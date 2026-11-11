/**
 * hand.ts — the little hand that says which colour is which finger.
 *
 * The colours on the neck mean nothing until someone is told what
 * they mean, and a legend of five coloured squares is a legend of
 * five coloured squares. A hand says it without words: the digit
 * itself, in that digit's colour.
 *
 * It is the owner's own drawing, and it is that drawing rather than
 * something like it: a flat silhouette, palm on, four fingers up and
 * the thumb out to the left, TRACED off the artwork they sent, at
 * half a pixel. It used to be five rounded bars laid out to the same
 * measurements, which is a different hand that happens to be the same
 * size -- their thumb comes off the palm at an angle no capsule has,
 * and the heel of their hand is a long sweep rather than a corner.
 *
 * Six outlines, all of them straight lines. The silhouette is the
 * whole hand, and the five digits are its own shape cut into pieces:
 * every point on a digit's edge is a point on the hand's edge, so the
 * colours cannot disagree with the outline they sit in. The legend is
 * drawn INTO the stage and then moved into its corner, and moving a
 * path here is adding two numbers to every coordinate in it; an arc
 * would have to be re-written instead, because its radii and its flags
 * are not coordinates, and a mis-shifted arc is a hand with a broken
 * thumb.
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
 * The box the outlines below are drawn in: the artwork's own size.
 *
 * Everything else is a coordinate inside it, so the hand can be drawn
 * at any size and still be that hand.
 */
const ART = { width: 165, height: 196 };

/**
 * The hand itself, as x,y pairs around its edge.
 *
 * Traced off the artwork rather than drawn: the outline is walked
 * along the pixel lattice and then thinned until no point is more
 * than half a pixel from where the drawing put it. Half a pixel of
 * a 165-wide drawing is a fifth of a pixel at the size the legend is
 * ever drawn, so this IS the artwork, not a likeness of it.
 */
const SILHOUETTE: readonly number[] = [
  79, 27, 86, 27, 86, 28, 87, 28, 87, 29, 88, 29, 88, 30, 90, 31, 90, 98, 91, 98, 91, 99, 93, 99,
  93, 98, 94, 98, 94, 42, 95, 42, 95, 40, 96, 40, 97, 38, 100, 38, 100, 37, 104, 37, 104, 38, 106,
  38, 106, 39, 107, 39, 107, 40, 109, 41, 109, 44, 110, 44, 110, 101, 112, 101, 112, 100, 113, 100,
  113, 60, 114, 60, 114, 57, 115, 57, 116, 55, 118, 55, 118, 54, 124, 54, 124, 55, 126, 55, 126, 56,
  128, 57, 128, 59, 129, 59, 129, 153, 128, 153, 128, 157, 127, 157, 126, 161, 125, 161, 125, 162,
  124, 162, 124, 163, 123, 163, 123, 164, 122, 164, 122, 165, 121, 165, 120, 167, 118, 167, 118,
  168, 116, 168, 116, 169, 114, 169, 114, 170, 108, 171, 108, 172, 103, 172, 103, 173, 83, 173, 83,
  172, 78, 172, 78, 171, 74, 171, 74, 170, 71, 170, 71, 169, 68, 169, 68, 168, 64, 167, 64, 166, 63,
  166, 63, 165, 61, 165, 61, 164, 60, 164, 60, 163, 59, 163, 59, 162, 58, 162, 58, 161, 57, 161, 57,
  160, 56, 160, 56, 159, 55, 159, 55, 158, 54, 158, 54, 157, 53, 157, 53, 156, 52, 156, 52, 155, 51,
  155, 51, 154, 50, 154, 50, 153, 49, 153, 49, 152, 48, 152, 47, 150, 45, 150, 45, 149, 44, 149, 44,
  148, 43, 148, 43, 147, 42, 147, 42, 146, 41, 146, 41, 145, 40, 145, 40, 144, 39, 144, 39, 143, 38,
  143, 38, 142, 37, 142, 37, 141, 36, 141, 36, 140, 35, 140, 35, 139, 34, 139, 34, 138, 33, 138, 33,
  137, 32, 137, 32, 136, 31, 136, 31, 135, 30, 135, 30, 134, 29, 134, 29, 133, 28, 133, 28, 132, 27,
  132, 26, 130, 24, 130, 24, 129, 23, 129, 23, 128, 22, 128, 22, 127, 20, 126, 20, 124, 19, 124, 19,
  117, 20, 117, 20, 116, 21, 116, 22, 114, 25, 114, 25, 113, 29, 113, 29, 114, 33, 114, 33, 115, 35,
  115, 35, 116, 37, 116, 37, 117, 39, 117, 39, 118, 41, 118, 41, 119, 43, 119, 43, 120, 47, 121, 48,
  123, 50, 123, 50, 124, 52, 124, 52, 125, 55, 125, 55, 47, 56, 47, 56, 44, 57, 44, 57, 43, 58, 43,
  59, 41, 67, 41, 67, 42, 68, 42, 68, 43, 70, 44, 70, 46, 71, 46, 71, 94, 72, 94, 72, 95, 74, 95,
  74, 94, 75, 94, 75, 31, 76, 31, 76, 29, 77, 29, 77, 28, 79, 28,
];

