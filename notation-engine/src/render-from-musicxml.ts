import type { Chord, MeasureEvent, Note, Rest } from './core/index.js';
import { getEngravingDefault, getGlyph } from './glyphs/index.js';
import {
  ALTO_CLEF,
  BASS_CLEF,
  PERCUSSION_CLEF,
  SOPRANO_CLEF,
  TAB_CLEF,
  TENOR_CLEF,
  TREBLE_CLEF,
  type ClefDefinition,
  type StemDirection,
  accidentalGlyphName,
  accidentalX,
  assignAccidentalColumns,
  beamDirection,
  beamYAtX,
  chordStemDirection,
  computeBarlineGeometry,
  computeBeamShape,
  graceNoteGlyphName,
  computeLedgerLines,
  computeStemLength,
  createAccidentalState,
  evaluateAccidental,
  beamedEventIndices,
  groupBeams,
  keySignatureAccidentals,
  middleLineY,
  needsFlag,
  numBeamLines,
  resolveStemDirection,
  computeTieShape,
  tieSide,
  voiceForcedDirection,
  voiceRestOffset,
  resetMeasure,
  restGlyphName,
  restY,
  selectNoteheadGlyphName,
  staffPositionForPitch,
  timeSignature,
  computeStaffGeometry,
  type AccidentalState,
  type BarlineType,
  type BeamStyle as BeamStyleOption,
} from './geometry/index.js';
import { DEFAULT_DRUM_MAPPING_TABLE, lookupDrumMapEntry } from './drums/index.js';
import { computeSystemLayout } from './layout/index.js';
import { fretDigitGlyphNames, tabStringPosition } from './geometry/index.js';
import { renderTabNumber } from './render/index.js';
import { computeBraceShape, needsBrace, needsContinuousBarline } from './geometry/index.js';
import { renderBrace } from './render/index.js';
import type { Diagnostic, MeasureAttributes } from './parser/index.js';
import { parseMusicXml, type ParseMusicXmlOptions } from './parser/index.js';
import { naiveMeasureLayout } from './layout/index.js';
import {
  createSvgDocument,
  renderAccidental,
  renderBarline,
  renderBeam,
  renderClef,
  renderFlag,
  renderKeySignature,
  renderLedgerLines,
  renderMark,
  renderNotehead,
  renderRest,
  renderStaff,
  renderStem,
  renderTie,
  renderTimeSignature,
  noteheadWidth,
} from './render/index.js';

const STAFF_LINES = 5;
/** How far down from the SVG's top the staff's BOTTOM line sits -- leaves room above for stems/ledger lines/accidentals in this deliberately naive layout. */
const STAFF_BOTTOM_Y = 8;
const SYSTEM_HEIGHT = 16;
const FONT_FAMILY = 'Bravura';
const INK_COLOR = '#000000';
const BACKGROUND_COLOR = '#ffffff';
const PX_PER_STAFF_SPACE = 20;
const MEASURE_WIDTH = 24;
const LEDGER_EXTENSION_FALLBACK = 0.4;
const LEDGER_THICKNESS_FALLBACK = 0.16;
const STEM_THICKNESS_FALLBACK = 0.12;
const TIE_MIDPOINT_THICKNESS_FALLBACK = 0.22;
const BEAM_THICKNESS_FALLBACK = 0.5;
const BEAM_SPACING_FALLBACK = 0.25;
/** The natural (unbeamed) stem length a beam group's shape starts from, matching Phase 16's own default. */
const DEFAULT_UNBEAMED_STEM_LENGTH = 3.5;
/** Hardcoded pending Phase 50's full config wiring -- same pattern as INK_COLOR/FONT_FAMILY above (Phase 21's documented limitation, not new to this phase). */
const DEFAULT_BEAM_STYLE: BeamStyleOption = 'straight';

export type RenderFromMusicXmlOptions = ParseMusicXmlOptions;

export interface RenderFromMusicXmlResult {
  readonly svg: string;
  readonly diagnostics: readonly Diagnostic[];
}

interface ClefMapping {
  readonly clefDef: ClefDefinition;
  readonly keySigClefName: string;
}

function mapClef(sign: string, line: number | undefined): ClefMapping {
  if (sign === 'G') return { clefDef: TREBLE_CLEF, keySigClefName: 'treble' };
  if (sign === 'F') return { clefDef: BASS_CLEF, keySigClefName: 'bass' };
  if (sign === 'C' && line === 3) return { clefDef: ALTO_CLEF, keySigClefName: 'alto' };
  if (sign === 'C' && line === 4) return { clefDef: TENOR_CLEF, keySigClefName: 'tenor' };
  if (sign === 'C') return { clefDef: SOPRANO_CLEF, keySigClefName: 'soprano' };
  if (sign === 'percussion') return { clefDef: PERCUSSION_CLEF, keySigClefName: 'treble' };
  if (sign === 'TAB') return { clefDef: TAB_CLEF, keySigClefName: 'treble' };
  return { clefDef: TREBLE_CLEF, keySigClefName: 'treble' };
}

function mapBarline(
  style: string | undefined,
  repeatDirection: 'forward' | 'backward' | undefined,
): BarlineType {
  if (repeatDirection === 'forward') return 'repeatBegin';
  if (repeatDirection === 'backward') return 'repeatEnd';
  if (style === 'light-heavy') return 'final';
  if (style === 'light-light') return 'double';
  if (style === 'dashed') return 'dashed';
  return 'single';
}

