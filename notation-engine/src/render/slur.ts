import type { SlurShape } from '../geometry/slur.js';
import { svgPath, svgNumber } from './svg-primitives.js';

export interface RenderSlurOptions {
  readonly color: string;
  /** Typically Phase 5's getEngravingDefault('slurMidpointThickness'). */
  readonly midpointThickness: number;
}

/** See `renderTie`: a quadratic Bezier peaks at half its control point's height, so the offsets are doubled to make the drawn curve reach the height the shape states. */
const CONTROL_POINT_REACH = 2;

/**
 * Draws a slur as a filled, tapered lens shape -- the identical technique
 * to Phase 26's `renderTie` (two quadratic Béziers sharing the same two
 * endpoints, one peaking `midpointThickness` below the other), kept as
 * its own function rather than shared code because a slur and a tie are
 * different musical concepts even though Bravura gives them numerically
 * identical thickness constants and this engine draws them the same way.
 */
export function renderSlur(shape: SlurShape, options: RenderSlurOptions): string {
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
