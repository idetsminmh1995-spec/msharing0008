import type { Chord, Measure, MeasureEvent, Note, Rest } from './core/index.js';
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
import {
  computeSystemLayoutVariableGaps,
  emptySkyline,
  addToSkyline,
  computeStaffDistance,
} from './layout/index.js';
import { fretDigitGlyphNames, tabStringPosition } from './geometry/index.js';
import {
  metronomeNoteGlyphName,
  metronomeDotGlyphName,
  metronomeEqualsGlyphName,
  metronomeBpmDigitGlyphNames,
} from './geometry/metronome.js';
import { renderMetronomeMark } from './render/metronome.js';
import { TICKS_PER_QUARTER } from './core/duration-math.js';
import { renderTabNumber } from './render/index.js';
import { computeBraceShape, needsBrace, needsContinuousBarline } from './geometry/index.js';
import { renderBrace } from './render/index.js';
import type { Diagnostic, MeasureAttributes } from './parser/index.js';
import { parseMusicXml, type ParseMusicXmlOptions } from './parser/index.js';
import {
  computeReferenceDuration,
  computeProportionalPositions,
  applyMinimumDistance,
  type SpacingEvent,
} from './layout/spacing.js';
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

// Phase 43/44 wiring: real Sec14 spacing constants, matching
// config/config.ts's own SpacingConfig defaults. Not threaded through
// as an actual EngineConfig parameter -- RenderFromMusicXmlOptions
// currently accepts only domParser, and widening that public surface
// is a separate decision from wiring the algorithm itself.
const SPACING_CONFIG = {
  spacingIncrement: 1.2,
  shortestDurationSpace: 2.0,
  minNoteDistance: 0.5,
  justify: false,
};
/** A rough per-note width estimate for Sec14.2's minimum-distance pass -- notehead alone, or notehead+accidental-allowance. Real per-glyph widths would need sharing the accidental-DISPLAY state (not just the pitch's own alter) between a measurement pass and the render pass; this stays a documented approximation rather than duplicating that state. */
const ESTIMATED_NOTEHEAD_WIDTH = 1.0;
const ESTIMATED_ACCIDENTAL_ALLOWANCE = 1.0;
/** Trailing room after a measure's last event, so it isn't flush against the barline. */
const MEASURE_TRAILING_MARGIN = 2.0;
/**
 * Reserved space at the start of EVERY measure for a possible clef/key/
 * time-signature header, even on a measure that doesn't actually draw
 * one. Simpler and safer than computing the real header width per
 * measure (which would need duplicating the isFirstMeasure/clefChanged/
 * keyChanged/timeChanged logic here before it's otherwise needed) at
 * the cost of some wasted blank space on ordinary measures -- stated
 * directly as a limitation rather than silently accepted.
 */
const MEASURE_HEADER_ALLOWANCE = 4.0;

/** Phase 29's own default, kept as this wiring's fallback floor when computeStaffDistance's own configured minimum isn't threaded through as a real EngineConfig parameter (see the Phase 43 wiring's own note on why RenderFromMusicXmlOptions stays domParser-only for now). */
const DEFAULT_STAFF_GAP_FALLBACK = 8;

/**
 * Phase 44 wiring: the single most extreme staff-position value any note
 * on `staffNumber` reaches, expressed as a non-negative extent AWAY from
 * that staff's own near edge -- exactly the shape `Skyline`'s segments
 * need. `side: 'south'` finds how far below the bottom line the lowest
 * note goes; `'north'` finds how far above the top line the highest note
 * goes. Scans every measure/voice/staff-matching note (including chord
 * members and unpitched display positions) across the whole part, using
 * only the FIRST measure's clef for that staff -- a mid-piece clef
 * change on one staff of a grand staff is a rare enough case that this
 * wiring accepts the small inaccuracy rather than re-deriving clefs per
 * measure just for this estimate.
 */