/** Cumulative start-tick of each event within a voice, recomputed from each event's own Duration.ticks -- Phase 3's Voice doesn't store per-event tick positions itself, so this reconstructs them from durations in order. */
function eventStartTicks(events: readonly MeasureEvent[]): readonly number[] {
  const starts: number[] = [];
  let tick = 0;
  for (const ev of events) {
    starts.push(tick);
    tick += ev.duration.ticks;
  }
  return starts;
}

function totalTicks(events: readonly MeasureEvent[]): number {
  return events.reduce((sum, ev) => sum + ev.duration.ticks, 0);
}

function glyphWidthOf(glyphName: string): number {
  const bbox = getGlyph(glyphName)?.bBox;
  return bbox !== undefined ? bbox.bBoxNE[0] - bbox.bBoxSW[0] : 0;
}

interface RenderCtx {
  readonly clefDef: ClefDefinition;
  readonly measureBottomY: number;
  /** Phase 41: this part's own <instrument id="..."> -> GM note number map (from Phase 35's parsed <midi-instrument> data), if any. Lets an unpitched note with a known GM number use the real drum mapping table instead of only its file-supplied display-step/octave. */
  readonly midiInstrumentsByPart: ReadonlyMap<string, number> | undefined;
}

/** Draws a note's accidental (if needed)/notehead/ledger-lines only -- no stem, no flag. Shared by both the plain (unbeamed) path and the beam-group path, which differ only in how the stem/flag (or beam) gets drawn afterward. */
function renderNoteheadPart(
  note: Note,
  x: number,
  ctx: RenderCtx,
  accidentalState: AccidentalState,
): {
  svg: string;
  position: number;
  noteheadGlyph: string;
  newAccidentalState: AccidentalState;
  drumStemDirection?: StemDirection;
} {
  const parts: string[] = [];

  // Percussion: <unpitched>'s display-step/display-octave ARE a staff
  // position, so they go through the same staffPositionForPitch as a real
  // pitch -- but an unpitched note can never carry an accidental (there's
  // no pitch to alter), so the whole accidental branch is skipped rather
  // than special-cased inside it.
  const isUnpitched = note.pitch.kind === 'unpitched';
  const step = isUnpitched ? note.pitch.displayStep : note.pitch.step;
  const octave = isUnpitched ? note.pitch.displayOctave : note.pitch.octave;

  // Phase 41/§13.3: an unpitched note whose <instrument id> resolves to a
  // known GM percussion note (via Phase 35's parsed <midi-instrument> map)
  // uses the real drum mapping table's own staff position -- GM numbers
  // are unambiguous (§13.1's own authority rule for "which drum sound"),
  // while a file's own display-step/octave is only ever a rendering hint.
  // A note with no resolvable GM number keeps using its own display
  // position exactly as before -- this is additive, not a replacement.
  const gmNote =
    isUnpitched && note.instrumentId !== undefined
      ? ctx.midiInstrumentsByPart?.get(note.instrumentId)
      : undefined;
  const drumEntry =
    gmNote !== undefined ? lookupDrumMapEntry(gmNote, DEFAULT_DRUM_MAPPING_TABLE).entry : undefined;

  const position =
    drumEntry !== undefined
      ? drumEntry.staffPosition
      : staffPositionForPitch(ctx.clefDef, step, octave);
  const y = ctx.measureBottomY + position;

  let state = accidentalState;
  if (note.pitch.kind === 'pitched') {
    const decision = evaluateAccidental(
      accidentalState,
      note.pitch.step,
      note.pitch.octave,
      note.pitch.alter,
      note.hasExplicitAccidental ?? false,
    );
    state = decision.newState;
    if (decision.shouldDraw) {
      const glyphName = accidentalGlyphName(note.pitch.alter);
      const width = glyphWidthOf(glyphName);
      parts.push(
        renderAccidental(glyphName, {
          x: accidentalX(x, width, 0),
          y,
          color: INK_COLOR,
          fontFamily: FONT_FAMILY,
        }),
      );
    }
  }

  const noteheadGlyph = selectNoteheadGlyphName({
    pitch: note.pitch,
    durationType: note.duration.type,
    ...(note.explicitNotehead !== undefined ? { explicitNotehead: note.explicitNotehead } : {}),
    ...(gmNote !== undefined && drumEntry !== undefined
      ? { midiNote: gmNote, overridesByKey: { [String(gmNote)]: drumEntry.noteheadShape } }
      : {}),
  });
  parts.push(renderNotehead(noteheadGlyph, { x, y, color: INK_COLOR, fontFamily: FONT_FAMILY }));

  const ledgerLines = computeLedgerLines(position, STAFF_LINES);
  if (ledgerLines.length > 0) {
    parts.push(
      renderLedgerLines(ledgerLines, {
        x,
        noteheadWidth: noteheadWidth(noteheadGlyph),
        staffBottomY: ctx.measureBottomY,
        extension: getEngravingDefault('legerLineExtension') ?? LEDGER_EXTENSION_FALLBACK,
        thickness: getEngravingDefault('legerLineThickness') ?? LEDGER_THICKNESS_FALLBACK,
        color: INK_COLOR,
      }),
    );
  }

  return {
    svg: parts.join('\n'),
    position,
    noteheadGlyph,
    newAccidentalState: state,
    ...(drumEntry?.stemDirection !== undefined
      ? { drumStemDirection: drumEntry.stemDirection }
      : {}),
  };
}

