/**
 * paint.ts — the two gradients a guitar is made of.
 *
 * Wood, metal and a sunburst top are never one flat colour, and a
 * picture drawn in flat colours reads as a diagram however carefully
 * it is laid out. These builders keep the drawing code honest: a
 * gradient is data, in the same coordinates as the shape it fills, so
 * the SVG side and the canvas side draw the same thing.
 */
import type { LinearGradient, RadialGradient, StageShape } from './types.js';

/** A gradient along a line, from (x1,y1) to (x2,y2). */
export function linear(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  stops: readonly (readonly [number, string])[],
): LinearGradient {
  return {
    kind: 'linear',
    x1,
    y1,
    x2,
    y2,
    stops: stops.map(([offset, color]) => ({ offset, color })),
  };
}

/** A gradient out from a point: a soundhole's shadow, a knob, a sunburst. */
export function radial(
  cx: number,
  cy: number,
  r: number,
  stops: readonly (readonly [number, string])[],
): RadialGradient {
  return { kind: 'radial', cx, cy, r, stops: stops.map(([offset, color]) => ({ offset, color })) };
}

/** Top-to-bottom across a box: the commonest one here, since the neck runs sideways. */
export function downward(
  y: number,
  height: number,
  stops: readonly (readonly [number, string])[],
): LinearGradient {
  return linear(0, y, 0, y + height, stops);
}

/** A rectangle, with the shape fields this drawing uses most. */
export function rectShape(
  x: number,
  y: number,
  width: number,
  height: number,
  fill: StageShape['fill'],
  extra: Partial<StageShape> = {},
): StageShape {
  return { kind: 'rect', x, y, width, height, fill, ...extra };
}

/** A circle, given its centre and radius rather than a box. */
export function circleShape(
  cx: number,
  cy: number,
  radius: number,
  fill: StageShape['fill'],
  extra: Partial<StageShape> = {},
): StageShape {
  return {
    kind: 'circle',
    x: cx,
    y: cy,
    width: radius * 2,
    height: radius * 2,
    fill,
    ...extra,
  };
}

/** A filled path. `x`/`y`/`width`/`height` are its bounds, for anything that measures it. */
export function pathShape(
  d: string,
  bounds: { x: number; y: number; width: number; height: number },
  fill: StageShape['fill'],
  extra: Partial<StageShape> = {},
): StageShape {
  return { kind: 'path', d, ...bounds, fill, ...extra };
}
