import { TICKS_PER_QUARTER } from '../core/duration-math.js';
import type { TempoMap, TempoSegment } from './tempo-map.js';

/**
 * §12.3's boundary rule: a query before the first segment or after the
 * last "clamps to the boundary segment rather than extrapolating
 * wildly." Implemented as clamping the SEARCH (always landing on a real
 * segment, never past the map's ends), not the output value -- the
 * segment's own rate still applies via the normal formula from there,
 * which is well-defined and bounded, not an arbitrary floor/ceiling.
 */
function findSegmentForTick(tempoMap: TempoMap, tick: number): TempoSegment {
  const segments = tempoMap.segments;
  const first = segments[0];
  if (first === undefined) {
    throw new Error('TempoMap has no segments -- buildTempoMap should never produce this.');
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

function findSegmentForSeconds(tempoMap: TempoMap, seconds: number): TempoSegment {
  const segments = tempoMap.segments;
  const first = segments[0];
  if (first === undefined) {
    throw new Error('TempoMap has no segments -- buildTempoMap should never produce this.');
  }
  if (seconds <= first.startSeconds) return first;

  let low = 0;
  let high = segments.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const midSegment = segments[mid];
    if (midSegment !== undefined && midSegment.startSeconds <= seconds) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return segments[low] ?? first;
}

/** §12.2: find the containing segment (binary search), then one subtraction and one multiply -- never re-accumulated note by note, so error never grows with song length. */
export function tickToSeconds(tempoMap: TempoMap, tick: number): number {
  const s = findSegmentForTick(tempoMap, tick);
  return (
    s.startSeconds + ((tick - s.startTick) / TICKS_PER_QUARTER) * (s.microsecondsPerQuarter / 1e6)
  );
}

/** The exact inverse of tickToSeconds (§12.2's own required property, to within floating-point epsilon). */
export function secondsToTick(tempoMap: TempoMap, seconds: number): number {
  const s = findSegmentForSeconds(tempoMap, seconds);
  return (
    s.startTick + ((seconds - s.startSeconds) * 1e6 * TICKS_PER_QUARTER) / s.microsecondsPerQuarter
  );
}
