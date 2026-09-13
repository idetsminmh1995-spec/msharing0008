import type { StemDirection } from './stem.js';
import type { TieSide } from './tie.js';

export type SlurSide = TieSide;

/**
 * §9.16's rule -- one decision for the WHOLE span, confirmed identically
 * across Wikipedia's "Slur (music)" and Dorico's own published engraving
 * conventions: all up-stem notes -> below; anything else (all down-stem,
 * or a mix of both) -> above. This is a different shape of rule from a
 * tie's per-note flip (§9.15) -- a slur commits to one side for its
 * entire length, the same way a beam commits to one shared direction for
 * its whole group (§9.13), just via a different test (here: "are they
 * ALL up?", not "which is furthest from the middle line?").
 */
export function slurSide(stemDirections: readonly StemDirection[]): SlurSide {
  if (stemDirections.length === 0) {
    throw new Error('slurSide needs at least one stem direction');
  }
  const allUp = stemDirections.every((d) => d === 'up');
  return allUp ? 'below' : 'above';
}

const SLUR_BULGE_HEIGHT = 0.5;

export interface SlurShape {
  readonly startX: number;
  readonly endX: number;
  readonly y: number;
  readonly side: SlurSide;
  readonly bulgeHeight: number;
}

/**
 * A slur's endpoints and curve height -- structurally the same shape as
 * Phase 26's `TieShape` (both render via the same tapered-lens Bezier
 * primitive), kept as a separate type and function because a slur and a
 * tie remain different musical concepts even where the geometry
 * coincides. `startX`/`endX` are the span's FIRST and LAST note only;
 * this section does not check that the curve clears any notes in
 * between (§9.16's stated limitation, matching Phase 24's beam-curve
 * scope).
 */
export function computeSlurShape(
  startX: number,
  endX: number,
  y: number,
  side: SlurSide,
): SlurShape {
  return { startX, endX, y, side, bulgeHeight: SLUR_BULGE_HEIGHT };
}