function renderNoteOrRest(
  ev: Note | Rest,
  x: number,
  ctx: RenderCtx,
  accidentalState: AccidentalState,
  forcedDirection: StemDirection | undefined,
  restOffset: number,
): {
  svg: string;
  newAccidentalState: AccidentalState;
  /** The resolved direction and notehead width -- undefined for a rest, since a rest has neither. Exposed so a caller can anchor a tie to/from this note without recomputing this note's own geometry. */
  tieAnchor?: { direction: StemDirection; position: number; noteheadGlyph: string };
} {
  if (ev.kind === 'rest') {
    const y = ctx.measureBottomY + restY(ev.duration.type, STAFF_LINES, restOffset);
    const svg = renderRest(restGlyphName(ev.duration.type), {
      x,
      y,
      color: INK_COLOR,
      fontFamily: FONT_FAMILY,
    });
    return { svg, newAccidentalState: accidentalState };
  }

  if (ev.isGrace) {
    // A grace note draws as ONE precomposed glyph (Phase 34) -- notehead,
    // stem, and flag are baked into the font's own design, not assembled
    // from this engine's separate notehead/stem/flag pieces the way an
    // ordinary note is. Its accidental (if any) still goes through the
    // normal state machine, since a grace note's own pitch can still need
    // one drawn.
    const isUnpitchedGrace = ev.pitch.kind === 'unpitched';
    const graceStep = isUnpitchedGrace ? ev.pitch.displayStep : ev.pitch.step;
    const graceOctave = isUnpitchedGrace ? ev.pitch.displayOctave : ev.pitch.octave;
    const gracePosition = staffPositionForPitch(ctx.clefDef, graceStep, graceOctave);
    const graceY = ctx.measureBottomY + gracePosition;
    const parts: string[] = [];
    let state = accidentalState;
    if (ev.pitch.kind === 'pitched') {
      const decision = evaluateAccidental(
        accidentalState,
        ev.pitch.step,
        ev.pitch.octave,
        ev.pitch.alter,
        ev.hasExplicitAccidental ?? false,
      );
      state = decision.newState;
      if (decision.shouldDraw) {
        const glyphName = accidentalGlyphName(ev.pitch.alter);
        const width = glyphWidthOf(glyphName);
        parts.push(
          renderAccidental(glyphName, {
            x: accidentalX(x, width, 0),
            y: graceY,
            color: INK_COLOR,
            fontFamily: FONT_FAMILY,
          }),
        );
      }
    }
    const graceDirection = resolveStemDirection({
      positions: [gracePosition],
      numLines: STAFF_LINES,
      ...(forcedDirection !== undefined ? { forcedDirection } : {}),
      ...(ev.explicitStemDirection !== undefined
        ? { explicitDirection: ev.explicitStemDirection }
        : {}),
    });
    const kind = ev.graceSlash ? 'acciaccatura' : 'appoggiatura';
    parts.push(
      renderMark(graceNoteGlyphName(kind, graceDirection), {
        x,
        y: graceY,
        color: INK_COLOR,
        fontFamily: FONT_FAMILY,
      }),
    );
    return { svg: parts.join('\n'), newAccidentalState: state };
  }

  const parts: string[] = [];
  const head = renderNoteheadPart(ev, x, ctx, accidentalState);
  parts.push(head.svg);
  const y = ctx.measureBottomY + head.position;

  // §9.14: voice-forced direction (when multiple voices share the staff)
  // wins over automatic placement -- "upper up, lower down, always" --
  // reusing Phase 16's own priority chain rather than hand-rolling it.
  // Computed unconditionally (even for a whole note, which draws no real
  // stem) because §9.15's tie side needs SOME resolved direction even
  // then -- "imagine where the stem would go if there was one."
  // Phase 41: a drum-table stem-direction convention (hands up / feet
  // down, §13.3) sits between an explicit file <stem> and automatic
  // placement -- the file's own explicit direction for this specific
  // note still wins if present; only when it's absent does the drum
  // table's own convention apply, ahead of ordinary automatic placement.
  const explicitDirection = ev.explicitStemDirection ?? head.drumStemDirection;

  const direction = resolveStemDirection({
    positions: [head.position],
    numLines: STAFF_LINES,
    ...(forcedDirection !== undefined ? { forcedDirection } : {}),
    ...(explicitDirection !== undefined ? { explicitDirection } : {}),
  });

  if (ev.duration.type !== 'whole') {
    const length = computeStemLength(head.position, middleLineY(STAFF_LINES));
    parts.push(
      renderStem({
        noteheadGlyphName: head.noteheadGlyph,
        noteX: x,
        noteY: y,
        direction,
        length,
        thickness: getEngravingDefault('stemThickness') ?? STEM_THICKNESS_FALLBACK,
        color: INK_COLOR,
      }),
    );
    if (needsFlag(ev.duration.type, false)) {
      const anchorName = direction === 'up' ? 'stemUpSE' : 'stemDownNW';
      const anchor = getGlyph(head.noteheadGlyph)?.anchors?.[anchorName];
      if (anchor !== undefined) {
        const stemX = x + anchor[0];
        const attachY = y - anchor[1];
        const endY = direction === 'up' ? attachY - length : attachY + length;
        parts.push(
          renderFlag(ev.duration.type, {
            x: stemX,
            y: endY,
            direction,
            color: INK_COLOR,
            fontFamily: FONT_FAMILY,
          }),
        );
      }
    }
  }

  return {
    svg: parts.join('\n'),
    newAccidentalState: head.newAccidentalState,
    tieAnchor: { direction, position: head.position, noteheadGlyph: head.noteheadGlyph },
  };
}

/**
 * Draws a full beam group (Phase 23's grouping + Phase 24's shape):
 * every member note's accidental/notehead/ledger-lines (via
 * `renderNoteheadPart`, no individual stem/flag), then one shared beam
 * whose slope/style comes from `computeBeamShape`, with each note's own
 * stem individually adjusted to reach that beam at its own X
 * (`beamYAtX`) rather than using its natural unbeamed length.
 */
