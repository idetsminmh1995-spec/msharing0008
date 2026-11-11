import type { HairpinShape } from '../geometry/hairpin.js';
import { svgLine } from './svg-primitives.js';

export interface RenderHairpinOptions {
  /** Typically Phase 5's getEngravingDefault('hairpinThickness'). */
  readonly thickness: number;
  readonly color: string;
}

/**
 * Draws a hairpin as two line segments meeting at its narrow end: for a
 * crescendo the narrow end is `startX` (opening toward `endX`); for a
 * decrescendo the narrow end is `endX` (closing from `startX`) -- mirror
 * images of the same two-line shape, not two independently-built shapes.
 */
export function renderHairpin(shape: HairpinShape, options: RenderHairpinOptions): string {
  const narrowX = shape.kind === 'crescendo' ? shape.startX : shape.endX;
  const wideX = shape.kind === 'crescendo' ? shape.endX : shape.startX;
  const attrs = { stroke: options.color, 'stroke-width': options.thickness };
  return [
    svgLine(narrowX, shape.y, wideX, shape.y - shape.spread, attrs),
    svgLine(narrowX, shape.y, wideX, shape.y + shape.spread, attrs),
  ].join('\n');
}
