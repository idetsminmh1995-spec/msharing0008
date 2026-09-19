import type { Score } from '../core/index.js';
import { TICKS_PER_QUARTER, baseTicksForType, ticksWithDots } from '../core/duration-math.js';
import type { TempoMarkEvent } from '../parser/musicxml/parse.js';
import { buildTempoMap, type RawTempoEvent } from '../timing/tempo-map.js';
import { buildEventStream } from './event-stream.js';
import type { PlaybackData, PlaybackMeasureLayout, PlaybackMeasurePlacement } from './position.js';

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

  const events = buildEventStream(input.score, globalTickOffsetByMeasure, tempoMap);

  return {
    measureNumbersInOrder: input.measureNumbersInOrder,
    globalTickOffsetByMeasure,
    timeSignatureByMeasure: input.timeSignatureByMeasure,
    measureLayoutsByNumber: input.measureLayoutsByNumber,
    placementByMeasureNumber: input.placementByMeasureNumber,
    measureHeaderAllowance: input.measureHeaderAllowance,
    tempoMap,
    events,
  };
}
