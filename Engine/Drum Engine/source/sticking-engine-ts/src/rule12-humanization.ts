/**
 * rule12-humanization.ts — RULE 12: CONTROLLED HUMAN VARIATION &
 * NON-ROBOTIC BEHAVIOR
 *
 * "Variation comes after validity and candidate generation; randomness
 * never repairs impossible behavior." This module runs strictly AFTER
 * Rule 8/29 has produced a physically valid committed sequence. It only
 * nudges microtiming and velocity within the style profile's configured
 * range, from a seeded generator, so runs are reproducible (Rule 26).
 */

import type { DrummerStyleProfile, HumanTimingContext } from './datamodel.js';
import { PythonRandom } from './core/mt19937.js';
import { sha256Hex } from './core/sha256.js';

/**
 * Every event gets its own reproducible sub-stream, derived from the
 * global seed plus the event id, so re-running with the same seed always
 * produces identical results regardless of solve order.
 *
 * The hash and the generator are both CPython's, reproduced exactly --
 * see `core/mt19937.ts` for why that is a contract and not a detail.
 */
function deterministicRng(seed: number, eventId: string): PythonRandom {
  const digest = sha256Hex(`${seed}:${eventId}`);
  return new PythonRandom(BigInt('0x' + digest.slice(0, 16)));
}

export const MAX_MICROTIMING_MS = 8.0;
export const MAX_VELOCITY_JITTER = 6;

/**
 * Bounded by `style.variationAmount` and the hard MAX_MICROTIMING_MS
 * ceiling -- never large enough to threaten Rule 6/13's physical
 * feasibility, only enough to avoid a quantized, robotic grid.
 */
export function humanizeTiming(
  eventId: string,
  scheduledTimeS: number,
  style: DrummerStyleProfile,
  seed: number,
  instrumentBiasMs = 0.0,
): HumanTimingContext {
  const rng = deterministicRng(seed, eventId + ':time');
  const boundMs = MAX_MICROTIMING_MS * style.variationAmount;
  const offsetMs = rng.uniform(-boundMs, boundMs) + instrumentBiasMs;
  return {
    eventId,
    scheduledTimeS,
    performedTimeS: scheduledTimeS + offsetMs / 1000.0,
    microtimingOffsetMs: offsetMs,
    instrumentBiasMs,
  };
}

/** The same, for dynamics. Clipped to the valid MIDI range. */
export function humanizeVelocity(
  eventId: string,
  baseVelocity: number,
  style: DrummerStyleProfile,
  seed: number,
): number {
  const rng = deterministicRng(seed, eventId + ':vel');
  const bound = MAX_VELOCITY_JITTER * style.variationAmount;
  const jitter = rng.uniform(-bound, bound);
  return Math.max(1, Math.min(127, pythonRound(baseVelocity + jitter)));
}

/**
 * Rule 12's "select among near-optimal valid alternatives": if the top
 * candidates are within epsilon of each other, pick among them
 * deterministically instead of always taking the greedy best -- which is
 * what keeps a repeated passage from looking robotically identical --
 * while never picking a worse-than-tied option.
 */
export function pickAmongNearTies<T>(
  candidates: readonly (readonly [T, number])[],
  seed: number,
  keyEventId: string,
  epsilon = 0.02,
): T | undefined {
  if (candidates.length === 0) return undefined;
  const bestScore = (candidates[0] as readonly [T, number])[1];
  const tied = candidates.filter((c) => bestScore - c[1] <= epsilon);
  if (tied.length === 1) return (tied[0] as readonly [T, number])[0];
  const rng = deterministicRng(seed, keyEventId + ':tie');
  return rng.choice(tied)[0];
}

/**
 * Python's `round()` — banker's rounding, half to EVEN.
 *
 * `round(99.5)` is 100 in JavaScript and 100 in Python, but
 * `round(98.5)` is 99 in JavaScript and 98 in Python. Velocities land on
 * exact halves often enough for this to matter, and a one-unit velocity
 * difference can cross a ghost/accent threshold in Rule 9.
 */
function pythonRound(x: number): number {
  const floor = Math.floor(x);
  const diff = x - floor;
  if (diff > 0.5) return floor + 1;
  if (diff < 0.5) return floor;
  return floor % 2 === 0 ? floor : floor + 1;
}