function renderBeamGroup(
  notes: readonly Note[],
  xs: readonly number[],
  ctx: RenderCtx,
  accidentalState: AccidentalState,
  beamStyle: BeamStyleOption,
  forcedDirection: StemDirection | undefined,
): { svg: string; newAccidentalState: AccidentalState } {
  const parts: string[] = [];
  let state = accidentalState;
  const positions: number[] = [];
  const noteheadGlyphs: string[] = [];

  notes.forEach((note, i) => {
    const x = xs[i];
    if (x === undefined) return;
    const head = renderNoteheadPart(note, x, ctx, state);
    parts.push(head.svg);
    state = head.newAccidentalState;
    positions.push(head.position);
    noteheadGlyphs.push(head.noteheadGlyph);
  });

  const middle = middleLineY(STAFF_LINES);
  const direction = forcedDirection ?? beamDirection(positions, middle);
  const naturalLength = Math.max(
    DEFAULT_UNBEAMED_STEM_LENGTH,
    ...positions.map((p) => computeStemLength(p, middle)),
  );
  const shape = computeBeamShape(positions, [...xs], direction, beamStyle, naturalLength);

  notes.forEach((_note, i) => {
    const x = xs[i];
    const position = positions[i];
    const noteheadGlyph = noteheadGlyphs[i];
    if (x === undefined || position === undefined || noteheadGlyph === undefined) return;
    const y = ctx.measureBottomY + position;
    const beamY = ctx.measureBottomY + beamYAtX(shape, x);
    const anchorName = direction === 'up' ? 'stemUpSE' : 'stemDownNW';
    const anchor = getGlyph(noteheadGlyph)?.anchors?.[anchorName];
    if (anchor === undefined) return;
    parts.push(
      renderStem({
        noteheadGlyphName: noteheadGlyph,
        noteX: x,
        noteY: y,
        direction,
        // renderStem draws from the notehead anchor a fixed `length` in
        // `direction` -- passing the exact distance to the beam's own Y
        // makes the stem tip land precisely on the (possibly sloped) beam.
        length: Math.abs(beamY - (y - anchor[1])),
        thickness: getEngravingDefault('stemThickness') ?? STEM_THICKNESS_FALLBACK,
        color: INK_COLOR,
      }),
    );
  });

  // §9.13's documented simplification: line count is the MAX across every
  // note in the group (whichever duration needs the most beam lines --
  // the finest subdivision present), not just the first note's own
  // duration. A group like [eighth, 16th, 16th] needs 2 lines throughout,
  // not 1.
  const lineCount = Math.max(1, ...notes.map((n) => numBeamLines(n.duration.type)));
  // `shape`'s Y values are in staff-position-RELATIVE units (matching
  // `positions`, which came straight from staffPositionForPitch with no
  // offset) -- renderBeam draws in absolute SVG space, so the beam's own
  // line(s) need measureBottomY added too, the same way each note's stem
  // endpoint already does a few lines above.
  const offsetShape = {
    ...shape,
    startY: shape.startY + ctx.measureBottomY,
    endY: shape.endY + ctx.measureBottomY,
  };
  parts.push(
    renderBeam(offsetShape, {
      lineCount,
      thickness: getEngravingDefault('beamThickness') ?? BEAM_THICKNESS_FALLBACK,
      spacing: getEngravingDefault('beamSpacing') ?? BEAM_SPACING_FALLBACK,
      color: INK_COLOR,
    }),
  );

  return { svg: parts.join('\n'), newAccidentalState: state };
}

