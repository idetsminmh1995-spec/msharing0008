/**
 * rng.ts — the engine's only source of randomness.
 *
 * Seeded, because the plan's README rule 4 requires that the same
 * input, config and seed produce byte-identical output. `Math.random`
 * anywhere in the engine would break that, and would break it
 * silently: two runs of the same song would differ by a few
 * milliseconds of humanisation and nobody would know why.
 */

/** mulberry32: small, fast, and good enough for jitter. */
export function makeRng(seed: number): () => number {
  let state = (Math.trunc(seed) || 1) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A number in [-amount, +amount], for MP-20..23's humanisation. */
export function jitter(rng: () => number, amount: number): number {
  return (rng() * 2 - 1) * amount;
}
