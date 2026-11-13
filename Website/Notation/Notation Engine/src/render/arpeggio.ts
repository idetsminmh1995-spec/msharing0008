import type { ArpeggioShape, NonArpeggioShape } from '../geometry/arpeggio.js';
import { svgLine, svgPath } from './svg-primitives.js';

export interface RenderArpeggioOptions {
  readonly color: string;
  /** Stroke weight, typically the font's own `stemThickness`-class value. */
  readonly thickness: number;
}

/** Draws a rolled chord's squiggle as one open stroked path (§9.25). */
export function renderArpeggio(shape: ArpeggioShape, options: RenderArpeggioOptions): string {
  if (shape.points.length < 2) return '';
  const [first, ...rest] = shape.points;
  if (first === undefined) return '';
  const d = [`M ${first[0]} ${first[1]}`, ...rest.map((point) => `L ${point[0]} ${point[1]}`)].join(
    ' ',
  );
  return svgPath(d, {
    fill: 'none',
    stroke: options.color,
    'stroke-width': options.thickness,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  });
}

/**
 * Draws the bracket that says a chord is explicitly NOT rolled (§9.25):
 * a vertical line with a short hook at each end, hooks pointing away
 * from the noteheads.
 */
export function renderNonArpeggio(shape: NonArpeggioShape, options: RenderArpeggioOptions): string {
  const stroke = { stroke: options.color, 'stroke-width': options.thickness };
  const hookX = shape.x - shape.hookLength;
  return [
    svgLine(shape.x, shape.topY, shape.x, shape.bottomY, stroke),
    svgLine(hookX, shape.topY, shape.x, shape.topY, stroke),
    svgLine(hookX, shape.bottomY, shape.x, shape.bottomY, stroke),
  ].join('\n');
}