function renderChord(
  chord: Chord,
  x: number,
  ctx: RenderCtx,
  accidentalState: AccidentalState,
  forcedDirection: StemDirection | undefined,
): { svg: string; newAccidentalState: AccidentalState } {
  const parts: string[] = [];
  // Chord members may be pitched OR unpitched (a drum chart legitimately
  // writes e.g. kick+hi-hat as a simultaneous group). Both go through the
  // same staffPositionForPitch -- an unpitched note's display-step/octave
  // IS its staff position. Only pitched members can carry an accidental.
  const positions = chord.notes.map((n) =>
    n.pitch.kind === 'pitched'
      ? staffPositionForPitch(ctx.clefDef, n.pitch.step, n.pitch.octave)
      : staffPositionForPitch(ctx.clefDef, n.pitch.displayStep, n.pitch.displayOctave),
  );

  let state = accidentalState;
  const drawFlags: boolean[] = [];
  const alters: number[] = [];
  for (const n of chord.notes) {
    if (n.pitch.kind === 'pitched') {
      const decision = evaluateAccidental(state, n.pitch.step, n.pitch.octave, n.pitch.alter);
      state = decision.newState;
      drawFlags.push(decision.shouldDraw);
      alters.push(n.pitch.alter);
    } else {
      drawFlags.push(false);
      alters.push(0);
    }
  }

  const positionsNeedingAccidentals = positions.filter((_, i) => drawFlags[i] === true);
  const placements = assignAccidentalColumns(positionsNeedingAccidentals);
  let placementIndex = 0;
  drawFlags.forEach((shouldDraw, i) => {
    if (!shouldDraw) return;
    const placement = placements[placementIndex];
    placementIndex += 1;
    if (placement === undefined) return;
    const alter = alters[i] ?? 0;
    const glyphName = accidentalGlyphName(alter);
    const width = glyphWidthOf(glyphName);
    parts.push(
      renderAccidental(glyphName, {
        x: accidentalX(x, width, placement.column),
        y: ctx.measureBottomY + placement.y,
        color: INK_COLOR,
        fontFamily: FONT_FAMILY,
      }),
    );
  });

  let widestGlyph: string | undefined;
  chord.notes.forEach((n, i) => {
    const glyphName = selectNoteheadGlyphName({
      pitch: n.pitch,
      durationType: chord.duration.type,
    });
    if (widestGlyph === undefined || glyphWidthOf(glyphName) > glyphWidthOf(widestGlyph)) {
      widestGlyph = glyphName;
    }
    const position = positions[i] ?? 0;
    const y = ctx.measureBottomY + position;
    parts.push(renderNotehead(glyphName, { x, y, color: INK_COLOR, fontFamily: FONT_FAMILY }));
    const ledgerLines = computeLedgerLines(position, STAFF_LINES);
    if (ledgerLines.length > 0) {
      parts.push(
        renderLedgerLines(ledgerLines, {
          x,
          noteheadWidth: noteheadWidth(glyphName),
          staffBottomY: ctx.measureBottomY,
          extension: getEngravingDefault('legerLineExtension') ?? LEDGER_EXTENSION_FALLBACK,
          thickness: getEngravingDefault('legerLineThickness') ?? LEDGER_THICKNESS_FALLBACK,
          color: INK_COLOR,
        }),
      );
    }
  });

  if (chord.duration.type !== 'whole' && positions.length > 0) {
    const direction = forcedDirection ?? chordStemDirection(positions, middleLineY(STAFF_LINES));
    const outermost = direction === 'up' ? Math.max(...positions) : Math.min(...positions);
    const length = computeStemLength(outermost, middleLineY(STAFF_LINES));
    parts.push(
      renderStem({
        noteheadGlyphName: widestGlyph ?? 'noteheadBlack',
        noteX: x,
        noteY: ctx.measureBottomY + outermost,
        direction,
        length,
        thickness: getEngravingDefault('stemThickness') ?? STEM_THICKNESS_FALLBACK,
        color: INK_COLOR,
      }),
    );
  }

  return { svg: parts.join('\n'), newAccidentalState: state };
}

/**
 * The Phase 21 vertical-slice entry point: MusicXML text in, a complete
 * SVG string out. Still deliberately naive in its LAYOUT (fixed-width
 * measures via layout/naive.ts, no content-aware spacing) -- see PLAN.md
 * §22's sequencing note that this phase "exists to be thrown away" once
 * Stage 8's real layout lands.
 *
 * Integration passes A and B have since made its CONTENT handling real:
 * every part renders, each part's staves render with their own clefs and
 * line counts, and a grand staff gets its brace and continuous barline.
 */
