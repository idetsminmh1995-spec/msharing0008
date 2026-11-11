import type { ExtenderLineShape } from '../geometry/lyric.js';
import { svgLine } from './svg-primitives.js';

export interface RenderExtenderLineOptions {
  /** Typically Phase 5's getEngravingDefault('lyricLineThickness'). */
  readonly thickness: number;
  readonly color: string;
}

/** Draws a melisma extender line as a plain horizontal segment. */
export function renderExtenderLine(
  shape: ExtenderLineShape,
  options: RenderExtenderLineOptions,
): string {
  return svgLine(shape.startX, shape.y, shape.endX, shape.y, {
    stroke: options.color,
    'stroke-width': options.thickness,
  });
}
