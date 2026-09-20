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
  computeVoltaGeometry,
  voltaLabel,
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
  shouldShowBarNumber,
  staffPositionForPitch,
  timeSignature,
  computeStaffGeometry,
  type AccidentalState,
  type BarlineType,
  type BeamStyle as BeamStyleOption,
} from './geometry/index.js';
import { lookupDrumMapEntry, mergeDrumMappingTable, type DrumMappingTable } from './drums/index.js';
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
import {
  computePlaybackData,
  notationEventId,
  DEFAULT_REPEAT_TIMES,
  type PlaybackData,
  type RepeatMeasureSpec,
} from './playback/index.js';
import { renderTabNumber, svgGroup } from './render/index.js';
import { renderBoundingBoxOverlay, renderSkylineOverlay } from './render/debug-overlay.js';
import { computeDebugSkylines, filterDiagnostics, measureSvgBoxes } from './debug/index.js';
import { computeBraceShape, needsBrace, needsContinuousBarline } from './geometry/index.js';
import { renderBrace } from './render/index.js';
import type { Diagnostic, MeasureAttributes } from './parser/index.js';
import { parseMusicXml, type ParseMusicXmlOptions, type ParseResult } from './parser/index.js';
import {
  resolveConfig,
  type EngineConfig,
  type FontSizeConfig,
  type NoteheadMappingConfig,
  type PartialEngineConfig,
} from './config/index.js';
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
  hasBackground,
  renderAccidental,
  renderBarline,
  renderVolta,
  renderRepeatCount,
  renderBarNumber,
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
const MEASURE_WIDTH = 24;

/**
 * Phase 50/§8: every element category `config.colors.overrides` can be
 * keyed by.
 *
 * §8's ColorConfig deliberately types `overrides` as a plain
 * string-keyed map (the `config/` module may import from nothing else in
 * the codebase, §4.1), so this union is where the real key set is
 * *stated*. A caller writing `{ overrides: { notehead: '#c00' } }` is
 * writing one of these names; anything else silently matches nothing,
 * which is why the supported names are enumerated here rather than left
 * to be discovered from the renderer's call sites.
 */
export type ColorCategory =
  | 'staff'
  | 'ledger'
  | 'barline'
  | 'brace'
  | 'notehead'
  | 'stem'
  | 'flag'
  | 'beam'
  | 'rest'
  | 'accidental'
  | 'clef'
  | 'keySignature'
  | 'timeSignature'
  | 'tie'
  | 'slur'
  | 'tuplet'
  | 'mark'
  | 'dynamic'
  | 'hairpin'
  | 'tempo'
  | 'barNumber'
  | 'tabNumber'
  | 'volta';

/**
 * Phase 50/§8: the drawing values the renderer reads, resolved ONCE from
 * an `EngineConfig` at the top of `renderFromMusicXml` and then carried
 * on `RenderCtx` to every function that draws anything.
 *
 * §8's own rule is "nothing user-facing may be hardcoded anywhere else
 * in the engine". Before this phase the renderer held `INK_COLOR`,
 * `FONT_FAMILY`, `BACKGROUND_COLOR`, `PX_PER_STAFF_SPACE` and
 * `DEFAULT_BEAM_STYLE` as module constants and read the default drum
 * table directly, so those options existed in the config object without
 * doing anything. This type is what replaced them: resolving in one
 * place (rather than each call site reaching into `config` itself) keeps
 * the ~30 drawing calls reading one short name each, and makes the merge
 * work -- the drum table, the notehead overrides -- happen once per
 * render instead of once per note.
 */
interface RenderTheme {
  readonly ink: string;
  readonly background: string;
  /** The SMuFL font every glyph is drawn in (`config.fonts.musicFont`). */
  readonly musicFont: string;
  /** The ordinary text font for non-glyph text -- bar numbers today. */
  readonly textFont: string;
  readonly sizes: FontSizeConfig;
  readonly beamStyle: BeamStyleOption;
  /** `DEFAULT_DRUM_MAPPING_TABLE` with `config.drums.mapping` merged on top (§13.3). */
  readonly drumMap: DrumMappingTable;
  readonly noteheadMapping: NoteheadMappingConfig;
  /** `config.colors.overrides[category]`, falling back to `config.colors.ink`. */
  readonly colorOf: (category: ColorCategory) => string;
}

