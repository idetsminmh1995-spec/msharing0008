/**
 * hand.ts — the little hand that says which colour is which finger.
 *
 * The colours on the neck mean nothing until someone is told what
 * they mean, and a legend of four coloured squares is a legend of
 * four coloured squares. A hand says it without words: a dot on the
 * fingertip, in that finger's colour.
 *
 * The hand itself stays plain -- an outline, no colour of its own --
 * so the only colours in the picture are the four being explained.
 * It is the FRETTING hand, the one doing the stopping, seen palm on
 * with the thumb to the left.
 */
import { resolveColors } from './colors.js';
import { GradientBank, n, tag, wrap } from './svg.js';
import type { GuitarColors, StageShape } from './types.js';

/** Finger lengths, as fractions of the longest -- a real hand, roughly. */
const FINGER_LENGTH: Readonly<Record<1 | 2 | 3 | 4, number>> = {
  1: 0.88,
  2: 1,
  3: 0.94,
  4: 0.74,
};

export interface HandOptions {
  readonly width: number;
  readonly height: number;
  readonly colors?: Partial<GuitarColors>;
  /** The hand's own ink. Defaults to something that reads on a light card. */
  readonly handColor?: string;
  readonly outline?: string;
}

/**
 * The hand, in the box it is given.
 *
 * Rectangles and circles only, like every other drawing here, so the
 * page's SVG and the video's canvas can both paint it from the same
 * list.
 */
export function handShapes(options: HandOptions): readonly StageShape[] {
  const colors = resolveColors(options.colors);
  const { width, height } = options;
  if (!(width > 0) || !(height > 0)) return [];

  const skin = options.handColor ?? '#F2E7DF';
  const outline = options.outline ?? '#8A7C74';
  const line = Math.max(1, width * 0.012);
  const shapes: StageShape[] = [];

  const palmLeft = width * 0.22;
  const palmRight = width * 0.94;
  const palmTop = height * 0.5;
  const palmWidth = palmRight - palmLeft;
  const palmHeight = height - palmTop - height * 0.03;

  // The thumb, tucked to the left and lower, as it is when a hand is
  // round a neck.
  const thumbWidth = palmWidth * 0.26;
  shapes.push({
    kind: 'rect',
    x: palmLeft - thumbWidth * 0.8,
    y: palmTop + palmHeight * 0.16,
    width: thumbWidth,
    height: palmHeight * 0.66,
    fill: skin,
    stroke: outline,
    strokeWidth: line,
    radius: thumbWidth / 2,
  });

  shapes.push({
    kind: 'rect',
    x: palmLeft,
    y: palmTop,
    width: palmWidth,
    height: palmHeight,
    fill: skin,
    stroke: outline,
    strokeWidth: line,
    radius: Math.min(palmWidth, palmHeight) * 0.3,
  });

  // Four fingers, index on the left through little on the right.
  const gap = palmWidth * 0.06;
  const fingerWidth = (palmWidth - gap * 3) / 4;
  const longest = palmTop - height * 0.06;
  const dots: StageShape[] = [];
  for (const key of [1, 2, 3, 4] as const) {
    const index = key - 1;
    const length = longest * FINGER_LENGTH[key];
    const x = palmLeft + index * (fingerWidth + gap);
    const y = palmTop - length;
    shapes.push({
      kind: 'rect',
      x,
      y,
      width: fingerWidth,
      // Reaching into the palm, so no seam shows where they meet.
      height: length + palmHeight * 0.32,
      fill: skin,
      stroke: outline,
      strokeWidth: line,
      radius: fingerWidth / 2,
    });
    // The top of the finger is painted in that finger's colour, not
    // just a dot on the tip. At the size this is drawn in a video
    // frame -- a couple of centimetres -- a dot is a speck and a
    // coloured finger is unmistakable.
    const colour =
      key === 1
        ? colors.index
        : key === 2
          ? colors.middle
          : key === 3
            ? colors.ring
            : colors.little;
    dots.push({
      kind: 'rect',
      x,
      y,
      width: fingerWidth,
      height: length * 0.62,
      fill: colour,
      radius: fingerWidth / 2,
    });
  }
  return [...shapes, ...dots];
}

export function renderHand(options: HandOptions): string {
  const gradients = new GradientBank();
  const body = handShapes(options)
    .map((shape) => {
      const common = {
        fill: gradients.paint(shape.fill),
        ...(shape.stroke !== undefined ? { stroke: shape.stroke } : {}),
        ...(shape.strokeWidth !== undefined ? { 'stroke-width': shape.strokeWidth } : {}),
      };
      if (shape.kind === 'circle') {
        return tag('circle', { cx: shape.x, cy: shape.y, r: shape.width / 2, ...common });
      }
      return tag('rect', {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        ...(shape.radius !== undefined ? { rx: shape.radius } : {}),
        ...common,
      });
    })
    .join('');
  return wrap(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: `0 0 ${n(options.width)} ${n(options.height)}`,
      width: options.width,
      height: options.height,
    },
    gradients.finish(body),
  );
}