function worstCaseStaffExtent(
  part: { readonly id: string; readonly measures: readonly Measure[] },
  staffNumber: number,
  allAttributes: readonly MeasureAttributes[],
  side: 'north' | 'south',
): number {
  const firstAttrs = allAttributes.find((a) => a.partId === part.id);
  const clefSpec = firstAttrs?.clefsByStaff[staffNumber];
  if (clefSpec === undefined) return 0;
  const { clefDef } = mapClef(clefSpec.sign, clefSpec.line);
  if (!clefDef.positionsByPitch) return 0;

  const staffLines = firstAttrs?.staffLinesByStaff[staffNumber] ?? STAFF_LINES;
  const topLineY = -(staffLines - 1);

  let worst: number | undefined;
  const consider = (position: number) => {
    worst =
      worst === undefined
        ? position
        : side === 'south'
          ? Math.max(worst, position)
          : Math.min(worst, position);
  };

  for (const measure of part.measures) {
    for (const voice of measure.voices) {
      for (const event of voice.events) {
        if ((event.staff ?? 1) !== staffNumber) continue;
        if (event.kind === 'note') {
          const p = event.pitch;
          consider(
            p.kind === 'pitched'
              ? staffPositionForPitch(clefDef, p.step, p.octave)
              : staffPositionForPitch(clefDef, p.displayStep, p.displayOctave),
          );
        } else if (event.kind === 'chord') {
          for (const n of event.notes) {
            const p = n.pitch;
            if (p.kind === 'pitched') consider(staffPositionForPitch(clefDef, p.step, p.octave));
          }
        }
      }
    }
  }

  if (worst === undefined) return 0;
  return side === 'south' ? Math.max(0, worst) : Math.max(0, topLineY - worst);
}

/**
 * Phase 43/44 wiring: a measure's REAL, content-driven width and the
 * real x-position of every distinct tick within it -- replacing
 * Phase 21's fixed MEASURE_WIDTH and the old tick-fraction interpolation
 * that used to serve every voice and every staff alike.
 *
 * Built from EVERY voice across EVERY staff of the measure combined
 * (not staff-by-staff): Sec14's spacing is one shared horizontal
 * timeline for the whole measure, and computing it once here is what
 * keeps a bass-staff note aligned under the treble-staff note it
 * sounds with, exactly as the old per-staff-but-tick-identical formula
 * already did.
 */
