/**
 * tempo.ts — ticks to seconds (DM-07).
 *
 * The finger engine never invents timing for MusicXML: the Notation
 * Engine owns note order and time (IN-E01, D-011). This is here for
 * MIDI input, and to convert a tick a caller hands over against the
 * same map the rest of the app uses.
 */

export interface TempoSegment {
  /** Where this tempo starts, in ticks. */
  readonly startTick: number;
  readonly microsecondsPerQuarter: number;
}

export interface TempoMap {
  readonly ticksPerQuarter: number;
  /** In tick order. A map with no segments is 120 BPM throughout. */
  readonly segments: readonly TempoSegment[];
}

const DEFAULT_US_PER_QUARTER = 500_000; // 120 BPM

export function tempoMap(
  ticksPerQuarter: number,
  segments: readonly TempoSegment[] = [],
): TempoMap {
  return {
    ticksPerQuarter: ticksPerQuarter > 0 ? ticksPerQuarter : 480,
    segments: [...segments].sort((a, b) => a.startTick - b.startTick),
  };
}

/**
 * Seconds from the start of the content to a tick.
 *
 * Walks the segments and adds each one's own elapsed time, so a tempo
 * change moves everything after it and nothing before it.
 */
export function tickToSeconds(map: TempoMap, tick: number): number {
  if (!Number.isFinite(tick)) return 0;
  const target = Math.max(0, tick);
  let seconds = 0;
  let cursor = 0;
  let usPerQuarter = DEFAULT_US_PER_QUARTER;
  for (const segment of map.segments) {
    const start = Math.max(0, segment.startTick);
    if (start >= target) break;
    if (start > cursor) {
      seconds += ((start - cursor) / map.ticksPerQuarter) * (usPerQuarter / 1_000_000);
      cursor = start;
    }
    usPerQuarter =
      segment.microsecondsPerQuarter > 0 ? segment.microsecondsPerQuarter : usPerQuarter;
  }
  seconds += ((target - cursor) / map.ticksPerQuarter) * (usPerQuarter / 1_000_000);
  return seconds;
}

/** The tempo in effect at a tick, as BPM -- for reports and debug. */
export function bpmAt(map: TempoMap, tick: number): number {
  let usPerQuarter = DEFAULT_US_PER_QUARTER;
  for (const segment of map.segments) {
    if (segment.startTick <= tick && segment.microsecondsPerQuarter > 0) {
      usPerQuarter = segment.microsecondsPerQuarter;
    } else if (segment.startTick > tick) break;
  }
  return 60_000_000 / usPerQuarter;
}
