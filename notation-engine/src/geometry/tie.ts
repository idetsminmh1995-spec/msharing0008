import type { StemDirection } from './stem.js';

export type TieSide = 'above' | 'below';

/**
 * §9.15's universal rule, confirmed identically across multiple sources
 * with zero disagreement: a tie is always placed on the OPPOSITE side
 * from the note's own stem direction ("if the stem is pointing down, the
 * tie goes on top, and if the stem is pointing up, the tie goes on the
 * bottom"). Takes the note's already-resolved direction rather than
 * recomputing one -- for a note in a multi-voice context the direction
 * may be forced (§9.14), and the tie must follow whatever direction that
 * note actually ended up with, not a fresh automatic calculation.
 */
export function tieSide(stemDirection: StemDirection): TieSide {
  return stemDirection === 'down' ? 'above' : 'below';
}

const TIE_BULGE_HEIGHT = 0.5;

export interface TieShape {
  readonly startX: number;
  readonly endX: number;
  readonly y: number;
  readonly side: TieSide;
  readonly bulgeHeight: number;
}

/**
 * The tie's endpoints and curve height. `y` is the notehead's own Y (both
 * tied notes share the same pitch, hence the same Y); the actual curve
 * bulges away from `y` by `bulgeHeight` toward whichever `side` -- 'above'
 * bulges to more-negative Y, 'below' to more-positive Y, matching this
 * engine's Y-down convention throughout.
 */
export function computeTieShape(startX: number, endX: number, y: number, side: TieSide): TieShape {
  return { startX, endX, y, side, bulgeHeight: TIE_BULGE_HEIGHT };
}
