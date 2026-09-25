/**
 * hand.ts — the little hand that says which colour is which finger.
 *
 * The colours on the neck mean nothing until someone is told what
 * they mean, and a legend of four coloured squares is a legend of
 * four coloured squares. A hand says it without words: this finger,
 * that colour.
 *
 * Drawn as the FRETTING hand seen from the back, fingers up, thumb
 * to the left -- a right-handed player's left hand, which is the hand
 * doing the stopping and therefore the hand these colours are about.
 */
import { resolveColors } from './stage.js';
import { n, tag, wrap } from './svg.js';
import type { GuitarColors, StageShape } from './types.js';

/** Finger lengths, as fractions of the longest -- a real hand, roughly. */
const FINGER_LENGTH: Readonly<Record<1 | 2 | 3 | 4, number>> = {
  1: 0.88,
  2: 1,
  3: 0.94,
  4: 0.74,
};

/**
 * The hand, in the box it is given.
 *
 * Rectangles and circles only, like every other drawing here, so the
 * page's SVG and the video's canvas can both paint it from the same
 * list.
 */
export function handShapes(options: {
  width: number;
  height: number;
  colors?: Partial<GuitarColors>;
  /** The palm and thumb, when a frame wants them in its own ink rather than the default. */
  palmColor?: string;
}): readonly StageShape[] {
  const colors = resolveColors(options.colors);
  const { width, height } = options;
  if (!(width > 0) || !(height > 0)) return [];

  const palm = options.palmColor ?? colors.unassigned;
  const shapes: StageShape[] = [];

  // The palm: the bottom half, with the fingers standing on it.
  const palmLeft = width * 0.2;
  const palmRight = width * 0.92;
  const palmTop = height * 0.52;
  const palmWidth = palmRight - palmLeft;
  const palmHeight = height - palmTop;

  // The thumb, tucked to the left and lower, as it is when a hand is
  // round a neck. A nub rather than a jointed thumb: this is a legend.
  const thumbWidth = palmWidth * 0.26;
  shapes.push({
    kind: 'rect',
    x: palmLeft - thumbWidth * 0.75,
    y: palmTop + palmHeight * 0.18,
    width: thumbWidth,
    height: palmHeight * 0.62,
    fill: palm,
    radius: thumbWidth / 2,
    opacity: 0.55,
  });

  shapes.push({
    kind: 'rect',
    x: palmLeft,
    y: palmTop,
    width: palmWidth,
    height: palmHeight,
    fill: palm,
    radius: Math.min(palmWidth, palmHeight) * 0.28,
    opacity: 0.55,
  });

  // Four fingers, index on the left through little on the right --
  // the order they are in when you look at the back of your own left
  // hand with the fingers pointing up.
  const gap = palmWidth * 0.06;
  const fingerWidth = (palmWidth - gap * 3) / 4;
  const longest = palmTop - height * 0.04;
  for (const key of [1, 2, 3, 4] as const) {
    const index = key - 1;
    const length = longest * FINGER_LENGTH[key];
    const x = palmLeft + index * (fingerWidth + gap);
    const y = palmTop - length;
    shapes.push({
      kind: 'rect',
      x,
      y,
      // A finger reaches INTO the palm, so no seam shows where they meet.
      width: fingerWidth,
      height: length + palmHeight * 0.3,
      fill:
        key === 1
          ? colors.index
          : key === 2
            ? colors.middle
            : key === 3
              ? colors.ring
              : colors.little,
      radius: fingerWidth / 2,
    });
  }
  return shapes;
}

export function renderHand(options: {
  width: number;
  height: number;
  colors?: Partial<GuitarColors>;
  palmColor?: string;
}): string {
  const body = handShapes(options)
    .map((shape) =>
      tag('rect', {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        fill: shape.fill,
        ...(shape.radius !== undefined ? { rx: shape.radius } : {}),
        ...(shape.opacity !== undefined ? { opacity: shape.opacity } : {}),
      }),
    )
    .join('');
  return wrap(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: `0 0 ${n(options.width)} ${n(options.height)}`,
      width: options.width,
      height: options.height,
    },
    body,
  );
}
