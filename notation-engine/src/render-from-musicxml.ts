import type { Chord, Measure, MeasureEvent, Note, Rest } from './core/index.js';
import type { DurationType } from './core/duration.js';
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
  articulationGlyphName,
  articulationSide,
  beamedEventIndices,
  groupBeams,
  groupBeamsFromHints,
  hasExplicitBeams,
  ornamentGlyphName,
  computeSlurShape,
  slurSide,
  computeTupletBracketShape,
  tupletBracketNeeded,
  tupletDigitGlyphName,
  tupletSide,
  computeHairpinShape,
  dynamicGlyphName,
  dynamicSide,
  keySignatureAccidentals,
  middleLineY,
  needsFlag,
  numBeamLines,
  resolveStemDirection,
  computeTieShape,
  tieSide,
  resolveNoteheadCollision,
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
  computeScrollLayout,
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
import { renderMetronomeMark, metronomeMarkWidth } from './render/metronome.js';
import { TICKS_PER_QUARTER } from './core/duration-math.js';
import { renderTabNumber } from './render/index.js';
import { computeBraceShape, needsBrace, needsContinuousBarline } from './geometry/index.js';
import { renderBrace } from './render/index.js';
import type { Diagnostic, MeasureAttributes } from './parser/index.js';
import { parseMusicXml, type ParseMusicXmlOptions } from './parser/index.js';
import { resolveConfig, DEFAULT_CONFIG, type PartialEngineConfig } from './config/index.js';
import { computePageLayout, type PageMeasureInput } from './layout/index.js';
import { measure as makeMeasure } from './core/index.js';
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
  renderHairpin,
  renderRest,
  renderSlur,
  renderStaff,
  renderStem,
  renderTie,
  renderTupletBracket,
  renderTupletNumber,
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
// config/config.ts's own SpacingConfig defaults, EXCEPT `justify` --
// see the note on `pageSpacingConfig` in renderFromMusicXml for why a
// scroll system is never justified while a page system is. These are
// the WITHIN-measure spacing constants; Integration L's `config.spacing`
// option feeds the between-measure justification instead.
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
 *
 * 6.0, not 4.0: empirically checked against the real cursorX a clef +
 * a 4/4 time signature actually advances to (confirmed identically for
 * both a treble clef and a percussion clef -- both real first notes
 * land at x=6 given layout.x=0). The original 4.0 undershot this,
 * which was invisible for ordinary notes (their own noteAreaX already
 * takes `Math.max(this allowance, the real cursorX)`, so undershooting
 * just meant cursorX won silently) but became a real, visible bug for
 * a tempo mark on a measure that DOES draw this header: the tempo
 * mark's own x used this allowance directly, with no cursorX to fall
 * back on, landing noticeably left of where the first note actually
 * starts.
 */
const MEASURE_HEADER_ALLOWANCE = 6.0;

/** Phase 29's own default, kept as this wiring's fallback floor. `config.staves.minStaffDistance` is not read yet -- one of the sections Phase 50 (§8, Stage 10) still has to unify; see Doc/STATUS.md §C2. */
const DEFAULT_STAFF_GAP_FALLBACK = 8;

/**
 * Integration M: a tempo mark is drawn ABOVE the staff (§9.21), but "above
 * the staff" is not the same as "above the staff's top LINE" -- stems,
 * beams and flags get there first. Integration D placed the mark a fixed
 * 2.5sp above the top line, which on any chart whose notes sit high (a
 * drum chart's hi-hat line is the top line) put it straight through the
 * beams. These are the clearances measured from the real content instead.
 */
const TEMPO_MARK_GAP = 1.5;
/** The metNote* glyphs are tall (the stem reaches well above the anchor), so the mark needs this much room above its own baseline. */
const TEMPO_MARK_HEIGHT = 2.0;
/** Added to a note's own position when estimating how high its stem and beam can reach: DEFAULT_UNBEAMED_STEM_LENGTH (declared below, next to the other stem constants) plus one beam's thickness. */
const STEM_AND_BEAM_ALLOWANCE = 3.5 + 0.5;

/**
 * §9.19/§9.20 specify each mark's SIDE, not its distance -- no source
 * gives one universal number, exactly as Phase 24's beam-slope cap and
 * Phase 31's hairpin spread already found. These are chosen, consistent
 * values: one staff space from the notehead to the first articulation
 * (and between stacked ones), and a slightly larger gap for ornaments,
 * which sit clear of the staff rather than next to the notehead.
 */
const ARTICULATION_GAP = 1.0;
const ORNAMENT_GAP = 1.5;

/**
 * Integration I: how far a slur's endpoints and a tuplet's bracket sit
 * from the noteheads they span. Chosen values for the same reason as the
 * two gaps above -- §9.16 and §9.17 specify the SIDE and the shape, not a
 * distance, and no source gives one universal number.
 */
const SLUR_GAP = 1.2;
const TUPLET_GAP = 1.8;
const SLUR_MIDPOINT_THICKNESS_FALLBACK = 0.22;
const TUPLET_BRACKET_THICKNESS_FALLBACK = 0.16;

/**
 * Integration J: how far a dynamic or hairpin sits from the staff it
 * belongs to. §9.21 specifies the SIDE ("below the staff by default")
 * and the shapes, not a distance -- another chosen value, matching the
 * gaps above. Measured from the staff's own near line, so an "above"
 * mark clears the top line by the same amount a "below" one clears the
 * bottom.
 */
const DYNAMIC_GAP = 2.5;
const HAIRPIN_THICKNESS_FALLBACK = 0.16;

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
/**
 * One note's staff position from its pitch OR its unpitched display
 * position -- the two are the same kind of answer (§4.3's invariant: no
 * code path branches on "is this a drum"), and every caller must treat
 * them identically.
 *
 * Extracted because `worstCaseStaffExtent` below handled unpitched notes
 * in its single-note branch but silently SKIPPED them in its chord
 * branch. A drum chart legitimately writes kick+hi-hat as one chord, so
 * on a multi-staff percussion part every chord contributed nothing to
 * §15's staff-distance estimate, understating the gap the staves need.
 */
