/**
 * CPython's `math.dist` for two 2-D points, reproduced exactly.
 *
 * WHY NOT `Math.hypot`, AND WHY NOT `sqrt(dx*dx + dy*dy)`:
 *
 * CPython's `math.hypot`/`math.dist` are CORRECTLY ROUNDED (3.8+). V8's
 * `Math.hypot` is not, and neither is the naive square-root. Measured
 * over this kit's own geometry -- every ordered pair of the 16 targets
 * and 4 neutral positions, 400 distances -- the naive form lands 1 ulp
 * away on 70 of them and `Math.hypot` on a different set.
 *
 * One ulp is not survivable here, and the parity suite proved it rather
 * than the other way round. The distance is multiplied into a candidate
 * score, the scores are summed across a 14-event lookahead window, and
 * the beam search keeps the higher total. On a run of 16th notes across
 * one surface the two starting hands score almost exactly equally, so a
 * 1e-17 difference in the total decides which hand starts -- and then
 * every note in the passage is stuck with the opposite hand. The first
 * parity run mirrored 32 of 32 events for exactly that reason.
 *
 * So this is CPython's `vector_norm` (Modules/mathmodule.c): scale by a
 * power of two so the largest component is in [0.5, 1), accumulate the
 * squares in double-double arithmetic, take a square root, and apply
 * one differential correction. `dl_mul`'s exact product needs an FMA,
 * which JavaScript does not have; Dekker's two-product gives the same
 * exact result for values that cannot overflow when split, which every
 * coordinate on a drum kit comfortably is.
 *
 * `test/unit/geometry.test.js` checks all 400 distances against
 * CPython's own output, so this is a verified reproduction rather than
 * a careful-looking one.
 */

/** Dekker's splitting constant, 2^27 + 1. */
const SPLIT = 134217729;

/** The exact product of a and b as (hi, lo) with hi = fl(a*b): Dekker's two-product, standing in for `dl_mul`'s FMA. */
function twoProduct(a: number, b: number): [number, number] {
  const p = a * b;
  const ca = SPLIT * a;
  const ah = ca - (ca - a);
  const al = a - ah;
  const cb = SPLIT * b;
  const bh = cb - (cb - b);
  const bl = b - bh;
  const err = ah * bh - p + ah * bl + al * bh + al * bl;
  return [p, err];
}

/** CPython's `dl_fast_sum`: exact sum of a and b, assuming |a| >= |b|. */
function fastTwoSum(a: number, b: number): [number, number] {
  const x = a + b;
  return [x, b - (x - a)];
}

const frexpBuffer = new DataView(new ArrayBuffer(8));

/** The exponent `e` from `frexp`: the value equals m * 2^e with 0.5 <= |m| < 1. */
function frexpExponent(value: number): number {
  frexpBuffer.setFloat64(0, value, false);
  const bits = frexpBuffer.getUint32(0, false);
  const rawExponent = (bits >>> 20) & 0x7ff;
  if (rawExponent !== 0) return rawExponent - 1022;
  // Subnormal: normalize by scaling up, then correct.
  frexpBuffer.setFloat64(0, value * 0x10000000000000, false);
  const hi = frexpBuffer.getUint32(0, false);
  return ((hi >>> 20) & 0x7ff) - 1022 - 52;
}

/** `2 ** exponent`, exactly, for the exponents this uses. */
function ldexp1(exponent: number): number {
  return Math.pow(2, exponent);
}

/** DBL_MIN: the smallest NORMAL double, 2^-1022. */
const DBL_MIN = 2.2250738585072014e-308;

/**
 * CPython's `vector_norm` for a 2-vector of non-negative components.
 * `max` is the larger of them.
 */
function vectorNorm(a: number, b: number): number {
  const max = a > b ? a : b;
  if (max === 0.0) return max;
  if (!Number.isFinite(max)) return max;

  const maxExponent = frexpExponent(max);
  if (maxExponent < -1023) {
    // CPython's subnormal guard, and it is load-bearing rather than
    // defensive: `scale` would be 2^1024, which is Infinity in a double,
    // and every value downstream of it becomes NaN. A test for a case no
    // drum kit can reach is what caught this, which is the argument for
    // writing it.
    return DBL_MIN * vectorNorm(a / DBL_MIN, b / DBL_MIN);
  }
  const scale = ldexp1(-maxExponent);

  let csum = 1.0;
  let frac1 = 0.0;
  let frac2 = 0.0;

  for (const component of [a, b]) {
    const x = component * scale; // lossless scaling
    const [prHi, prLo] = twoProduct(x, x); // lossless squaring
    const [smHi, smLo] = fastTwoSum(csum, prHi); // lossless addition
    csum = smHi;
    frac1 += prLo;
    frac2 += smLo;
  }

  let h = Math.sqrt(csum - 1.0 + (frac1 + frac2));
  const [prHi, prLo] = twoProduct(-h, h);
  const [smHi, smLo] = fastTwoSum(csum, prHi);
  csum = smHi;
  frac1 += prLo;
  frac2 += smLo;
  const x = csum - 1.0 + (frac1 + frac2);
  h += x / (2.0 * h); // differential correction
  return h / scale;
}

/** `math.dist((x1, y1), (x2, y2))`. */
export function distance2d(x1: number, y1: number, x2: number, y2: number): number {
  return vectorNorm(Math.abs(x1 - x2), Math.abs(y1 - y2));
}
