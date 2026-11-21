import type { Score } from '../core/index.js';
import { isPitched } from '../core/pitch.js';
import { TICKS_PER_QUARTER, baseTicksForType, ticksWithDots } from '../core/duration-math.js';
import type { DirectionEvent, TempoMarkEvent } from '../parser/musicxml/parse.js';
import type { MidiInstrumentInfo } from '../parser/musicxml/instrument.js';
import { buildTempoMap, type RawTempoEvent } from '../timing/tempo-map.js';
import { buildEventStream } from './event-stream.js';
import { buildRepeatPlan, type RepeatMeasureSpec } from './repeats.js';
import type {
  PlaybackData,
  PlaybackMeasureLayout,
  PlaybackMeasurePlacement,
  PlaybackTrack,
} from './position.js';

const DEFAULT_MEASURE_TICKS = TICKS_PER_QUARTER * 4;
/** §11.1's own MIDI default, matching `timing/tempo-map.ts`'s own fallback: no tempo stated at all means 120 BPM. */
const DEFAULT_MICROSECONDS_PER_QUARTER = 500_000;

/**
 * A `<metronome>`-derived tempo mark states its BPM in whatever
 * `beat-unit` the file chose (an eighth note, a dotted quarter, ...),
 * never necessarily a quarter -- but §12's `TempoMap` is defined in
 * quarter-notes-per-minute throughout (`RawTempoEvent.microsecondsPerQuarter`).
 * Converts by the ratio of one beat-unit's own tick length to one
 * quarter's: e.g. "eighth = 120" is 120 eighth-notes/minute, exactly 60
 * quarter-notes/minute, half as fast as "quarter = 120" would be.
 */
function microsecondsPerQuarterFor(mark: TempoMarkEvent): number {
  const beatUnitTicks = ticksWithDots(baseTicksForType(mark.beatUnit), mark.beatUnitDots);
  const quarterNotesPerMinute = mark.perMinute * (beatUnitTicks / TICKS_PER_QUARTER);
  return quarterNotesPerMinute > 0
    ? 60_000_000 / quarterNotesPerMinute
    : DEFAULT_MICROSECONDS_PER_QUARTER;
}

export interface ComputePlaybackDataInput {
  readonly score: Score;
  /** Every measure number in the score's own performance order -- `renderFromMusicXml`'s own `measureNumbersInOrder`. */
  readonly measureNumbersInOrder: readonly number[];
  /** Each measure's own real tick length -- `renderFromMusicXml`'s own `measureTicksByNumber`, already resolved for the rare case where two parts disagree (longest wins). */
  readonly measureTicksByNumber: ReadonlyMap<number, number>;
  readonly timeSignatureByMeasure: ReadonlyMap<
    number,
    { readonly numerator: number; readonly denominator: number }
  >;
  readonly tempoMarks: readonly TempoMarkEvent[];
  /** `renderFromMusicXml`'s own `measureLayoutsByNumber` -- the SAME object the SVG was drawn from, not a second computation of it. */
  readonly measureLayoutsByNumber: ReadonlyMap<number, PlaybackMeasureLayout>;
  /** `renderFromMusicXml`'s own `placementByMeasureNumber`. */
  readonly placementByMeasureNumber: ReadonlyMap<number, PlaybackMeasurePlacement>;
  readonly measureHeaderAllowance: number;
  /**
   * MusicXML `<transpose>` semitones per `${partId}:${measureNumber}`,
   * so `events[].midiNotes` sounds at concert pitch while the drawn
   * notation stays at written pitch. Omitted means no part transposes.
   */
  readonly transposeSemitonesByPartAndMeasure?: ReadonlyMap<string, number>;
  /**
   * Each part's `<midi-instrument>` routing (`ParseResult.midiInstrumentInfoByPart`),
   * so (a) an unpitched percussion note resolves to a GM key number and
   * sounds, and (b) each `tracks[]` entry carries the program/bank/channel
   * a host SoundFont engine should set. Omitted means no part carries
   * routing, which is most hand-written MusicXML.
   */
  readonly midiInstrumentInfoByPart?: ReadonlyMap<string, ReadonlyMap<string, MidiInstrumentInfo>>;
  /**
   * Each measure's repeat/volta marks, in written order, already
   * resolved from both sides of every shared barline. Omitted means
   * "this score has no repeats", which is what a hand-built `Score`
   * (no MusicXML barlines at all) is.
   */
  readonly repeatMeasures?: readonly RepeatMeasureSpec[];
  /**
   * Every `<direction>` the score carries (`ParseResult.directions`), so a
   * dynamic marking becomes the velocity of the notes after it. Omitted
   * means the score states no dynamics and every note sounds at the
   * default velocity.
   */
  readonly directions?: readonly DirectionEvent[];
}

