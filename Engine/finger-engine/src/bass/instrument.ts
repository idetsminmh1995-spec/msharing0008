/**
 * instrument.ts — what a bass IS (Plan Part 03).
 *
 * Tunings, dimensions and the one rule that makes a bass a different
 * problem from a guitar rather than a guitar with fewer strings: the
 * neck is half again as long, so the same hand reaches far fewer
 * frets. Everything the solver does about that follows from the
 * millimetres here.
 */
import { fingertipXMm, fretDistanceMm, fretWidthMm } from '../core/geometry.js';
import type { InstrumentSpec } from '../core/types.js';
import { BASS_DEFAULTS } from './defaults.js';

/** [BG-02] The tunings people actually play, lowest string first [DM-01]. */
export const BASS_TUNINGS = {
  '4-standard': [28, 33, 38, 43],
  '4-dropD': [26, 33, 38, 43],
  '4-halfDown': [27, 32, 37, 42],
  '4-Dstandard': [26, 31, 36, 41],
  '5-lowB': [23, 28, 33, 38, 43],
  '5-highC': [28, 33, 38, 43, 48],
  '6-standard': [23, 28, 33, 38, 43, 48],
} as const satisfies Record<string, readonly number[]>;

export type BassTuningId = keyof typeof BASS_TUNINGS;

/** [BG-03] The four scale lengths a bass is built at, in millimetres. */
export const BASS_SCALES = {
  short: 762, // 30"
  medium: 812.8, // 32"
  long: 863.6, // 34" -- the default, and most basses
  extraLong: 889, // 35", common on five-strings for a firmer low B
} as const;

export type BassScaleId = keyof typeof BASS_SCALES;

/**
 * [BG-05] How far apart the outer strings sit, at each end of the
 * neck, for each string count.
 *
 * A six-string bass is not a four-string with two more strings beside
 * it: the neck is wider but not half again as wide, so the strings
 * are packed closer. Crossing strings therefore costs LESS on a six
 * than on a four, which is the opposite of what a rule written in
 * string numbers would say.
 */
export const BASS_STRING_SPREAD: Readonly<
  Record<number, { readonly nutMm: number; readonly bridgeMm: number }>
> = {
  4: { nutMm: 33, bridgeMm: 57 },
  5: { nutMm: 37, bridgeMm: 72 },
  6: { nutMm: 44, bridgeMm: 82.5 },
};

export interface BassInstrumentOptions {
  readonly tuning?: readonly number[] | BassTuningId;
  readonly numStrings?: number;
  readonly scaleLengthMm?: number | BassScaleId;
  readonly numFrets?: number;
  readonly capo?: number;
  readonly fretless?: boolean;
  readonly octaveShift?: number;
  readonly nutSpacingMm?: number;
  readonly bridgeSpacingMm?: number;
}

/**
 * A full `InstrumentSpec` for a bass, from however little the caller
 * knows.
 *
 * The string count follows the TUNING rather than standing beside it:
 * a five-string tuning with `numStrings: 4` is not a configuration,
 * it is a bug that would put every note on the wrong string, so the
 * tuning wins and the count is read off it.
 */
export function bassInstrument(options: BassInstrumentOptions = {}): InstrumentSpec {
  const tuning = resolveTuning(options);
  const numStrings = tuning.length;
  const spread = BASS_STRING_SPREAD[numStrings] ?? BASS_STRING_SPREAD[4];
  const scaleLengthMm =
    typeof options.scaleLengthMm === 'string'
      ? BASS_SCALES[options.scaleLengthMm]
      : (options.scaleLengthMm ?? BASS_DEFAULTS.instrument.scaleLengthMm);
  return {
    kind: 'bass',
    numStrings,
    tuning,
    capo: options.capo ?? BASS_DEFAULTS.instrument.capo,
    numFrets: options.numFrets ?? BASS_DEFAULTS.instrument.numFrets,
    scaleLengthMm,
    nutSpacingMm: options.nutSpacingMm ?? (spread as { nutMm: number }).nutMm,
    bridgeSpacingMm: options.bridgeSpacingMm ?? (spread as { bridgeMm: number }).bridgeMm,
    fretless: options.fretless ?? BASS_DEFAULTS.instrument.fretless,
    octaveShift: options.octaveShift ?? BASS_DEFAULTS.instrument.octaveShift,
  };
}

function resolveTuning(options: BassInstrumentOptions): readonly number[] {
  const named = options.tuning;
  if (typeof named === 'string') return BASS_TUNINGS[named];
  if (named !== undefined && named.length > 0) return [...named];
  // No tuning named, but a string count was: take the standard one for
  // that many strings rather than four strings' worth of notes.
  const count = options.numStrings;
  if (count === 5) return BASS_TUNINGS['5-lowB'];
  if (count === 6) return BASS_TUNINGS['6-standard'];
  return BASS_DEFAULTS.instrument.tuning;
}

/**
 * [BG-06] The fingertip offset this instrument is measured with.
 *
 * On a fretless neck there is no wire to sit behind: the note IS the
 * line, so the offset is zero and a dot lands on the whole number.
 */
export function bassGeometry(instrument: InstrumentSpec): { fingertipBehindFret: number } {
  return {
    fingertipBehindFret:
      instrument.fretless === true ? 0 : BASS_DEFAULTS.geometry.fingertipBehindFret,
  };
}

/** The highest pitch this instrument can play: top string, last fret. */
export function bassTopPitch(instrument: InstrumentSpec): number {
  const top = instrument.tuning[instrument.tuning.length - 1] ?? 43;
  return top + instrument.numFrets;
}

/** The lowest pitch this instrument can play: bottom string, open. */
export function bassBottomPitch(instrument: InstrumentSpec): number {
  return instrument.tuning[0] ?? 28;
}

/**
 * [Part 03 §3] How far apart the index and the little finger must sit
 * for a given shape, in millimetres.
 *
 * `frets` is how many frets the shape spans: 2 for Simandl (index and
 * pinky two frets apart, 1-2-4), 3 for one-finger-per-fret, 1 for two
 * neighbouring fingers. This is the number the fingering system is
 * chosen by -- not the fret it happens at -- because the same shape is
 * a stretch at the first fret and comfortable at the twelfth.
 */
export function shapeSpanMm(instrument: InstrumentSpec, indexFret: number, frets: number): number {
  const geometry = bassGeometry(instrument);
  return (
    fingertipXMm(instrument, geometry, indexFret + frets) -
    fingertipXMm(instrument, geometry, indexFret)
  );
}

/** The first fret at which a shape fits inside a limit, or null if it never does. */
export function firstFretWithin(
  instrument: InstrumentSpec,
  frets: number,
  limitMm: number,
): number | null {
  for (let fret = 1; fret + frets <= instrument.numFrets; fret++) {
    if (shapeSpanMm(instrument, fret, frets) <= limitMm) return fret;
  }
  return null;
}

/** [GEO-01/02] Re-exported at bass names so Part 03's tables can be checked directly. */
export function bassFretDistanceMm(instrument: InstrumentSpec, fret: number): number {
  return fretDistanceMm(instrument.scaleLengthMm, fret);
}

export function bassFretWidthMm(instrument: InstrumentSpec, fret: number): number {
  return fretWidthMm(instrument.scaleLengthMm, fret);
}