function buildTheme(config: EngineConfig): RenderTheme {
  const overrides = config.colors.overrides;
  return {
    ink: config.colors.ink,
    background: config.colors.background,
    musicFont: config.fonts.musicFont,
    textFont: config.fonts.textFont,
    sizes: config.fonts.sizes,
    beamStyle: config.beam.style,
    drumMap: mergeDrumMappingTable(config.drums.mapping),
    noteheadMapping: config.noteheadMapping,
    colorOf: (category) => overrides?.[category] ?? config.colors.ink,
  };
}

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
 * The small pad every measure leaves at its own left edge, before
 * anything is drawn -- so a clef, or the first notehead, is not flush
 * against the barline.
 *
 * This is ALL an ordinary measure reserves. The real header width is
 * computed per measure by `headerWidths` (clef + key signature + time
 * signature, only where the measure actually draws them), because a
 * header is not a constant: a four-sharp key signature needs 10.5, and
 * a measure that restates nothing needs just this.
 *
 * It used to be one constant, `MEASURE_HEADER_ALLOWANCE = 6.0`, applied
 * to every measure. That was two bugs at once -- too NARROW where a key
 * signature was restated (the tempo mark and the playback cursor landed
 * inside the header) and too WIDE everywhere else (five staff spaces of
 * empty air after every barline, which is what made this engine's drum
 * output look unlike MuseScore's).
 */
const MEASURE_LEADING_PAD = 0.5;

/**
 * The fallback header width for a measure with no layout entry of its
 * own -- `positionToX`'s last resort, and nothing else. Kept at the old
 * constant's value so a caller that somehow reaches it is no worse off
 * than before.
 */
const MEASURE_HEADER_ALLOWANCE = 6.0;

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
/** Phase 50: a bar number's own clearance above whatever its measure reaches -- smaller than a tempo mark's, since plain digits have no tall stem to keep clear of the staff. */
const BAR_NUMBER_GAP = 1.0;
/**
 * A volta bracket's end hooks drop this far toward the staff, and the
 * bracket itself is drawn this much clear of the bar-number band below
 * it.
 *
 * The bracket sits ABOVE the bar numbers rather than the other way
 * round, which is the reverse of the usual engraving order. Deliberate:
 * bar numbers are drawn at a measure's own left edge, which is exactly
 * where a volta starts, and the two would collide on precisely the
 * measures a volta cares about. Putting the bracket higher costs a
 * little air above the staff on a score that has voltas, and nothing at
 * all on a score that does not.
 */
const VOLTA_HOOK_DEPTH = 1.0;
const VOLTA_BAR_NUMBER_CLEARANCE = 0.4;

/** How far above the top staff line a volta bracket's horizontal line sits -- clear of the bar-number band beneath it (see VOLTA_HOOK_DEPTH). */
function voltaGapAboveStaff(sizes: { readonly barNumber: number }): number {
  return BAR_NUMBER_GAP + sizes.barNumber + VOLTA_BAR_NUMBER_CLEARANCE + VOLTA_HOOK_DEPTH;
}

/** One volta bracket to draw: the measures it covers, its numbers, and whether it closes (a `discontinue` ending, and one running off the end of the score, do not). */
interface VoltaSpan {
  readonly measureNumbers: readonly number[];
  readonly numbers: readonly number[];
  readonly closed: boolean;
}

/**
 * The volta brackets a score's measures describe.
 *
 * A volta runs from the measure that OPENS it to whichever comes first:
 * the measure that closes it (`<ending type="stop">`), the measure
 * before the next volta opens, or the end of the score. MusicXML states
 * the open and the close independently and real files leave the close
 * off -- so the "next volta opens" and "score ends" cases are not error
 * recovery, they are the ordinary reading.
 */
function voltaSpans(specs: readonly RepeatMeasureSpec[]): readonly VoltaSpan[] {
  const spans: VoltaSpan[] = [];
  for (let i = 0; i < specs.length; i++) {
    const numbers = specs[i]?.endingStart;
    if (numbers === undefined) continue;
    const measureNumbers: number[] = [];
    let closed = false;
    for (let j = i; j < specs.length; j++) {
      const spec = specs[j];
      if (spec === undefined) break;
      if (j > i && spec.endingStart !== undefined) break;
      measureNumbers.push(spec.measureNumber);
      if (spec.endingStop) {
        closed = spec.endingDiscontinue !== true;
        break;
      }
    }
    if (measureNumbers.length > 0) spans.push({ measureNumbers, numbers, closed });
  }
  return spans;
}
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
  /** This measure's OWN header width (see `headerWidths`), not a score-wide constant. */
  headerWidth: number,
  /** `config.spacing.minMeasureWidth` -- the note area's own floor for a whole-note-long measure. */
  minMeasureWidth: number,
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
    return Math.max(max, headerWidth + markWidth + MEASURE_TRAILING_MARGIN);
  }, 0);

  /**
   * `config.spacing.minMeasureWidth`, scaled by this measure's own
   * notated length -- a 2/4 bar should not be as wide as a 4/4 one, and
   * a 12/8 bar should not be as narrow.
   *
   * Clamped at both ends. The lower clamp keeps a one-beat pickup from
   * collapsing to a quarter of a bar (a pickup still needs room for its
   * own notes plus its header); the upper one keeps a pathological
   * "measure" of twenty beats -- which real files do write, for a
   * cadenza or an unmetered passage -- from reserving a screenful of
   * blank staff.
   */
  const durationScale = Math.min(2, Math.max(0.35, measureTicks / (TICKS_PER_QUARTER * 4)));
  const minWidth = headerWidth + minMeasureWidth * durationScale;

  if (ticks.length === 0) {
    // A measure with no events at all gets exactly the same standard
    // width as a measure whose events happen to be sparse -- the reader
    // should not be able to tell "nothing written here" from "one whole
    // rest written here" by the bar's width.
    return { width: Math.max(minWidth, tempoMarkMinWidth), positionsByTick: new Map() };
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
    minWidth,
    headerWidth + lastX + lastWidth + MEASURE_TRAILING_MARGIN,
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
/** What `renderParsedMusicXml` takes: everything `renderFromMusicXml` does, minus the parser's own options (parsing already happened). */
export interface RenderParsedMusicXmlOptions {
  /**
   * Integration L/§16.2 + Phase 50/§8: the engine config. Every section
   * the renderer can act on is live -- see `buildTheme` and
   * `Doc/phase-50-theming-api.md`.
   */
  readonly config?: PartialEngineConfig;
}

export interface RenderFromMusicXmlOptions
  extends ParseMusicXmlOptions, RenderParsedMusicXmlOptions {}

export interface RenderFromMusicXmlResult {
  readonly svg: string;
  readonly diagnostics: readonly Diagnostic[];
  /** Phase 48/PLAN.md §17.1: the position API and event stream for this exact render -- pass this into `positionToX`/`xToPosition`/`resolvePosition`/`getEventStream` (all pure functions of it). */
  readonly playback: PlaybackData;
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
/**
 * Each event's start tick within its measure.
 *
 * Prefers the event's OWN `startTick` (§10.1's parser cursor, which
 * honours `<backup>`/`<forward>`) and falls back to the running sum only
 * for an event that has none -- a hand-built `Score`, where a voice has
 * no gaps by construction. Summing alone is wrong the moment a voice
 * skips time without writing a rest, which is how a drum kick that plays
 * on beats 1 and 3 is normally written.
 */
function eventStartTicks(events: readonly MeasureEvent[]): readonly number[] {
  const starts: number[] = [];
  let tick = 0;
  for (const ev of events) {
    const start = ev.startTick ?? tick;
    starts.push(start);
    tick = start + ev.duration.ticks;
  }
  return starts;
}

/** How far into the measure this voice's last event ENDS -- not the sum of its durations, which ignores any gap between them. */
function totalTicks(events: readonly MeasureEvent[]): number {
  const starts = eventStartTicks(events);
  return events.reduce((end, ev, i) => Math.max(end, (starts[i] ?? 0) + ev.duration.ticks), 0);
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
        color: ctx.theme.colorOf('mark'),
        fontFamily: ctx.theme.musicFont,
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
  /** Phase 50/§8: the resolved config values every drawing call below reads. */
  readonly theme: RenderTheme;
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
    gmNote !== undefined ? lookupDrumMapEntry(gmNote, ctx.theme.drumMap).entry : undefined;

  const position =
    drumEntry !== undefined
      ? drumEntry.staffPosition
      : staffPositionForPitch(ctx.clefDef, step, octave);

  // §9.7's selection order, with the two override sources merged in
  // precedence order: the drum table's own shape for this GM note is the
  // engine's default opinion, and `config.noteheadMapping.overridesByKey`
  // is the USER's -- so the user's entry for the same key wins. (A user
  // who sets `{ "38": "diamond" }` means it for the snare whether or not
  // the drum table already had an opinion about the snare.)
  const drumOverride =
    gmNote !== undefined && drumEntry !== undefined
      ? { [String(gmNote)]: drumEntry.noteheadShape }
      : undefined;
  const configOverrides = ctx.theme.noteheadMapping.overridesByKey;
  const overridesByKey =
    drumOverride !== undefined || configOverrides !== undefined
      ? { ...drumOverride, ...configOverrides }
      : undefined;

  const noteheadGlyph = selectNoteheadGlyphName({
    pitch: note.pitch,
    durationType: note.duration.type,
    defaultShape: ctx.theme.noteheadMapping.defaultShape,
    ...(note.explicitNotehead !== undefined ? { explicitNotehead: note.explicitNotehead } : {}),
    ...(note.explicitNoteheadSmufl !== undefined
      ? { explicitNoteheadSmufl: note.explicitNoteheadSmufl }
      : {}),
    ...(gmNote !== undefined ? { midiNote: gmNote } : {}),
    ...(overridesByKey !== undefined ? { overridesByKey } : {}),
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
  // A clef that doesn't position notes by pitch (a tab clef) has no
  // pitch-derived reach at all: Integration C draws its events as fret
  // numbers ON the string lines, which never leave the staff. Asking
  // resolveNoteRendering for a staff position here would throw -- the
  // same guard worstCaseStaffExtent already carries, and the reason a
  // tab part was the one fixture that could not carry a tempo mark.
  if (!ctx.clefDef.positionsByPitch) return 0;
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
          color: ctx.theme.colorOf('accidental'),
          fontFamily: ctx.theme.musicFont,
        }),
      );
    }
  }

  parts.push(
    renderNotehead(noteheadGlyph, {
      x,
      y,
      color: ctx.theme.colorOf('notehead'),
      fontFamily: ctx.theme.musicFont,
    }),
  );

  const ledgerLines = computeLedgerLines(position, STAFF_LINES);
  if (ledgerLines.length > 0) {
    parts.push(
      renderLedgerLines(ledgerLines, {
        x,
        noteheadWidth: noteheadWidth(noteheadGlyph),
        staffBottomY: ctx.measureBottomY,
        extension: getEngravingDefault('legerLineExtension') ?? LEDGER_EXTENSION_FALLBACK,
        thickness: getEngravingDefault('legerLineThickness') ?? LEDGER_THICKNESS_FALLBACK,
        color: ctx.theme.colorOf('ledger'),
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
      color: ctx.theme.colorOf('rest'),
      fontFamily: ctx.theme.musicFont,
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
            color: ctx.theme.colorOf('accidental'),
            fontFamily: ctx.theme.musicFont,
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
        color: ctx.theme.colorOf('notehead'),
        fontFamily: ctx.theme.musicFont,
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
        color: ctx.theme.colorOf('stem'),
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
            color: ctx.theme.colorOf('flag'),
            fontFamily: ctx.theme.musicFont,
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
  /**
   * Phase 51/§18.3: each member's OWN drawn content (its noteheads,
   * accidentals, ledger lines, stem and marks), in the same order as
   * `events`, so the caller can stamp each one with its own `data-id`.
   * The beam itself is shared by the whole group and is returned
   * separately -- it belongs to no single event.
   */
  memberSvgs: readonly string[];
  beamSvg: string;
  newAccidentalState: AccidentalState;
  /** Integration I: one anchor per member event, in the same order as `events`. */
  anchors: readonly EventAnchor[];
} {
  /** One bucket per member, filled in three passes (heads, stems, marks) below. */
  const memberParts: string[][] = [];
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
      memberParts.push([heads.svg]);
      state = heads.newAccidentalState;
      members.push({ x, positions: heads.positions, glyph: heads.widestGlyph, source: event });
    } else {
      const head = renderNoteheadPart(event, x, ctx, state);
      memberParts.push([head.svg]);
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
    memberParts[i]?.push(
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
        color: ctx.theme.colorOf('stem'),
      }),
    );
  });

  // Integration H: a beamed event carries its own §9.19/§9.20 marks, using
  // the beam's own shared stem direction (§9.13) rather than re-deriving
  // a per-note one, so every mark in the group sits on the same side. A
  // chord's marks live on its FIRST note, as MusicXML writes them.
  members.forEach((m, i) => {
    const markSource = m.source.kind === 'chord' ? m.source.notes[0] : m.source;
    if (markSource === undefined) return;
    const marks = renderNoteMarks(
      markSource,
      m.x,
      Math.min(...m.positions),
      Math.max(...m.positions),
      direction,
      ctx,
    );
    if (marks !== '') memberParts[i]?.push(marks);
  });

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
  const beamSvg = renderBeam(offsetShape, {
    lineCount,
    thickness: getEngravingDefault('beamThickness') ?? BEAM_THICKNESS_FALLBACK,
    spacing: getEngravingDefault('beamSpacing') ?? BEAM_SPACING_FALLBACK,
    color: ctx.theme.colorOf('beam'),
  });

  return {
    memberSvgs: memberParts.map((p) => p.join('\n')),
    beamSvg,
    newAccidentalState: state,
    anchors,
  };
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
        color: ctx.theme.colorOf('accidental'),
        fontFamily: ctx.theme.musicFont,
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
    parts.push(
      renderNotehead(glyphName, {
        x,
        y,
        color: ctx.theme.colorOf('notehead'),
        fontFamily: ctx.theme.musicFont,
      }),
    );
    const ledgerLines = computeLedgerLines(position, STAFF_LINES);
    if (ledgerLines.length > 0) {
      parts.push(
        renderLedgerLines(ledgerLines, {
          x,
          noteheadWidth: noteheadWidth(glyphName),
          staffBottomY: ctx.measureBottomY,
          extension: getEngravingDefault('legerLineExtension') ?? LEDGER_EXTENSION_FALLBACK,
          thickness: getEngravingDefault('legerLineThickness') ?? LEDGER_THICKNESS_FALLBACK,
          color: ctx.theme.colorOf('ledger'),
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
          color: ctx.theme.colorOf('stem'),
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
          color: ctx.theme.colorOf('slur'),
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
          color: ctx.theme.colorOf('tuplet'),
        }),
      );
    }
    parts.push(
      renderTupletNumber(digitGlyph, (first.x + last.x) / 2, absoluteY, {
        color: ctx.theme.colorOf('tuplet'),
        fontFamily: ctx.theme.musicFont,
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
/**
 * Phase 53/§18.1: render a score that has ALREADY been parsed.
 *
 * §18.1's own performance strategy says "the `Score` and layout result
 * are cached so resize/re-theme never re-parse", and until this phase
 * there was no way to honour it: `renderFromMusicXml` always parsed, so
 * every resize, every theme change and every scroll/page switch paid for
 * the XML again. Parsing is by far the most expensive step (measured on
 * a 100-measure score in Chromium: 35.8ms of a 46.9ms total), so a host
 * driving an interactive resize was spending three quarters of its
 * budget re-deriving a `Score` it already had.
 *
 * Hold the `parseMusicXml` result, call this as often as you like.
 * `renderFromMusicXml` is exactly `parseMusicXml` + this, so nothing
 * about the one-shot path changes.
 */
export function renderParsedMusicXml(
  parsed: ParseResult,
  options?: RenderParsedMusicXmlOptions,
): RenderFromMusicXmlResult {
  const {
    score,
    attributes,
    diagnostics: parseDiagnostics,
    tempoMarks,
    midiInstrumentsByPart: midiInstrumentsByPartMap,
    directions,
    prints,
  } = parsed;
  const diagnostics: Diagnostic[] = [...parseDiagnostics];
  const config = resolveConfig(options?.config);
  // Phase 50/§8: one resolution of every user-facing drawing value, passed
  // down on RenderCtx. Everything below reads `theme`, never a constant.
  const theme = buildTheme(config);
  /** Phase 51/§18.3: the absolute y of every staff bottom line drawn, for the skyline overlay. */
  const staffBottomYs = new Set<number>();
  /** Whether this render has already said that a tab mask cannot work on a transparent background. */
  let reportedTransparentTabMask = false;
  /**
   * §14.3's justification fills a system to a KNOWN width. Scroll mode
   * (§16.1) has no such width -- its single system is as wide as the
   * music -- so it never justifies, which is why the scroll path keeps
   * SPACING_CONFIG's own `justify: false`. Page mode does have one
   * (`usableWidth`), so it takes the config's value, whose default is
   * true. This is the semantics, not a workaround: the same score in the
   * two modes is genuinely laid out differently.
   */
  const pageSpacingConfig = config.spacing;

  if (score.parts.length === 0) {
    const doc = createSvgDocument(
      {
        viewBoxWidth: MEASURE_WIDTH,
        viewBoxHeight: SYSTEM_HEIGHT,
        pxPerStaffSpace: config.layout.pxPerStaffSpace,
        backgroundColor: theme.background,
      },
      [],
    );
    return {
      svg: doc,
      diagnostics,
      playback: computePlaybackData({
        score,
        measureNumbersInOrder: [],
        measureTicksByNumber: new Map(),
        timeSignatureByMeasure: new Map(),
        tempoMarks: [],
        measureLayoutsByNumber: new Map(),
        placementByMeasureNumber: new Map(),
        measureHeaderAllowance: MEASURE_HEADER_ALLOWANCE,
      }),
    };
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
    {
      readonly width: number;
      readonly positionsByTick: ReadonlyMap<number, number>;
      /** Seeded with the floor below, then replaced with each measure's REAL header width once system placement is known (see `resolveHeaderWidths`). */
      readonly headerWidth: number;
    }
  >();
  const measureTicksByNumber = new Map<number, number>();
  /** Phase 48/§17.1: each measure's own time signature, from the SAME part whose ticks won the "longest wins" comparison just below -- what `computePlaybackData` needs for §17.2's beat-position math. */
  const timeSignatureByMeasure = new Map<
    number,
    { readonly numerator: number; readonly denominator: number }
  >();
  const BARLINE_METRICS = {
    thinThickness: getEngravingDefault('thinBarlineThickness') ?? 0.16,
    thickThickness: getEngravingDefault('thickBarlineThickness') ?? 0.5,
    separation: getEngravingDefault('barlineSeparation') ?? 0.4,
    dotWidth: 0.4,
    dashLength: getEngravingDefault('dashedBarlineDashLength') ?? 0.5,
    gapLength: getEngravingDefault('dashedBarlineGapLength') ?? 0.25,
  };

  /**
   * How much of `measureNumber`'s own left edge the barline drawn there
   * occupies.
   *
   * Integration Q: that barline is ONE physical line at the boundary the
   * two measures share, and either side may declare it -- a repeat-begin
   * is normally written as `location="left"` on the measure it opens.
   * Whoever declares it, it is drawn starting AT the boundary and
   * extending right, so it is this measure's space that it takes.
   */
  /**
   * The same width, maximised over every part -- what the HEADER
   * reserves, and therefore what the clef/key/time drawn inside it must
   * start after.
   *
   * Maximised rather than per-part because all parts share one
   * horizontal timeline (Integration L): if one part declares the
   * repeat barline and another does not, both parts' clefs still have
   * to line up, and they line up at the wider of the two.
   */
  const openingBarlineAllowance = (measureNumber: number): number => {
    let widest = 0;
    for (const part of score.parts) {
      widest = Math.max(widest, openingBarlineWidthForPart(part.id, measureNumber));
    }
    return widest;
  };

  const openingBarlineWidthForPart = (partId: string, measureNumber: number): number => {
    const here = attributesByPartAndMeasure.get(`${partId}:${measureNumber}`);
    const previous = attributesByPartAndMeasure.get(`${partId}:${measureNumber - 1}`);
    const style = here?.leftBarlineStyle ?? previous?.barlineStyle;
    const direction = here?.leftRepeatDirection ?? previous?.repeatDirection;
    if (style === undefined && direction === undefined) return 0;
    return computeBarlineGeometry(mapBarline(style, direction), BARLINE_METRICS).width;
  };

  /**
   * Every measure's repeat and volta marks, in written order, resolved
   * from BOTH sides of each shared barline -- what `playback/repeats.ts`
   * unfolds into the order the score is actually played.
   *
   * Read from the first part that says anything about a given barline.
   * A repeat is a property of the SCORE, not of one instrument: parts
   * must agree, and where a file only marks the repeat on one staff
   * (common enough in drum charts, where the repeat is written once on
   * the top part) taking the first part that has it is the only reading
   * that plays the piece as written.
   */
  let repeatMeasureSpecsCache: readonly RepeatMeasureSpec[] | undefined;
  const repeatMeasureSpecs = (): readonly RepeatMeasureSpec[] => {
    if (repeatMeasureSpecsCache !== undefined) return repeatMeasureSpecsCache;
    const attrsFor = (measureNumber: number) => {
      for (const part of score.parts) {
        const attrs = attributesByPartAndMeasure.get(`${part.id}:${measureNumber}`);
        if (attrs !== undefined) return attrs;
      }
      return undefined;
    };
    /** The first part that declares anything at all about this measure's edges. */
    const edgeFor = (measureNumber: number) => {
      for (const part of score.parts) {
        const attrs = attributesByPartAndMeasure.get(`${part.id}:${measureNumber}`);
        if (attrs === undefined) continue;
        if (
          attrs.repeatDirection !== undefined ||
          attrs.leftRepeatDirection !== undefined ||
          attrs.endingNumbers !== undefined ||
          attrs.leftEndingNumbers !== undefined
        ) {
          return attrs;
        }
      }
      return attrsFor(measureNumber);
    };

    repeatMeasureSpecsCache = measureNumbersInOrder.map((measureNumber, index) => {
      const here = edgeFor(measureNumber);
      const previousNumber = measureNumbersInOrder[index - 1];
      const nextNumber = measureNumbersInOrder[index + 1];
      const previous = previousNumber !== undefined ? edgeFor(previousNumber) : undefined;
      const next = nextNumber !== undefined ? edgeFor(nextNumber) : undefined;

      const repeatStart =
        here?.leftRepeatDirection === 'forward' || previous?.repeatDirection === 'forward';
      const endsRepeat =
        here?.repeatDirection === 'backward' || next?.leftRepeatDirection === 'backward';
      const declaredTimes =
        (here?.repeatDirection === 'backward' ? here.repeatTimes : undefined) ??
        (next?.leftRepeatDirection === 'backward' ? next.leftRepeatTimes : undefined);

      // An <ending type="start"> normally rides this measure's LEFT
      // barline; a file that writes it on the PREVIOUS measure's right
      // barline means the same thing, one measure earlier in the
      // document but at the same physical line.
      const endingStart =
        (here?.leftEndingType !== 'stop' && here?.leftEndingType !== 'discontinue'
          ? here?.leftEndingNumbers
          : undefined) ?? (previous?.endingType === 'start' ? previous.endingNumbers : undefined);
      const endingStop =
        here?.endingType === 'stop' ||
        here?.endingType === 'discontinue' ||
        next?.leftEndingType === 'stop' ||
        next?.leftEndingType === 'discontinue';
      const endingDiscontinue =
        here?.endingType === 'discontinue' || next?.leftEndingType === 'discontinue';

      return {
        measureNumber,
        ticks: measureTicksByNumber.get(measureNumber) ?? TICKS_PER_QUARTER * 4,
        repeatStart,
        ...(endsRepeat ? { repeatEndTimes: declaredTimes ?? DEFAULT_REPEAT_TIMES } : {}),
        ...(endingStart !== undefined ? { endingStart } : {}),
        endingStop,
        ...(endingDiscontinue ? { endingDiscontinue: true } : {}),
      };
    });
    return repeatMeasureSpecsCache;
  };

  /**
   * How wide a measure's HEADER is -- the clef, key signature and time
   * signature it actually draws -- by the same rules the draw loop uses,
   * maximised over every part and staff because all parts share ONE
   * horizontal timeline (Integration L).
   *
   * It is not a constant, and `MEASURE_HEADER_ALLOWANCE` being one was
   * two separate bugs. A measure with a FOUR-SHARP key signature needs
   * 10.5 and got 6.0, so the tempo mark and the playback cursor landed
   * inside the header. A measure that restates NOTHING needs 0.5 and
   * also got 6.0, so every barline in the score was followed by five
   * staff spaces of empty air -- visible on this project's own drum
   * file, and the thing that made it look unlike MuseScore's output.
   *
   * `isSystemStart` is a parameter rather than a lookup because it is
   * needed BOTH before layout (to give each measure a width that fits
   * its own header) and after it (to record the final, exact width for
   * `positionToX`). Before layout the real answer does not exist yet --
   * which measures start a system is what layout decides -- so the
   * caller predicts it from the score's own `<print>` breaks, and the
   * post-layout pass corrects it.
   */
  const headerWidths = (isSystemStart: (measureNumber: number) => boolean): Map<number, number> => {
    const widthByMeasure = new Map<number, number>();
    for (const part of score.parts) {
      let previousAttrs: MeasureAttributes | undefined;
      part.measures.forEach((measure, measureIndex) => {
        const attrs = attributesByPartAndMeasure.get(`${part.id}:${measure.number}`);
        if (attrs === undefined) return;
        const systemStart = isSystemStart(measure.number);
        const clefChanged =
          previousAttrs === undefined ||
          previousAttrs.clefSign !== attrs.clefSign ||
          previousAttrs.clefLine !== attrs.clefLine;
        const keyChanged = previousAttrs === undefined || previousAttrs.fifths !== attrs.fifths;
        const timeChanged =
          previousAttrs === undefined ||
          previousAttrs.timeNumerator !== attrs.timeNumerator ||
          previousAttrs.timeDenominator !== attrs.timeDenominator;

        // Per staff, because `takesKeySignature` differs between them --
        // a guitar part's tab staff draws no key signature while its
        // notation staff does, and the WIDER one governs the timeline.
        const staffNumbers = Array.from({ length: Math.max(1, attrs.staves) }, (_, n) => n + 1);
        for (const staffNumber of staffNumbers) {
          const staffClef = attrs.clefsByStaff[staffNumber] ?? attrs.clefsByStaff[1];
          const { clefDef, keySigClefName } = mapClef(
            staffClef?.sign ?? attrs.clefSign,
            staffClef?.line ?? attrs.clefLine,
          );
          // A barline drawn at this measure's LEFT edge extends RIGHT,
          // into the measure -- a repeat-begin ("heavy-light" plus its
          // two dots) is nearly two staff spaces wide. Reserving it here
          // is what keeps the first note clear of it; the note used to
          // be pushed past it by the old blanket 6.0 allowance, which is
          // why removing that allowance is what exposed this.
          let width = MEASURE_LEADING_PAD + openingBarlineAllowance(measure.number);
          if (systemStart || clefChanged) width += 3;
          if ((systemStart || keyChanged) && attrs.fifths !== 0 && clefDef.takesKeySignature) {
            try {
              width += keySignatureAccidentals(attrs.fifths, keySigClefName).length + 0.5;
            } catch {
              // An unsupported clef draws no key signature at all (the
              // draw loop catches the same throw and warns), so it costs
              // no width either.
            }
          }
          if (measureIndex === 0 || timeChanged) width += 2.5;
          widthByMeasure.set(
            measure.number,
            Math.max(widthByMeasure.get(measure.number) ?? 0, width),
          );
        }
        previousAttrs = attrs;
      });
    }
    return widthByMeasure;
  };

  /** Rewrites every measure layout's `headerWidth` from a (now known) isSystemStart. */
  const applyHeaderWidths = (isSystemStart: (measureNumber: number) => boolean): void => {
    const widthByMeasure = headerWidths(isSystemStart);
    for (const [measureNumber, layout] of measureLayoutsByNumber) {
      measureLayoutsByNumber.set(measureNumber, {
        ...layout,
        headerWidth: widthByMeasure.get(measureNumber) ?? MEASURE_LEADING_PAD,
      });
    }
  };

  /**
   * The pre-layout prediction. A measure starts a system if it is the
   * score's first, or if the file itself asked for a break there
   * (`<print new-system>`/`new-page`). Page mode can break elsewhere
   * too, and those measures end up slightly narrow -- the draw loop's
   * own `Math.max(noteAreaXOf(...), cursorX)` still places their notes
   * correctly, and `applyHeaderWidths` below records the exact width, so
   * nothing DRIFTS; the measure is only a little tight.
   */
  const predictedSystemStarts = new Set<number>();
  {
    const first = measureNumbersInOrder[0];
    if (first !== undefined) predictedSystemStarts.add(first);
    for (const pr of prints) {
      if (pr.newSystem || pr.newPage) predictedSystemStarts.add(pr.measureNumber);
    }
  }
  const predictedHeaderWidths = headerWidths((n) => predictedSystemStarts.has(n));

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
      if (measureTicks === undefined || ticks > measureTicks) {
        measureTicks = ticks;
        timeSignatureByMeasure.set(measureNumber, {
          numerator: attrs.timeNumerator,
          denominator: attrs.timeDenominator,
        });
      }
    }
    const headerWidth = predictedHeaderWidths.get(measureNumber) ?? MEASURE_LEADING_PAD;
    const layout = computeMeasureLayout(
      makeMeasure(measureNumber, combinedVoices),
      measureTicks ?? TICKS_PER_QUARTER * 4,
      tempoMarks.filter((tm) => tm.measureNumber === measureNumber),
      headerWidth,
      config.spacing.minMeasureWidth,
    );
    measureLayoutsByNumber.set(measureNumber, { ...layout, headerWidth });
    measureTicksByNumber.set(measureNumber, measureTicks ?? TICKS_PER_QUARTER * 4);
  }

  /**
   * Phase 50: whether measure `measureNumber` of the TOP part could carry
   * a bar number, for headroom purposes only.
   *
   * Which measures actually start a system isn't known until layout runs
   * -- and layout's own system height depends on the padding computed
   * from this, so it cannot simply be reordered. In scroll mode (§16.1)
   * there is exactly ONE system, so only the score's first measure can
   * start one and the answer is exact. In page mode any measure can, so
   * every measure counts as a candidate: an over-estimate of the
   * headroom, never an under-estimate that would clip a number off the
   * top of the page.
   */
  const couldCarryBarNumber = (measureNumber: number, isFirstOfScore: boolean): boolean => {
    if (config.barNumbers.display === 'systemStart') {
      return config.layout.mode === 'scroll' ? isFirstOfScore : true;
    }
    return shouldShowBarNumber(measureNumber, config.barNumbers, false);
  };

  /**
   * Integration M (extended by Phase 50): how much extra room above the
   * staff the things drawn ABOVE it need -- tempo marks, and now bar
   * numbers -- beyond what STAFF_BOTTOM_Y already leaves. Computed
   * score-wide and applied uniformly, so every staff of every system
   * shifts together and nothing lands outside the viewBox. Zero when
   * nothing needs more room than the existing headroom, which is what
   * keeps most fixtures byte-identical.
   */
  const aboveStaffPadding = (() => {
    const existingHeadroom = STAFF_BOTTOM_Y - computeStaffGeometry(STAFF_LINES).height;
    let needed = 0;
    score.parts.forEach((part, partIndex) => {
      const midi = midiInstrumentsByPartMap.get(part.id);
      part.measures.forEach((m, measureIndex) => {
        const hasTempoMark = tempoMarks.some(
          (t) => t.partId === part.id && t.measureNumber === m.number,
        );
        // Only the top part draws bar numbers (see where they're drawn).
        const hasBarNumber = partIndex === 0 && couldCarryBarNumber(m.number, measureIndex === 0);
        if (hasBarNumber) {
          // A bar number sits at the measure's own LEFT EDGE, before the
          // header allowance the notes start after, so unlike a tempo
          // mark it has nothing to clear but the staff's top line -- no
          // note, stem or beam is ever drawn at that x. The digits rise
          // from their own baseline, so the font size is a safe
          // over-estimate of how far above it they reach.
          needed = Math.max(needed, BAR_NUMBER_GAP + theme.sizes.barNumber);
        }
        if (!hasTempoMark) return;
        const a = attributesByPartAndMeasure.get(`${part.id}:${m.number}`);
        const spec = a?.clefsByStaff[1];
        const { clefDef } = mapClef(spec?.sign ?? a?.clefSign ?? 'G', spec?.line ?? a?.clefLine);
        const extent = measureNorthExtent(m, 1, {
          clefDef,
          measureBottomY: 0,
          midiInstrumentsByPart: midi,
          theme,
        });
        needed = Math.max(needed, extent + TEMPO_MARK_GAP + TEMPO_MARK_HEIGHT);
      });
    });
    // A volta bracket (or a `×N`) is drawn above everything else that
    // goes above the staff, so it, not the bar number, sets the
    // headroom on a score that has one. `voltaGapAboveStaff` is the
    // distance to its LINE; the text of a `×N` rises above that line
    // from its own baseline, hence the font size on top.
    const specsForHeadroom = repeatMeasureSpecs();
    const needsVoltaRoom =
      specsForHeadroom.some((spec) => spec.endingStart !== undefined) ||
      specsForHeadroom.some(
        (spec) => spec.repeatEndTimes !== undefined && spec.repeatEndTimes > DEFAULT_REPEAT_TIMES,
      );
    if (needsVoltaRoom) {
      const raisedCount = specsForHeadroom.some(
        (spec) =>
          spec.repeatEndTimes !== undefined &&
          spec.repeatEndTimes > DEFAULT_REPEAT_TIMES &&
          voltaSpans(specsForHeadroom).some((span) =>
            span.measureNumbers.includes(spec.measureNumber),
          ),
      );
      needed = Math.max(
        needed,
        voltaGapAboveStaff(theme.sizes) +
          theme.sizes.barNumber +
          (raisedCount ? theme.sizes.barNumber + VOLTA_BAR_NUMBER_CLEARANCE : 0),
      );
    }
    return Math.max(0, needed - existingHeadroom);
  })();
  /** Every staff's bottom line sits this far down, above-staff headroom included. */
  const staffBottomY = STAFF_BOTTOM_Y + aboveStaffPadding;

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
    // §15.1's distance is a CLEARANCE: from the upper staff's bottom line
    // down to the lower staff's TOP line (upperSouth reaches below the
    // one, lowerNorth reaches above the other). computeSystemLayoutVariableGaps
    // stacks staves by their BOTTOM lines, so the lower staff's own
    // height is added here to convert between the two frames.
    //
    // Phase 50 found this while wiring `config.staves.minStaffDistance`:
    // the clearance used to be handed to the layout as though it were
    // already a bottom-to-bottom offset, which under-allocated by exactly
    // one staff height -- visible on the crossing-hands fixture, where 16
    // units of required clearance were granted only 12.
    const lowerStaffLines =
      attributes.find((a) => a.partId === part.id)?.staffLinesByStaff[lowerStaffNumber] ??
      STAFF_LINES;
    const lowerStaffHeight = computeStaffGeometry(lowerStaffLines).height;
    return (
      lowerStaffHeight +
      computeStaffDistance(upperSouth, lowerNorth, config.staves.minStaffDistance)
    );
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

  /** Where one measure sits: its x/width, which system and page it belongs to, and that system's own vertical origin. */
  interface MeasurePlacement {
    readonly x: number;
    readonly width: number;
    readonly systemY: number;
    readonly systemIndex: number;
    /** Phase 48/§17.1: always 0 in scroll mode (one page); the page-mode branch below sets the real value -- `positionToX` needs it to tell a host which page a tick's cursor lands on. */
    readonly pageIndex: number;
    readonly isSystemStart: boolean;
  }
  const placementByMeasureNumber = new Map<number, MeasurePlacement>();
  /** Each system's own left edge and vertical origin -- what a brace needs, once per system rather than once per part. */
  const systemOrigins: { systemIndex: number; x: number; systemY: number }[] = [];

  // One system's full vertical extent: the tallest staff stack in the
  // score (every part, every staff) plus the room STAFF_BOTTOM_Y already
  // reserves above the first staff.
  const lowestStaffOffset = scoreLayout.positions[scoreLayout.positions.length - 1]?.y ?? 0;
  const systemHeight = SYSTEM_HEIGHT + aboveStaffPadding + lowestStaffOffset;

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
            pageIndex,
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
        pageIndex: 0,
        isSystemStart: i === 0,
      });
    });
  }

  /**
   * Each measure's REAL header width -- the clef, key signature and time
   * signature it actually draws -- computed by the same rules the draw
   * loop below uses, and maximised over every part and staff because all
   * parts share ONE horizontal timeline (§Integration L).
   *
   * This exists because `MEASURE_HEADER_ALLOWANCE` is a constant (6.0)
   * and a real header is not: a four-sharp key signature makes it 10.
   * The draw loop already handled that with a local
   * `Math.max(layout.x + allowance, cursorX)`, so the NOTES were always
   * drawn in the right place -- but the tempo mark, the direction
   * placement and, worst, `positionToX` all kept using the bare
   * constant. On the user's own E-major score the playback cursor
   * reported x=6.00 for a note drawn at x=10.5. Found in the final
   * end-to-end review.
   *
   * Computing it here rather than inside the draw loop is what lets all
   * four agree: it needs `isSystemStart`, which only exists once system
   * placement is done, and it must be one number per measure rather than
   * one per staff, or a percussion part (no key signature) and a piano
   * part (four sharps) would start their notes at different x.
   */
  applyHeaderWidths(
    (measureNumber) => placementByMeasureNumber.get(measureNumber)?.isSystemStart ?? false,
  );

  /** Where a measure's notes actually begin: its own left edge plus its real header. */
  const noteAreaXOf = (measureX: number, measureNumber: number): number =>
    measureX + (measureLayoutsByNumber.get(measureNumber)?.headerWidth ?? MEASURE_HEADER_ALLOWANCE);

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
      // The SAME note-area x the note pass uses -- Integration G's own
      // hard-won lesson was that a marking computing its x in a different
      // coordinate system than the notes drifts apart from them as soon
      // as a measure's width changes, and the final review found exactly
      // that between the constant allowance and a real wide header.
      const noteAreaX = noteAreaXOf(placement.x, measureNumber);
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

      /**
       * Where the top staff sits, and how far this measure's own content
       * reaches above it -- shared by everything this engine draws ABOVE
       * the system (Integration D's tempo mark, Phase 50's bar number) so
       * the two can never disagree about what they have to clear.
       *
       * Computed directly from staff 1's own known geometry, since the
       * per-staff cursorX/staffGeometry the note-rendering loop below uses
       * aren't in scope yet at this point (each staff computes its own).
       * Lazy and memoized: a measure with neither a tempo mark nor a bar
       * number never pays for measureNorthExtent's scan of its notes.
       */
      let topStaffCache: { topStaffY: number; staffHeight: number } | undefined;
      const topStaff = (): { topStaffY: number; staffHeight: number } => {
        if (topStaffCache === undefined) {
          const topStaffGeometry = computeStaffGeometry(attrs.staffLinesByStaff[1] ?? STAFF_LINES);
          topStaffCache = {
            topStaffY: staffBottomY + systemY - topStaffGeometry.height,
            staffHeight: topStaffGeometry.height,
          };
        }
        return topStaffCache;
      };

      /**
       * Integration M: how far this measure's own content reaches above
       * the top staff line -- what a TEMPO MARK has to clear. The real
       * content, not just the staff's top line: on a drum chart the
       * hi-hat line IS the top line, so a fixed offset from it put the
       * mark straight through the beams -- measured on this project's own
       * fixture, the mark sat at y=1.50 while the first note's stem ran
       * 3.56 -> 0.50 at the very same x.
       *
       * Lazy: a measure with no tempo mark never pays for the scan. (A
       * bar number does NOT use this -- see where it's drawn.)
       */
      let northExtentCache: number | undefined;
      const topStaffNorthExtent = (): number => {
        if (northExtentCache === undefined) {
          const topClefSpec = attrs.clefsByStaff[1];
          const { clefDef: topClefDef } = mapClef(
            topClefSpec?.sign ?? attrs.clefSign,
            topClefSpec?.line ?? attrs.clefLine,
          );
          northExtentCache = measureNorthExtent(measure, 1, {
            clefDef: topClefDef,
            measureBottomY: 0,
            midiInstrumentsByPart: midiInstrumentsByPartMap.get(part.id),
            theme,
          });
        }
        return northExtentCache;
      };

      // Integration D: draw this measure's own tempo marks ONCE (above the
      // topmost staff, per tempoMarkSide()), never once per staff -- a
      // tempo mark describes the whole system, not one staff of it.
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
        const noteAreaX = noteAreaXOf(layout.x, measure.number);
        const noteAreaWidth = layout.x + layout.width - noteAreaX;
        const measureTotalTicks =
          attrs.timeNumerator * (4 / attrs.timeDenominator) * TICKS_PER_QUARTER;
        const { topStaffY } = topStaff();
        const northExtent = topStaffNorthExtent();
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
                color: theme.colorOf('tempo'),
                fontFamily: theme.musicFont,
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
        // Phase 51/§18.3: every staff line this render actually drew, for
        // the skyline overlay to hang its per-staff envelopes on.
        staffBottomYs.add(bottomY);

        svgParts.push(
          renderStaff(staffGeometry, {
            x: layout.x,
            y: bottomY,
            width: layout.width,
            color: theme.colorOf('staff'),
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
                  color: theme.colorOf('dynamic'),
                  fontFamily: theme.musicFont,
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
                  color: theme.colorOf('hairpin'),
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

        // Past the small leading pad AND past whatever barline is drawn
        // at this measure's own left edge, which extends RIGHT into the
        // measure -- a repeat-begin is nearly two staff spaces of thick
        // line, thin line and dots. `headerWidths` reserves exactly this
        // much, and the clef used to be drawn on top of it: the dots of
        // a repeat-begin on measure 1 landed inside the percussion clef.
        let cursorX = layout.x + MEASURE_LEADING_PAD + openingBarlineAllowance(measure.number);

        if (isSystemStart || clefChanged) {
          svgParts.push(
            renderClef(clefDef, {
              x: cursorX,
              // Integration A bug fix: a clef glyph belongs on the line it names
              // (gClef on G, fClef on F), not on the staff's bottom line.
              // Passing bottomY alone drew every clef too low -- barely
              // noticeable for treble (1 space) but glaring for bass (3).
              y: bottomY + clefDef.glyphY,
              color: theme.colorOf('clef'),
              fontFamily: theme.musicFont,
            }),
          );
          cursorX += 3;
        }

        // A key signature is drawn only on a staff that HAS a key --
        // `clefDef.takesKeySignature`, which is false for tab (says which
        // fret, not which pitch) and for percussion (a drum staff has no
        // key), and true everywhere else. NOT `positionsByPitch`: a
        // percussion clef does position by pitch, since it maps
        // `<unpitched>` display-step/octave through treble's reference
        // line, so that predicate would have kept the bug on drum staves.
        //
        // Found in the final end-to-end review, on the user's own guitar
        // file: it drew an F# on the TAB staff.
        if ((isSystemStart || keyChanged) && attrs.fifths !== 0 && clefDef.takesKeySignature) {
          try {
            const accidentals = keySignatureAccidentals(attrs.fifths, keySigClefName);
            svgParts.push(
              renderKeySignature(accidentals, {
                x: cursorX,
                spacing: 1,
                staffBottomY: bottomY,
                color: theme.colorOf('keySignature'),
                fontFamily: theme.musicFont,
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
                color: theme.colorOf('timeSignature'),
                fontFamily: theme.musicFont,
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
          const ctx: RenderCtx = { clefDef, measureBottomY: bottomY, midiInstrumentsByPart, theme };
          // Phase 43/44 wiring: the header allowance every measure reserves
          // (see computeMeasureLayout), not a fraction of this measure's
          // own (now content-driven, no longer fixed) width.
          // `noteAreaXOf` is the score-wide maximum across every part and
          // staff, so it is already at least this staff's own cursorX --
          // the Math.max that used to live here only ever compensated for
          // the constant being too small.
          const noteAreaX = Math.max(noteAreaXOf(layout.x, measure.number), cursorX);
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

            /**
             * Phase 51/§18.3: "every rendered element carries a stable
             * `data-id` attribute tracing back to its `Score` node".
             *
             * The id comes from `notationEventId`, the SAME function the
             * playback event stream builds its `noteIds` from (§17.1) --
             * so a host handed `{ tick, noteIds }` can find the exact
             * `<g>` that sounds at that tick with a plain
             * `querySelector`, with no second id scheme to keep in sync.
             * A chord member's `#n<i>` suffix resolves to its chord's own
             * group via `elementIdForNoteId`.
             */
            const withEventId = (svg: string, voiceId: number, eventIndex: number): string =>
              svgGroup([svg], {
                'data-id': notationEventId(part.id, measure.number, voiceId, eventIndex),
              });

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
                  memberSvgs,
                  beamSvg,
                  newAccidentalState,
                  anchors: groupAnchors,
                } = renderBeamGroup(
                  groupNotes,
                  groupXs,
                  ctx,
                  accidentalState,
                  theme.beamStyle,
                  forcedDirection,
                );
                groupAnchors.forEach((anchor, memberIndex) => {
                  const eventIndex = groupIndices[memberIndex];
                  if (eventIndex !== undefined) anchorByIndex.set(eventIndex, anchor);
                });
                // Phase 51/§18.3: each member carries its OWN id, not the
                // group's -- a beam is a relationship between events, and
                // a host highlighting one eighth note must not light up
                // the other three it happens to be beamed to.
                memberSvgs.forEach((memberSvg, memberIndex) => {
                  const eventIndex = groupIndices[memberIndex];
                  if (eventIndex === undefined) return;
                  svgParts.push(withEventId(memberSvg, voice.id, eventIndex));
                });
                svgParts.push(beamSvg);
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
                svgParts.push(withEventId(svg, voice.id, idx));
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
                      color: theme.colorOf('tie'),
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

                svgParts.push(withEventId(svg, voice.id, idx));
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
          // `noteAreaXOf` is the score-wide maximum across every part and
          // staff, so it is already at least this staff's own cursorX --
          // the Math.max that used to live here only ever compensated for
          // the constant being too small.
          const noteAreaX = Math.max(noteAreaXOf(layout.x, measure.number), cursorX);
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
              // Integration C's fret-number mask is painted in the
              // page's background colour, which a transparent render
              // does not have. Said once per render, not once per
              // fret -- a 200-note tab part would otherwise bury every
              // other diagnostic.
              if (!hasBackground(theme.background) && !reportedTransparentTabMask) {
                reportedTransparentTabMask = true;
                diagnostics.push({
                  severity: 'info',
                  code: 'TAB_MASK_ON_TRANSPARENT_BACKGROUND',
                  message:
                    'Tab fret numbers cannot mask the string line behind them on a transparent ' +
                    'background, so the line runs through them. Set colors.background to the ' +
                    'colour this render will sit on.',
                  location: { partId: part.id, measureNumber: measure.number },
                });
              }
              svgParts.push(
                renderTabNumber(fretDigitGlyphNames(event.fret), {
                  x: eventX,
                  y: bottomY + position,
                  color: theme.colorOf('tabNumber'),
                  backgroundColor: theme.background,
                  fontFamily: theme.musicFont,
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
      //
      // With ONE exception: if the next measure starts a new SYSTEM, the
      // barline it declares belongs to that system's left edge, not to
      // the trailing edge of this one. A repeat-begin drawn at the end
      // of a line is the wrong place for it -- the reader is told to
      // repeat from a point that is then on the next line.
      const nextAttrs = attributesByPartAndMeasure.get(`${part.id}:${measure.number + 1}`);
      const nextStartsSystem =
        placementByMeasureNumber.get(measure.number + 1)?.isSystemStart ?? false;
      const barlineType = mapBarline(
        (nextStartsSystem ? undefined : nextAttrs?.leftBarlineStyle) ?? attrs.barlineStyle,
        (nextStartsSystem ? undefined : nextAttrs?.leftRepeatDirection) ?? attrs.repeatDirection,
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
          color: theme.colorOf('barline'),
          fontFamily: theme.musicFont,
        }),
      );

      // This measure's OWN left edge, drawn only where no measure before
      // it could have: the first measure of the score, and any measure
      // that starts a system (whose predecessor now deliberately skips
      // it, just above).
      //
      // `openingBarlineWidth` has always RESERVED room for this -- which
      // is how a repeat-begin on measure 1 came to occupy space with
      // nothing drawn in it. A repeat from the top of the chart is about
      // as ordinary as a repeat gets, so this is not an edge case.
      if (
        isSystemStart &&
        (attrs.leftBarlineStyle !== undefined || attrs.leftRepeatDirection !== undefined)
      ) {
        svgParts.push(
          renderBarline(
            computeBarlineGeometry(
              mapBarline(attrs.leftBarlineStyle, attrs.leftRepeatDirection),
              barlineMetrics,
            ),
            {
              x: layout.x,
              staffBottomY: barlineBottomY,
              height: barlineHeight,
              color: theme.colorOf('barline'),
              fontFamily: theme.musicFont,
            },
          ),
        );
      }

      // Phase 50/§13.1: the bar number, drawn per `config.barNumbers`
      // (default 'systemStart'). Like a tempo mark this belongs to the
      // SYSTEM, not to a staff, so only the top part draws it -- a piano
      // score must not number each measure twice, once per staff.
      //
      // Drawn AFTER this measure's staves and notes so the digits sit on
      // top of anything they overlap, and at the measure's own left edge
      // (before the header allowance the notes start after), which keeps
      // it clear of a tempo mark in the same measure without needing to
      // know whether there is one: the mark starts at the note area, a
      // full MEASURE_HEADER_ALLOWANCE to the right of a one- or two-digit
      // number.
      if (
        partIndex === 0 &&
        shouldShowBarNumber(measure.number, config.barNumbers, isSystemStart)
      ) {
        const { topStaffY, staffHeight } = topStaff();
        svgParts.push(
          renderBarNumber(measure.number, {
            x: layout.x,
            staffBottomY: topStaffY + staffHeight,
            staffHeight,
            // A fixed gap above the TOP LINE, not above the measure's
            // content the way Integration M clears a tempo mark: the
            // number is at the measure's left edge, where no note, stem or
            // beam is ever drawn, so there is nothing else to clear.
            offsetAboveStaff: BAR_NUMBER_GAP,
            color: theme.colorOf('barNumber'),
            fontFamily: theme.textFont,
            fontSize: theme.sizes.barNumber,
          }),
        );
      }

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
        svgParts.push(
          renderBrace(braceShape, { color: theme.colorOf('brace'), fontFamily: theme.musicFont }),
        );
      }
    }
  });

  /**
   * §9.18: the two things a repeat structure draws ABOVE the staff --
   * volta ("1." / "2.") brackets, and the `×N` over a repeat played
   * more than twice.
   *
   * Drawn after every part, from `placementByMeasureNumber`, for one
   * reason the measure loop could not give: a volta spans a RANGE of
   * measures, and that range may cross a system break. Knowing which
   * measures share a system is exactly what the placement map is, so
   * one bracket per (volta, system) falls out of it -- with hooks only
   * at the volta's real ends, not at the break.
   */
  {
    const topPart = score.parts[0];
    const specs = topPart !== undefined ? repeatMeasureSpecs() : [];
    const spans = voltaSpans(specs);
    const repeatCounts = specs.filter(
      (spec) => spec.repeatEndTimes !== undefined && spec.repeatEndTimes > DEFAULT_REPEAT_TIMES,
    );
    if (topPart !== undefined && (spans.length > 0 || repeatCounts.length > 0)) {
      const topAttrs = firstAttributesByPart.get(topPart.id);
      const topStaffHeight = computeStaffGeometry(
        topAttrs?.staffLinesByStaff[1] ?? STAFF_LINES,
      ).height;
      const voltaGap = voltaGapAboveStaff(theme.sizes);
      const lineYFor = (measureNumber: number): number | undefined => {
        const placement = placementByMeasureNumber.get(measureNumber);
        if (placement === undefined) return undefined;
        return staffBottomY + placement.systemY - topStaffHeight - voltaGap;
      };
      const metrics = {
        thickness: getEngravingDefault('repeatEndingLineThickness') ?? 0.16,
        hookDepth: VOLTA_HOOK_DEPTH,
      };

      for (const span of spans) {
        // One bracket per contiguous run of the span's measures that
        // share a system.
        let runStart = 0;
        for (let i = 0; i <= span.measureNumbers.length; i++) {
          const current = span.measureNumbers[i];
          const previous = span.measureNumbers[i - 1];
          const sameSystem =
            current !== undefined &&
            previous !== undefined &&
            placementByMeasureNumber.get(current)?.systemIndex ===
              placementByMeasureNumber.get(previous)?.systemIndex;
          if (i > 0 && sameSystem) continue;
          if (i > 0) {
            const first = span.measureNumbers[runStart];
            const last = span.measureNumbers[i - 1];
            const firstPlacement =
              first !== undefined ? placementByMeasureNumber.get(first) : undefined;
            const lastPlacement =
              last !== undefined ? placementByMeasureNumber.get(last) : undefined;
            const y = first !== undefined ? lineYFor(first) : undefined;
            if (firstPlacement !== undefined && lastPlacement !== undefined && y !== undefined) {
              svgParts.push(
                renderVolta(
                  computeVoltaGeometry(
                    {
                      width: lastPlacement.x + lastPlacement.width - firstPlacement.x,
                      hasStartHook: runStart === 0,
                      hasEndHook: span.closed && i === span.measureNumbers.length,
                    },
                    metrics,
                  ),
                  {
                    x: firstPlacement.x,
                    y,
                    // Only the volta's FIRST piece is labelled; a
                    // continuation after a system break repeating "1."
                    // would read as a second, different ending.
                    label: runStart === 0 ? voltaLabel(span.numbers) : '',
                    color: theme.colorOf('volta'),
                    fontFamily: theme.textFont,
                    fontSize: theme.sizes.barNumber,
                  },
                ),
              );
            }
          }
          runStart = i;
        }
      }

      for (const spec of repeatCounts) {
        const placement = placementByMeasureNumber.get(spec.measureNumber);
        const y = lineYFor(spec.measureNumber);
        if (placement === undefined || y === undefined || spec.repeatEndTimes === undefined) {
          continue;
        }
        // The count sits ON the volta band when nothing else is there,
        // and one text height above it when a volta bracket already
        // ends at this very barline -- which is the normal case, since
        // a repeat played four times is usually the one with the
        // endings.
        const underVolta = spans.some((span) => span.measureNumbers.includes(spec.measureNumber));
        svgParts.push(
          renderRepeatCount(spec.repeatEndTimes, {
            x: placement.x + placement.width,
            y: underVolta ? y - (theme.sizes.barNumber + VOLTA_BAR_NUMBER_CLEARANCE) : y,
            color: theme.colorOf('volta'),
            fontFamily: theme.textFont,
            fontSize: theme.sizes.barNumber,
          }),
        );
      }
    }
  }

  // Phase 51/§18.3: the overlays, appended LAST so they sit on top of the
  // music they describe. Both are measured from the SVG this render just
  // produced (see `measureSvgBoxes`), so neither can disagree with what
  // was actually drawn -- and when both are off (the default) nothing
  // below runs at all.
  if (config.debug.drawBoundingBoxes || config.debug.drawSkyline) {
    const boxes = measureSvgBoxes(svgParts.join('\n'));
    if (config.debug.drawBoundingBoxes) {
      svgParts.push(renderBoundingBoxOverlay(boxes, { color: config.debug.boundingBoxColor }));
    }
    if (config.debug.drawSkyline) {
      const skylines = computeDebugSkylines(
        boxes,
        [...staffBottomYs].sort((a, b) => a - b),
      );
      svgParts.push(renderSkylineOverlay(skylines, { color: config.debug.skylineColor }));
    }
  }

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
      pxPerStaffSpace: config.layout.pxPerStaffSpace,
      backgroundColor: theme.background,
    },
    svgParts,
  );

  const playback = computePlaybackData({
    score,
    measureNumbersInOrder,
    measureTicksByNumber,
    timeSignatureByMeasure,
    tempoMarks,
    measureLayoutsByNumber,
    placementByMeasureNumber,
    measureHeaderAllowance: MEASURE_HEADER_ALLOWANCE,
    repeatMeasures: repeatMeasureSpecs(),
  });
  // One diagnostic channel for the caller (§18.3), whichever module
  // produced the finding -- `playback/repeats.ts` keeps its own
  // reporting shape for the same reason `timing/` does, and this is
  // where the two meet.
  for (const d of playback.repeatDiagnostics) {
    diagnostics.push({ severity: d.severity, code: d.code, message: d.message });
  }

  // §18.3: ONE diagnostic channel, severity-filtered by
  // `config.debug.logLevel` -- the engine has no console logging anywhere
  // for this filter to have to compete with. The default ('info') passes
  // everything, so a caller that sets nothing sees exactly what it always
  // did.
  return { svg, diagnostics: filterDiagnostics(diagnostics, config.debug.logLevel), playback };
}

/**
 * Parse a MusicXML document and render it, in one call -- the ordinary
 * entry point, and exactly `parseMusicXml` followed by
 * `renderParsedMusicXml`.
 *
 * For anything that re-renders the SAME score (a resize, a theme change,
 * a scroll/page switch), keep the `parseMusicXml` result and call
 * `renderParsedMusicXml` instead: parsing is the expensive step, and
 * §18.1's interactive budgets assume it is not repeated.
 */
export function renderFromMusicXml(
  xmlText: string,
  options?: RenderFromMusicXmlOptions,
): RenderFromMusicXmlResult {
  return renderParsedMusicXml(parseMusicXml(xmlText, options), options);
}
