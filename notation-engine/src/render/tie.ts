import type { TieShape } from '../geometry/tie.js';
import { svgPath } from './svg-primitives.js';

export interface RenderTieOptions {
  readonly color: string;
  /** Typically Phase 5's getEngravingDefault('tieMidpointThickness'). */
  readonly midpointThickness: number;
}

/**
 * Draws a tie as a filled, tapered lens shape rather than a single
 * uniform-width stroke: two quadratic Béziers sharing the same two
 * endpoints, one curving to `bulgeHeight - midpointThickness/2` and the
 * other to `bulgeHeight + midpointThickness/2`, so the shape is thinnest
 * at its very tips and thickest at its peak -- matching Bravura's own
 * distinction between `tieEndpointThickness` and `tieMidpointThickness`
 * (a beam, by contrast, is uniform thickness throughout, which is why
 * Phase 24's beam rendering is a plain stroked line/path instead).
 *
 * Simplification, stated rather than silently exact: the two curves meet
 * at the SAME endpoints, tapering fully to a point rather than to
 * Bravura's real (small but nonzero) `tieEndpointThickness`. Visually
 * close at this engine's scale; a future refinement could offset the tips
 * by half that thickness for full fidelity.
 */
export function renderTie(shape: TieShape, options: RenderTieOptions): string {
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
