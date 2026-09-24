import { pitchedPitch, unpitchedPitch, type PitchStep } from '../../core/pitch.js';
import { duration as makeDuration, type Duration } from '../../core/duration.js';
import { xmlDivisionsToTicks, TICKS_PER_QUARTER } from '../../core/duration-math.js';
import type { DurationType } from '../../core/duration.js';
import { note as makeNote, type Note } from '../../core/note.js';
import { rest as makeRest, type Rest } from '../../core/rest.js';
import { chord as makeChord } from '../../core/chord.js';
import type { MeasureEvent } from '../../core/measure-event.js';
import { voice as makeVoice } from '../../core/voice.js';
import { measure as makeMeasure, type Measure } from '../../core/measure.js';
import { part as makePart, type Part } from '../../core/part.js';
import { score as makeScore, type Score } from '../../core/score.js';
import { diagnostic, type Diagnostic, type DiagnosticLocation } from './diagnostic.js';
import { parseAttributesElement, type ClefSpec } from './attributes.js';
import { isKnownDurationType } from './note.js';
import { parseNoteElement, type ParsedNoteEvent } from './note.js';
import { attrOf, childrenNamed, firstChildNamed, intOf, textOf } from './dom-helpers.js';
import { parseMidiInstrumentMap } from './instrument.js';
import { convertTimewiseToPartwise } from './timewise.js';
import {
  directionPlacement,
  directionStaff,
  parseDirectionElement,
  parseSoundTempo,
  type ParsedDynamicLevel,
  type ParsedWedge,
} from './direction.js';
import { parseHarmonyElement, type ParsedHarmony } from './harmony.js';

const DEFAULT_DIVISIONS = 1;
const DEFAULT_FIFTHS = 0;
const DEFAULT_TIME_NUMERATOR = 4;
const DEFAULT_TIME_DENOMINATOR = 4;
const DEFAULT_CLEF_SIGN = 'G';
const DEFAULT_CLEF_LINE = 2;

/**
 * The per-(part, measure) clef/key/time/barline side-table §10 asks for --
 * separate from the core `Score`, which never knows about clefs or key/time
 * signatures at all (those are notational, not musical, per Phase 3).
 * Every measure gets an entry, even ones with no `<attributes>` of their
 * own -- inheriting whatever was last in effect, matching MusicXML's own
 * "attributes persist until changed" semantics.
 */
export interface MeasureAttributes {
  readonly partId: string;
  readonly measureNumber: number;
  readonly divisions: number;
  readonly fifths: number;
  /** `<key><mode>` as the file wrote it, lower-cased. Absent when it wrote none -- `fifths` alone cannot tell G major from E minor. */
  readonly mode?: string;
  readonly timeNumerator: number;
  readonly timeDenominator: number;
  /** STATUS C3/§9.4: an additive meter's written form ("3+2+2"), when the file wrote one. Absent for an ordinary meter. */
  readonly timeNumeratorDisplay?: string;
  readonly clefSign: string;
  readonly clefLine?: number;
  /** Integration A: how many staves this part has (piano = 2, most instruments = 1). */
  readonly staves: number;
  /** Integration A: every staff's own clef, keyed by staff number -- what a grand staff needs so its bass staff isn't collapsed onto its treble staff. */
  readonly clefsByStaff: Readonly<Record<number, ClefSpec>>;
  /** Integration B: each staff's own line count (tab = 6, most = 5), keyed by staff number. Absent entries mean the ordinary 5. */
  readonly staffLinesByStaff: Readonly<Record<number, number>>;
  /** Raw MusicXML <bar-style> text (e.g. "light-heavy") for this measure's ending (right-edge) barline, if present -- from a <barline> with no `location`, or an explicit `location="right"`. Mapping this to Phase 13's BarlineType is a later integration step's job, not the parser's. */
  readonly barlineStyle?: string;
  readonly repeatDirection?: 'forward' | 'backward';
  /**
   * `<repeat times="N">` on that same ending barline -- how many times
   * the repeated section is played IN TOTAL, not how many times it is
   * jumped back to. MusicXML's default when the attribute is absent is
   * 2 (play it, jump back, play it again), which is why this is
   * optional rather than defaulted here: "the file said 2" and "the
   * file said nothing" are different facts, and only the repeat
   * resolver needs to collapse them.
   */
  readonly repeatTimes?: number;
  /** `<ending number="1,2">` on the ending barline -- the volta numbers this measure's right edge closes. */
  readonly endingNumbers?: readonly number[];
  /** That `<ending>`'s own type. `discontinue` is an open-ended volta (no down-hook), which plays exactly like `stop`. */
  readonly endingType?: 'start' | 'stop' | 'discontinue';
  /**
   * Integration Q: the SAME two fields, but for a `<barline location="left">`
   * -- this measure's OWN starting (left-edge) barline, a different
   * physical position from its ending one above. Real files commonly write
   * a repeat's opening barline this way, on the first measure of the
   * repeated section, rather than as a `location="right"` on the measure
   * before it -- both describe the same barline conceptually, but only
   * `location` says which edge of THIS measure to draw it on.
   */
  readonly leftBarlineStyle?: string;
  readonly leftRepeatDirection?: 'forward' | 'backward';
  readonly leftRepeatTimes?: number;
  /** `<ending number="1,2" type="start">` on the STARTING barline -- the volta numbers this measure opens, which is where a volta bracket is drawn from. */
  readonly leftEndingNumbers?: readonly number[];
  readonly leftEndingType?: 'start' | 'stop' | 'discontinue';
}

