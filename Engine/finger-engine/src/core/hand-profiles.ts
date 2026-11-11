/**
 * hand-profiles.ts — [BP-009] one hand, three sizes.
 *
 * Every span limit in the engine is a measurement of a HAND, not of
 * an instrument, which is the whole reason the same numbers can be
 * handed a guitar and a bass and give different answers on each: the
 * millimetres stay put and the frets move under them. What this file
 * adds is that hands differ too.
 *
 * One multiplier over every comfort and every maximum, rather than a
 * table per size. A bigger hand is not a hand with a differently
 * shaped reach -- it is the same reach, longer, and a table of
 * eighteen numbers per profile would be eighteen chances to make two
 * of them disagree.
 *
 * Shared with the guitar engine deliberately: a player has one pair
 * of hands whatever they pick up, so the setting belongs to the
 * person, not to the instrument.
 */

export type HandProfile = 'small' | 'medium' | 'large';

/** [BP-009] The multiplier each profile puts on every span limit. */
export const HAND_PROFILES: Readonly<Record<HandProfile, number>> = {
  small: 0.9,
  medium: 1,
  large: 1.1,
};

export const DEFAULT_HAND_PROFILE: HandProfile = 'medium';

export function handProfileScale(profile: HandProfile | undefined): number {
  return HAND_PROFILES[profile ?? DEFAULT_HAND_PROFILE];
}

/** A pair of limits as the left-hand rules state them, in millimetres. */
export interface SpanLimits {
  readonly comfort: number;
  readonly max: number;
}

/**
 * The same limits, scaled to a hand.
 *
 * Returns a new object rather than editing in place: the defaults are
 * the engine's one copy of these numbers and a profile that mutated
 * them would make the second analysis in a session disagree with the
 * first.
 */
export function scaleSpans<K extends string>(
  spans: Readonly<Record<K, SpanLimits>>,
  profile: HandProfile | undefined,
): Record<K, SpanLimits> {
  const factor = handProfileScale(profile);
  const out = {} as Record<K, SpanLimits>;
  for (const key of Object.keys(spans) as K[]) {
    const limit = spans[key];
    out[key] = { comfort: limit.comfort * factor, max: limit.max * factor };
  }
  return out;
}
