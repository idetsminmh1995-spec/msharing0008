/**
 * Design 2 — Beat Dots.
 *
 * A machined medallion with the count standing in its middle, and one
 * dot per beat of the bar in a row underneath. The owner drew it; these
 * are the proportions measured off that drawing, in staff-space-free
 * fractions of the medallion's own radius so the whole thing scales as
 * one object into any of the three frames.
 *
 * The rings are built from two tick bands rather than from a gradient
 * or a pattern fill. A gradient needs an id, an id is document-wide,
 * and these frames render both inline in a page and inside an <img> for
 * capture -- two frames in one document would fight over the name. Each
 * band is ONE path of many subpaths rather than many <line> elements,
 * because a video paints this thirty times a second and the difference
 * is a hundred and fifty elements a frame.
 *
 * What moves: the number, the dot under it, and a ring that pings
 * outward from the medallion's edge and is gone by the next beat. The
 * drawing it came from is a still, so between beats this looks exactly
 * like that still -- which is the point.
 */

import { bands, FONT_DISPLAY, logo } from '../layout.js';
import { circle, easeOut, group, lerp, n, path, polar, text } from '../svg.js';
import type { Canvas, Design, DesignContext, Palette } from '../types.js';

/**
 * Every radius in the medallion, as a fraction of its own outer radius.
 *
 * Measured off the owner's drawing: the rings there fall at 1.00, 0.73,
 * 0.57 and 0.51 of the outer edge, with the fine hatching filling the
 * two bands between them.
 */
const RING = {
  outer: 1.0,
  coarseTicksOuter: 0.96,
  coarseTicksInner: 0.8,
  middle: 0.73,
  fineTicksOuter: 0.69,
  fineTicksInner: 0.6,
  innerOuter: 0.57,
  inner: 0.51,
  /** The count's type size. */
  numeral: 0.65,
} as const;

/** The dots, also as fractions of the medallion's radius. */
const DOTS = {
  radius: 0.176,
  spacing: 0.578,
  /** How far below the medallion's centre the row sits. */
  drop: 1.67,
} as const;

/** One ring of radial ticks, as a single path. */
function tickRing(
  cx: number,
  cy: number,
  radius: number,
  count: number,
  from: number,
  to: number,
): string {
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const turns = i / count;
    const [x1, y1] = polar(cx, cy, radius * from, turns);
    const [x2, y2] = polar(cx, cy, radius * to, turns);
    parts.push(`M ${n(x1)} ${n(y1)} L ${n(x2)} ${n(y2)}`);
  }
  return parts.join(' ');
}

function medallion(
  cx: number,
  cy: number,
  radius: number,
  canvas: Canvas,
  palette: Palette,
): string {
  // Thick enough to read at video size. The drawing's own rings are
  // about a fiftieth of its radius across, which on a 1080-tall frame
  // is four or five real pixels -- a true hairline would vanish into
  // the encoder.
  const hairline = Math.max(canvas.short * 0.0022, radius * 0.018);
  const ring = (r: number, width: number, opacity: number): string =>
    circle(cx, cy, radius * r, {
      fill: 'none',
      stroke: palette.inkSoft,
      'stroke-width': width,
      opacity,
    });

  return group(
    {},
    ring(RING.outer, hairline, 0.9) +
      path(tickRing(cx, cy, radius, 84, RING.coarseTicksInner, RING.coarseTicksOuter), {
        stroke: palette.inkSoft,
        'stroke-width': hairline * 0.7,
        opacity: 0.75,
        fill: 'none',
      }) +
      ring(RING.middle, hairline * 0.8, 0.8) +
      path(tickRing(cx, cy, radius, 120, RING.fineTicksInner, RING.fineTicksOuter), {
        stroke: palette.inkSoft,
        'stroke-width': hairline * 0.55,
        opacity: 0.55,
        fill: 'none',
      }) +
      ring(RING.innerOuter, hairline * 0.9, 0.85) +
      ring(RING.inner, hairline * 0.7, 0.65),
  );
}

export const beatDots: Design = {
  id: 'beat-dots',
  name: 'Beat Dots',
  description: 'A machined medallion with the count inside it, and one dot per beat below.',
  look: 'Black & red',
  draw(context: DesignContext): string {
    const { canvas, palette, frame } = context;
    const { stage } = bands(canvas);
    const count = Math.max(1, frame.beatsPerBar);

    // The medallion and its row of dots are one object, sized to
    // whichever of the stage's two dimensions runs out first and then
    // centred in it as a whole -- so the row never falls off the
    // bottom of a short frame, and the medallion never swells to fill
    // a tall one on its own.
    const groupHeight = 1 + DOTS.drop + DOTS.radius; // in radii, from the medallion's top
    const radius = Math.min(canvas.short * 0.27, stage.width * 0.42, stage.height / groupHeight);
    const cx = stage.x + stage.width / 2;
    const cy = stage.y + (stage.height - radius * groupHeight) / 2 + radius;

    // A ring that pings outward from the edge on the beat and is gone
    // before the next one.
    const ping = 1 - easeOut(Math.min(1, frame.phase * 1.6));
    const pulse =
      ping <= 0.02
        ? ''
        : circle(cx, cy, radius * lerp(1.0, 1.14, 1 - ping), {
            fill: 'none',
            stroke: palette.accent,
            'stroke-width': Math.max(canvas.short * 0.002, radius * 0.016),
            opacity: ping * 0.55,
          });

    const numeral = text(String(frame.beat), cx, cy + radius * RING.numeral * 0.35, {
      fill: palette.accent,
      'font-family': FONT_DISPLAY,
      'font-size': radius * RING.numeral,
      'font-weight': 800,
      'text-anchor': 'middle',
    });

    // The row keeps to the stage even when the bar is long: the spacing
    // closes up before the dots themselves do, because dots that have
    // shrunk to specks stop reading as beats at all.
    const dotRadius = radius * DOTS.radius;
    const spacing = Math.min(
      radius * DOTS.spacing,
      count > 1 ? (stage.width * 0.92 - dotRadius * 2) / (count - 1) : radius * DOTS.spacing,
    );
    const dotY = cy + radius * DOTS.drop;
    // The beat's own dot swells on the attack and settles back to the
    // size of the others, so a still frame between beats is the row of
    // equal dots the design was drawn as.
    const swell = lerp(1.45, 1, easeOut(Math.min(1, frame.phase * 2.6)));

    const dots: string[] = [];
    for (let i = 0; i < count; i++) {
      const isCurrent = i === frame.beat - 1;
      dots.push(
        circle(cx + (i - (count - 1) / 2) * spacing, dotY, dotRadius * (isCurrent ? swell : 1), {
          fill: palette.ink,
        }),
      );
    }

    return (
      medallion(cx, cy, radius, canvas, palette) +
      pulse +
      numeral +
      group({}, dots.join('')) +
      logo(context)
    );
  },
};