/**
 * `<ending number="...">` is a comma-separated list of volta numbers
 * ("1", or "1,2", or "1, 3"). Anything non-numeric in it is dropped
 * rather than rejected -- MusicXML also allows a purely textual ending
 * label, which has no place in a repeat structure but should not cost
 * the file its other endings.
 */
function parseEndingNumbers(raw: string | null): readonly number[] | undefined {
  if (raw === null) return undefined;
  const numbers = raw
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((n) => Number.isInteger(n) && n > 0);
  return numbers.length > 0 ? numbers : undefined;
}

function parseEndingType(raw: string | null): 'start' | 'stop' | 'discontinue' | undefined {
  return raw === 'start' || raw === 'stop' || raw === 'discontinue' ? raw : undefined;
}

export interface TempoMarkEvent {
  readonly partId: string;
  readonly measureNumber: number;
  /** This measure-local tick, from the shared §10.1 cursor, at which the mark appears -- a <direction> is a marking, not a note/rest, and never advances that cursor. */
  readonly tick: number;
  readonly beatUnit: DurationType;
  readonly beatUnitDots: number;
  readonly perMinute: number;
}

/**
 * Phase 35 Tier 2/§10.4: one `<direction>`'s recognized content at the
 * measure-local tick it appeared at. A side-table for the same reason
 * `tempoMarks` is one -- a direction attaches to a POSITION, not to a
 * note, so Phase 3's core `Score` deliberately has nowhere to put it.
 */
export interface DirectionEvent {
  readonly partId: string;
  readonly measureNumber: number;
  /** Measure-local tick from §10.1's shared cursor. A `<direction>` is a marking and never advances it. */
  readonly tick: number;
  /** `<direction staff="N">`, defaulting to 1 -- which staff of a grand staff this marking sits under. */
  readonly staff: number;
  readonly placement?: 'above' | 'below';
  readonly dynamics: readonly ParsedDynamicLevel[];
  readonly wedges: readonly ParsedWedge[];
  readonly words: readonly string[];
  readonly rehearsals: readonly string[];
}

/** Phase 35 Tier 2/§10.4: one `<harmony>` (chord symbol) at a measure-local tick. See `harmony.ts` for why the `<kind>` is preserved raw rather than reduced. */
export interface HarmonyEvent extends ParsedHarmony {
  readonly partId: string;
  readonly measureNumber: number;
  readonly tick: number;
}

/**
 * Phase 35 Tier 2/§10.4: one `<print>`'s system/page break request.
 * §16.2's page layout consumes this directly ("Respects explicit
 * `<print new-system="yes">`/`new-page="yes"` from MusicXML").
 */
export interface PrintEvent {
  readonly partId: string;
  readonly measureNumber: number;
  readonly newSystem: boolean;
  readonly newPage: boolean;
}

export interface ParseResult {
  readonly score: Score;
  readonly attributes: readonly MeasureAttributes[];
  readonly diagnostics: readonly Diagnostic[];
  /** Integration D: every real <direction><direction-type><metronome> found, in document order. A separate side-table for the same reason midiInstrumentsByPart is -- a rendering-relevant fact Phase 3 deliberately keeps off the core Score/Note types. */
  readonly tempoMarks: readonly TempoMarkEvent[];
  /**
   * Phase 35/§10.4's `<midi-instrument>` data: per-part, a map from each
   * `<instrument id="...">` a `<note>` can reference to its GM
   * percussion note number (already corrected for MusicXML's 1-based
   * vs. GM's 0-based numbering -- see `instrument.ts`). Exposed as its
   * own side-table, the same shape as `attributes`, rather than added to
   * the core `Score`/`Note` types -- this is exactly the kind of "extra
   * fact a renderer might want, that Phase 3 deliberately keeps out of
   * the musical data model" `MeasureAttributes` already exists for.
   * Phase 41's own GM-note-to-notehead-shape default table is what
   * actually consumes this; this phase only makes the mapping available.
   */
  readonly midiInstrumentsByPart: ReadonlyMap<string, ReadonlyMap<string, number>>;
  /** Phase 35 Tier 2/§10.4: every `<direction>` with recognized content, in document order. */
  readonly directions: readonly DirectionEvent[];
  /** Phase 35 Tier 2/§10.4: every `<harmony>`, in document order. */
  readonly harmonies: readonly HarmonyEvent[];
  /** Phase 35 Tier 2/§10.4: every `<print>` that asks for a system or page break, in document order. */
  readonly prints: readonly PrintEvent[];
}

