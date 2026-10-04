/**
 * handSpan.ts — how far apart two fingers can be.
 *
 * The one fact the whole fingering search turns on. A chord is playable
 * if its outer notes are inside the span of the fingers put on them; a
 * passage needs a hand shift exactly when it is not. Every other rule
 * in `fingeringCost.ts` is a preference, and this is a measurement.
 *
 *
 * STATED IN WHITE KEYS, MEASURED IN MILLIMETRES
 *
 * The table below is in WHITE KEYS, because that is the unit a hand's
 * reach is actually taught in -- "a comfortable fifth", "stretches to an
 * octave" -- and because a white key is the only evenly spaced thing on
 * a piano. The geometry then turns it into millimetres, which is what
 * the solver compares against, because C to C# and E to F are both one
 * semitone and are not the same distance at all.
 *
 * Two numbers per pair, not one:
 *
 *   comfort  the hand is relaxed and could hold it all day
 *   max      the hand can reach it, and would rather not
 *
 * Between them the cost rises; past `max` the shape is refused. One
 * number would make every stretch either free or impossible, and real
 * fingering is full of stretches a player accepts for a bar.
 *
 * The thumb-to-little span is the one every hand is measured by -- it is
 * what `HAND_PROFILES` scales, and what PianoPlayer calls hand size. A
 * medium hand reaches an octave comfortably and a ninth at a stretch,
 * which is what `1-5` says below.
 */

import type { Finger } from '../core/types.js';
import { WHITE_KEY_WIDTH_MM } from '../keyboard/pianoGeometry.js';
import { HAND_PROFILES, type HandProfile } from '../kinematics/handPose.js';

export interface Span {
  /** White keys the hand holds without effort. */
  readonly comfort: number;
  /** White keys it can reach at all. */
  readonly max: number;
}

/**
 * Lower finger number first: `1-5` is the thumb to the little finger.
 *
 * Written out rather than generated from `${Finger}-${Finger}`, which
 * would also admit `5-1` -- the same pair spelt backwards, and a second
 * place for the same measurement to live.
 */
export type FingerPair =
  | '1-1'
  | '1-2'
  | '1-3'
  | '1-4'
  | '1-5'
  | '2-2'
  | '2-3'
  | '2-4'
  | '2-5'
  | '3-3'
  | '3-4'
  | '3-5'
  | '4-4'
  | '4-5'
  | '5-5';

export function fingerPair(a: Finger, b: Finger): FingerPair {
  return (a < b ? `${a}-${b}` : `${b}-${a}`) as FingerPair;
}

/**
 * A medium adult hand, in white keys.
 *
 * The thumb reaches further from every finger than any other pair does,
 * because it is the only one that leaves the hand sideways. 4 and 5 are
 * the tightest pair there is -- they share a tendon, which is why a
 * fourth finger does so much of the deciding in real fingering.
 */
export const MEDIUM_SPANS: Readonly<Record<FingerPair, Span>> = {
  '1-2': { comfort: 2, max: 4 },
  '1-3': { comfort: 3.5, max: 5.5 },
  '1-4': { comfort: 5, max: 7 },
  '1-5': { comfort: 7, max: 8.5 },
  '2-3': { comfort: 1.5, max: 2.5 },
  '2-4': { comfort: 2.5, max: 4 },
  '2-5': { comfort: 4, max: 5.5 },
  '3-4': { comfort: 1, max: 2 },
  '3-5': { comfort: 2.5, max: 4 },
  '4-5': { comfort: 1, max: 2 },
  // A finger against itself: one key, and it cannot be two places.
  '1-1': { comfort: 0, max: 0 },
  '2-2': { comfort: 0, max: 0 },
  '3-3': { comfort: 0, max: 0 },
  '4-4': { comfort: 0, max: 0 },
  '5-5': { comfort: 0, max: 0 },
};

/**
 * The same spans for a particular hand, in MILLIMETRES.
 *
 * One multiplier over every pair rather than a table per size, for the
 * same reason the rig scales that way: a bigger hand is not a hand with
 * a differently shaped reach, it is the same reach, longer.
 */
export function spansFor(profile: HandProfile = 'medium'): Readonly<Record<FingerPair, Span>> {
  const scale = HAND_PROFILES[profile];
  const out = {} as Record<FingerPair, Span>;
  for (const key of Object.keys(MEDIUM_SPANS) as FingerPair[]) {
    const span = MEDIUM_SPANS[key];
    out[key] = {
      comfort: span.comfort * scale * WHITE_KEY_WIDTH_MM,
      max: span.max * scale * WHITE_KEY_WIDTH_MM,
    };
  }
  return out;
}

export interface SpanVerdict {
  /** How far past comfort the stretch is, 0 when it is inside. 1 at the maximum. */
  readonly strain: number;
  /** True when no hand of this size reaches it. */
  readonly impossible: boolean;
}

/**
 * What it costs this hand to hold two fingers that far apart.
 *
 * `distanceMm` is signed in the caller's frame and taken as a magnitude
 * here: a hand does not care which way round two fingers are, only how
 * far. Which way round they are ALLOWED to be is a different rule, and
 * `fingeringCost.ts` owns it -- fingers cannot cross inside one chord.
 */
export function spanStrain(
  spans: Readonly<Record<FingerPair, Span>>,
  a: Finger,
  b: Finger,
  distanceMm: number,
): SpanVerdict {
  const span = spans[fingerPair(a, b)];
  const distance = Math.abs(distanceMm);
  if (span === undefined) return { strain: 0, impossible: false };
  if (distance <= span.comfort) return { strain: 0, impossible: false };
  if (distance > span.max) return { strain: 1, impossible: true };
  const range = span.max - span.comfort;
  return { strain: range <= 0 ? 1 : (distance - span.comfort) / range, impossible: false };
}

/**
 * How far this hand reaches at all, thumb to little finger, in mm.
 *
 * What a hand split uses to know that two notes cannot be one hand's.
 */
export function maxReachMm(spans: Readonly<Record<FingerPair, Span>>): number {
  return spans['1-5']?.max ?? 0;
}