/**
 * The routing a track carries when a part has several `<midi-instrument>`
 * entries (a drum kit names one per drum). The program/bank/channel are
 * the part's own, not per-drum, so any entry that states them answers for
 * the whole part; the first that does wins. A kit whose entries carry only
 * `<midi-unpitched>` (the common case) contributes no program here and the
 * host uses its own default patch, while the drum KEYS still resolve per
 * note through the same map.
 */
function firstRoutingFor(
  info: ReadonlyMap<string, MidiInstrumentInfo> | undefined,
): Pick<MidiInstrumentInfo, 'program' | 'bank' | 'channel'> {
  if (info === undefined) return {};
  for (const record of info.values()) {
    if (record.program !== undefined || record.bank !== undefined || record.channel !== undefined) {
      return {
        ...(record.program !== undefined ? { program: record.program } : {}),
        ...(record.bank !== undefined ? { bank: record.bank } : {}),
        ...(record.channel !== undefined ? { channel: record.channel } : {}),
      };
    }
  }
  return {};
}

/** True when any note in the part is unpitched -- what marks a track as percussion for a host. */
function partHasUnpitchedNotes(part: Score['parts'][number]): boolean {
  for (const measure of part.measures) {
    for (const voice of measure.voices) {
      for (const event of voice.events) {
        const notes = event.kind === 'chord' ? event.notes : event.kind === 'note' ? [event] : [];
        if (notes.some((note) => !isPitched(note.pitch))) return true;
      }
    }
  }
  return false;
}

/**
 * PLAN.md §17.1, Phase 48: assembles the full `PlaybackData` a rendered
 * score's `positionToX`/`xToPosition`/`getEventStream`/`resolvePosition`
 * all read. Called once, at the end of `renderFromMusicXml`, from the
 * exact layout maps that produced its SVG -- see each field's own comment
 * on `ComputePlaybackDataInput` for why nothing here is recomputed
 * independently of what was actually drawn.
 */
export function computePlaybackData(input: ComputePlaybackDataInput): PlaybackData {
  const globalTickOffsetByMeasure = new Map<number, number>();
  let running = 0;
  for (const measureNumber of input.measureNumbersInOrder) {
    globalTickOffsetByMeasure.set(measureNumber, running);
    running += input.measureTicksByNumber.get(measureNumber) ?? DEFAULT_MEASURE_TICKS;
  }

  const rawTempoEvents: RawTempoEvent[] = input.tempoMarks.map((mark) => ({
    tick: (globalTickOffsetByMeasure.get(mark.measureNumber) ?? 0) + mark.tick,
    microsecondsPerQuarter: microsecondsPerQuarterFor(mark),
  }));
  const { tempoMap } = buildTempoMap(rawTempoEvents);

  const events = buildEventStream(
    input.score,
    globalTickOffsetByMeasure,
    tempoMap,
    input.transposeSemitonesByPartAndMeasure,
    input.midiInstrumentInfoByPart,
    input.directions,
  );

  const { plan, diagnostics: repeatDiagnostics } = buildRepeatPlan({
    measures:
      input.repeatMeasures ??
      input.measureNumbersInOrder.map((measureNumber) => ({
        measureNumber,
        ticks: input.measureTicksByNumber.get(measureNumber) ?? DEFAULT_MEASURE_TICKS,
        repeatStart: false,
        endingStop: false,
      })),
    writtenTickByMeasure: globalTickOffsetByMeasure,
    tempoMap,
  });

  return {
    measureNumbersInOrder: input.measureNumbersInOrder,
    globalTickOffsetByMeasure,
    measureTicksByNumber: input.measureTicksByNumber,
    timeSignatureByMeasure: input.timeSignatureByMeasure,
    measureLayoutsByNumber: input.measureLayoutsByNumber,
    placementByMeasureNumber: input.placementByMeasureNumber,
    measureHeaderAllowance: input.measureHeaderAllowance,
    tempoMap,
    events,
    tracks: input.score.parts.map((part): PlaybackTrack => {
      const routing = firstRoutingFor(input.midiInstrumentInfoByPart?.get(part.id));
      const percussion = partHasUnpitchedNotes(part);
      return {
        id: part.id,
        ...(part.name !== undefined ? { name: part.name } : {}),
        ...(routing.program !== undefined ? { program: routing.program } : {}),
        ...(routing.bank !== undefined ? { bank: routing.bank } : {}),
        ...(routing.channel !== undefined ? { channel: routing.channel } : {}),
        ...(percussion ? { percussion: true } : {}),
      };
    }),
    performance: plan,
    repeatDiagnostics,
  };
}
