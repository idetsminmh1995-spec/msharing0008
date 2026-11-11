import type { TieShape } from '../geometry/tie.js';
import { svgPath, svgNumber } from './svg-primitives.js';

export interface RenderTieOptions {
  readonly color: string;
  /** Typically Phase 5's getEngravingDefault('tieMidpointThickness'). */
  readonly midpointThickness: number;
}

/**
 * A quadratic Bezier reaches HALF the height its control point is at:
 * B(0.5) = (P0 + 2*P1 + P2)/4, and with both endpoints on the baseline
 * that is half of P1. So a control point put at the height the curve is
 * meant to reach draws a curve half that high.
 *
 * That was this engine's tie and slur for a long time, and it is what
 * the owner saw: a tie stated at Bravura's 0.21 staff spaces thick and
 * arcing half a space came out 0.105 thick and 0.25 high -- a hairline
 * between two noteheads, next to invisible at video size. Doubling the
 * control offsets is all it takes: the shape's own numbers were right,
 * only the drawing of them was not.
 */
const CONTROL_POINT_REACH = 2;

/**
 * Draws a tie as a filled, tapered lens shape rather than a single
 * uniform-width stroke: two quadratic Béziers sharing the same two
 * endpoints, one peaking `midpointThickness` below the other, so the
 * shape is thinnest at its very tips and thickest at its peak --
 * matching Bravura's own distinction between `tieEndpointThickness` and
 * `tieMidpointThickness` (a beam, by contrast, is uniform thickness
 * throughout, which is why Phase 24's beam rendering is a plain
 * stroked line/path instead).
 *
 * Simplification, stated rather than silently exact: the two curves meet
 * at the SAME endpoints, tapering fully to a point rather than to
 * Bravura's real `tieEndpointThickness` -- which is 0.05 staff spaces,
 * under half a pixel at the sizes this engine draws at, so the tips
 * would look no different for the extra geometry.
 */
export function renderTie(shape: TieShape, options: RenderTieOptions): string {
  const towardBulge = shape.side === 'above' ? -1 : 1;
  const midX = (shape.startX + shape.endX) / 2;
  const half = options.midpointThickness / 2;
  const innerY = shape.y + towardBulge * (shape.bulgeHeight - half) * CONTROL_POINT_REACH;
  const outerY = shape.y + towardBulge * (shape.bulgeHeight + half) * CONTROL_POINT_REACH;

  const n = svgNumber;
  const d =
    `M ${n(shape.startX)} ${n(shape.y)} ` +
    `Q ${n(midX)} ${n(innerY)} ${n(shape.endX)} ${n(shape.y)} ` +
    `Q ${n(midX)} ${n(outerY)} ${n(shape.startX)} ${n(shape.y)} Z`;

  return svgPath(d, { fill: options.color, stroke: 'none' });
}
