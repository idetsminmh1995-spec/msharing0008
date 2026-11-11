import { TICKS_PER_QUARTER } from '../core/duration-math.js';

export interface MusicalPosition {
  readonly measureNumber: number;
  /** 1-based and fractional -- beat 2.5 is "the and of 2" in 4/4 (§12.3). */
  readonly beat: number;
  readonly tickInMeasure: number;
}

export interface TimeSignatureSegment {
  readonly startTick: number;
  /** The measure number of the measure that begins exactly at startTick. */
  readonly startMeasureNumber: number;
  readonly numerator: number;
  readonly denominator: number;
}

/** Sorted, contiguous by startTick -- the same shape TempoMap already uses, applied here to time-signature ranges instead of tempo ranges. */
export interface MeasureMap {
  readonly segments: readonly TimeSignatureSegment[];
}

export interface RawTimeSignatureEvent {
  readonly tick: number;
  readonly numerator: number;
  readonly denominator: number;
}

const DEFAULT_NUMERATOR = 4;
const DEFAULT_DENOMINATOR = 4;

/** One measure's length in ticks under a given time signature: numerator beats, each (4/denominator) quarter notes long. */
function measureLengthTicks(numerator: number, denominator: number): number {
  return numerator * (4 / denominator) * TICKS_PER_QUARTER;
}

/**
 * §12.3: builds the sparse segment list `tickToPosition`/`positionToTick`
 * search over -- one segment per time-signature era, each knowing which
 * measure number begins its own span, rather than a boundary entry for
 * every individual measure (which would be wasteful for a long piece
 * with few time-signature changes). Measure numbers within a span are
 * then a simple division, not a lookup.
 */
export function buildMeasureMap(
  rawEvents: readonly RawTimeSignatureEvent[],
  firstMeasureNumber = 1,
): MeasureMap {
  const sorted = [...rawEvents].sort((a, b) => a.tick - b.tick);
  const byTick = new Map<number, { numerator: number; denominator: number }>();
  for (const e of sorted)
    byTick.set(e.tick, { numerator: e.numerator, denominator: e.denominator });
  let ticks = [...byTick.keys()].sort((a, b) => a - b);

  if (ticks.length === 0 || ticks[0] !== 0) {
    ticks = [0, ...ticks];
    if (!byTick.has(0))
      byTick.set(0, { numerator: DEFAULT_NUMERATOR, denominator: DEFAULT_DENOMINATOR });
  }

  const segments: TimeSignatureSegment[] = [];
  let previousStartTick = 0;
  let previousMeasureNumber = firstMeasureNumber;
  let previousNumerator = DEFAULT_NUMERATOR;
  let previousDenominator = DEFAULT_DENOMINATOR;

  ticks.forEach((tick, index) => {
    const sig = byTick.get(tick) ?? {
      numerator: DEFAULT_NUMERATOR,
      denominator: DEFAULT_DENOMINATOR,
    };
    if (index === 0) {
      segments.push({ startTick: tick, startMeasureNumber: firstMeasureNumber, ...sig });
      previousStartTick = tick;
      previousMeasureNumber = firstMeasureNumber;
      previousNumerator = sig.numerator;
      previousDenominator = sig.denominator;
      return;
    }
    // How many whole measures of the PREVIOUS time signature fit before
    // this new one begins. A time signature changing mid-measure in a
    // real file is unusual; this rounds to the nearest whole measure
    // rather than producing a fractional measure number.
    const elapsedTicks = tick - previousStartTick;
    const measuresElapsed = Math.round(
      elapsedTicks / measureLengthTicks(previousNumerator, previousDenominator),
    );
    const startMeasureNumber = previousMeasureNumber + measuresElapsed;
    segments.push({ startTick: tick, startMeasureNumber, ...sig });
    previousStartTick = tick;
    previousMeasureNumber = startMeasureNumber;
    previousNumerator = sig.numerator;
    previousDenominator = sig.denominator;
  });

  return { segments };
}

function findSegmentForTick(measureMap: MeasureMap, tick: number): TimeSignatureSegment {
  const segments = measureMap.segments;
  const first = segments[0];
  if (first === undefined) {
    throw new Error('MeasureMap has no segments -- buildMeasureMap should never produce this.');
  }
  if (tick <= first.startTick) return first;

  let low = 0;
  let high = segments.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const midSegment = segments[mid];
    if (midSegment !== undefined && midSegment.startTick <= tick) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return segments[low] ?? first;
}

/** §12.3: converts a tick into a human-readable measure+beat position. */
export function tickToPosition(measureMap: MeasureMap, tick: number): MusicalPosition {
  const s = findSegmentForTick(measureMap, tick);
  const measureLen = measureLengthTicks(s.numerator, s.denominator);
  const ticksIntoSegment = tick - s.startTick;
  const measuresIntoSegment = Math.floor(ticksIntoSegment / measureLen);
  const measureNumber = s.startMeasureNumber + measuresIntoSegment;
  const tickInMeasure = ticksIntoSegment - measuresIntoSegment * measureLen;
  const beatLen = (4 / s.denominator) * TICKS_PER_QUARTER;
  const beat = 1 + tickInMeasure / beatLen;
  return { measureNumber, beat, tickInMeasure };
}

function findSegmentForMeasure(
  measureMap: MeasureMap,
  measureNumber: number,
): TimeSignatureSegment {
  const segments = measureMap.segments;
  const first = segments[0];
  if (first === undefined) {
    throw new Error('MeasureMap has no segments -- buildMeasureMap should never produce this.');
  }
  if (measureNumber <= first.startMeasureNumber) return first;

  let low = 0;
  let high = segments.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const midSegment = segments[mid];
    if (midSegment !== undefined && midSegment.startMeasureNumber <= measureNumber) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return segments[low] ?? first;
}

/** The exact inverse of tickToPosition. */
export function positionToTick(measureMap: MeasureMap, position: MusicalPosition): number {
  const s = findSegmentForMeasure(measureMap, position.measureNumber);
  const measureLen = measureLengthTicks(s.numerator, s.denominator);
  const measuresIntoSegment = position.measureNumber - s.startMeasureNumber;
  const beatLen = (4 / s.denominator) * TICKS_PER_QUARTER;
  const tickInMeasure = (position.beat - 1) * beatLen;
  return s.startTick + measuresIntoSegment * measureLen + tickInMeasure;
}
