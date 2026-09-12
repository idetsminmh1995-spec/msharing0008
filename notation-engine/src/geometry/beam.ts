import type { DurationType } from '../core/duration.js';
import { TICKS_PER_QUARTER } from '../core/duration-math.js';

/** True for the durations §9.9 already gives an individual flag when unbeamed -- eighth and shorter. */
function isBeamable(durationType: DurationType): boolean {
  switch (durationType) {
    case 'eighth':
    case '16th':
    case '32nd':
    case '64th':
    case '128th':
    case '256th':
    case '512th':
    case '1024th':
      return true;
    default:
      return false;
  }
}

/**
 * The tick length of one "beat" for a time signature, per §9.12's
 * verified rule: compound meters (denominator 8, numerator divisible by 3
 * and greater than 3 -- 6/8, 9/8, 12/8) use a dotted-quarter beat (3
 * eighth-notes' worth); every other meter uses one note of the
 * denominator's own value (a quarter in 4/4, a half in 2/2, an eighth in
 * a simple x/8 meter, etc.).
 */
export function beamBeatTicks(numerator: number, denominator: number): number {
  const isCompound = denominator === 8 && numerator % 3 === 0 && numerator > 3;
  if (isCompound) {
    return 3 * (TICKS_PER_QUARTER / 2); // 3 eighth notes
  }
  return TICKS_PER_QUARTER * (4 / denominator);
}

export interface BeamableEvent {
  readonly durationType: DurationType;
  /** Whether this event is a rest -- a rest is never itself beamed, and breaks a run of beamable notes (§9.12). */
  readonly isRest: boolean;
}

/** One group of 2+ consecutive event indices sharing a beam. A solitary beamable note (nothing grouped with it) never appears in the output -- it keeps its individual flag instead. */
export interface BeamGroup {
  readonly eventIndices: readonly number[];
}

/**
 * §9.12's full grouping algorithm: walks a voice's events (with their
 * already-known start ticks -- the same reconstruction Phase 21's
 * `eventStartTicks` already does) and returns which ones share a beam.
 *
 * `groupTicks` overrides the computed beat length -- e.g. passing
 * `TICKS_PER_QUARTER` (one full quarter's worth) in 4/4 produces the
 * common real-world "groups of 4 eighth notes" convention instead of the
 * textbook-strict groups of 2; omitting it uses the plain beat-based
 * default.
 */
export function groupBeams(
  events: readonly BeamableEvent[],
  startTicks: readonly number[],
  numerator: number,
  denominator: number,
  groupTicks?: number,
): readonly BeamGroup[] {
  const unit = groupTicks ?? beamBeatTicks(numerator, denominator);
  const groups: BeamGroup[] = [];
  let current: number[] = [];
  let currentUnitIndex: number | undefined;

  const flush = (): void => {
    if (current.length >= 2) {
      groups.push({ eventIndices: current });
    }
    current = [];
    currentUnitIndex = undefined;
  };

  events.forEach((event, i) => {
    const tick = startTicks[i] ?? 0;
    if (event.isRest || !isBeamable(event.durationType)) {
      flush();
      return;
    }
    const unitIndex = unit > 0 ? Math.floor(tick / unit) : 0;
    if (currentUnitIndex !== undefined && unitIndex !== currentUnitIndex) {
      flush();
    }
    current.push(i);
    currentUnitIndex = unitIndex;
  });
  flush();

  return groups;
}

/** Every event index that ended up in some beam group -- convenient for a caller deciding whether to draw an individual flag (needsFlag from §9.9 should be called with `isBeamed: true` for these). */
export function beamedEventIndices(groups: readonly BeamGroup[]): ReadonlySet<number> {
  const set = new Set<number>();
  for (const group of groups) {
    for (const index of group.eventIndices) {
      set.add(index);
    }
  }
  return set;
}