export function renderFromMusicXml(
  xmlText: string,
  options?: RenderFromMusicXmlOptions,
): RenderFromMusicXmlResult {
  const {
    score,
    attributes,
    diagnostics: parseDiagnostics,
    midiInstrumentsByPart: midiInstrumentsByPartMap,
  } = parseMusicXml(xmlText, options);
  const diagnostics: Diagnostic[] = [...parseDiagnostics];

  if (score.parts.length === 0) {
    const doc = createSvgDocument(
      {
        viewBoxWidth: MEASURE_WIDTH,
        viewBoxHeight: SYSTEM_HEIGHT,
        pxPerStaffSpace: PX_PER_STAFF_SPACE,
        backgroundColor: BACKGROUND_COLOR,
      },
      [],
    );
    return { svg: doc, diagnostics };
  }

  // Integration B: every part is rendered, each offset vertically below
  // the one before it. Phase 29's computeSystemLayout already handles
  // multi-PART stacking (not just multi-staff), so it is given the real
  // per-part staff counts here rather than a single part's.
  const partStaffCounts = score.parts.map((p) => {
    const a = attributes.find((x) => x.partId === p.id);
    return Math.max(1, a?.staves ?? 1);
  });
  const scoreLayout = computeSystemLayout(partStaffCounts);
  const staffOffsetFor = (partIndex: number, staffIndexInPart: number): number =>
    scoreLayout.positions.find(
      (pos) => pos.partIndex === partIndex && pos.staffIndexInPart === staffIndexInPart,
    )?.y ?? 0;

  const svgParts: string[] = [];
  let totalWidth = MEASURE_WIDTH;

  score.parts.forEach((part, partIndex) => {
    const layouts = naiveMeasureLayout(part.measures.length, MEASURE_WIDTH);
    const lastLayout = layouts[layouts.length - 1];
    const partWidth = lastLayout !== undefined ? lastLayout.x + MEASURE_WIDTH : MEASURE_WIDTH;
    totalWidth = Math.max(totalWidth, partWidth);

    // Phase 41: this part's own GM instrument map, if any -- used to look
    // up a real drum-table entry for an unpitched note whose <instrument
    // id> resolves to a known GM percussion note number.
    const midiInstrumentsByPart = midiInstrumentsByPartMap.get(part.id);

    // Integration A: accidental state is per STAFF -- a measure-local accidental
    // on the treble staff must not carry over onto the bass staff, and each
    // staff resets independently at its own barline.
    const accidentalStateByStaff = new Map<number, AccidentalState>();
    let previousAttrs: MeasureAttributes | undefined;

    part.measures.forEach((measure, i) => {
      const attrs = attributes.find(
        (a) => a.partId === part.id && a.measureNumber === measure.number,
      );
      const layout = layouts[i];
      if (attrs === undefined || layout === undefined) return;

      // Integration A: one pass per staff. A single-staff part runs this
      // exactly once (staffNumber 1), producing byte-identical output to
      // the pre-Integration-A single-staff renderer; a grand staff runs it once per
      // staff, each with its OWN clef and its own vertical offset.
      const staffNumbers = Array.from({ length: Math.max(1, attrs.staves) }, (_, n) => n + 1);

      staffNumbers.forEach((staffNumber, staffIndex) => {
        // Integration A: THIS staff's own clef, not the part's first clef --
        // using attrs.clefSign for every staff is exactly what collapsed a
        // piano's bass staff onto its treble staff. Falls back to staff 1's
        // clef (then the parser's own default) when a file declares fewer
        // clefs than it does staves.
        const staffClef = attrs.clefsByStaff[staffNumber] ?? attrs.clefsByStaff[1];
        const { clefDef, keySigClefName } = mapClef(
          staffClef?.sign ?? attrs.clefSign,
          staffClef?.line ?? attrs.clefLine,
        );
        // Integration B: this staff's own line count, straight from the
        // file's <staff-details><staff-lines> (tab = 6, most = 5). The
        // note-drawing helpers below still assume STAFF_LINES, which is
        // safe precisely because they only ever run for a pitch-positioning
        // clef, and every such staff in practice has 5 lines -- a tab
        // staff's notes are skipped entirely (see the UNSUPPORTED_CLEF
        // diagnostic), so no note math depends on this being 6.
        const staffLines = attrs.staffLinesByStaff[staffNumber] ?? STAFF_LINES;
        const staffGeometry = computeStaffGeometry(staffLines);
        const bottomY = STAFF_BOTTOM_Y + staffOffsetFor(partIndex, staffIndex);

        svgParts.push(
          renderStaff(staffGeometry, {
            x: layout.x,
            y: bottomY,
            width: layout.width,
            color: INK_COLOR,
            lineThickness: getEngravingDefault('staffLineThickness') ?? 0.13,
          }),
        );

        const isFirstMeasure = i === 0;
        const clefChanged =
          previousAttrs === undefined ||
          previousAttrs.clefSign !== attrs.clefSign ||
          previousAttrs.clefLine !== attrs.clefLine;
        const keyChanged = previousAttrs === undefined || previousAttrs.fifths !== attrs.fifths;
        const timeChanged =
          previousAttrs === undefined ||
          previousAttrs.timeNumerator !== attrs.timeNumerator ||
          previousAttrs.timeDenominator !== attrs.timeDenominator;

        let cursorX = layout.x + 0.5;

        if (isFirstMeasure || clefChanged) {
          svgParts.push(
            renderClef(clefDef, {
              x: cursorX,
              // Integration A bug fix: a clef glyph belongs on the line it names
              // (gClef on G, fClef on F), not on the staff's bottom line.
              // Passing bottomY alone drew every clef too low -- barely
              // noticeable for treble (1 space) but glaring for bass (3).
              y: bottomY + clefDef.glyphY,
              color: INK_COLOR,
              fontFamily: FONT_FAMILY,
            }),
          );
          cursorX += 3;
        }

        if ((isFirstMeasure || keyChanged) && attrs.fifths !== 0) {
          try {
            const accidentals = keySignatureAccidentals(attrs.fifths, keySigClefName);
            svgParts.push(
              renderKeySignature(accidentals, {
                x: cursorX,
                spacing: 1,
                staffBottomY: bottomY,
                color: INK_COLOR,
                fontFamily: FONT_FAMILY,
              }),
            );
            cursorX += accidentals.length + 0.5;
          } catch (err) {
            diagnostics.push({
              severity: 'warning',
              code: 'UNSUPPORTED_KEY_SIGNATURE_CLEF',
              message: err instanceof Error ? err.message : String(err),
              location: { partId: part.id, measureNumber: measure.number },
            });
          }
        }

        if (isFirstMeasure || timeChanged) {
          try {
            const sig = timeSignature(attrs.timeNumerator, attrs.timeDenominator);
            svgParts.push(
              renderTimeSignature(sig, {
                x: cursorX,
                staffBottomY: bottomY,
                color: INK_COLOR,
                fontFamily: FONT_FAMILY,
              }),
            );
            cursorX += 2.5;
          } catch (err) {
            diagnostics.push({
              severity: 'warning',
              code: 'INVALID_TIME_SIGNATURE',
              message: err instanceof Error ? err.message : String(err),
              location: { partId: part.id, measureNumber: measure.number },
            });
          }
        }

        const previousStaffState = accidentalStateByStaff.get(staffNumber);
        let accidentalState: AccidentalState =
          previousStaffState === undefined || keyChanged
            ? createAccidentalState(attrs.fifths)
            : resetMeasure(previousStaffState);
        accidentalStateByStaff.set(staffNumber, accidentalState);

        if (clefDef.positionsByPitch) {
          const ctx: RenderCtx = { clefDef, measureBottomY: bottomY, midiInstrumentsByPart };
          const noteAreaX = Math.max(layout.x + layout.width * 0.25, cursorX);
          const noteAreaWidth = layout.x + layout.width - noteAreaX;
          // §9.14: forced stem direction only applies once a staff genuinely
          // has multiple voices sharing it -- a single voice keeps ordinary
          // automatic direction (renderNoteOrRest/renderChord/renderBeamGroup
          // all fall back to automatic when this is undefined).
          const isMultiVoice = measure.voices.length > 1;

          for (const voice of measure.voices) {
            const forcedDirection = isMultiVoice ? voiceForcedDirection(voice.id) : undefined;
            const restOffset = isMultiVoice ? voiceRestOffset(voice.id) : 0;
            // §9.15: tracks the most recent note that started a tie (tieStart)
            // in THIS voice, so the next note carrying tieStop can be
            // connected to it. Scoped to within one measure and to
            // non-beamed, non-chord notes only -- a tie spanning a barline,
            // or into/out of a beamed or chord note, is documented as not yet
            // drawn (see Doc/phase-26).
            let pendingTie: { x: number; y: number; direction: StemDirection } | undefined;
            const starts = eventStartTicks(voice.events);
            const total = totalTicks(voice.events) || 1;
            const eventXs = voice.events.map((_, idx) => {
              const startTick = starts[idx] ?? 0;
              return noteAreaX + (startTick / total) * noteAreaWidth;
            });

            // Phase 23 grouping: treat a rest, a chord, OR a grace note as
            // breaking a beamable run. Chords aren't supported by
            // renderBeamGroup yet (documented scope limit). Grace notes draw
            // as one precomposed Phase 34 glyph with the flag/stem already
            // baked in -- they must never be swept into an ordinary beam
            // group alongside real notes, which is exactly what happened
            // before this check existed: a real MusicXML fixture with two
            // grace notes immediately preceding a beamed triplet produced a
            // single 5-note beam group (2 grace + 3 real), silently drawing
            // the grace notes as if they were ordinary noteheads and never
            // reaching the grace-note rendering branch below at all.
            const beamableEvents = voice.events.map((event) => ({
              durationType: event.duration.type,
              isRest: event.kind !== 'note' || event.isGrace === true,
            }));
            const groups = groupBeams(
              beamableEvents,
              starts,
              attrs.timeNumerator,
              attrs.timeDenominator,
            );
            const beamedIndices = beamedEventIndices(groups);
            const groupByFirstIndex = new Map<number, (typeof groups)[number]>();
            for (const group of groups) {
              const firstIndex = group.eventIndices[0];
              if (firstIndex !== undefined) groupByFirstIndex.set(firstIndex, group);
            }

            voice.events.forEach((event, idx) => {
              // Integration A: a multi-staff part's voices carry events for
              // EVERY staff; this pass draws only the ones belonging to the
              // staff currently being rendered. An event with no <staff> is
              // staff 1, matching MusicXML's own default. Note the x
              // positions were computed from ALL events above, deliberately
              // -- both staves of a grand staff share one horizontal
              // timeline, so a bass note stays aligned under the treble note
              // it sounds with.
              const eventStaff = event.staff ?? 1;
              if (eventStaff !== staffNumber) return;
              const eventX = eventXs[idx] ?? 0;

              // Defense in depth: grace notes are already excluded from
              // `beamableEvents` above, so `beamedIndices` should never
              // contain one -- but route them to their own path
              // unconditionally regardless, rather than relying solely on
              // that upstream exclusion holding forever.
              const isGraceNote = event.kind === 'note' && event.isGrace === true;

              if (!isGraceNote && beamedIndices.has(idx)) {
                const group = groupByFirstIndex.get(idx);
                if (group === undefined) return; // a non-first member of an already-rendered group
                const groupNotes = group.eventIndices
                  .map((i) => voice.events[i])
                  .filter((e): e is Note => e !== undefined && e.kind === 'note');
                const groupXs = group.eventIndices.map((i) => eventXs[i] ?? 0);
                const { svg, newAccidentalState } = renderBeamGroup(
                  groupNotes,
                  groupXs,
                  ctx,
                  accidentalState,
                  DEFAULT_BEAM_STYLE,
                  forcedDirection,
                );
                svgParts.push(svg);
                accidentalState = newAccidentalState;
                return;
              }

              if (event.kind === 'chord') {
                const { svg, newAccidentalState } = renderChord(
                  event,
                  eventX,
                  ctx,
                  accidentalState,
                  forcedDirection,
                );
                svgParts.push(svg);
                accidentalState = newAccidentalState;
              } else {
                const { svg, newAccidentalState, tieAnchor } = renderNoteOrRest(
                  event,
                  eventX,
                  ctx,
                  accidentalState,
                  forcedDirection,
                  restOffset,
                );

                if (event.kind === 'note' && event.tieStop && pendingTie !== undefined) {
                  const side = tieSide(pendingTie.direction);
                  const startX =
                    pendingTie.x + noteheadWidth(tieAnchor?.noteheadGlyph ?? 'noteheadBlack');
                  const shape = computeTieShape(startX, eventX, pendingTie.y, side);
                  svgParts.push(
                    renderTie(shape, {
                      color: INK_COLOR,
                      midpointThickness:
                        getEngravingDefault('tieMidpointThickness') ??
                        TIE_MIDPOINT_THICKNESS_FALLBACK,
                    }),
                  );
                }
                pendingTie =
                  event.kind === 'note' && event.tieStart && tieAnchor !== undefined
                    ? {
                        x: eventX,
                        y: ctx.measureBottomY + tieAnchor.position,
                        direction: tieAnchor.direction,
                      }
                    : undefined;

                svgParts.push(svg);
                accidentalState = newAccidentalState;
              }
            });
          }
        } else if (clefDef.name === 'tab') {
          // Integration C: tablature places a note by STRING and FRET, not
          // by pitch. The horizontal timeline is computed exactly as the
          // pitched branch does, so a tab staff stays aligned under the
          // notation staff it accompanies.
          const noteAreaX = Math.max(layout.x + layout.width * 0.25, cursorX);
          const noteAreaWidth = layout.x + layout.width - noteAreaX;

          for (const voice of measure.voices) {
            const starts = eventStartTicks(voice.events);
            const total = totalTicks(voice.events) || 1;

            voice.events.forEach((event, idx) => {
              if (event.kind !== 'note') return;
              if ((event.staff ?? 1) !== staffNumber) return;
              if (event.stringNumber === undefined || event.fret === undefined) {
                // A tab staff whose notes carry no <string>/<fret> can't be
                // drawn -- say so rather than rendering an empty staff with
                // no explanation.
                diagnostics.push({
                  severity: 'info',
                  code: 'TAB_NOTE_MISSING_STRING_OR_FRET',
                  message: `A note on a tab staff has no <string>/<fret>; it cannot be placed and was skipped.`,
                  location: { partId: part.id, measureNumber: measure.number },
                });
                return;
              }

              let position: number;
              try {
                position = tabStringPosition(event.stringNumber, staffLines);
              } catch {
                diagnostics.push({
                  severity: 'warning',
                  code: 'TAB_STRING_OUT_OF_RANGE',
                  message: `String ${event.stringNumber} does not exist on this ${staffLines}-line tab staff; the note was skipped.`,
                  location: { partId: part.id, measureNumber: measure.number },
                });
                return;
              }

              const eventX = noteAreaX + ((starts[idx] ?? 0) / total) * noteAreaWidth;
              svgParts.push(
                renderTabNumber(fretDigitGlyphNames(event.fret), {
                  x: eventX,
                  y: bottomY + position,
                  color: INK_COLOR,
                  backgroundColor: BACKGROUND_COLOR,
                  fontFamily: FONT_FAMILY,
                }),
              );
            });
          }
        } else {
          // Currently UNREACHABLE: tab is the only clef with
          // positionsByPitch === false, and Integration C gave it its own
          // branch above. Deliberately retained rather than deleted, so
          // that a future non-pitch clef fails loudly here instead of
          // silently dropping every note on that staff. If one is added,
          // this branch becomes live again and needs its own test.
          diagnostics.push({
            severity: 'info',
            code: 'UNSUPPORTED_CLEF_FOR_NOTES',
            message: `Clef "${attrs.clefSign}" does not position notes by pitch; skipping notes in this measure.`,
            location: { partId: part.id, measureNumber: measure.number },
          });
        }
      });

      const barlineType = mapBarline(attrs.barlineStyle, attrs.repeatDirection);
      const barlineMetrics = {
        thinThickness: getEngravingDefault('thinBarlineThickness') ?? 0.16,
        thickThickness: getEngravingDefault('thickBarlineThickness') ?? 0.5,
        separation: getEngravingDefault('barlineSeparation') ?? 0.4,
        dotWidth: 0.4,
        dashLength: getEngravingDefault('dashedBarlineDashLength') ?? 0.5,
        gapLength: getEngravingDefault('dashedBarlineGapLength') ?? 0.25,
      };
      const barlineGeometry = computeBarlineGeometry(barlineType, barlineMetrics);
      // §9.18: within a brace group (one instrument's own multiple staves),
      // the barline runs CONTINUOUSLY through every staff and the gaps
      // between them -- one tall barline, not one per staff.
      const outerStaffGeometry = computeStaffGeometry(
        attrs.staffLinesByStaff[staffNumbers[0] ?? 1] ?? STAFF_LINES,
      );
      const firstStaffOffset = staffOffsetFor(partIndex, 0);
      const lastStaffOffset = staffOffsetFor(partIndex, staffNumbers.length - 1);
      const barlineBottomY = STAFF_BOTTOM_Y + lastStaffOffset;
      const barlineHeight = needsContinuousBarline(staffNumbers.length)
        ? outerStaffGeometry.height + (lastStaffOffset - firstStaffOffset)
        : outerStaffGeometry.height;
      svgParts.push(
        renderBarline(barlineGeometry, {
          x: layout.x + layout.width,
          staffBottomY: barlineBottomY,
          height: barlineHeight,
          color: INK_COLOR,
          fontFamily: FONT_FAMILY,
        }),
      );

      previousAttrs = attrs;
    });

    // §9.18/Phase 29: a part with 2+ staves is ONE instrument, so its staves
    // are joined by a brace at the system's left edge -- drawn once for the
    // whole system, not per measure.
    const partStaffCount = partStaffCounts[partIndex] ?? 1;
    if (needsBrace(partStaffCount)) {
      const firstOffset = staffOffsetFor(partIndex, 0);
      const lastOffset = staffOffsetFor(partIndex, partStaffCount - 1);
      // This block sits outside the measure loop, so it reads the part's
      // own first <attributes> rather than a per-measure `attrs`.
      const partFirstAttrs = attributes.find((a) => a.partId === part.id);
      const topStaffHeight = computeStaffGeometry(
        partFirstAttrs?.staffLinesByStaff[1] ?? STAFF_LINES,
      ).height;
      const braceShape = computeBraceShape(
        STAFF_BOTTOM_Y + firstOffset - topStaffHeight,
        STAFF_BOTTOM_Y + lastOffset,
        0,
      );
      svgParts.push(renderBrace(braceShape, { color: INK_COLOR, fontFamily: FONT_FAMILY }));
    }
  });

  const svg = createSvgDocument(
    {
      viewBoxWidth: totalWidth + 2,
      // Integration A/B: the viewBox must fit EVERY staff of EVERY part,
      // or the lower ones are simply clipped out of the rendered image.
      // The last position in the score-wide layout is the lowest staff.
      viewBoxHeight:
        SYSTEM_HEIGHT + (scoreLayout.positions[scoreLayout.positions.length - 1]?.y ?? 0),
      pxPerStaffSpace: PX_PER_STAFF_SPACE,
      backgroundColor: BACKGROUND_COLOR,
    },
    svgParts,
  );

  return { svg, diagnostics };
}
