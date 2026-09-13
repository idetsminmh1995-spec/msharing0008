import type { SlurShape } from '../geometry/slur.js';
import { svgPath } from './svg-primitives.js';

export interface RenderSlurOptions {
  readonly color: string;
  /** Typically Phase 5's getEngravingDefault('slurMidpointThickness'). */
  readonly midpointThickness: number;
}

/**
 * Draws a slur as a filled, tapered lens shape -- the identical technique
 * to Phase 26's `renderTie` (two quadratic Béziers sharing the same two
 * endpoints, one bulging to `bulgeHeight - midpointThickness/2` and the
 * other to `bulgeHeight + midpointThickness/2`), kept as its own function
 * rather than shared code because a slur and a tie are different musical
 * concepts even though Bravura gives them numerically identical
 * thickness constants and this engine draws them the same way.
 */
export function renderSlur(shape: SlurShape, options: RenderSlurOptions): string {
  const towardBulge = shape.side === 'above' ? -1 : 1;
  const midX = (shape.startX + shape.endX) / 2;
  const innerY = shape.y + towardBulge * (shape.bulgeHeight - options.midpointThickness / 2);
  const outerY = shape.y + towardBulge * (shape.bulgeHeight + options.midpointThickness / 2);

  const d =
    `M ${shape.startX} ${shape.y} ` +
    `Q ${midX} ${innerY} ${shape.endX} ${shape.y} ` +
    `Q ${midX} ${outerY} ${shape.startX} ${shape.y} Z`;

  return svgPath(d, { fill: options.color, stroke: 'none' });
}
