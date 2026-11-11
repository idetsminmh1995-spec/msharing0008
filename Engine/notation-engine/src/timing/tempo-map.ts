import { TICKS_PER_QUARTER } from '../core/duration-math.js';
import { timingDiagnostic, type TimingDiagnostic } from './diagnostic.js';

export interface TempoSegment {
  readonly startTick: number;
  readonly startSeconds: number;
  readonly microsecondsPerQuarter: number;
}

/** Sorted, contiguous by startTick -- §12.1's own stated invariant. */
export interface TempoMap {
  readonly segments: readonly TempoSegment[];
}

export interface RawTempoEvent {
  readonly tick: number;
  readonly microsecondsPerQuarter: number;
}

/** §11.1's own documented MIDI default: no tempo event means 120 BPM. Used here too, both for a genuinely empty tempo map and for the implicit tempo in effect before a file's first explicit tempo change. */
const DEFAULT_MICROSECONDS_PER_QUARTER = 500_000;

export interface BuildTempoMapResult {
  readonly tempoMap: TempoMap;
  readonly diagnostics: readonly TimingDiagnostic[];
}

/**
 * §12.2's anti-drift design: `startSeconds` is precomputed cumulatively
 * ONCE here, when the map is built -- never re-derived by stepping note
 * by note and accumulating elapsed time, which is exactly the approach
 * that accumulates floating-point error proportional to song length.
 * Every later `tickToSeconds`/`secondsToTick` call is then just a binary
 * search plus one multiply, with error bounded by one subtraction and
 * one multiplication from the nearest tempo change -- never by how many
 * notes came before it.
 */
export function buildTempoMap(rawEvents: readonly RawTempoEvent[]): BuildTempoMapResult {
  const diagnostics: TimingDiagnostic[] = [];

  // Sort by tick, and where two events share a tick, keep the LAST one
  // declared (matching the same "later wins" convention MusicXML's own
  // <attributes> merging already uses) -- a stable sort preserves
  // original relative order for same-tick events before this reduction.
  const sorted = [...rawEvents].sort((a, b) => a.tick - b.tick);
  const byTick = new Map<number, number>();
  for (const e of sorted) byTick.set(e.tick, e.microsecondsPerQuarter);
  let dedupedTicks = [...byTick.keys()].sort((a, b) => a - b);

  if (dedupedTicks.length === 0) {
    diagnostics.push(
      timingDiagnostic(
        'warning',
        'EMPTY_TEMPO_MAP',
        'No tempo events at all; assuming a constant 120 BPM.',
      ),
    );
    return {
      tempoMap: {
        segments: [
          {
            startTick: 0,
            startSeconds: 0,
            microsecondsPerQuarter: DEFAULT_MICROSECONDS_PER_QUARTER,
          },
        ],
      },
      diagnostics,
    };
  }

  // If the first real tempo event isn't at tick 0, the implicit tempo
  // beforehand is the same 120 BPM default -- not a warning-worthy
  // condition on its own (perfectly normal for a file to only declare
  // tempo once it actually changes), so no diagnostic here.
  if (dedupedTicks[0] !== 0) {
    dedupedTicks = [0, ...dedupedTicks];
    byTick.set(0, DEFAULT_MICROSECONDS_PER_QUARTER);
  }

  const segments: TempoSegment[] = [];
  let previousStartSeconds = 0;
  let previousStartTick = 0;
  let previousMicrosecondsPerQuarter = DEFAULT_MICROSECONDS_PER_QUARTER;

  dedupedTicks.forEach((tick, index) => {
    const microsecondsPerQuarter = byTick.get(tick) ?? DEFAULT_MICROSECONDS_PER_QUARTER;
    if (index === 0) {
      segments.push({ startTick: tick, startSeconds: 0, microsecondsPerQuarter });
      previousStartSeconds = 0;
      previousStartTick = tick;
      previousMicrosecondsPerQuarter = microsecondsPerQuarter;
      return;
    }
    const startSeconds =
      previousStartSeconds +
      ((tick - previousStartTick) / TICKS_PER_QUARTER) * (previousMicrosecondsPerQuarter / 1e6);
    segments.push({ startTick: tick, startSeconds, microsecondsPerQuarter });
    previousStartSeconds = startSeconds;
    previousStartTick = tick;
    previousMicrosecondsPerQuarter = microsecondsPerQuarter;
  });

  return { tempoMap: { segments }, diagnostics };
}
