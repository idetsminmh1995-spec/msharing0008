import type { Voice } from './voice.js';

/**
 * One measure/bar within a Part. Key/time/clef changes at this measure are
 * Phase 10/11/12's concern (attached as per-measure "attributes" once those
 * phases exist) -- deliberately not modeled yet, to keep Phase 3 scoped to
 * just notes/rests/chords/voices.
 */
export interface Measure {
  /** 1-based measure number, as printed on the score. */
  readonly number: number;
  readonly voices: readonly Voice[];
}

export function measure(number: number, voices: readonly Voice[]): Measure {
  return { number, voices };
}
