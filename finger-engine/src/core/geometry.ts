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

/** [GEO-01] Distance from the nut to fret `n`. Fret 12 lands at exactly half the scale. */
export function fretDistanceMm(scaleLengthMm: number, fret: number): number {
  if (fret <= 0) return 0;
  return scaleLengthMm * (1 - Math.pow(2, -fret / 12));
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
  if (instrument.capo > 0 && fret <= instrument.capo) {
    return fretDistanceMm(instrument.scaleLengthMm, instrument.capo);
  }
  return (
    fretDistanceMm(instrument.scaleLengthMm, fret) -
    geometry.fingertipBehindFret * fretWidthMm(instrument.scaleLengthMm, fret)
  );
}

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
