/**
 * draw.ts — the artwork, where the placement put it.
 *
 * This file used to ASSEMBLE a hand: an outline walked up one side of
 * every finger and down the other, with a separate thumb overlaid and
 * creases drawn in afterwards. It drew a hand the way someone who has
 * never drawn a hand would. It is gone.
 *
 * What is left is the part a program is actually good at: taking an
 * artist's outline and moving it. Every curve of `HAND_OUTLINE` goes
 * through one affine transform — the placement's position, turn, spread
 * and mirror — and comes out as path data. A cubic stays a cubic under
 * an affine, control points and all, so this is exact: the shape drawn
 * is the shape in the file, never an approximation of it.
 */

import { HAND_OUTLINE } from './artwork.js';
import { transformPoint, type HandPlacement } from './place.js';

/** Trims a coordinate to two decimals of a white key — finer than any pixel, and far shorter in the markup. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * The hand outline as SVG path data, placed.
 *
 * One string, which is what both renderers want: an SVG `<path d>` and
 * a canvas `new Path2D(d)` parse it identically, so the preview and the
 * exported video are the same drawing.
 */
export function handPath(placement: HandPlacement): string {
  const parts: string[] = [];
  for (const command of HAND_OUTLINE) {
    if (command[0] === 'M') {
      const p = transformPoint(placement, command[1], command[2]);
      parts.push(`M ${round(p.x)} ${round(p.y)}`);
    } else if (command[0] === 'C') {
      const c1 = transformPoint(placement, command[1], command[2]);
      const c2 = transformPoint(placement, command[3], command[4]);
      const to = transformPoint(placement, command[5], command[6]);
      parts.push(
        `C ${round(c1.x)} ${round(c1.y)} ${round(c2.x)} ${round(c2.y)} ${round(to.x)} ${round(to.y)}`,
      );
    } else {
      parts.push('Z');
    }
  }
  // The artwork's own outline is open -- Illustrator left the last
  // curve to meet the first point -- so it is closed here rather than
  // relying on the fill rule to do it, which a stroke would not.
  parts.push('Z');
  return parts.join(' ');
}