/** Minimal shape of what a DOMParser needs to provide -- lets tests inject jsdom's (or any other) implementation, per §10's "tests inject a parser so Node can run them." */
export interface DomParserLike {
  parseFromString(text: string, mimeType: string): { documentElement: Element | null };
}

export interface ParseMusicXmlOptions {
  readonly domParser?: new () => DomParserLike;
}

/** One note/rest event at a specific tick, in a specific voice -- the intermediate record the tick-cursor traversal produces before chord-grouping and Score assembly. */
interface TickRecord {
  readonly voiceId: number;
  readonly tick: number;
  readonly ev: ParsedNoteEvent;
}

function buildDuration(ev: ParsedNoteEvent): Duration {
  const tuplet =
    ev.tupletActualNotes !== undefined && ev.tupletNormalNotes !== undefined
      ? { actualNotes: ev.tupletActualNotes, normalNotes: ev.tupletNormalNotes }
      : undefined;
  return makeDuration(ev.durationType, ev.dots, ev.ticks, tuplet);
}

function buildSingle(ev: ParsedNoteEvent): Note | Rest {
  if (ev.isRest || ev.step === undefined || ev.octave === undefined) {
    return makeRest({
      duration: buildDuration(ev),
      voice: ev.voice,
      ...(ev.staff !== undefined ? { staff: ev.staff } : {}),
      // A rest can carry a fermata exactly as a note can (§10.4).
      ...(ev.notations.hasFermata ? { hasFermata: true } : {}),
    });
  }
  // Percussion (<unpitched>) and pitched notes use the SAME Note type --
  // they differ only in which kind of Pitch they carry, exactly as Phase
  // 3's §4.3 invariant requires. No isDrum flag anywhere.
  const pitch = ev.isUnpitched
    ? unpitchedPitch(ev.step, ev.octave)
    : pitchedPitch(ev.step, ev.alter ?? 0, ev.octave);
  return makeNote({
    pitch,
    duration: buildDuration(ev),
    voice: ev.voice,
    ...(ev.staff !== undefined ? { staff: ev.staff } : {}),
    ...(ev.tieStart ? { tieStart: true } : {}),
    ...(ev.tieStop ? { tieStop: true } : {}),
    ...(ev.explicitNotehead !== undefined ? { explicitNotehead: ev.explicitNotehead } : {}),
    ...(ev.explicitNoteheadSmufl !== undefined
      ? { explicitNoteheadSmufl: ev.explicitNoteheadSmufl }
      : {}),
    ...(ev.instrumentId !== undefined ? { instrumentId: ev.instrumentId } : {}),
    ...(ev.stringNumber !== undefined ? { stringNumber: ev.stringNumber } : {}),
    ...(ev.fret !== undefined ? { fret: ev.fret } : {}),
    ...(ev.isGrace ? { isGrace: true, graceSlash: ev.graceSlash } : {}),
    ...(ev.explicitStemDirection !== undefined
      ? { explicitStemDirection: ev.explicitStemDirection }
      : {}),
    ...(ev.hasExplicitAccidental ? { hasExplicitAccidental: true } : {}),
    // Phase 35 Tier 2/§10.4. Every one of these is omitted entirely when
    // empty rather than set to an empty array, so a note from a file
    // with no notations at all produces a byte-identical object to the
    // one it produced before this phase -- which is what keeps every
    // pre-existing snapshot and deep-equality test valid.
    ...(ev.notations.articulations.length > 0 ? { articulations: ev.notations.articulations } : {}),
    ...(ev.notations.ornaments.length > 0 ? { ornaments: ev.notations.ornaments } : {}),
    ...(ev.notations.hasFermata ? { hasFermata: true } : {}),
    ...(ev.notations.slurStarts.length > 0 ? { slurStarts: ev.notations.slurStarts } : {}),
    ...(ev.notations.slurStops.length > 0 ? { slurStops: ev.notations.slurStops } : {}),
    ...(ev.notations.tupletStart ? { tupletStart: true } : {}),
    ...(ev.notations.tupletStop ? { tupletStop: true } : {}),
    ...(ev.beams.length > 0 ? { beams: ev.beams } : {}),
    ...(ev.lyrics.length > 0 ? { lyrics: ev.lyrics } : {}),
  });
}

/**
 * Turns one group of same-tick, same-voice note events into a single
 * `MeasureEvent`. A lone event becomes a Note/Rest directly; 2+ becomes a
 * Chord -- but per §10.7, malformed chord data (e.g. mismatched durations
 * across members, which `chord()` validates and rejects) must never
 * throw uncaught. If `chord()` rejects the group, this falls back to just
 * the first member with a diagnostic, rather than losing the whole
 * measure to an exception.
 */
