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
  renderNotehead,
  renderRest,
  renderStaff,
  renderStem,
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
}

/** Draws a note's accidental (if needed)/notehead/ledger-lines only -- no stem, no flag. Shared by both the plain (unbeamed) path and the beam-group path, which differ only in how the stem/flag (or beam) gets drawn afterward. */
function renderNoteheadPart(
  note: Note,
  x: number,
  ctx: RenderCtx,
  accidentalState: AccidentalState,
): { svg: string; position: number; noteheadGlyph: string; newAccidentalState: AccidentalState } {
  const parts: string[] = [];

  // Percussion: <unpitched>'s display-step/display-octave ARE a staff
  // position, so they go through the same staffPositionForPitch as a real
  // pitch -- but an unpitched note can never carry an accidental (there's
  // no pitch to alter), so the whole accidental branch is skipped rather
  // than special-cased inside it.
  const isUnpitched = note.pitch.kind === 'unpitched';
  const step = isUnpitched ? note.pitch.displayStep : note.pitch.step;
  const octave = isUnpitched ? note.pitch.displayOctave : note.pitch.octave;
  const position = staffPositionForPitch(ctx.clefDef, step, octave);
  const y = ctx.measureBottomY + position;

  let state = accidentalState;
  if (note.pitch.kind === 'pitched') {
    const decision = evaluateAccidental(
      accidentalState,
      note.pitch.step,
      note.pitch.octave,
      note.pitch.alter,
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

  return { svg: parts.join('\n'), position, noteheadGlyph, newAccidentalState: state };
}

function renderNoteOrRest(
  ev: Note | Rest,
  x: number,
  ctx: RenderCtx,
  accidentalState: AccidentalState,
  forcedDirection: StemDirection | undefined,
  restOffset: number,
): { svg: string; newAccidentalState: AccidentalState } {
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

  const parts: string[] = [];
  const head = renderNoteheadPart(ev, x, ctx, accidentalState);
  parts.push(head.svg);
  const y = ctx.measureBottomY + head.position;

  if (ev.duration.type !== 'whole') {
    // §9.14: voice-forced direction (when multiple voices share the staff)
    // wins over automatic placement -- "upper up, lower down, always" --
    // reusing Phase 16's own priority chain rather than hand-rolling it.
    const direction = resolveStemDirection({
      positions: [head.position],
      numLines: STAFF_LINES,
      ...(forcedDirection !== undefined ? { forcedDirection } : {}),
    });
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

  return { svg: parts.join('\n'), newAccidentalState: head.newAccidentalState };
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
 * SVG string out. Deliberately naive (fixed-width measures via
 * layout/naive.ts, no beaming, no multi-voice collision avoidance, only
 * the FIRST part is rendered) -- see PLAN.md §22's sequencing note that
 * this phase "exists to be thrown away" once Stage 8's real layout lands.
 */
export function renderFromMusicXml(
  xmlText: string,
  options?: RenderFromMusicXmlOptions,
): RenderFromMusicXmlResult {
  const { score, attributes, diagnostics: parseDiagnostics } = parseMusicXml(xmlText, options);
  const diagnostics: Diagnostic[] = [...parseDiagnostics];

  const part = score.parts[0];
  if (part === undefined) {
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

  const layouts = naiveMeasureLayout(part.measures.length, MEASURE_WIDTH);
  const lastLayout = layouts[layouts.length - 1];
  const totalWidth = lastLayout !== undefined ? lastLayout.x + MEASURE_WIDTH : MEASURE_WIDTH;

  const svgParts: string[] = [];
  const staffGeometry = computeStaffGeometry(STAFF_LINES);

  let accidentalState: AccidentalState | undefined;
  let previousAttrs: MeasureAttributes | undefined;

  part.measures.forEach((measure, i) => {
    const attrs = attributes.find(
      (a) => a.partId === part.id && a.measureNumber === measure.number,
    );
    const layout = layouts[i];
    if (attrs === undefined || layout === undefined) return;

    const { clefDef, keySigClefName } = mapClef(attrs.clefSign, attrs.clefLine);
    const bottomY = STAFF_BOTTOM_Y;

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
        renderClef(clefDef, { x: cursorX, y: bottomY, color: INK_COLOR, fontFamily: FONT_FAMILY }),
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

    if (accidentalState === undefined || keyChanged) {
      accidentalState = createAccidentalState(attrs.fifths);
    } else {
      accidentalState = resetMeasure(accidentalState);
    }

    if (clefDef.positionsByPitch) {
      const ctx: RenderCtx = { clefDef, measureBottomY: bottomY };
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
        const starts = eventStartTicks(voice.events);
        const total = totalTicks(voice.events) || 1;
        const eventXs = voice.events.map((_, idx) => {
          const startTick = starts[idx] ?? 0;
          return noteAreaX + (startTick / total) * noteAreaWidth;
        });

        // Phase 23 grouping: treat a rest OR a chord as breaking a beamable
        // run (chords sharing a beam aren't supported by renderBeamGroup
        // yet, which only draws individual noteheads -- documented scope
        // limit, not silently wrong).
        const beamableEvents = voice.events.map((event) => ({
          durationType: event.duration.type,
          isRest: event.kind !== 'note',
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
          if (accidentalState === undefined) return;
          const eventX = eventXs[idx] ?? 0;

          if (beamedIndices.has(idx)) {
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
            const { svg, newAccidentalState } = renderNoteOrRest(
              event,
              eventX,
              ctx,
              accidentalState,
              forcedDirection,
              restOffset,
            );
            svgParts.push(svg);
            accidentalState = newAccidentalState;
          }
        });
      }
    } else {
      diagnostics.push({
        severity: 'info',
        code: 'UNSUPPORTED_CLEF_FOR_NOTES',
        message: `Clef "${attrs.clefSign}" does not position notes by pitch; skipping notes in this measure.`,
        location: { partId: part.id, measureNumber: measure.number },
      });
    }

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
    svgParts.push(
      renderBarline(barlineGeometry, {
        x: layout.x + layout.width,
        staffBottomY: bottomY,
        height: staffGeometry.height,
        color: INK_COLOR,
        fontFamily: FONT_FAMILY,
      }),
    );

    previousAttrs = attrs;
  });

  const svg = createSvgDocument(
    {
      viewBoxWidth: totalWidth + 2,
      viewBoxHeight: SYSTEM_HEIGHT,
      pxPerStaffSpace: PX_PER_STAFF_SPACE,
      backgroundColor: BACKGROUND_COLOR,
    },
    svgParts,
  );

  return { svg, diagnostics };
}
