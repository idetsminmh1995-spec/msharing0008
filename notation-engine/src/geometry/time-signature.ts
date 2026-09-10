/**
 * A time signature. `numerator`/`denominator` are the actual numeric
 * meaning (e.g. 7/8 -> numerator:7, denominator:8) -- always used for
 * beat-duration math elsewhere in the engine. `numeratorDisplay` is an
 * OPTIONAL override for additive/irregular meters that are written
 * differently than their numeric total (e.g. "3+2+2" over a denominator
 * of 8, still numerator:7 for math purposes, but displayed as "3+2+2").
 */
export interface TimeSignature {
  readonly numerator: number;
  readonly denominator: number;
  readonly numeratorDisplay?: string;
  /**
   * 'common' draws the C symbol instead of numerals (only valid for
   * 4/4); 'cut' draws the cut-C symbol instead of numerals (only valid
   * for 2/2). Omitted means plain numeric digits.
   */
  readonly symbol?: 'common' | 'cut';
}

export interface TimeSignatureOptions {
  numeratorDisplay?: string;
  symbol?: 'common' | 'cut';
}

function isPositivePowerOfTwo(n: number): boolean {
  return Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0;
}

/**
 * Builds a validated TimeSignature. Throws for a non-positive-integer
 * numerator, a denominator that isn't a positive power of 2 (1,2,4,8,16,
 * 32,64...), or a `symbol` that doesn't match its required numerator/
 * denominator (common=4/4 only, cut=2/2 only) -- catching a nonsensical
 * "common time symbol representing 7/8" at construction time rather than
 * silently drawing something wrong.
 */
export function timeSignature(
  numerator: number,
  denominator: number,
  options?: TimeSignatureOptions,
): TimeSignature {
  if (!Number.isInteger(numerator) || numerator <= 0) {
    throw new Error(`Time signature numerator must be a positive integer, got ${numerator}`);
  }
  if (!isPositivePowerOfTwo(denominator)) {
    throw new Error(
      `Time signature denominator must be a positive power of 2 (1,2,4,8,16,32,64...), got ${denominator}`,
    );
  }
  if (options?.symbol === 'common' && (numerator !== 4 || denominator !== 4)) {
    throw new Error(
      `The 'common' time symbol only applies to 4/4, got ${numerator}/${denominator}`,
    );
  }
  if (options?.symbol === 'cut' && (numerator !== 2 || denominator !== 2)) {
    throw new Error(`The 'cut' time symbol only applies to 2/2, got ${numerator}/${denominator}`);
  }

  let result: TimeSignature = { numerator, denominator };
  if (options?.numeratorDisplay !== undefined) {
    result = { ...result, numeratorDisplay: options.numeratorDisplay };
  }
  if (options?.symbol !== undefined) {
    result = { ...result, symbol: options.symbol };
  }
  return result;
}

/** The exact text to render for the numerator -- numeratorDisplay if given, otherwise the plain number. */
export function numeratorText(sig: TimeSignature): string {
  return sig.numeratorDisplay ?? String(sig.numerator);
}

/** The exact text to render for the denominator -- always the plain number (additive/irregular display only ever applies to the numerator). */
export function denominatorText(sig: TimeSignature): string {
  return String(sig.denominator);
}
