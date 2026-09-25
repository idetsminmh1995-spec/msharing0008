/**
 * geometry.ts — the fretboard in millimetres (Plan Part 04).
 *
 * The engine measures difficulty in real distance, not in fret
 * numbers, because frets get narrower towards the body: a four-fret
 * stretch at the first fret is a hard stretch, and the same four
 * frets at the twelfth is comfortable. Fret numbers cannot tell those
 * apart; millimetres can.
 *
 * [GEO-06] None of this reaches the screen. The renderer has its own
 * drawing geometry and is given fret/string numbers; these
 * millimetres exist only to cost a fingering and to time a movement.
 */
import type { InstrumentSpec, StringIndex } from './types.js';

export interface GeometryConfig {
  /** [GEO-03] how far behind the fret wire the fingertip sits, as a fraction of the fret's width. */
  readonly fingertipBehindFret: number;
}

/**
 * Remembered fret positions, for one scale length at a time.
 *
 * `fretDistanceMm` is a pure function of two numbers, and the solver
 * asks it for the same two dozen frets hundreds of thousands of times
 * in one song -- it is the single hottest line in the engine. The
 * memo changes no answer; it only stops the same power being raised
 * again and again. A plain array beats a map here because the key is
 * a small integer, and one scale length is enough: a session plays
 * one guitar, and a second one simply rebuilds the table.
 */
const MEMO_FRETS = 64;
let memoScaleLength = -1;
let memoDistances = new Float64Array(MEMO_FRETS + 1).fill(Number.NaN);

/** [GEO-01] Distance from the nut to fret `n`. Fret 12 lands at exactly half the scale. */
export function fretDistanceMm(scaleLengthMm: number, fret: number): number {
  if (fret <= 0) return 0;
  if (fret > MEMO_FRETS || !Number.isInteger(fret)) {
    return scaleLengthMm * (1 - Math.pow(2, -fret / 12));
  }
  if (scaleLengthMm !== memoScaleLength) {
    memoScaleLength = scaleLengthMm;
    memoDistances = new Float64Array(MEMO_FRETS + 1).fill(Number.NaN);
  }
  const remembered = memoDistances[fret] as number;
  if (!Number.isNaN(remembered)) return remembered;
  const distance = scaleLengthMm * (1 - Math.pow(2, -fret / 12));
  memoDistances[fret] = distance;
  return distance;
}

/** [GEO-02] The width of the fret SPACE `n`, between wire n-1 and wire n. */
export function fretWidthMm(scaleLengthMm: number, fret: number): number {
  if (fret <= 0) return 0;
  return fretDistanceMm(scaleLengthMm, fret) - fretDistanceMm(scaleLengthMm, fret - 1);
}

/**
 * [GEO-03] Where a fingertip sits along the neck for a note.
 *
 * Just behind the wire, not in the middle of the space, because that
 * is where a finger actually goes -- and it is what makes a stretch
 * at the first fret measure longer than the same stretch higher up.
 * An open string is the nut; a note held by a capo is the capo.
 */
export function fingertipXMm(
  instrument: InstrumentSpec,
  geometry: GeometryConfig,
  fret: number,
): number {
  if (fret <= 0) return 0;
  const whole = fret <= MEMO_FRETS && Number.isInteger(fret);
  if (whole) {
    // Same memo, same reason as the fret distances -- one step higher
    // up, because THIS is the number the cost model actually asks for,
    // and asking for it folds three fret distances into one lookup.
    const signature =
      instrument.scaleLengthMm * 1e6 + instrument.capo * 1e3 + geometry.fingertipBehindFret;
    if (signature !== memoTipSignature) {
      memoTipSignature = signature;
      memoTips = new Float64Array(MEMO_FRETS + 1).fill(Number.NaN);
    }
    const remembered = memoTips[fret] as number;
    if (!Number.isNaN(remembered)) return remembered;
  }
  const x =
    instrument.capo > 0 && fret <= instrument.capo
      ? fretDistanceMm(instrument.scaleLengthMm, instrument.capo)
      : fretDistanceMm(instrument.scaleLengthMm, fret) -
        geometry.fingertipBehindFret * fretWidthMm(instrument.scaleLengthMm, fret);
  if (whole) memoTips[fret] = x;
  return x;
}

let memoTipSignature = Number.NaN;
let memoTips = new Float64Array(MEMO_FRETS + 1).fill(Number.NaN);

/**
 * [GEO-04] The gap between neighbouring strings at a point along the
 * neck. Strings fan out from the nut to the bridge, so a stretch
 * across strings costs more the further up the neck it happens.
 */
export function stringSpacingMm(instrument: InstrumentSpec, xMm: number): number {
  const span =
    instrument.nutSpacingMm +
    ((instrument.bridgeSpacingMm - instrument.nutSpacingMm) * xMm) / instrument.scaleLengthMm;
  return span / Math.max(1, instrument.numStrings - 1);
}

/** [GEO-04] How far across the neck a string sits, at a point along it. */
export function stringYMm(instrument: InstrumentSpec, string: StringIndex, xMm: number): number {
  return (string - 1) * stringSpacingMm(instrument, xMm);
}

export interface FingertipPoint {
  readonly xMm: number;
  readonly yMm: number;
}

/** Where a fingertip is, for a note on a string at a fret. */
export function fingertipPoint(
  instrument: InstrumentSpec,
  geometry: GeometryConfig,
  string: StringIndex,
  fret: number,
): FingertipPoint {
  const xMm = fingertipXMm(instrument, geometry, fret);
  return { xMm, yMm: stringYMm(instrument, string, xMm) };
}

/**
 * [GEO-05] How far apart two fingertips are.
 *
 * The two axes are reported as well as the straight-line distance,
 * because they do not cost the same: reaching ALONG the neck is a
 * stretch, reaching ACROSS it is barely anything.
 */
export function fingertipDistanceMm(
  a: FingertipPoint,
  b: FingertipPoint,
): { distanceMm: number; alongMm: number; acrossMm: number } {
  const alongMm = Math.abs(b.xMm - a.xMm);
  const acrossMm = Math.abs(b.yMm - a.yMm);
  return { distanceMm: Math.hypot(alongMm, acrossMm), alongMm, acrossMm };
}

/**
 * The stretch between two frets on one string, as the fingers feel it.
 *
 * This is the number the span limits in Part 05 are written against:
 * index at fret p, little finger at fret p+3, on the same string.
 */
export function spanMm(
  instrument: InstrumentSpec,
  geometry: GeometryConfig,
  fromFret: number,
  toFret: number,
): number {
  return Math.abs(
    fingertipXMm(instrument, geometry, toFret) - fingertipXMm(instrument, geometry, fromFret),
  );
}