function staffPositionOfNote(note: Note, clefDef: ClefDefinition): number {
  const p = note.pitch;
  return p.kind === 'pitched'
    ? staffPositionForPitch(clefDef, p.step, p.octave)
    : staffPositionForPitch(clefDef, p.displayStep, p.displayOctave);
}

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
          consider(staffPositionOfNote(event, clefDef));
        } else if (event.kind === 'chord') {
          for (const n of event.notes) {
            consider(staffPositionOfNote(n, clefDef));
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
  measureTempoMarks: readonly {
    readonly beatUnit: string;
    readonly beatUnitDots: number;
    readonly perMinute: number;
  }[],
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

  // Phase 43/44 wiring: a measure holding a tempo mark must be wide
  // enough for it -- the notes' own widths alone don't guarantee this
  // (a narrow pickup measure with only a rest is not wide enough to
  // hold "quarter = 120" without the mark visually overrunning the
  // barline that follows it).
  const tempoMarkMinWidth = measureTempoMarks.reduce((max, tm) => {
    const dotGlyph = tm.beatUnitDots > 0 ? metronomeDotGlyphName() : undefined;
    const markWidth = metronomeMarkWidth(
      metronomeNoteGlyphName(tm.beatUnit as DurationType),
      dotGlyph,
      metronomeEqualsGlyphName(),
      metronomeBpmDigitGlyphNames(tm.perMinute),
      1.0,
    );
    return Math.max(max, MEASURE_HEADER_ALLOWANCE + markWidth + MEASURE_TRAILING_MARGIN);
  }, 0);

  if (ticks.length === 0) {
    return { width: Math.max(MEASURE_WIDTH, tempoMarkMinWidth), positionsByTick: new Map() };
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
    tempoMarkMinWidth,
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

export interface RenderFromMusicXmlOptions extends ParseMusicXmlOptions {
  /**
   * Integration L/§16.2: the engine config. Only the sections this
   * renderer actually reads are honoured today -- `layout.mode`
   * ('scroll' vs 'page'), `page` (page geometry), and `spacing`.
   * Everything else (colours, fonts, bar numbers, ...) is still the
   * hardcoded constant it was; unifying ALL of them is Phase 50's own
   * job (§8, Stage 10), and pretending otherwise here would be worse
   * than saying so.
   */
  readonly config?: PartialEngineConfig;
}

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

/**
 * Integration H: draws a note's §9.19 articulations and §9.20 ornaments.
 *
 * Placement follows each section's own rule exactly, and they are
 * genuinely different rules -- which is why this cannot be one shared
 * loop over "marks near a note":
 *
 * - An articulation goes on the NOTEHEAD side (opposite the stem), next
 *   to the notehead itself. `articulationSide` decides which side.
 * - Marcato is §9.19's one named exception: "always placed above the
 *   staff", so it uses the above-the-staff cursor rather than the
 *   notehead one, regardless of stem direction.
 * - An ornament is ALWAYS above, unconditionally (§9.20 is explicit that
 *   this is not the articulation rule reused), and sits above the staff.
 *
 * Marcato and ornaments share one above-the-staff cursor so a note
 * carrying both does not draw them on top of each other.
 *
 * `topPosition`/`bottomPosition` are the highest and lowest noteheads of
 * the event -- identical for a single note, the chord's outer notes for a
 * chord, so a chord's marks clear every member rather than just the first.
 *
 * Known limitation (§9.19's own): the multi-voice exception, where marks
 * move to the STEM side to keep each voice's marks unambiguous, is not
 * implemented -- this is the single-voice default only.
 */
function renderNoteMarks(
  source: Note,
  x: number,
  topPosition: number,
  bottomPosition: number,
  direction: StemDirection,
  ctx: RenderCtx,
): string {
  const articulations = source.articulations ?? [];
  const ornaments = source.ornaments ?? [];
  if (articulations.length === 0 && ornaments.length === 0) return '';

  const parts: string[] = [];
  const topLine = -(STAFF_LINES - 1);
  // Staff-position units: more negative is higher up the page.
  let aboveStaff = Math.min(topPosition, topLine);
  let aboveNote = topPosition;
  let belowNote = bottomPosition;

  const place = (glyphName: string, position: number): void => {
    parts.push(
      renderMark(glyphName, {
        x,
        y: ctx.measureBottomY + position,
        color: INK_COLOR,
        fontFamily: FONT_FAMILY,
      }),
    );
  };

  for (const type of articulations) {
    const side = articulationSide(type, direction);
    if (type === 'marcato') {
      aboveStaff -= ARTICULATION_GAP;
      place(articulationGlyphName(type, side), aboveStaff);
    } else if (side === 'above') {
      aboveNote -= ARTICULATION_GAP;
      place(articulationGlyphName(type, side), aboveNote);
    } else {
      belowNote += ARTICULATION_GAP;
      place(articulationGlyphName(type, side), belowNote);
    }
  }

  for (const type of ornaments) {
    aboveStaff -= ORNAMENT_GAP;
    place(ornamentGlyphName(type), aboveStaff);
  }

  return parts.join('\n');
}

/**
 * Integration I: everything a SPAN (a slur, §9.16; a tuplet, §9.17) needs
 * to know about one already-drawn event, captured as that event renders
 * so the span pass never re-derives geometry a second, possibly
 * disagreeing way. `topPosition`/`bottomPosition` differ only for a
 * chord; for a single note they are the same value.
 */
interface EventAnchor {
  readonly x: number;
  readonly topPosition: number;
  readonly bottomPosition: number;
  readonly direction: StemDirection;
  readonly noteheadGlyph: string;
}

interface RenderCtx {
  readonly clefDef: ClefDefinition;
  readonly measureBottomY: number;
  /** Phase 41: this part's own <instrument id="..."> -> GM note number map (from Phase 35's parsed <midi-instrument> data), if any. Lets an unpitched note with a known GM number use the real drum mapping table instead of only its file-supplied display-step/octave. */
  readonly midiInstrumentsByPart: ReadonlyMap<string, number> | undefined;
}

/**
 * Where a note's notehead goes and which glyph draws it -- the two facts
 * that must be identical everywhere they are needed.
 *
 * Extracted so §9.14's collision pass (Integration K) computes them with
 * the EXACT code that draws them, rather than a second implementation
 * that could disagree. A drum note's GM-mapped staff position is the
 * case that makes this matter: re-deriving it from display-step/octave
 * would place the collision check on a different line than the notehead
 * actually lands on.
 */
function resolveNoteRendering(
  note: Note,
  ctx: RenderCtx,
): { position: number; noteheadGlyph: string; drumStemDirection?: StemDirection } {
  const isUnpitched = note.pitch.kind === 'unpitched';
  const step = isUnpitched ? note.pitch.displayStep : note.pitch.step;
  const octave = isUnpitched ? note.pitch.displayOctave : note.pitch.octave;

  // Phase 41/§13.3: an unpitched note whose <instrument id> resolves to a
  // known GM percussion note (via Phase 35's parsed <midi-instrument> map)
  // uses the real drum mapping table's own staff position -- GM numbers
  // are unambiguous (§13.1's own authority rule for "which drum sound"),
  // while a file's own display-step/octave is only ever a rendering hint.
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

  const noteheadGlyph = selectNoteheadGlyphName({
    pitch: note.pitch,
    durationType: note.duration.type,
    ...(note.explicitNotehead !== undefined ? { explicitNotehead: note.explicitNotehead } : {}),
    ...(gmNote !== undefined && drumEntry !== undefined
      ? { midiNote: gmNote, overridesByKey: { [String(gmNote)]: drumEntry.noteheadShape } }
      : {}),
  });

  return {
    position,
    noteheadGlyph,
    ...(drumEntry?.stemDirection !== undefined
      ? { drumStemDirection: drumEntry.stemDirection }
      : {}),
  };
}

/**
 * Integration M: how far above `staffNumber`'s own top line this measure's
 * content reaches, in staff spaces (never negative).
 *
 * A deliberate over-estimate: every note is treated as though it carried
 * an up stem and a beam, because the cheap alternative -- working out each
 * note's real stem direction here -- would duplicate resolveStemDirection's
 * whole priority chain in a second place. Over-clearing a tempo mark by a
 * staff space is invisible; colliding with a beam is not.
 */
function measureNorthExtent(measure: Measure, staffNumber: number, ctx: RenderCtx): number {
  const topLineY = -(STAFF_LINES - 1);
  let highest: number | undefined;
  const consider = (position: number): void => {
    const reach = position - STEM_AND_BEAM_ALLOWANCE;
    highest = highest === undefined ? reach : Math.min(highest, reach);
  };
  for (const voice of measure.voices) {
    for (const event of voice.events) {
      if ((event.staff ?? 1) !== staffNumber) continue;
      if (event.kind === 'note') consider(resolveNoteRendering(event, ctx).position);
      else if (event.kind === 'chord') {
        for (const n of event.notes) consider(resolveNoteRendering(n, ctx).position);
      }
    }
  }
  if (highest === undefined) return 0;
  return Math.max(0, topLineY - highest);
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
  // position -- but an unpitched note can never carry an accidental
  // (there's no pitch to alter), so the whole accidental branch below is
  // skipped rather than special-cased inside it. The position and glyph
  // themselves come from resolveNoteRendering, shared with §9.14's
  // collision pass so the two can never disagree.
  const { position, noteheadGlyph, drumStemDirection } = resolveNoteRendering(note, ctx);
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
    ...(drumStemDirection !== undefined ? { drumStemDirection } : {}),
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
    const length = computeStemLength(head.position, middleLineY(STAFF_LINES), direction);
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

  // Integration H: §9.19/§9.20 marks. Pushed only when there ARE marks --
  // an unconditional push of an empty string would add a stray blank line
  // to every note's output and invalidate every existing snapshot.
  const marks = renderNoteMarks(ev, x, head.position, head.position, direction, ctx);
  if (marks !== '') parts.push(marks);

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
  events: readonly (Note | Chord)[],
  xs: readonly number[],
  ctx: RenderCtx,
  accidentalState: AccidentalState,
  beamStyle: BeamStyleOption,
  forcedDirection: StemDirection | undefined,
): {
  svg: string;
  newAccidentalState: AccidentalState;
  /** Integration I: one anchor per member event, in the same order as `events`. */
  anchors: readonly EventAnchor[];
} {
  const parts: string[] = [];
  let state = accidentalState;

  /**
   * One member of the beam group. A plain note has a single notehead, so
   * all three positions coincide; a CHORD has several, and the stem and
   * the beam attach to different ones -- which is the whole reason this
   * intermediate shape exists.
   */
  interface BeamMember {
    readonly x: number;
    readonly positions: readonly number[];
    /** The widest notehead, whose anchor the stem is measured from. */
    readonly glyph: string;
    readonly source: Note | Chord;
  }

  const members: BeamMember[] = [];
  events.forEach((event, i) => {
    const x = xs[i];
    if (x === undefined) return;
    if (event.kind === 'chord') {
      // Integration M: a chord in a beam group. Drum charts are built
      // from these (hi-hat + snare struck together), so excluding them
      // left a stray flag on every beamed chord -- 62 of them on this
      // project's own drum fixture, one for every chord the file beams.
      const heads = renderChordHeadsPart(event, x, ctx, state);
      parts.push(heads.svg);
      state = heads.newAccidentalState;
      members.push({ x, positions: heads.positions, glyph: heads.widestGlyph, source: event });
    } else {
      const head = renderNoteheadPart(event, x, ctx, state);
      parts.push(head.svg);
      state = head.newAccidentalState;
      members.push({ x, positions: [head.position], glyph: head.noteheadGlyph, source: event });
    }
  });

  const middle = middleLineY(STAFF_LINES);
  // Every notehead in the group votes on the shared direction (§9.13),
  // not just one per event -- a chord's own spread is exactly the kind of
  // thing that decides which way a beam should go.
  const allPositions = members.flatMap((m) => [...m.positions]);
  const direction = forcedDirection ?? beamDirection(allPositions, middle);

  /** The notehead nearest the beam: the beam must clear it. */
  const beamPositionOf = (m: BeamMember): number =>
    direction === 'up' ? Math.min(...m.positions) : Math.max(...m.positions);
  /** The notehead the stem attaches to: the far end of the chord from the beam. */
  const attachPositionOf = (m: BeamMember): number =>
    direction === 'up' ? Math.max(...m.positions) : Math.min(...m.positions);

  const beamPositions = members.map(beamPositionOf);
  const naturalLength = Math.max(
    DEFAULT_UNBEAMED_STEM_LENGTH,
    ...beamPositions.map((p) => computeStemLength(p, middle, direction)),
  );
  const anchorName = direction === 'up' ? 'stemUpSE' : 'stemDownNW';
  // Integration P: the beam's own endpoints must land where the stems
  // actually attach (the notehead's own stem-side corner -- e.g. an X
  // notehead's stemUpSE anchor sits 1.16sp to the right of its origin),
  // not at each notehead's raw, unadjusted x. Using the raw x here made
  // the beam fall short of (or overshoot) the actual stem by that same
  // anchor offset -- harmless as overshoot at the group's first note, but
  // at the last note it left the beam ending before the stem it was
  // supposed to meet, so the group's final stem appeared to float,
  // disconnected from the beam, with no flag either (a genuinely
  // different defect from Integration O's stem-length fix, and the one
  // the user's own reference-image comparison was actually showing).
  const stemXs = members.map((m) => {
    const anchor = getGlyph(m.glyph)?.anchors?.[anchorName];
    return m.x + (anchor?.[0] ?? 0);
  });
  const shape = computeBeamShape(beamPositions, stemXs, direction, beamStyle, naturalLength);

  members.forEach((m, i) => {
    const attachPosition = attachPositionOf(m);
    const y = ctx.measureBottomY + attachPosition;
    const stemX = stemXs[i] ?? m.x;
    const beamY = ctx.measureBottomY + beamYAtX(shape, stemX);
    const anchor = getGlyph(m.glyph)?.anchors?.[anchorName];
    if (anchor === undefined) return;
    parts.push(
      renderStem({
        noteheadGlyphName: m.glyph,
        noteX: m.x,
        noteY: y,
        direction,
        // renderStem draws from the notehead anchor a fixed `length` in
        // `direction` -- passing the exact distance to the beam's own Y
        // makes the stem tip land precisely on the (possibly sloped)
        // beam. Measured from the ATTACH notehead, so a chord's stem
        // spans the whole chord and still ends exactly on the beam.
        length: Math.abs(beamY - (y - anchor[1])),
        thickness: getEngravingDefault('stemThickness') ?? STEM_THICKNESS_FALLBACK,
        color: INK_COLOR,
      }),
    );
  });

  // Integration H: a beamed event carries its own §9.19/§9.20 marks, using
  // the beam's own shared stem direction (§9.13) rather than re-deriving
  // a per-note one, so every mark in the group sits on the same side. A
  // chord's marks live on its FIRST note, as MusicXML writes them.
  for (const m of members) {
    const markSource = m.source.kind === 'chord' ? m.source.notes[0] : m.source;
    if (markSource === undefined) continue;
    const marks = renderNoteMarks(
      markSource,
      m.x,
      Math.min(...m.positions),
      Math.max(...m.positions),
      direction,
      ctx,
    );
    if (marks !== '') parts.push(marks);
  }

  const anchors: EventAnchor[] = members.map((m) => ({
    x: m.x,
    topPosition: Math.min(...m.positions),
    bottomPosition: Math.max(...m.positions),
    direction,
    noteheadGlyph: m.glyph,
  }));

  // §9.13's documented simplification: line count is the MAX across every
  // event in the group (whichever duration needs the most beam lines --
  // the finest subdivision present), not just the first one's own
  // duration. A group like [eighth, 16th, 16th] needs 2 lines throughout,
  // not 1.
  const lineCount = Math.max(1, ...events.map((e) => numBeamLines(e.duration.type)));
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

  return { svg: parts.join('\n'), newAccidentalState: state, anchors };
}

/**
 * Draws a chord's accidentals, noteheads and ledger lines -- everything
 * except the stem. The chord-shaped counterpart of `renderNoteheadPart`,
 * and extracted for exactly the same reason: both `renderChord` (which
 * adds its own stem) and `renderBeamGroup` (whose stems reach a shared
 * beam) need these heads drawn identically.
 */
function renderChordHeadsPart(
  chord: Chord,
  x: number,
  ctx: RenderCtx,
  accidentalState: AccidentalState,
): {
  svg: string;
  positions: readonly number[];
  glyphs: readonly string[];
  widestGlyph: string;
  newAccidentalState: AccidentalState;
} {
  const parts: string[] = [];
  // Chord members may be pitched OR unpitched (a drum chart legitimately
  // writes e.g. kick+hi-hat as a simultaneous group). Both go through the
  // same resolveNoteRendering -- an unpitched note's display-step/octave
  // IS its staff position. Only pitched members can carry an accidental.
  const resolved = chord.notes.map((n) => resolveNoteRendering(n, ctx));
  const positions = resolved.map((r) => r.position);

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
  const glyphs: string[] = [];
  resolved.forEach((r, i) => {
    const glyphName = r.noteheadGlyph;
    glyphs.push(glyphName);
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

  return {
    svg: parts.join('\n'),
    positions,
    glyphs,
    widestGlyph: widestGlyph ?? 'noteheadBlack',
    newAccidentalState: state,
  };
}

function renderChord(
  chord: Chord,
  x: number,
  ctx: RenderCtx,
  accidentalState: AccidentalState,
  forcedDirection: StemDirection | undefined,
): { svg: string; newAccidentalState: AccidentalState; anchor?: EventAnchor } {
  const heads = renderChordHeadsPart(chord, x, ctx, accidentalState);
  const parts: string[] = [heads.svg];
  const positions = heads.positions;

  if (positions.length > 0) {
    const direction =
      forcedDirection ?? chordStemDirection([...positions], middleLineY(STAFF_LINES));
    if (chord.duration.type !== 'whole') {
      const outermost = direction === 'up' ? Math.max(...positions) : Math.min(...positions);
      const length = computeStemLength(outermost, middleLineY(STAFF_LINES), direction);
      parts.push(
        renderStem({
          noteheadGlyphName: heads.widestGlyph,
          noteX: x,
          noteY: ctx.measureBottomY + outermost,
          direction,
          length,
          thickness: getEngravingDefault('stemThickness') ?? STEM_THICKNESS_FALLBACK,
          color: INK_COLOR,
        }),
      );
    }
    // Integration H: MusicXML attaches a chord's <notations> to its FIRST
    // <note> (the others carry only <chord/>), so that note's marks are
    // the chord's marks. They clear the chord's OUTER noteheads, not just
    // the first one's own position.
    const firstNote = chord.notes[0];
    if (firstNote !== undefined) {
      const marks = renderNoteMarks(
        firstNote,
        x,
        Math.min(...positions),
        Math.max(...positions),
        direction,
        ctx,
      );
      if (marks !== '') parts.push(marks);
    }
    return {
      svg: parts.join('\n'),
      newAccidentalState: heads.newAccidentalState,
      anchor: {
        x,
        topPosition: Math.min(...positions),
        bottomPosition: Math.max(...positions),
        direction,
        noteheadGlyph: heads.widestGlyph,
      },
    };
  }

  return { svg: parts.join('\n'), newAccidentalState: heads.newAccidentalState };
}

/**
 * Integration K/§9.14: how far each voice's noteheads must shift right at
 * each tick so two voices sharing a staff never render as an ambiguous
 * smear. The key is `voiceId:tick`; an absent key means no shift.
 *
 * §9.14 owns the rule itself (`resolveNoteheadCollision`); this only
 * feeds it real note positions and collects the answers. Positions come
 * from `resolveNoteRendering`, the same function that draws them, so a
 * drum note's GM-mapped line is the line actually tested.
 *
 * Known limitation, exactly as §9.14 states it: only PAIRWISE comparison
 * is specified, so a genuine 3-or-4-voice pile-up where a middle voice is
 * squeezed from both sides is not solved -- each pair is resolved
 * independently and the largest resulting shift wins for that voice.
 */
function computeVoiceCollisionOffsets(
  measure: Measure,
  staffNumber: number,
  ctx: RenderCtx,
): ReadonlyMap<string, number> {
  const offsets = new Map<string, number>();

  /** One notehead's staff position, with the voice and tick it belongs to. */
  const entries: { voiceId: number; tick: number; position: number; width: number }[] = [];
  for (const voice of measure.voices) {
    const starts = eventStartTicks(voice.events);
    voice.events.forEach((event, idx) => {
      if ((event.staff ?? 1) !== staffNumber) return;
      const tick = starts[idx] ?? 0;
      const notes = event.kind === 'note' ? [event] : event.kind === 'chord' ? event.notes : [];
      for (const note of notes) {
        if (note.isGrace === true) continue; // a grace note is a precomposed glyph, not a notehead to offset
        const { position, noteheadGlyph } = resolveNoteRendering(note, ctx);
        entries.push({
          voiceId: voice.id,
          tick,
          position,
          width: noteheadWidth(noteheadGlyph),
        });
      }
    });
  }

  const distinctVoices = new Set(entries.map((e) => e.voiceId));
  if (distinctVoices.size < 2) return offsets;

  const record = (voiceId: number, tick: number, offset: number): void => {
    if (offset === 0) return;
    const key = `${voiceId}:${tick}`;
    offsets.set(key, Math.max(offsets.get(key) ?? 0, offset));
  };

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];
      if (a === undefined || b === undefined) continue;
      if (a.tick !== b.tick || a.voiceId === b.voiceId) continue;
      // §9.14 moves the HIGHER-numbered voice, so that note's own width
      // is the shift distance.
      const movingWidth = a.voiceId > b.voiceId ? a.width : b.width;
      const { offsetA, offsetB } = resolveNoteheadCollision(
        a.position,
        a.voiceId,
        b.position,
        b.voiceId,
        movingWidth,
      );
      record(a.voiceId, a.tick, offsetA);
      record(b.voiceId, b.tick, offsetB);
    }
  }

  return offsets;
}

/**
 * The `<notations>`-carrying note of an event: a plain Note is itself;
 * a Chord's notations live on its FIRST note, which is where MusicXML
 * puts them (the rest carry only `<chord/>`). A Rest carries none of the
 * span notations this function's callers care about.
 */
function spanSourceNote(event: MeasureEvent): Note | undefined {
  if (event.kind === 'note') return event;
  if (event.kind === 'chord') return event.notes[0];
  return undefined;
}

/**
 * Integration I: draws one voice's SPANS -- §9.16 slurs and §9.17 tuplets
 * -- after every event in that voice has been drawn and has contributed
 * its `EventAnchor`.
 *
 * A span is deliberately a second pass rather than something the
 * event-drawing loop does inline: both endpoints must already be placed
 * before either can be drawn, and a slur legitimately spans beamed notes,
 * chords and plain notes alike, which are three different drawing paths.
 * Collecting anchors once and resolving spans here is what lets all three
 * participate without each path knowing about spans at all.
 *
 * Scope, stated rather than implied: a span is resolved only WITHIN one
 * voice of one measure. A slur or tuplet that crosses a barline is left
 * undrawn with a diagnostic -- the same honest boundary Phase 26's ties
 * already draw at, and for the same reason (nothing here can see the next
 * measure's x positions).
 */
function renderSpans(
  events: readonly MeasureEvent[],
  anchorByIndex: ReadonlyMap<number, EventAnchor>,
  beamedIndices: ReadonlySet<number>,
  ctx: RenderCtx,
  onDiagnostic: (code: string, message: string) => void,
): string {
  const parts: string[] = [];

  const spanAnchors = (startIdx: number, endIdx: number): EventAnchor[] => {
    const out: EventAnchor[] = [];
    for (let i = startIdx; i <= endIdx; i++) {
      const anchor = anchorByIndex.get(i);
      if (anchor !== undefined) out.push(anchor);
    }
    return out;
  };

  // ---- §9.16 slurs ----------------------------------------------------
  const openSlurs = new Map<number, number>();
  events.forEach((event, idx) => {
    const note = spanSourceNote(event);
    if (note === undefined) return;

    for (const number of note.slurStops ?? []) {
      const startIdx = openSlurs.get(number);
      if (startIdx === undefined) {
        onDiagnostic(
          'UNMATCHED_SLUR',
          `A <slur type="stop" number="${number}"> has no matching start in this measure and voice; the slur was not drawn.`,
        );
        continue;
      }
      openSlurs.delete(number);
      const anchors = spanAnchors(startIdx, idx);
      // §9.16: "a single-note span is nonsensical for a slur (2+ notes
      // required) and should be rejected rather than silently drawing
      // something."
      if (anchors.length < 2) continue;
      const side = slurSide(anchors.map((a) => a.direction));
      const y =
        side === 'above'
          ? Math.min(...anchors.map((a) => a.topPosition)) - SLUR_GAP
          : Math.max(...anchors.map((a) => a.bottomPosition)) + SLUR_GAP;
      const first = anchors[0];
      const last = anchors[anchors.length - 1];
      if (first === undefined || last === undefined) continue;
      const shape = computeSlurShape(
        // Start just past the first notehead and end at the last one's own
        // x, the same convention Phase 26's ties already use.
        first.x + noteheadWidth(first.noteheadGlyph),
        last.x,
        ctx.measureBottomY + y,
        side,
      );
      parts.push(
        renderSlur(shape, {
          color: INK_COLOR,
          midpointThickness:
            getEngravingDefault('slurMidpointThickness') ?? SLUR_MIDPOINT_THICKNESS_FALLBACK,
        }),
      );
    }

    for (const number of note.slurStarts ?? []) {
      openSlurs.set(number, idx);
    }
  });
  if (openSlurs.size > 0) {
    onDiagnostic(
      'UNMATCHED_SLUR',
      `${openSlurs.size} slur(s) start in this measure and voice but never stop in it; a slur crossing a barline is not drawn (see Doc/integration-i-slur-tuplet-wiring.md).`,
    );
  }

  // ---- §9.17 tuplets --------------------------------------------------
  let openTuplet: number | undefined;
  events.forEach((event, idx) => {
    const note = spanSourceNote(event);
    if (note === undefined) return;

    if (note.tupletStart === true) openTuplet = idx;

    if (note.tupletStop !== true) return;
    const startIdx = openTuplet;
    openTuplet = undefined;
    if (startIdx === undefined) {
      onDiagnostic(
        'UNMATCHED_TUPLET',
        'A <tuplet type="stop"> has no matching start in this measure and voice; the tuplet mark was not drawn.',
      );
      return;
    }

    const anchors = spanAnchors(startIdx, idx);
    if (anchors.length < 2) return;

    const actualNotes = note.duration.tuplet?.actualNotes;
    if (actualNotes === undefined) {
      onDiagnostic(
        'TUPLET_WITHOUT_RATIO',
        'A <tuplet> has no <time-modification> to take its number from; the tuplet mark was not drawn.',
      );
      return;
    }
    let digitGlyph: string;
    try {
      digitGlyph = tupletDigitGlyphName(actualNotes);
    } catch {
      // §9.17's own stated limitation: single-digit counts only.
      onDiagnostic(
        'TUPLET_NUMBER_UNSUPPORTED',
        `A ${actualNotes}-note tuplet needs multi-digit layout, which §9.17 does not implement; the tuplet mark was not drawn.`,
      );
      return;
    }

    // §9.17: the bracket is redundant when one beam already shows the
    // group's extent -- which is true only if EVERY member is beamed.
    const allMembersBeamed = (() => {
      for (let i = startIdx; i <= idx; i++) {
        if (anchorByIndex.get(i) === undefined) continue;
        if (!beamedIndices.has(i)) return false;
      }
      return true;
    })();

    const first = anchors[0];
    const last = anchors[anchors.length - 1];
    if (first === undefined || last === undefined) return;
    // §9.17's side rule is the OPPOSITE of a tie's or slur's: the
    // bracket/number sits on the STEM side. The group shares one stem
    // direction in practice; the first member's is used when it does not.
    const side = tupletSide(first.direction);
    const y =
      side === 'above'
        ? Math.min(...anchors.map((a) => a.topPosition)) - TUPLET_GAP
        : Math.max(...anchors.map((a) => a.bottomPosition)) + TUPLET_GAP;
    const absoluteY = ctx.measureBottomY + y;

    if (tupletBracketNeeded(allMembersBeamed)) {
      parts.push(
        renderTupletBracket(computeTupletBracketShape(first.x, last.x, absoluteY, side), {
          thickness:
            getEngravingDefault('tupletBracketThickness') ?? TUPLET_BRACKET_THICKNESS_FALLBACK,
          color: INK_COLOR,
        }),
      );
    }
    parts.push(
      renderTupletNumber(digitGlyph, (first.x + last.x) / 2, absoluteY, {
        color: INK_COLOR,
        fontFamily: FONT_FAMILY,
      }),
    );
  });
  if (openTuplet !== undefined) {
    onDiagnostic(
      'UNMATCHED_TUPLET',
      'A <tuplet> starts in this measure and voice but never stops in it; a tuplet crossing a barline is not drawn.',
    );
  }

  return parts.join('\n');
}

/**
 * The engine's main entry point: MusicXML text in, a complete SVG string
 * out.
 *
 * It began as Phase 21's deliberately naive vertical slice (fixed-width
 * measures via `layout/naive.ts`) -- PLAN.md §22 said that phase "exists
 * to be thrown away", and Stage 8 duly threw it away. Nothing here uses
 * `layout/naive.ts` any more: measure widths come from §14's real
 * spacing algorithm (Integration E), grand-staff distance from §15's
 * skyline (Integration F), and system/page placement from §16.1/§16.2
 * (Phase 45 and Integration L).
 *
 * Content handling grew the same way: every part renders with its own
 * clefs, line counts, brace and continuous barline (Integrations A/B);
 * tab frets (C); tempo marks (D/G); articulations and ornaments (H);
 * slurs and tuplets (I); dynamics and hairpins (J); multi-voice notehead
 * collisions (K).
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
    directions,
    prints,
  } = parseMusicXml(xmlText, options);
  const diagnostics: Diagnostic[] = [...parseDiagnostics];
  const config = resolveConfig(options?.config);
  /**
   * §14.3's justification fills a system to a KNOWN width. Scroll mode
   * (§16.1) has no such width -- its single system is as wide as the
   * music -- so it never justifies, which is why the scroll path keeps
   * SPACING_CONFIG's own `justify: false`. Page mode does have one
   * (`usableWidth`), so it takes the config's value, whose default is
   * true. This is the semantics, not a workaround: the same score in the
   * two modes is genuinely laid out differently.
   */
  const pageSpacingConfig = { ...DEFAULT_CONFIG.spacing, ...options?.config?.spacing };

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

  /**
   * Integration L: ONE horizontal timeline for the whole score.
   *
   * This used to be computed per part, which meant a part whose measure 1
   * held eight eighth notes made that measure wide while another part's
   * whole-note measure 1 stayed narrow -- so the two parts' barlines
   * landed at completely different x positions and nothing lined up
   * vertically. §14's spacing is one shared axis for the whole SYSTEM,
   * and §9.18 says in as many words that a system shares "the same
   * horizontal measure positions ... down the system". Computing it once
   * here, from every part's voices combined, is what makes that true.
   */
  const measureNumbersInOrder: number[] = [];
  /** `partId:measureNumber` -> that part's own Measure, so the loops below never re-scan a part's measure array. */
  const measureByPartAndNumber = new Map<string, Measure>();
  {
    const seen = new Set<number>();
    for (const part of score.parts) {
      for (const m of part.measures) {
        measureByPartAndNumber.set(`${part.id}:${m.number}`, m);
        if (seen.has(m.number)) continue;
        seen.add(m.number);
        measureNumbersInOrder.push(m.number);
      }
    }
  }
  /**
   * The same index for the attributes side-table. Both exist because the
   * score-wide layout below, and the render loop after it, each look a
   * (part, measure) pair up once per measure -- with a linear `.find()`
   * that made the whole render quadratic in measure count on a large
   * score, well before §18.1's own budget would have allowed it.
   */
  const attributesByPartAndMeasure = new Map<string, MeasureAttributes>();
  for (const a of attributes) {
    attributesByPartAndMeasure.set(`${a.partId}:${a.measureNumber}`, a);
  }
  /** The first `<attributes>` of a part, for the score-wide passes that need a part's starting state. */
  const firstAttributesByPart = new Map<string, MeasureAttributes>();
  for (const a of attributes) {
    if (!firstAttributesByPart.has(a.partId)) firstAttributesByPart.set(a.partId, a);
  }

  const measureLayoutsByNumber = new Map<
    number,
    { readonly width: number; readonly positionsByTick: ReadonlyMap<number, number> }
  >();
  const measureTicksByNumber = new Map<number, number>();
  for (const measureNumber of measureNumbersInOrder) {
    const combinedVoices = [];
    let measureTicks: number | undefined;
    for (const part of score.parts) {
      const m = measureByPartAndNumber.get(`${part.id}:${measureNumber}`);
      if (m === undefined) continue;
      combinedVoices.push(...m.voices);
      const attrs = attributesByPartAndMeasure.get(`${part.id}:${measureNumber}`);
      if (attrs === undefined) continue;
      const ticks = attrs.timeNumerator * (4 / attrs.timeDenominator) * TICKS_PER_QUARTER;
      // Parts SHOULD agree on the meter; if a file disagrees, the longest
      // wins so no part's last note falls outside the measure.
      measureTicks = measureTicks === undefined ? ticks : Math.max(measureTicks, ticks);
    }
    const layout = computeMeasureLayout(
      makeMeasure(measureNumber, combinedVoices),
      measureTicks ?? TICKS_PER_QUARTER * 4,
      tempoMarks.filter((tm) => tm.measureNumber === measureNumber),
    );
    measureLayoutsByNumber.set(measureNumber, layout);
    measureTicksByNumber.set(measureNumber, measureTicks ?? TICKS_PER_QUARTER * 4);
  }

  /**
   * Integration M: how much extra room above the staff the tempo marks
   * need, beyond what STAFF_BOTTOM_Y already leaves. Computed score-wide
   * and applied uniformly, so every staff of every system shifts together
   * and the marks never land outside the viewBox. Zero for a score with
   * no tempo marks, which is what keeps every such fixture byte-identical.
   */
  const tempoTopPadding = (() => {
    if (tempoMarks.length === 0) return 0;
    const existingHeadroom = STAFF_BOTTOM_Y - computeStaffGeometry(STAFF_LINES).height;
    let needed = 0;
    for (const part of score.parts) {
      const midi = midiInstrumentsByPartMap.get(part.id);
      for (const m of part.measures) {
        if (!tempoMarks.some((t) => t.partId === part.id && t.measureNumber === m.number)) continue;
        const a = attributesByPartAndMeasure.get(`${part.id}:${m.number}`);
        const spec = a?.clefsByStaff[1];
        const { clefDef } = mapClef(spec?.sign ?? a?.clefSign ?? 'G', spec?.line ?? a?.clefLine);
        const extent = measureNorthExtent(m, 1, {
          clefDef,
          measureBottomY: 0,
          midiInstrumentsByPart: midi,
        });
        needed = Math.max(needed, extent + TEMPO_MARK_GAP + TEMPO_MARK_HEIGHT);
      }
    }
    return Math.max(0, needed - existingHeadroom);
  })();
  /** Every staff's bottom line sits this far down, tempo-mark headroom included. */
  const staffBottomY = STAFF_BOTTOM_Y + tempoTopPadding;

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
    const a = firstAttributesByPart.get(p.id);
    return Math.max(1, a?.staves ?? 1);
  });
  const scoreLayout = computeSystemLayoutVariableGaps(partStaffCounts, staffDistanceForPair);
  const staffOffsetFor = (partIndex: number, staffIndexInPart: number): number =>
    scoreLayout.positions.find(
      (pos) => pos.partIndex === partIndex && pos.staffIndexInPart === staffIndexInPart,
    )?.y ?? 0;

  /** Where one measure sits: its x/width, which system it belongs to, and that system's own vertical origin. */
  interface MeasurePlacement {
    readonly x: number;
    readonly width: number;
    readonly systemY: number;
    readonly systemIndex: number;
    readonly isSystemStart: boolean;
  }
  const placementByMeasureNumber = new Map<number, MeasurePlacement>();
  /** Each system's own left edge and vertical origin -- what a brace needs, once per system rather than once per part. */
  const systemOrigins: { systemIndex: number; x: number; systemY: number }[] = [];

  // One system's full vertical extent: the tallest staff stack in the
  // score (every part, every staff) plus the room STAFF_BOTTOM_Y already
  // reserves above the first staff.
  const lowestStaffOffset = scoreLayout.positions[scoreLayout.positions.length - 1]?.y ?? 0;
  const systemHeight = SYSTEM_HEIGHT + tempoTopPadding + lowestStaffOffset;

  const widthOf = (measureNumber: number): number =>
    measureLayoutsByNumber.get(measureNumber)?.width ?? MEASURE_WIDTH;

  let pageCount = 1;
  if (config.layout.mode === 'page') {
    // §16.2: "<print new-system/new-page> from MusicXML" is respected.
    // Any part asking for a break breaks the whole system -- a system is
    // score-wide, so one part cannot break alone.
    const breaksByMeasure = new Map<number, { newSystem: boolean; newPage: boolean }>();
    for (const pr of prints) {
      const existing = breaksByMeasure.get(pr.measureNumber);
      breaksByMeasure.set(pr.measureNumber, {
        newSystem: (existing?.newSystem ?? false) || pr.newSystem,
        newPage: (existing?.newPage ?? false) || pr.newPage,
      });
    }
    const pageInputs: PageMeasureInput[] = measureNumbersInOrder.map((measureNumber) => {
      const breaks = breaksByMeasure.get(measureNumber);
      return {
        measureNumber,
        width: widthOf(measureNumber),
        ...(breaks?.newSystem === true ? { forceNewSystem: true } : {}),
        ...(breaks?.newPage === true ? { forceNewPage: true } : {}),
      };
    });
    const pageLayout = computePageLayout(pageInputs, systemHeight, config.page, pageSpacingConfig);
    pageCount = Math.max(1, pageLayout.pages.length);
    let systemIndex = 0;
    pageLayout.pages.forEach((page, pageIndex) => {
      page.systems.forEach((system, systemIndexOnPage) => {
        const systemY =
          pageIndex * config.page.pageHeight +
          config.page.marginTop +
          systemIndexOnPage * systemHeight;
        systemOrigins.push({ systemIndex, x: config.page.marginLeft, systemY });
        system.measures.forEach((m, i) => {
          placementByMeasureNumber.set(m.measureNumber, {
            x: config.page.marginLeft + m.x,
            width: m.width,
            systemY,
            systemIndex,
            isSystemStart: i === 0,
          });
        });
        systemIndex += 1;
      });
    });
  } else {
    const scrollLayout = computeScrollLayout(
      measureNumbersInOrder.map((measureNumber) => ({
        measureNumber,
        width: widthOf(measureNumber),
      })),
    );
    systemOrigins.push({ systemIndex: 0, x: scrollLayout.measures[0]?.x ?? 0, systemY: 0 });
    scrollLayout.measures.forEach((m, i) => {
      placementByMeasureNumber.set(m.measureNumber, {
        x: m.x,
        width: m.width,
        systemY: 0,
        systemIndex: 0,
        isSystemStart: i === 0,
      });
    });
  }

  const svgParts: string[] = [];
  let totalWidth = MEASURE_WIDTH;
  for (const placement of placementByMeasureNumber.values()) {
    totalWidth = Math.max(totalWidth, placement.x + placement.width);
  }

  score.parts.forEach((part, partIndex) => {
    // Integration L: the measure x/width/system placement is SCORE-wide
    // now (see the block above), so a part only looks its own measures up
    // in the shared map rather than laying them out again for itself.
    const directionXFor = (measureNumber: number, tick: number): number | undefined => {
      const placement = placementByMeasureNumber.get(measureNumber);
      if (placement === undefined) return undefined;
      // The SAME header allowance the note pass uses for noteAreaX --
      // Integration G's own hard-won lesson was that a marking computing
      // its x in a different coordinate system than the notes drifts
      // apart from them as soon as a measure's width changes.
      const noteAreaX = placement.x + MEASURE_HEADER_ALLOWANCE;
      const realX = measureLayoutsByNumber.get(measureNumber)?.positionsByTick.get(tick);
      if (realX !== undefined) return noteAreaX + realX;
      const measureTicks = measureTicksByNumber.get(measureNumber) ?? TICKS_PER_QUARTER * 4;
      return noteAreaX + (tick / (measureTicks || 1)) * (placement.x + placement.width - noteAreaX);
    };

    const partDirections = directions.filter((d) => d.partId === part.id);
    /** Resolved crescendo/decrescendo spans, keyed by the measure they START in so each is drawn exactly once. */
    const wedgeSpansByMeasure = new Map<
      number,
      { staff: number; startX: number; endX: number; kind: 'crescendo' | 'decrescendo' }[]
    >();
    {
      // A wedge's own `number` distinguishes overlapping wedges; its
      // staff keeps two staves' wedges from closing each other's spans.
      const openWedges = new Map<
        string,
        { measureNumber: number; staff: number; x: number; kind: 'crescendo' | 'decrescendo' }
      >();
      for (const d of partDirections) {
        const x = directionXFor(d.measureNumber, d.tick);
        if (x === undefined) continue;
        for (const wedge of d.wedges) {
          const key = `${d.staff}:${wedge.number}`;
          if (wedge.type === 'stop') {
            const open = openWedges.get(key);
            if (open === undefined) {
              diagnostics.push({
                severity: 'info',
                code: 'UNMATCHED_WEDGE',
                message: `A <wedge type="stop" number="${wedge.number}"> has no matching start in this part; the hairpin was not drawn.`,
                location: { partId: part.id, measureNumber: d.measureNumber },
              });
              continue;
            }
            openWedges.delete(key);
            // Integration L: in page mode the two ends can land in
            // different SYSTEMS, where the x axis restarts and the y
            // differs -- drawing one line between them would run
            // diagonally across the page. Real engraving splits such a
            // hairpin at the system break; that is not built, so this
            // says so rather than drawing something wrong.
            const startSystem = placementByMeasureNumber.get(open.measureNumber)?.systemIndex;
            const endSystem = placementByMeasureNumber.get(d.measureNumber)?.systemIndex;
            if (startSystem !== endSystem) {
              diagnostics.push({
                severity: 'info',
                code: 'WEDGE_CROSSES_SYSTEM',
                message:
                  'A hairpin spans a system break; splitting one across systems is not implemented, so it was not drawn.',
                location: { partId: part.id, measureNumber: open.measureNumber },
              });
              continue;
            }
            const list = wedgeSpansByMeasure.get(open.measureNumber) ?? [];
            list.push({ staff: open.staff, startX: open.x, endX: x, kind: open.kind });
            wedgeSpansByMeasure.set(open.measureNumber, list);
          } else {
            openWedges.set(key, {
              measureNumber: d.measureNumber,
              staff: d.staff,
              x,
              kind: wedge.type,
            });
          }
        }
      }
      for (const [key, open] of openWedges) {
        diagnostics.push({
          severity: 'info',
          code: 'UNMATCHED_WEDGE',
          message: `A wedge (${key}) starts but never stops in this part; the hairpin was not drawn.`,
          location: { partId: part.id, measureNumber: open.measureNumber },
        });
      }
    }
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
      const attrs = attributesByPartAndMeasure.get(`${part.id}:${measure.number}`);
      const layout = placementByMeasureNumber.get(measure.number);
      if (attrs === undefined || layout === undefined) return;
      // Integration L: in page mode a measure sits in one of several
      // stacked systems, so every y in this measure is offset by that
      // system's own origin. In scroll mode `systemY` is always 0 and
      // every formula below reduces to exactly what it was.
      const systemY = layout.systemY;
      /** §16.2: a clef and key signature are redrawn at the start of EVERY system, not only the first measure of the piece. */
      const isSystemStart = layout.isSystemStart;

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
        // Use the EXACT same header allowance the note-rendering pass
        // below uses for noteAreaX -- a real, second bug: this used to
        // compute noteAreaX as a FRACTION of the measure's own width
        // (layout.width * 0.25), which is a DIFFERENT coordinate system
        // from the notes' own fixed-allowance formula. As long as a
        // measure stayed near its old default width the two formulas
        // happened to roughly agree, but once a measure is genuinely
        // widened to fit a tempo mark (as this file's own measure 2
        // needs), the fraction-based x grows right along with it,
        // drifting the mark further from where the notes actually start
        // -- exactly the "no visible change" the user reported, since
        // widening the measure and this drift canceled each other out
        // visually.
        const noteAreaX = layout.x + MEASURE_HEADER_ALLOWANCE;
        const noteAreaWidth = layout.x + layout.width - noteAreaX;
        const measureTotalTicks =
          attrs.timeNumerator * (4 / attrs.timeDenominator) * TICKS_PER_QUARTER;
        const topStaffLines = attrs.staffLinesByStaff[1] ?? STAFF_LINES;
        const topStaffGeometry = computeStaffGeometry(topStaffLines);
        const topStaffY = staffBottomY + systemY - topStaffGeometry.height;
        // Integration M: clear the measure's REAL content, not just the
        // staff's top line. On a drum chart the hi-hat line IS the top
        // line, so a fixed offset from it put the mark straight through
        // the beams -- measured on this project's own fixture, the mark
        // sat at y=1.50 while the first note's stem ran 3.56 -> 0.50 at
        // the very same x.
        const topClefSpec = attrs.clefsByStaff[1];
        const { clefDef: topClefDef } = mapClef(
          topClefSpec?.sign ?? attrs.clefSign,
          topClefSpec?.line ?? attrs.clefLine,
        );
        const northExtent = measureNorthExtent(measure, 1, {
          clefDef: topClefDef,
          measureBottomY: 0,
          midiInstrumentsByPart: midiInstrumentsByPartMap.get(part.id),
        });
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
                // tempoMarkSide() is always 'above'. The clearance is
                // measured from whatever this measure's content actually
                // reaches (stems and beams included), not from the staff
                // line -- see the note where northExtent is computed.
                y: topStaffY - northExtent - TEMPO_MARK_GAP,
                color: INK_COLOR,
                fontFamily: FONT_FAMILY,
                noteToEqualsGap: 1.0,
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
        const bottomY = staffBottomY + systemY + staffOffsetFor(partIndex, staffIndex);

        svgParts.push(
          renderStaff(staffGeometry, {
            x: layout.x,
            y: bottomY,
            width: layout.width,
            color: INK_COLOR,
            lineThickness: getEngravingDefault('staffLineThickness') ?? 0.13,
          }),
        );

        // Integration J: §9.21's dynamics and hairpins for THIS staff of
        // this measure. Drawn before the notes so a notehead is never
        // hidden behind a mark; both sit clear of the staff anyway.
        {
          const topLineY = bottomY - staffGeometry.height;
          const markY = (placement: 'above' | 'below'): number =>
            placement === 'above' ? topLineY - DYNAMIC_GAP : bottomY + DYNAMIC_GAP;

          for (const d of partDirections) {
            if (d.measureNumber !== measure.number || d.staff !== staffNumber) continue;
            if (d.dynamics.length === 0) continue;
            const x = directionXFor(d.measureNumber, d.tick);
            if (x === undefined) continue;
            // §9.21's default is 'below'; a file that states its own
            // placement is believed instead, the same way Phase 35
            // already lets an explicit <stem> or <notehead> win over
            // this engine's own convention.
            const y = markY(d.placement ?? dynamicSide());
            // Several <dynamics> children in one element are ONE compound
            // marking ("sf" + "p" = sfp), so they are laid out left to
            // right rather than stacked on one spot.
            let cursor = x;
            for (const level of d.dynamics) {
              const glyphName = dynamicGlyphName(level);
              svgParts.push(
                renderMark(glyphName, {
                  x: cursor,
                  y,
                  color: INK_COLOR,
                  fontFamily: FONT_FAMILY,
                }),
              );
              cursor += glyphWidthOf(glyphName);
            }
          }

          for (const span of wedgeSpansByMeasure.get(measure.number) ?? []) {
            if (span.staff !== staffNumber) continue;
            svgParts.push(
              renderHairpin(
                computeHairpinShape(span.startX, span.endX, markY(dynamicSide()), span.kind),
                {
                  thickness: getEngravingDefault('hairpinThickness') ?? HAIRPIN_THICKNESS_FALLBACK,
                  color: INK_COLOR,
                },
              ),
            );
          }
        }

        const isFirstMeasureOfPart = i === 0;
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

        if (isSystemStart || clefChanged) {
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

        if ((isSystemStart || keyChanged) && attrs.fifths !== 0) {
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

        // A time signature, unlike a clef or key signature, is NOT
        // restated at each system start -- only where it actually changes
        // (and at the very start of the part).
        if (isFirstMeasureOfPart || timeChanged) {
          try {
            // STATUS C3/§9.4: an additive meter is DRAWN as the file
            // wrote it ("3+2+2") while every tick calculation keeps using
            // the numeric total (7). Phase 12 could already render this;
            // the parser only started supplying it with Phase 35 Tier 2.
            const sig = timeSignature(attrs.timeNumerator, attrs.timeDenominator, {
              ...(attrs.timeNumeratorDisplay !== undefined
                ? { numeratorDisplay: attrs.timeNumeratorDisplay }
                : {}),
            });
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
          // Integration K/§9.14: computed once per (measure, staff),
          // because a collision is by definition a fact ABOUT two voices
          // and cannot be seen from inside either one's own loop.
          const collisionOffsets = computeVoiceCollisionOffsets(measure, staffNumber, ctx);

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
              const baseX =
                realX !== undefined
                  ? noteAreaX + realX
                  : noteAreaX + (startTick / total) * fallbackNoteAreaWidth;
              // §9.14's shift is applied to the event's x itself, so the
              // notehead, its accidental, its ledger lines, its stem and
              // any tie/slur anchored to it all move together -- exactly
              // what §9.14 requires ("its own ledger lines / accidental,
              // which move with it").
              return baseX + (collisionOffsets.get(`${voice.id}:${startTick}`) ?? 0);
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
            const beamableEvents = voice.events.map((event) => {
              // Integration M: a CHORD is beamable now. It used to be
              // lumped in with rests here, which broke every beam run a
              // chord sat in -- on a drum chart, where hi-hat + snare
              // struck together IS a chord, that was most of them.
              const beamSource =
                event.kind === 'chord' ? event.notes[0] : event.kind === 'note' ? event : undefined;
              const isRest =
                event.kind === 'rest' || (event.kind === 'note' && event.isGrace === true);
              // §10.4/§10.8: the file's own level-1 <beam>, when it wrote
              // one. A chord's <beam> lives on its first note, exactly
              // where MusicXML puts it.
              const level1 = isRest ? undefined : beamSource?.beams?.find((b) => b.number === 1);
              return {
                durationType: event.duration.type,
                isRest,
                ...(level1 !== undefined ? { beamValue: level1.value } : {}),
              };
            });
            // §10.8: a file that states its own beaming is the authority
            // on it. Only when NO note in this voice gave a level-1 hint
            // does Phase 23's time-signature inference decide instead.
            const groups = hasExplicitBeams(beamableEvents)
              ? groupBeamsFromHints(beamableEvents)
              : groupBeams(beamableEvents, starts, attrs.timeNumerator, attrs.timeDenominator);
            const beamedIndices = beamedEventIndices(groups);
            const groupByFirstIndex = new Map<number, (typeof groups)[number]>();
            for (const group of groups) {
              const firstIndex = group.eventIndices[0];
              if (firstIndex !== undefined) groupByFirstIndex.set(firstIndex, group);
            }

            // Integration I: every drawn event's geometry, keyed by its
            // own index in this voice, for the span pass below.
            const anchorByIndex = new Map<number, EventAnchor>();

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
                // The indices, the notes and the x positions are all
                // derived from ONE filtered list. They used to be derived
                // separately -- `groupNotes` filtered to real notes while
                // `groupXs` mapped every index unfiltered -- so any group
                // member that was not a plain Note would have silently
                // shifted every following note onto the wrong x. Nothing
                // can currently put a non-note in a group, which is
                // exactly why the misalignment would have been so hard to
                // find if something ever did.
                const groupIndices = group.eventIndices.filter((i) => {
                  const kind = voice.events[i]?.kind;
                  return kind === 'note' || kind === 'chord';
                });
                const groupNotes = groupIndices
                  .map((i) => voice.events[i])
                  .filter(
                    (e): e is Note | Chord =>
                      e !== undefined && (e.kind === 'note' || e.kind === 'chord'),
                  );
                const groupXs = groupIndices.map((i) => eventXs[i] ?? 0);
                const {
                  svg,
                  newAccidentalState,
                  anchors: groupAnchors,
                } = renderBeamGroup(
                  groupNotes,
                  groupXs,
                  ctx,
                  accidentalState,
                  DEFAULT_BEAM_STYLE,
                  forcedDirection,
                );
                groupAnchors.forEach((anchor, memberIndex) => {
                  const eventIndex = groupIndices[memberIndex];
                  if (eventIndex !== undefined) anchorByIndex.set(eventIndex, anchor);
                });
                svgParts.push(svg);
                accidentalState = newAccidentalState;
                return;
              }

              if (event.kind === 'chord') {
                const { svg, newAccidentalState, anchor } = renderChord(
                  event,
                  eventX,
                  ctx,
                  accidentalState,
                  forcedDirection,
                );
                if (anchor !== undefined) anchorByIndex.set(idx, anchor);
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

                if (event.kind === 'note' && tieAnchor !== undefined) {
                  anchorByIndex.set(idx, {
                    x: eventX,
                    topPosition: tieAnchor.position,
                    bottomPosition: tieAnchor.position,
                    direction: tieAnchor.direction,
                    noteheadGlyph: tieAnchor.noteheadGlyph,
                  });
                }

                svgParts.push(svg);
                accidentalState = newAccidentalState;
              }
            });

            // Integration I: §9.16 slurs and §9.17 tuplets, drawn after
            // every event in this voice is placed (both endpoints of a
            // span must exist before either can be drawn).
            const spans = renderSpans(
              voice.events,
              anchorByIndex,
              beamedIndices,
              ctx,
              (code, message) => {
                diagnostics.push({
                  severity: 'info',
                  code,
                  message,
                  location: { partId: part.id, measureNumber: measure.number },
                });
              },
            );
            if (spans !== '') svgParts.push(spans);
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

      // Integration Q: the boundary this measure draws at its OWN right
      // edge is the exact same physical barline the NEXT measure might
      // instead describe via `location="left"` on ITS `<barline>` -- a
      // real file's repeat-begin is commonly written that way, on the
      // first measure of the repeated section, rather than as this
      // measure's own `location="right"`. When the next measure states
      // one, it wins (drawn HERE, at the shared boundary) over whatever
      // (usually nothing, defaulting to a plain single line) this measure
      // declared for the same edge -- never both, so the boundary is
      // still drawn exactly once.
      const nextAttrs = attributesByPartAndMeasure.get(`${part.id}:${measure.number + 1}`);
      const barlineType = mapBarline(
        nextAttrs?.leftBarlineStyle ?? attrs.barlineStyle,
        nextAttrs?.leftRepeatDirection ?? attrs.repeatDirection,
      );
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
      const barlineBottomY = staffBottomY + systemY + lastStaffOffset;
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
    // are joined by a brace at each system's left edge -- drawn once per
    // SYSTEM (page mode has several), not once per measure.
    const partStaffCount = partStaffCounts[partIndex] ?? 1;
    if (needsBrace(partStaffCount)) {
      const firstOffset = staffOffsetFor(partIndex, 0);
      const lastOffset = staffOffsetFor(partIndex, partStaffCount - 1);
      // This block sits outside the measure loop, so it reads the part's
      // own first <attributes> rather than a per-measure `attrs`.
      const partFirstAttrs = firstAttributesByPart.get(part.id);
      const topStaffHeight = computeStaffGeometry(
        partFirstAttrs?.staffLinesByStaff[1] ?? STAFF_LINES,
      ).height;
      for (const origin of systemOrigins) {
        const braceShape = computeBraceShape(
          staffBottomY + origin.systemY + firstOffset - topStaffHeight,
          staffBottomY + origin.systemY + lastOffset,
          origin.x,
        );
        svgParts.push(renderBrace(braceShape, { color: INK_COLOR, fontFamily: FONT_FAMILY }));
      }
    }
  });

  const svg = createSvgDocument(
    {
      // §16.2: page mode's canvas is the PAGE, however much or little of
      // it the music fills; scroll mode's is as wide as the music itself.
      viewBoxWidth: config.layout.mode === 'page' ? config.page.pageWidth : totalWidth + 2,
      // Integration A/B: the viewBox must fit EVERY staff of EVERY part,
      // or the lower ones are simply clipped out of the rendered image.
      // In page mode that means every page, stacked.
      viewBoxHeight:
        config.layout.mode === 'page' ? pageCount * config.page.pageHeight : systemHeight,
      pxPerStaffSpace: PX_PER_STAFF_SPACE,
      backgroundColor: BACKGROUND_COLOR,
    },
    svgParts,
  );

  return { svg, diagnostics };
}