function buildEvent(
  group: readonly ParsedNoteEvent[],
  location: DiagnosticLocation,
  diagnostics: Diagnostic[],
): MeasureEvent {
  const first = group[0];
  if (first === undefined) {
    throw new Error('Internal error: empty event group passed to buildEvent');
  }
  if (group.length === 1) {
    return buildSingle(first);
  }

  const built = group.map((ev) => buildSingle(ev));
  const notesOnly = built.filter((n): n is Note => n.kind === 'note');
  if (notesOnly.length < 2) {
    diagnostics.push(
      diagnostic(
        'warning',
        'INVALID_CHORD',
        'A <chord> group had fewer than 2 real notes; using the first member only.',
        location,
      ),
    );
    return buildSingle(first);
  }
  try {
    return makeChord(notesOnly);
  } catch (err) {
    diagnostics.push(
      diagnostic(
        'warning',
        'INVALID_CHORD',
        `Chord group rejected (${err instanceof Error ? err.message : String(err)}); using the first note only.`,
        location,
      ),
    );
    const firstNote = notesOnly[0];
    if (firstNote === undefined) {
      throw new Error('Internal error: empty notesOnly after length check');
    }
    return firstNote;
  }
}

function isPitchStepText(value: string | undefined): value is PitchStep {
  return (
    value === 'C' ||
    value === 'D' ||
    value === 'E' ||
    value === 'F' ||
    value === 'G' ||
    value === 'A' ||
    value === 'B'
  );
}
void isPitchStepText; // reserved (e.g. for richer future diagnostics) -- referenced to silence unused-export lint

/**
 * Turns a MusicXML `<score-partwise>` document into a `Score` (§6) plus
 * the `MeasureAttributes` side-table and any `Diagnostic`s. Never throws
 * on malformed input (§10.7) -- the worst case is an empty `Score` with
 * diagnostics explaining why.
 *
 * Only `<score-partwise>` is accepted directly; `<score-timewise>`
 * conversion is Phase 36, and `.mxl` (compressed) input is Phase 36 too --
 * pass this function the already-decompressed XML text.
 */