function computeMeasureLayout(
  measure: Measure,
  measureTicks: number,
): { readonly width: number; readonly positionsByTick: ReadonlyMap<number, number> } {
  const hasAccidentalByTick = new Map<number, boolean>();
  for (const voice of measure.voices) {
    const starts = eventStartTicks(voice.events);
    voice.events.forEach((event, idx) => {
      // Phase 43/44 wiring: a chord needs a spacing entry exactly like a
      // single note does -- it occupies its own attack point on the
      // shared timeline, and its own accidental allowance is whichever
      // of its member notes needs one. A rest also occupies its own
      // attack point (it still needs to be DRAWN somewhere consistent
      // with the rest of the measure's real spacing), just with no
      // accidental to account for. Missing the chord case was a real bug
      // caught by testing: a chord's own tick simply never entered the
      // position map, leaving it (and the note colliding with it) both
      // falling back to the old formula.
      if (event.kind !== 'note' && event.kind !== 'chord' && event.kind !== 'rest') return;
      const tick = starts[idx] ?? 0;
      const hasAccidental =
        event.kind === 'note'
          ? (event.pitch.kind === 'pitched' && event.pitch.alter !== 0) ||
            event.hasExplicitAccidental === true
          : event.kind === 'chord'
            ? event.notes.some(
                (n) =>
                  (n.pitch.kind === 'pitched' && n.pitch.alter !== 0) ||
                  n.hasExplicitAccidental === true,
              )
            : false;
      hasAccidentalByTick.set(tick, (hasAccidentalByTick.get(tick) ?? false) || hasAccidental);
    });
  }

  const ticks = [...hasAccidentalByTick.keys()].sort((a, b) => a - b);
  if (ticks.length === 0) {
    return { width: MEASURE_WIDTH, positionsByTick: new Map() };
  }

  // Sec14's "duration" for spacing purposes, generalized to multiple
  // voices sharing one axis: the gap to the NEXT distinct attack point
  // (or to the measure's own end, for the last one) -- not each note's
  // own written duration, which can differ across simultaneous voices.
  const spacingEvents: SpacingEvent[] = ticks.map((tick, i) => {
    const nextTick = i + 1 < ticks.length ? (ticks[i + 1] ?? measureTicks) : measureTicks;
    const gapTicks = Math.max(1, nextTick - tick);
    const width =
      ESTIMATED_NOTEHEAD_WIDTH +
      (hasAccidentalByTick.get(tick) === true ? ESTIMATED_ACCIDENTAL_ALLOWANCE : 0);
    return { ticks: gapTicks, renderedWidth: width };
  });

  const referenceTicks = computeReferenceDuration(spacingEvents, TICKS_PER_QUARTER);
  const proportional = computeProportionalPositions(spacingEvents, referenceTicks, SPACING_CONFIG);
  const enforced = applyMinimumDistance(proportional, spacingEvents, SPACING_CONFIG);

  const positionsByTick = new Map<number, number>();
  ticks.forEach((tick, i) => {
    positionsByTick.set(tick, enforced[i] ?? 0);
  });

  const lastX = enforced[enforced.length - 1] ?? 0;
  const lastWidth = spacingEvents[spacingEvents.length - 1]?.renderedWidth ?? 0;
  const width = Math.max(
    MEASURE_WIDTH * 0.3,
    MEASURE_HEADER_ALLOWANCE + lastX + lastWidth + MEASURE_TRAILING_MARGIN,
  );

  return { width, positionsByTick };
}
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
    tempoMarks,
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
  // Phase 44 wiring: for every part with a grand staff (2+ staves), the
  // REAL distance each adjacent staff pair needs, using §15's skyline --
  // "worst case" extents (the single highest/lowest note anywhere in
  // that staff, across the whole part) rather than per-x-position
  // tracking, since notes aren't positioned yet at this point in the
  // render (staff Y itself depends on this very computation). A stated
  // approximation: stems/beams/ledger lines aren't added on top of a
  // note's own position, so a very tall stem could still, in principle,
  // reach slightly further than this accounts for.
  const staffDistanceForPair = (partIndex: number, staffIndexInPart: number): number => {
    const part = score.parts[partIndex];
    if (part === undefined) return 8;
    const upperStaffNumber = staffIndexInPart + 1;
    const lowerStaffNumber = staffIndexInPart + 2;
    const upperExtent = worstCaseStaffExtent(part, upperStaffNumber, attributes, 'south');
    const lowerExtent = worstCaseStaffExtent(part, lowerStaffNumber, attributes, 'north');
    const upperSouth = addToSkyline(emptySkyline('south'), { xStart: 0, xEnd: 1, y: upperExtent });
    const lowerNorth = addToSkyline(emptySkyline('north'), { xStart: 0, xEnd: 1, y: lowerExtent });
    return computeStaffDistance(upperSouth, lowerNorth, DEFAULT_STAFF_GAP_FALLBACK);
  };

  const partStaffCounts = score.parts.map((p) => {
    const a = attributes.find((x) => x.partId === p.id);
    return Math.max(1, a?.staves ?? 1);
  });
  const scoreLayout = computeSystemLayoutVariableGaps(partStaffCounts, staffDistanceForPair);
  const staffOffsetFor = (partIndex: number, staffIndexInPart: number): number =>
    scoreLayout.positions.find(
      (pos) => pos.partIndex === partIndex && pos.staffIndexInPart === staffIndexInPart,
    )?.y ?? 0;

  const svgParts: string[] = [];
  let totalWidth = MEASURE_WIDTH;

  score.parts.forEach((part, partIndex) => {
    // Phase 43/44 wiring: each measure's own real, content-driven width
    // and per-tick position map -- computed once per part, up front,
    // replacing naiveMeasureLayout's fixed-width assumption. Needs each
    // measure's own real length (from its own time signature) to give
    // the LAST event reasonable trailing space.
    const measureLayoutsByNumber = new Map<
      number,
      { readonly width: number; readonly positionsByTick: ReadonlyMap<number, number> }
    >();
    let cumulativeX = 0;
    const layouts: {
      readonly measureNumber: number;
      readonly x: number;
      readonly width: number;
    }[] = [];
    for (const measure of part.measures) {
      const attrs = attributes.find(
        (a) => a.partId === part.id && a.measureNumber === measure.number,
      );
      const measureTicks =
        attrs !== undefined
          ? attrs.timeNumerator * (4 / attrs.timeDenominator) * TICKS_PER_QUARTER
          : TICKS_PER_QUARTER * 4;
      const measureLayout = computeMeasureLayout(measure, measureTicks);
      measureLayoutsByNumber.set(measure.number, measureLayout);
      layouts.push({ measureNumber: measure.number, x: cumulativeX, width: measureLayout.width });
      cumulativeX += measureLayout.width;
    }
    const lastLayout = layouts[layouts.length - 1];
    const partWidth = lastLayout !== undefined ? lastLayout.x + lastLayout.width : MEASURE_WIDTH;
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

      // Integration D: draw this measure's own tempo marks ONCE (above the
      // topmost staff, per tempoMarkSide()), never once per staff -- a
      // tempo mark describes the whole system, not one staff of it.
      // Computed directly from staff 1's own known geometry, since the
      // per-staff cursorX/staffGeometry the note-rendering loop below uses
      // aren't in scope yet at this point (each staff computes its own).
      const measureTempoMarks = tempoMarks.filter(
        (m) => m.partId === part.id && m.measureNumber === measure.number,
      );
      if (measureTempoMarks.length > 0) {
        const noteAreaX = layout.x + layout.width * 0.25;
        const noteAreaWidth = layout.width * 0.75;
        const measureTotalTicks =
          attrs.timeNumerator * (4 / attrs.timeDenominator) * TICKS_PER_QUARTER;
        const topStaffLines = attrs.staffLinesByStaff[1] ?? STAFF_LINES;
        const topStaffGeometry = computeStaffGeometry(topStaffLines);
        const topStaffY = STAFF_BOTTOM_Y - topStaffGeometry.height;
        for (const mark of measureTempoMarks) {
          const dotGlyph = mark.beatUnitDots > 0 ? metronomeDotGlyphName() : undefined;
          const eventX = noteAreaX + (mark.tick / (measureTotalTicks || 1)) * noteAreaWidth;
          svgParts.push(
            renderMetronomeMark(
              metronomeNoteGlyphName(mark.beatUnit),
              dotGlyph,
              metronomeEqualsGlyphName(),
              metronomeBpmDigitGlyphNames(mark.perMinute),
              {
                x: eventX,
                // tempoMarkSide() is always 'above' -- placed just clear of
                // the topmost staff's own top line.
                y: topStaffY - 1,
                color: INK_COLOR,
                fontFamily: FONT_FAMILY,
                noteToEqualsGap: 0.6,
              },
            ),
          );
        }
      }

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
          // Phase 43/44 wiring: the header allowance every measure reserves
          // (see computeMeasureLayout), not a fraction of this measure's
          // own (now content-driven, no longer fixed) width.
          const noteAreaX = Math.max(layout.x + MEASURE_HEADER_ALLOWANCE, cursorX);
          const measureLayout = measureLayoutsByNumber.get(measure.number);
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
            // Phase 43/44 wiring: a real, content-driven position for every
            // tick that has an event ANYWHERE in the measure (computed once,
            // shared across every voice and staff of this measure -- see
            // computeMeasureLayout). Falls back to the old tick-fraction
            // formula only if this measure had no notes at all to build a
            // real map from (computeMeasureLayout's own empty-measure case).
            const fallbackNoteAreaWidth = layout.x + layout.width - noteAreaX;
            const eventXs = voice.events.map((_, idx) => {
              const startTick = starts[idx] ?? 0;
              const realX = measureLayout?.positionsByTick.get(startTick);
              return realX !== undefined
                ? noteAreaX + realX
                : noteAreaX + (startTick / total) * fallbackNoteAreaWidth;
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
          const noteAreaX = Math.max(layout.x + MEASURE_HEADER_ALLOWANCE, cursorX);
          const fallbackNoteAreaWidth = layout.x + layout.width - noteAreaX;
          const measureLayout = measureLayoutsByNumber.get(measure.number);

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

              const startTick = starts[idx] ?? 0;
              const realX = measureLayout?.positionsByTick.get(startTick);
              const eventX =
                realX !== undefined
                  ? noteAreaX + realX
                  : noteAreaX + (startTick / total) * fallbackNoteAreaWidth;
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
