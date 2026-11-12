import type { SlideShape } from '../geometry/slide.js';
import { svgPath, svgNumber } from './svg-primitives.js';
export interface RenderSlideOptions {
  readonly color: string;
  readonly thickness: number;
}
/** Draws a straight slash for <slide>; glissando is visibly distinct with a fine wave. */
export function renderSlide(shape: SlideShape, options: RenderSlideOptions): string {
  const n = svgNumber;
  if (shape.kind === 'slide')
    return svgPath(`M ${n(shape.startX)} ${n(shape.startY)} L ${n(shape.endX)} ${n(shape.endY)}`, {
      fill: 'none',
      stroke: options.color,
      'stroke-width': options.thickness,
      'stroke-linecap': 'round',
    });
  const dx = shape.endX - shape.startX,
    dy = shape.endY - shape.startY;
  const steps = Math.max(4, Math.ceil(dx / 1.5));
  const amp = Math.min(0.28, Math.max(0.12, dx / 24));
  const pts = [`M ${n(shape.startX)} ${n(shape.startY)}`];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = shape.startX + dx * t;
    const y = shape.startY + dy * t + Math.sin(t * Math.PI * 2 * Math.max(1, dx / 4)) * amp;
    pts.push(`L ${n(x)} ${n(y)}`);
  }
  return svgPath(pts.join(' '), {
    fill: 'none',
    stroke: options.color,
    'stroke-width': options.thickness,
    'stroke-linecap': 'round',
    'stroke-dasharray': '0.01 0',
  });
}