/**
 * The five digits, each one a piece of the hand above.
 *
 * A finger is the silhouette cut to that finger's own column, down
 * past the web to the knuckle -- so the colour runs on into the palm
 * a little way, the way a finger does, instead of stopping dead where
 * the gap between two fingers happens to close. The four cuts are
 * staggered rather than level, because the knuckles are.
 *
 * The thumb is cut along the crease it makes with the palm, which is
 * a line from just inside the web down towards the heel. There is no
 * gap to find it by: in this drawing the thumb and the heel of the
 * hand are one stretch of outline, so the crease is the only place to
 * put the join, and it is the place a hand puts it.
 */
const THUMB: readonly number[] = [
  25, 113, 33, 114, 33, 115, 35, 115, 35, 116, 37, 116, 37, 117, 39, 117, 39, 118, 41, 118, 41, 119,
  43, 119, 43, 120, 45, 120, 45, 121, 47, 121, 48, 123, 50, 123, 50, 124, 52, 124, 36, 140, 35, 140,
  35, 139, 34, 139, 34, 138, 33, 138, 33, 137, 32, 137, 32, 136, 31, 136, 31, 135, 30, 135, 30, 134,
  29, 134, 29, 133, 28, 133, 28, 132, 27, 132, 26, 130, 24, 130, 24, 129, 23, 129, 23, 128, 22, 128,
  22, 127, 20, 126, 20, 124, 19, 124, 19, 117, 20, 117, 20, 116, 21, 116, 22, 114, 25, 114,
];

const INDEX: readonly number[] = [
  59, 41, 67, 41, 67, 42, 68, 42, 68, 43, 70, 44, 70, 46, 71, 46, 71, 94, 72, 94, 72, 114, 55, 114,
  55, 47, 56, 47, 56, 44, 57, 44, 57, 43, 58, 43,
];

const MIDDLE: readonly number[] = [
  79, 27, 86, 27, 86, 28, 87, 28, 87, 29, 88, 29, 88, 30, 90, 31, 90, 98, 91, 98, 91, 114, 72, 114,
  72, 95, 74, 95, 74, 94, 75, 94, 75, 31, 76, 31, 76, 29, 77, 29, 77, 28, 79, 28,
];

const RING: readonly number[] = [
  100, 37, 104, 37, 104, 38, 106, 38, 106, 39, 107, 39, 107, 40, 109, 41, 109, 44, 110, 44, 110,
  101, 111, 101, 111, 118, 91, 118, 91, 99, 93, 99, 93, 98, 94, 98, 94, 42, 95, 42, 95, 40, 96, 40,
  97, 38, 100, 38,
];

const LITTLE: readonly number[] = [
  118, 54, 124, 54, 124, 55, 126, 55, 126, 56, 128, 57, 128, 59, 129, 59, 129, 120, 111, 120, 111,
  101, 113, 100, 113, 60, 114, 60, 114, 57, 115, 57, 116, 55, 118, 55,
];

/** Which digit each outline is, so the palette rather than this file names the colours. */
const DIGITS: readonly {
  readonly of: keyof typeof DIGIT_TINTS;
  readonly outline: readonly number[];
}[] = [
  { of: 'thumb', outline: THUMB },
  { of: 'index', outline: INDEX },
  { of: 'middle', outline: MIDDLE },
  { of: 'ring', outline: RING },
  { of: 'little', outline: LITTLE },
];

const DIGIT_TINTS = {
  thumb: (colors: GuitarColors) => colors.thumb,
  index: (colors: GuitarColors) => colors.index,
  middle: (colors: GuitarColors) => colors.middle,
  ring: (colors: GuitarColors) => colors.ring,
  little: (colors: GuitarColors) => colors.little,
} as const;

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
 * a hand. The whole silhouette goes down first in the palm's colour
 * and the five digits are laid over it, which is why a seam is
 * impossible: under every digit is the hand itself.
 */
export function handShapes(options: HandOptions): readonly StageShape[] {
  const colors = resolveColors(options.colors);
  const { width, height } = options;
  if (!(width > 0) || !(height > 0)) return [];

  const scale = Math.min(width / ART.width, height / ART.height);
  const offsetX = (width - ART.width * scale) / 2;
  const offsetY = (height - ART.height * scale) / 2;
  const piece = (outline: readonly number[], fill: string, extra: Partial<StageShape> = {}) => {
    const at = (index: number): number =>
      index % 2 === 0
        ? offsetX + (outline[index] as number) * scale
        : offsetY + (outline[index] as number) * scale;
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    let d = '';
    for (let index = 0; index < outline.length; index += 2) {
      const x = at(index);
      const y = at(index + 1);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      d += `${index === 0 ? 'M' : 'L'}${round(x)},${round(y)}`;
    }
    return {
      kind: 'path' as const,
      d: `${d}Z`,
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
      fill,
      ...extra,
    };
  };

  // The hand first, then its digits over it, in the order a hand has
  // them.
  return [
    piece(
      SILHOUETTE,
      options.handColor ?? '#F2E7DF',
      options.outline === undefined
        ? {}
        : { stroke: options.outline, strokeWidth: Math.max(1, width * 0.01) },
    ),
    ...DIGITS.map((digit) => piece(digit.outline, DIGIT_TINTS[digit.of](colors))),
  ];
}

/** Three decimals is a thousandth of a pixel, and keeps the path short. */
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function renderHand(options: HandOptions): string {
  const gradients = new GradientBank();
  const body = handShapes(options)
    .map((shape) =>
      tag('path', {
        d: shape.d ?? '',
        fill: gradients.paint(shape.fill),
        ...(shape.stroke === undefined ? {} : { stroke: shape.stroke }),
        ...(shape.strokeWidth === undefined ? {} : { 'stroke-width': shape.strokeWidth }),
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
    gradients.finish(body),
  );
}
