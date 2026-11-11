import { arcHeightForSpan } from './slur.js';
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

export interface TieShape {
  readonly startX: number;
  readonly endX: number;
  readonly y: number;
  readonly side: TieSide;
  /** How far the drawn curve's peak stands off `y` -- the height it REACHES, not a control-point height. */
  readonly bulgeHeight: number;
}

/**
 * The tie's endpoints and curve height. `y` is the notehead's own Y (both
 * tied notes share the same pitch, hence the same Y); the actual curve
 * bulges away from `y` by `bulgeHeight` toward whichever `side` -- 'above'
 * bulges to more-negative Y, 'below' to more-positive Y, matching this
 * engine's Y-down convention throughout.
 *
 * The height comes from the tie's own LENGTH (`arcHeightForSpan`), not
 * from a constant: a tie between two notes a space apart and a tie
 * across half a bar are not the same shape, and drawing them as though
 * they were made the short ones look like scratches.
 */
export function computeTieShape(startX: number, endX: number, y: number, side: TieSide): TieShape {
  return { startX, endX, y, side, bulgeHeight: arcHeightForSpan(endX - startX) };
}
