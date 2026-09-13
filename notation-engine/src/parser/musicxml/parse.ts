import { pitchedPitch, unpitchedPitch, type PitchStep } from '../../core/pitch.js';
import { duration as makeDuration, type Duration } from '../../core/duration.js';
import { xmlDivisionsToTicks, TICKS_PER_QUARTER } from '../../core/duration-math.js';
import { note as makeNote, type Note } from '../../core/note.js';
import { rest as makeRest, type Rest } from '../../core/rest.js';
import { chord as makeChord } from '../../core/chord.js';
import type { MeasureEvent } from '../../core/measure-event.js';
import { voice as makeVoice } from '../../core/voice.js';
import { measure as makeMeasure, type Measure } from '../../core/measure.js';
import { part as makePart, type Part } from '../../core/part.js';
import { score as makeScore, type Score } from '../../core/score.js';
import { diagnostic, type Diagnostic, type DiagnosticLocation } from './diagnostic.js';
import { parseAttributesElement } from './attributes.js';
import { parseNoteElement, type ParsedNoteEvent } from './note.js';
import { attrOf, childrenNamed, firstChildNamed, intOf, textOf } from './dom-helpers.js';
import { parseMidiInstrumentMap } from './instrument.js';

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
  readonly timeNumerator: number;
  readonly timeDenominator: number;
  readonly clefSign: string;
  readonly clefLine?: number;
  /** Raw MusicXML <bar-style> text (e.g. "light-heavy") for this measure's ending barline, if present. Mapping this to Phase 13's BarlineType is a later integration step's job, not the parser's. */
  readonly barlineStyle?: string;
  readonly repeatDirection?: 'forward' | 'backward';
}

export interface ParseResult {
  readonly score: Score;
  readonly attributes: readonly MeasureAttributes[];
  readonly diagnostics: readonly Diagnostic[];
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
    ...(ev.isGrace ? { isGrace: true, graceSlash: ev.graceSlash } : {}),
    ...(ev.explicitStemDirection !== undefined
      ? { explicitStemDirection: ev.explicitStemDirection }
      : {}),
    ...(ev.hasExplicitAccidental ? { hasExplicitAccidental: true } : {}),
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
  const root = doc.documentElement;

  if (root === null || root.tagName !== 'score-partwise') {
    diagnostics.push(
      diagnostic(
        'error',
        'UNSUPPORTED_ROOT',
        `Expected <score-partwise>, got "${root?.tagName ?? 'nothing'}" (score-timewise is a later phase).`,
      ),
    );
    return {
      score: makeScore({ parts: [] }),
      attributes: [],
      diagnostics,
      midiInstrumentsByPart: new Map(),
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

  for (const partEl of childrenNamed(root, 'part')) {
    const partId = attrOf(partEl, 'id') ?? `part-${parts.length + 1}`;
    const partName = partNames.get(partId);

    // Running per-part state -- `<attributes>` legally persists across
    // measure boundaries until changed again (§10.8).
    let currentDivisions: number | undefined;
    let warnedMissingDivisions = false;
    let currentFifths = DEFAULT_FIFTHS;
    let currentTimeNumerator = DEFAULT_TIME_NUMERATOR;
    let currentTimeDenominator = DEFAULT_TIME_DENOMINATOR;
    let currentClefSign = DEFAULT_CLEF_SIGN;
    let currentClefLine: number | undefined = DEFAULT_CLEF_LINE;

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

      // §10.1: walk direct children IN DOCUMENT ORDER, maintaining one
      // shared tick cursor. Never filter by voice -- that's the exact bug
      // the pre-Phase-1 prototype hit once, now a hard rule here.
      for (const child of Array.from(measureEl.children)) {
        if (child.tagName === 'attributes') {
          const update = parseAttributesElement(child);
          if (update.divisions !== undefined) currentDivisions = update.divisions;
          if (update.fifths !== undefined) currentFifths = update.fifths;
          if (update.timeNumerator !== undefined) currentTimeNumerator = update.timeNumerator;
          if (update.timeDenominator !== undefined) currentTimeDenominator = update.timeDenominator;
          if (update.clefSign !== undefined) currentClefSign = update.clefSign;
          if (update.clefLine !== undefined) currentClefLine = update.clefLine;
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
          tick -= xmlDivisionsToTicks(amount, currentDivisions ?? DEFAULT_DIVISIONS);
          lastAdvance = 0; // a chord can never span a backup/forward boundary
        } else if (child.tagName === 'forward') {
          const amount = intOf(firstChildNamed(child, 'duration')) ?? 0;
          tick += xmlDivisionsToTicks(amount, currentDivisions ?? DEFAULT_DIVISIONS);
          lastAdvance = 0;
        } else if (child.tagName === 'barline') {
          const style = textOf(firstChildNamed(child, 'bar-style'));
          if (style !== undefined) barlineStyle = style;
          const repeatEl = firstChildNamed(child, 'repeat');
          const dir = repeatEl?.getAttribute('direction');
          if (dir === 'forward' || dir === 'backward') repeatDirection = dir;
        } else {
          // §10.7: an unknown element is ignored but recorded at 'info'
          // severity -- not silently dropped without a trace. Covers
          // both genuinely unknown tags and v1-out-of-scope v2 elements
          // (<direction>, <print>, etc.) alike; v1 doesn't act on any of
          // them, but the caller can still see they were present.
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
          events.push(buildEvent(group, location, diagnostics));
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
        timeNumerator: currentTimeNumerator,
        timeDenominator: currentTimeDenominator,
        clefSign: currentClefSign,
        ...(currentClefLine !== undefined ? { clefLine: currentClefLine } : {}),
        ...(barlineStyle !== undefined ? { barlineStyle } : {}),
        ...(repeatDirection !== undefined ? { repeatDirection } : {}),
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
    midiInstrumentsByPart: midiInstrumentMaps,
  };
}
