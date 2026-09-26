/**
 * hand.ts — the little hand that says which colour is which finger.
 *
 * The colours on the neck mean nothing until someone is told what
 * they mean, and a legend of five coloured squares is a legend of
 * five coloured squares. A hand says it without words: the digit
 * itself, in that digit's colour.
 *
 * It is the owner's own outline -- a flat silhouette, palm on, four
 * fingers up and the thumb out to the left -- and every digit is
 * painted, thumb included. The palm stays plain, so the only colours
 * in the picture are the five being explained.
 *
 * Rounded rectangles, nothing else. The legend is drawn INTO the
 * stage and then moved into its corner, and moving a shape here is
 * adding two numbers to it; an arc would have to be re-written
 * instead, and a mis-shifted arc is a hand with a broken thumb.
 */
import { resolveColors } from './colors.js';
import { GradientBank, n, tag, wrap } from './svg.js';
import type { GuitarColors, HandPicture, StageShape } from './types.js';

/**
 * The drawn hand that came with the page's own artwork.
 *
 * Its size is the file's, kept here for the same reason the
 * photograph's fret wires are: the engine has to lay the picture out
 * before the browser has finished loading it, and a hand that jumps
 * size when the file arrives is worse than one drawn a frame late.
 */
export const HAND_PICTURE: Omit<HandPicture, 'href'> = { width: 839, height: 915 };

/** That drawing, at the path the caller keeps it. */
export function handPicture(href: string): HandPicture {
  return { ...HAND_PICTURE, href };
}

/**
 * The silhouette, in its own units.
 *
 * Traced off the owner's drawing, which is 165 by 196: four fingers
 * as rounded bars over a palm, and the thumb as a rounded bar out to
 * the left. Everything below is a share of this box, so the hand can
 * be drawn at any size and still be that hand.
 */
const ART = { width: 165, height: 196 };

/** Each finger: its left edge, its right edge, and where its tip is. */
const FINGERS: Readonly<Record<1 | 2 | 3 | 4, { from: number; to: number; tip: number }>> = {
  1: { from: 57, to: 73, tip: 42 },
  2: { from: 75, to: 91, tip: 30 },
  3: { from: 95, to: 111, tip: 42 },
  4: { from: 113, to: 129, tip: 54 },
};

const PALM = { from: 57, to: 129, top: 96, bottom: 172 };

/** The thumb's own bar, out to the left of the palm's lower half. */
const THUMB = { from: 22, to: 80, top: 106, bottom: 138 };

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
 * Scaled to fit and centred, so it keeps its own shape whatever box
 * it is handed -- a hand squashed to fill a frame stops looking like
 * a hand. Rounded rectangles only, like every other drawing here, so
 * the page's SVG and the video's canvas paint it from the same list
 * and it can be moved about the frame by shifting two numbers.
 */
export function handShapes(options: HandOptions): readonly StageShape[] {
  const colors = resolveColors(options.colors);
  const { width, height } = options;
  if (!(width > 0) || !(height > 0)) return [];

  const scale = Math.min(width / ART.width, height / ART.height);
  const offsetX = (width - ART.width * scale) / 2;
  const offsetY = (height - ART.height * scale) / 2;
  const bar = (
    from: number,
    to: number,
    top: number,
    bottom: number,
    fill: string,
    round: number,
  ): StageShape => ({
    kind: 'rect',
    x: offsetX + from * scale,
    y: offsetY + top * scale,
    width: (to - from) * scale,
    height: (bottom - top) * scale,
    fill,
    radius: round * scale,
    ...(options.outline === undefined
      ? {}
      : { stroke: options.outline, strokeWidth: Math.max(1, width * 0.01) }),
  });

  // The thumb and the fingers first, because the palm laps over the
  // feet of all five and there should be no seam where they meet.
  const shapes: StageShape[] = [
    bar(
      THUMB.from,
      THUMB.to,
      THUMB.top,
      THUMB.bottom,
      colors.thumb,
      (THUMB.bottom - THUMB.top) / 2,
    ),
  ];
  const tint: Readonly<Record<1 | 2 | 3 | 4, string>> = {
    1: colors.index,
    2: colors.middle,
    3: colors.ring,
    4: colors.little,
  };
  for (const key of [1, 2, 3, 4] as const) {
    const finger = FINGERS[key];
    shapes.push(
      bar(
        finger.from,
        finger.to,
        finger.tip,
        PALM.top + 24,
        tint[key],
        (finger.to - finger.from) / 2,
      ),
    );
  }
  shapes.push(
    bar(
      PALM.from,
      PALM.to,
      PALM.top,
      PALM.bottom,
      options.handColor ?? '#F2E7DF',
      (PALM.to - PALM.from) / 4.2,
    ),
  );
  return shapes;
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