export function parseMusicXml(xmlText: string, options?: ParseMusicXmlOptions): ParseResult {
  const diagnostics: Diagnostic[] = [];

  const DOMParserCtor: (new () => DomParserLike) | undefined =
    options?.domParser ?? (typeof DOMParser !== 'undefined' ? DOMParser : undefined);
  if (DOMParserCtor === undefined) {
    throw new Error(
      "No DOMParser available. In Node, pass one via options.domParser (e.g. jsdom's window.DOMParser).",
    );
  }

  const doc = new DOMParserCtor().parseFromString(xmlText, 'application/xml');
  const rawRoot = doc.documentElement;

  // §10.6: convert <score-timewise> to <score-partwise> up front so
  // everything below this point only ever sees one shape.
  const root =
    rawRoot !== null && rawRoot.tagName === 'score-timewise'
      ? convertTimewiseToPartwise(rawRoot)
      : rawRoot;

  if (root === null || root.tagName !== 'score-partwise') {
    diagnostics.push(
      diagnostic(
        'error',
        'UNSUPPORTED_ROOT',
        `Expected <score-partwise> or <score-timewise>, got "${root?.tagName ?? 'nothing'}".`,
      ),
    );
    return {
      score: makeScore({ parts: [] }),
      attributes: [],
      diagnostics,
      tempoMarks: [],
      midiInstrumentsByPart: new Map(),
      directions: [],
      harmonies: [],
      prints: [],
    };
  }

  const partListEl = firstChildNamed(root, 'part-list');
  const partNames = new Map<string, string>();
  const midiInstrumentMaps = new Map<string, ReadonlyMap<string, number>>();
  if (partListEl !== undefined) {
    for (const scorePartEl of childrenNamed(partListEl, 'score-part')) {
      const id = attrOf(scorePartEl, 'id');
      const name = textOf(firstChildNamed(scorePartEl, 'part-name'));
      if (id !== undefined) {
        partNames.set(id, name ?? id);
        midiInstrumentMaps.set(id, parseMidiInstrumentMap(scorePartEl));
      }
    }
  }

  const parts: Part[] = [];
  const allAttributes: MeasureAttributes[] = [];
  const tempoMarks: TempoMarkEvent[] = [];
  const directions: DirectionEvent[] = [];
  const harmonies: HarmonyEvent[] = [];
  const prints: PrintEvent[] = [];

  for (const partEl of childrenNamed(root, 'part')) {
    const partId = attrOf(partEl, 'id') ?? `part-${parts.length + 1}`;
    const partName = partNames.get(partId);

    // Running per-part state -- `<attributes>` legally persists across
    // measure boundaries until changed again (§10.8).
    let currentDivisions: number | undefined;
    let warnedMissingDivisions = false;
    let currentFifths = DEFAULT_FIFTHS;
    let currentMode: string | undefined;
    let currentTimeNumerator = DEFAULT_TIME_NUMERATOR;
    let currentTimeDenominator = DEFAULT_TIME_DENOMINATOR;
    /** STATUS C3: an additive meter's written form, cleared whenever a later <time> is an ordinary one -- otherwise a 7/8 "3+2+2" would keep displaying over a subsequent plain 4/4. */
    let currentTimeNumeratorDisplay: string | undefined;
    let currentClefSign = DEFAULT_CLEF_SIGN;
    let currentClefLine: number | undefined = DEFAULT_CLEF_LINE;
    // Integration A: a part's staff count and its per-staff clefs. Merged
    // PER STAFF rather than replaced wholesale -- a mid-piece <clef
    // number="2"> change must not wipe staff 1's own clef, which a plain
    // object-replace would do.
    let currentStaves = 1;
    let currentStaffLinesByStaff: Record<number, number> = {};
    let currentClefsByStaff: Record<number, ClefSpec> = {
      1:
        DEFAULT_CLEF_LINE !== undefined
          ? { sign: DEFAULT_CLEF_SIGN, line: DEFAULT_CLEF_LINE }
          : { sign: DEFAULT_CLEF_SIGN },
    };

    const measures: Measure[] = [];

    for (const measureEl of childrenNamed(partEl, 'measure')) {
      const rawNumber = attrOf(measureEl, 'number');
      const measureNumber =
        rawNumber !== undefined ? Number.parseInt(rawNumber, 10) : measures.length + 1;
      const location: DiagnosticLocation = { partId, measureNumber };

      const records: TickRecord[] = [];
      let tick = 0;
      // The ticks the most recently processed NON-chord note advanced the
      // cursor by -- a <chord/> continuation note must be recorded at the
      // BASE note's tick (tick - lastAdvance), never at the current
      // (already-advanced) cursor position. Missing this is the exact way
      // a naive translation of "chord notes don't advance the cursor"
      // still produces the wrong recorded tick for them.
      let lastAdvance = 0;
      let barlineStyle: string | undefined;
      let repeatDirection: 'forward' | 'backward' | undefined;
      let repeatTimes: number | undefined;
      let endingNumbers: readonly number[] | undefined;
      let endingType: 'start' | 'stop' | 'discontinue' | undefined;
      let leftBarlineStyle: string | undefined;
      let leftRepeatDirection: 'forward' | 'backward' | undefined;
      let leftRepeatTimes: number | undefined;
      let leftEndingNumbers: readonly number[] | undefined;
      let leftEndingType: 'start' | 'stop' | 'discontinue' | undefined;

      // §10.1: walk direct children IN DOCUMENT ORDER, maintaining one
      // shared tick cursor. Never filter by voice -- that's the exact bug
      // the pre-Phase-1 prototype hit once, now a hard rule here.
      for (const child of Array.from(measureEl.children)) {
        if (child.tagName === 'attributes') {
          const update = parseAttributesElement(child);
          if (update.divisions !== undefined) currentDivisions = update.divisions;
          if (update.fifths !== undefined) currentFifths = update.fifths;
          // Assigned even when undefined: a new <key> with no <mode>
          // has stopped saying, and carrying the old answer forward
          // would report a mode this file no longer claims.
          if (update.fifths !== undefined || update.mode !== undefined) currentMode = update.mode;
          if (update.timeNumerator !== undefined) {
            currentTimeNumerator = update.timeNumerator;
            // Deliberately assigned even when undefined: a new <time> that
            // is NOT additive must clear a previous additive display.
            currentTimeNumeratorDisplay = update.timeNumeratorDisplay;
          }
          if (update.timeDenominator !== undefined) currentTimeDenominator = update.timeDenominator;
          if (update.clefSign !== undefined) currentClefSign = update.clefSign;
          if (update.clefLine !== undefined) currentClefLine = update.clefLine;
          if (update.staves !== undefined) currentStaves = update.staves;
          if (update.clefsByStaff !== undefined) {
            currentClefsByStaff = { ...currentClefsByStaff, ...update.clefsByStaff };
          }
          if (update.staffLinesByStaff !== undefined) {
            currentStaffLinesByStaff = {
              ...currentStaffLinesByStaff,
              ...update.staffLinesByStaff,
            };
          }
        } else if (child.tagName === 'note') {
          if (currentDivisions === undefined) {
            currentDivisions = DEFAULT_DIVISIONS;
            if (!warnedMissingDivisions) {
              diagnostics.push(
                diagnostic(
                  'warning',
                  'MISSING_DIVISIONS',
                  'No <divisions> found before the first note; assuming 1.',
                  location,
                ),
              );
              warnedMissingDivisions = true;
            }
          }
          const { event, diagnostics: noteDiags } = parseNoteElement(
            child,
            currentDivisions,
            location,
          );
          diagnostics.push(...noteDiags);
          if (event.isUnsupported) {
            diagnostics.push(
              diagnostic(
                'info',
                'UNSUPPORTED_NOTE',
                'Skipped a <note> that is neither <pitch>, <unpitched>, nor <rest>.',
                location,
              ),
            );
          } else {
            const recordTick = event.isChordMember ? tick - lastAdvance : tick;
            records.push({ voiceId: event.voice, tick: recordTick, ev: event });
          }
          if (!event.isChordMember) {
            tick += event.ticks;
            lastAdvance = event.ticks;
          }
        } else if (child.tagName === 'backup') {
          const amount = intOf(firstChildNamed(child, 'duration')) ?? 0;
          const target = tick - xmlDivisionsToTicks(amount, currentDivisions ?? DEFAULT_DIVISIONS);
          // MusicXML's own rule: `<backup>` may not move before the start
          // of the measure. Real files break it -- writing the measure's
          // LENGTH where they meant the elapsed amount is a common
          // mistake, and this project's own tie-dot-staff fixture does
          // exactly that. Clamping keeps the following voice at the
          // measure start (where it plainly belongs) instead of placing
          // it at a negative tick; §10.7's rule is to say so rather than
          // silently absorb it.
          if (target < 0) {
            diagnostics.push(
              diagnostic(
                'warning',
                'BACKUP_BEFORE_MEASURE_START',
                `A <backup> of ${amount} divisions would move ${-target} ticks before the start of the measure; clamped to the measure start.`,
                location,
              ),
            );
          }
          tick = Math.max(0, target);
          lastAdvance = 0; // a chord can never span a backup/forward boundary
        } else if (child.tagName === 'forward') {
          const amount = intOf(firstChildNamed(child, 'duration')) ?? 0;
          tick += xmlDivisionsToTicks(amount, currentDivisions ?? DEFAULT_DIVISIONS);
          lastAdvance = 0;
        } else if (child.tagName === 'barline') {
          // Integration Q: `location="left"` is a DIFFERENT physical
          // position (this measure's own starting edge) from the default
          // /`"right"` case (its ending edge) -- conflating them put a
          // real file's repeat-begin barline (written this way on the
          // first measure of the repeated section) a whole measure late,
          // sharing the ending-barline fields with whatever THIS measure's
          // own right edge needed instead.
          const style = textOf(firstChildNamed(child, 'bar-style'));
          const repeatEl = firstChildNamed(child, 'repeat');
          const dir = repeatEl?.getAttribute('direction');
          const rawTimes = repeatEl?.getAttribute('times');
          const times =
            rawTimes !== null && rawTimes !== undefined
              ? Number.parseInt(rawTimes, 10)
              : Number.NaN;
          const endingEl = firstChildNamed(child, 'ending');
          const numbers = parseEndingNumbers(endingEl?.getAttribute('number') ?? null);
          const type = parseEndingType(endingEl?.getAttribute('type') ?? null);
          if (child.getAttribute('location') === 'left') {
            if (style !== undefined) leftBarlineStyle = style;
            if (dir === 'forward' || dir === 'backward') leftRepeatDirection = dir;
            if (Number.isInteger(times) && times >= 1) leftRepeatTimes = times;
            if (numbers !== undefined) leftEndingNumbers = numbers;
            if (type !== undefined) leftEndingType = type;
          } else {
            if (style !== undefined) barlineStyle = style;
            if (dir === 'forward' || dir === 'backward') repeatDirection = dir;
            if (Number.isInteger(times) && times >= 1) repeatTimes = times;
            if (numbers !== undefined) endingNumbers = numbers;
            if (type !== undefined) endingType = type;
          }
        } else if (child.tagName === 'direction') {
          // Integration D: <direction><direction-type><metronome> is a
          // MARKING, not a note/rest -- it never advances the shared tick
          // cursor. Recorded at the CURRENT (measure-local) tick, since
          // §10.1's cursor is exactly where this direction was encountered
          // in document order. A <direction> with no <metronome> (e.g.
          // <words> text, <dynamics>, <wedge>) is still v2/out-of-scope --
          // recorded the same UNKNOWN_ELEMENT way as before, rather than
          // silently swallowed now that <direction> itself has a branch.
          let recognizedSomething = false;
          let producedTempoMark = false;
          for (const directionTypeEl of childrenNamed(child, 'direction-type')) {
            const metronomeEl = firstChildNamed(directionTypeEl, 'metronome');
            if (metronomeEl === undefined) continue;
            const rawBeatUnit = textOf(firstChildNamed(metronomeEl, 'beat-unit'));
            const perMinute = intOf(firstChildNamed(metronomeEl, 'per-minute'));
            if (
              rawBeatUnit === undefined ||
              !isKnownDurationType(rawBeatUnit) ||
              perMinute === undefined
            ) {
              diagnostics.push(
                diagnostic(
                  'info',
                  'UNSUPPORTED_METRONOME',
                  'A <metronome> element is missing a recognized <beat-unit> or <per-minute>; skipping it.',
                  location,
                ),
              );
              recognizedSomething = true;
              continue;
            }
            const beatUnitDots = childrenNamed(metronomeEl, 'beat-unit-dot').length;
            tempoMarks.push({
              partId,
              measureNumber,
              tick,
              beatUnit: rawBeatUnit,
              beatUnitDots,
              perMinute,
            });
            recognizedSomething = true;
            producedTempoMark = true;
          }

          // Phase 35 Tier 2/§10.4: the rest of <direction>'s content --
          // dynamics, wedges, words, rehearsal marks -- plus <sound tempo>.
          const { content, diagnostics: directionDiags } = parseDirectionElement(child, location);
          diagnostics.push(...directionDiags);
          if (directionDiags.length > 0) recognizedSomething = true;
          const placement = directionPlacement(child);
          if (
            content.dynamics.length > 0 ||
            content.wedges.length > 0 ||
            content.words.length > 0 ||
            content.rehearsals.length > 0
          ) {
            directions.push({
              partId,
              measureNumber,
              tick,
              staff: directionStaff(child),
              ...(placement !== undefined ? { placement } : {}),
              dynamics: content.dynamics,
              wedges: content.wedges,
              words: content.words,
              rehearsals: content.rehearsals,
            });
            recognizedSomething = true;
          }
          // A <sound tempo> alongside a <metronome> in the SAME <direction>
          // is the same tempo stated twice (MuseScore and others routinely
          // emit both) -- taking both would put two marks at one tick. The
          // notated <metronome> wins, since it carries a real beat unit;
          // <sound tempo> is quarter-notes-per-minute by definition and is
          // only used when nothing notated said otherwise here.
          if (content.soundTempo !== undefined && !producedTempoMark) {
            tempoMarks.push({
              partId,
              measureNumber,
              tick,
              beatUnit: 'quarter',
              beatUnitDots: 0,
              perMinute: content.soundTempo,
            });
            recognizedSomething = true;
          }

          if (!recognizedSomething) {
            diagnostics.push(
              diagnostic(
                'info',
                'UNKNOWN_ELEMENT',
                'Ignored <direction> (nothing the v2 parser recognizes inside it).',
                location,
              ),
            );
          }
        } else if (child.tagName === 'harmony') {
          // Phase 35 Tier 2/§10.4: a chord symbol at the current cursor
          // position. Like <direction>, it is a marking and never advances
          // the tick cursor.
          harmonies.push({ partId, measureNumber, tick, ...parseHarmonyElement(child) });
        } else if (child.tagName === 'print') {
          // Phase 35 Tier 2/§10.4 + §16.2: an explicit system/page break.
          // Recorded only when it actually asks for one -- a <print> that
          // merely carries layout hints is not a break request.
          const newSystem = child.getAttribute('new-system') === 'yes';
          const newPage = child.getAttribute('new-page') === 'yes';
          if (newSystem || newPage) {
            prints.push({ partId, measureNumber, newSystem, newPage });
          }
          // A <print> also legally carries page/system/staff LAYOUT hints
          // (<system-layout>, <staff-layout>, ...). Those are genuinely
          // not read by this parser, and §10.7's no-silent-loss rule means
          // saying so beats going quiet just because the same element's
          // break attributes happen to be understood now.
          const ignoredPrintChildren = Array.from(child.children).map((c) => c.tagName);
          if (ignoredPrintChildren.length > 0) {
            diagnostics.push(
              diagnostic(
                'info',
                'UNKNOWN_ELEMENT',
                `Ignored <print> layout hints: <${ignoredPrintChildren.join('>, <')}>.`,
                location,
              ),
            );
          }
        } else if (child.tagName === 'sound') {
          // A bare <sound tempo> directly under <measure> (legal, and how
          // some exporters state a tempo with no visible marking at all).
          const soundTempo = parseSoundTempo(child);
          if (soundTempo !== undefined) {
            tempoMarks.push({
              partId,
              measureNumber,
              tick,
              beatUnit: 'quarter',
              beatUnitDots: 0,
              perMinute: soundTempo,
            });
          }
        } else {
          // §10.7: an unknown element is ignored but recorded at 'info'
          // severity -- not silently dropped without a trace. Covers
          // both genuinely unknown tags and v1-out-of-scope v2 elements
          // (<print>, etc.) alike; v1 doesn't act on most of them, but the
          // caller can still see they were present.
          diagnostics.push(
            diagnostic(
              'info',
              'UNKNOWN_ELEMENT',
              `Ignored <${child.tagName}> (not handled by the v1 parser).`,
              location,
            ),
          );
        }
      }

      // Group by voice, sort by tick (stable -- preserves each chord
      // group's original relative order), then merge consecutive
      // same-tick chord-member records into one MeasureEvent each.
      const byVoice = new Map<number, TickRecord[]>();
      for (const record of records) {
        const list = byVoice.get(record.voiceId);
        if (list === undefined) {
          byVoice.set(record.voiceId, [record]);
        } else {
          list.push(record);
        }
      }

      const voices = [];
      for (const [voiceId, list] of byVoice) {
        const sorted = [...list].sort((a, b) => a.tick - b.tick);
        const events: MeasureEvent[] = [];
        let i = 0;
        while (i < sorted.length) {
          const head = sorted[i];
          if (head === undefined) break;
          const group: ParsedNoteEvent[] = [head.ev];
          let j = i + 1;
          for (;;) {
            const next = sorted[j];
            if (next === undefined || next.tick !== head.tick || !next.ev.isChordMember) break;
            group.push(next.ev);
            j++;
          }
          // §10.1's cursor, carried onto the event itself. Without this
          // every consumer re-derives the tick by summing the durations
          // before it, which is wrong for any voice with a `<forward>`
          // gap or one that starts partway into the measure -- see
          // `startTick`'s own comment in core/note.ts.
          events.push({ ...buildEvent(group, location, diagnostics), startTick: head.tick });
          i = j;
        }
        voices.push(makeVoice(voiceId, events));

        // §10.7: a voice whose events run past what the current time
        // signature implies is kept and rendered anyway -- just warned
        // about here. Layout (a later phase) decides how to actually
        // display an overrun measure; this parser's only job is to not
        // silently lose or truncate the data.
        const lastRecord = sorted[sorted.length - 1];
        if (lastRecord !== undefined) {
          const voiceEndTick = lastRecord.tick + lastRecord.ev.ticks;
          const expectedTicks =
            currentTimeNumerator * (4 / currentTimeDenominator) * TICKS_PER_QUARTER;
          const TICK_EPSILON = 1e-6;
          if (voiceEndTick > expectedTicks + TICK_EPSILON) {
            diagnostics.push(
              diagnostic(
                'warning',
                'MEASURE_OVERRUN',
                `Voice ${voiceId} has ${voiceEndTick} ticks, more than the ${currentTimeNumerator}/${currentTimeDenominator} time signature implies (${expectedTicks}). Keeping the events; layout will handle the overflow.`,
                location,
              ),
            );
          }
        }
      }

      measures.push(makeMeasure(measureNumber, voices));

      allAttributes.push({
        partId,
        measureNumber,
        divisions: currentDivisions ?? DEFAULT_DIVISIONS,
        fifths: currentFifths,
        ...(currentMode !== undefined ? { mode: currentMode } : {}),
        timeNumerator: currentTimeNumerator,
        timeDenominator: currentTimeDenominator,
        ...(currentTimeNumeratorDisplay !== undefined
          ? { timeNumeratorDisplay: currentTimeNumeratorDisplay }
          : {}),
        clefSign: currentClefSign,
        ...(currentClefLine !== undefined ? { clefLine: currentClefLine } : {}),
        staves: currentStaves,
        clefsByStaff: { ...currentClefsByStaff },
        staffLinesByStaff: { ...currentStaffLinesByStaff },
        ...(barlineStyle !== undefined ? { barlineStyle } : {}),
        ...(repeatDirection !== undefined ? { repeatDirection } : {}),
        ...(repeatTimes !== undefined ? { repeatTimes } : {}),
        ...(endingNumbers !== undefined ? { endingNumbers } : {}),
        ...(endingType !== undefined ? { endingType } : {}),
        ...(leftBarlineStyle !== undefined ? { leftBarlineStyle } : {}),
        ...(leftRepeatDirection !== undefined ? { leftRepeatDirection } : {}),
        ...(leftRepeatTimes !== undefined ? { leftRepeatTimes } : {}),
        ...(leftEndingNumbers !== undefined ? { leftEndingNumbers } : {}),
        ...(leftEndingType !== undefined ? { leftEndingType } : {}),
      });
    }

    parts.push(makePart(partId, measures, partName));
  }

  const totalMeasures = parts.reduce((sum, p) => sum + p.measures.length, 0);
  if (parts.length === 0 || totalMeasures === 0) {
    // §10.7: zero parseable measures is the only case that yields an
    // empty Score -- and even then, diagnostics, never an exception.
    diagnostics.push(
      diagnostic(
        'warning',
        'NO_MEASURES',
        parts.length === 0
          ? 'The document produced zero parts.'
          : "The document's parts produced zero measures.",
      ),
    );
  }

  return {
    score: makeScore({ parts }),
    attributes: allAttributes,
    diagnostics,
    tempoMarks,
    midiInstrumentsByPart: midiInstrumentMaps,
    directions,
    harmonies,
    prints,
  };
}
