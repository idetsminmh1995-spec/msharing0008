/**
 * layout.ts — the three canvases, and the shared frame furniture.
 *
 * Every design gets the same canvas for a given ratio, so 9x16 is a
 * genuinely different arrangement rather than a 16x9 squeezed
 * sideways. The helpers here are the parts every design places the
 * same way -- the title, the tempo readout -- so eleven designs differ
 * in their IDEA rather than in where they put the BPM.
 */

import { group, n, text } from './svg.js';
import type { AspectRatio, Canvas, DesignContext } from './types.js';

/**
 * 1920 on the long side for landscape and portrait, 1080 square. Real
 * delivery sizes, so a design's stroke widths and type sizes mean the
 * same thing here as in an export.
 */
const CANVAS_SIZES: Record<AspectRatio, { width: number; height: number }> = {
  '16x9': { width: 1920, height: 1080 },
  '9x16': { width: 1080, height: 1920 },
  '1x1': { width: 1080, height: 1080 },
};

export function canvasFor(aspect: AspectRatio): Canvas {
  const { width, height } = CANVAS_SIZES[aspect];
  return {
    width,
    height,
    aspect,
    short: Math.min(width, height),
    long: Math.max(width, height),
    isPortrait: height > width,
    isSquare: width === height,
  };
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function centreOf(box: Rect): [number, number] {
  return [box.x + box.width / 2, box.y + box.height / 2];
}

/** The margin nothing important crosses, as a fraction of the short side. */
export function gutter(canvas: Canvas): number {
  return canvas.short * 0.075;
}

/**
 * The band at the top for a title and the tempo readout, and the
 * "stage" below it that a design actually draws in.
 *
 * Portrait gives the header proportionally less of the frame and the
 * stage a lot more, because a 9x16 video is watched on a phone where
 * the middle is what the eye is on.
 */
export function bands(canvas: Canvas): { header: Rect; stage: Rect } {
  const pad = gutter(canvas);
  const size = typeScale(canvas);
  const mark = canvas.short * 0.11;
  // Measured from what the header actually holds, not as a fraction of
  // the frame. It used to be a fraction, and when the tempo readout grew
  // the band did not -- so it landed on top of the subtitle in the two
  // narrow ratios. Room is now reserved for the type that is really
  // there, plus the mark, whatever the frame's shape.
  const headerHeight =
    canvas.isPortrait || canvas.isSquare
      ? Math.max(size.title + size.subtitle * 1.45 + size.stat * 1.35, mark + pad)
      : Math.max(size.title + size.subtitle * 1.5, size.stat * 1.6, mark);
  const header: Rect = {
    x: pad,
    y: pad,
    width: canvas.width - pad * 2,
    height: headerHeight,
  };
  const stageTop = header.y + header.height;
  return {
    header,
    stage: {
      x: pad,
      y: stageTop,
      width: canvas.width - pad * 2,
      height: canvas.height - stageTop - pad,
    },
  };
}

/** The type stack, scaled off the short side so it reads the same in all three shapes. */
export function typeScale(canvas: Canvas) {
  const unit = canvas.short / 1080;
  return {
    title: 62 * unit,
    subtitle: 34 * unit,
    label: 26 * unit,
    readout: 88 * unit,
    huge: 420 * unit,
    /** The tempo and the time signature. Big enough to read across a room. */
    stat: 72 * unit,
    /** The word "BPM" beside its number -- a unit, not a headline. */
    statUnit: 28 * unit,
  };
}

/**
 * Roughly how wide a string will be.
 *
 * SVG has no measurement without a DOM, and the readout has to be
 * right-aligned out of pieces at two different sizes. Per-character
 * estimates are a few percent out on a proportional face, which on a
 * tempo readout is invisible -- and the alternative is either one
 * uniform size or a DOM dependency this engine does not want.
 */
export function advanceWidth(value: string, fontSize: number): number {
  let units = 0;
  for (const ch of value) {
    if (ch === ' ') units += 0.3;
    else if ('.,:\u00b7'.includes(ch)) units += 0.32;
    else if (ch === '/') units += 0.44;
    else if (ch >= '0' && ch <= '9') units += 0.62;
    else if (ch === ch.toUpperCase() && ch !== ch.toLowerCase()) units += 0.7;
    else units += 0.56;
  }
  return units * fontSize;
}

/** Where the mark goes. Top-left, always -- see `logo`. */
export function logoBox(canvas: Canvas): Rect {
  const size = canvas.short * 0.11;
  const pad = gutter(canvas);
  return { x: pad, y: pad, width: size, height: size };
}

export const FONT_DISPLAY = "'Sora', 'Trebuchet MS', sans-serif";
export const FONT_TEXT = "'Manrope', 'Segoe UI', sans-serif";

/**
 * The tempo and the time signature, drawn big.
 *
 * Two large figures with a small unit label between them, rather than
 * one line of small type: on a lesson video the BPM is the second thing
 * a viewer looks for after the count, and it has to survive being
 * watched on a phone.
 *
 * Laid out right-to-left from `rightEdge` when `align` is 'end', which
 * is why it needs `advanceWidth` -- the pieces are at two different
 * sizes, so a single `text-anchor="end"` cannot place them.
 */
function tempoReadout(
  context: DesignContext,
  x: number,
  baseline: number,
  align: 'middle' | 'end',
): string {
  const { canvas, palette, frame } = context;
  const size = typeScale(canvas);
  const bpm = String(frame.bpm);
  const signature = `${frame.timeSignature.numerator}/${frame.timeSignature.denominator}`;
  const unit = 'BPM';
  const gap = size.statUnit * 0.5;

  const wBpm = advanceWidth(bpm, size.stat);
  const wUnit = advanceWidth(unit, size.statUnit);
  const wSig = advanceWidth(signature, size.stat);
  const total = wBpm + gap + wUnit + gap * 2.2 + wSig;

  const left = align === 'end' ? x - total : x - total / 2;
  const big = {
    'font-family': FONT_DISPLAY,
    'font-size': size.stat,
    'font-weight': 800,
  };

  let cursor = left;
  let body = text(bpm, cursor, baseline, { fill: palette.accent, ...big });
  cursor += wBpm + gap;
  body += text(unit, cursor, baseline, {
    fill: palette.inkSoft,
    'font-family': FONT_TEXT,
    'font-size': size.statUnit,
    'font-weight': 700,
    'letter-spacing': n(size.statUnit * 0.1),
  });
  cursor += wUnit + gap * 2.2;
  body += text(signature, cursor, baseline, { fill: palette.ink, ...big });
  return body;
}

/**
 * Title, subtitle and the tempo readout.
 *
 * Landscape runs the title along the top with the readout right-
 * aligned against it; portrait and square stack the two centred,
 * because a narrow frame has no room beside the words and a centred
 * stack is what a phone video wants anyway.
 *
 * The title starts clear of the logo, which always sits in the
 * top-left corner -- see `logo`.
 */
export function header(context: DesignContext): string {
  const { canvas, palette, title, subtitle, logoUrl } = context;
  const { header: box } = bands(canvas);
  const size = typeScale(canvas);
  const mark = logoBox(canvas);
  const hasLogo = logoUrl !== undefined && logoUrl !== '';

  if (canvas.isPortrait || canvas.isSquare) {
    const [cx] = centreOf(box);
    let y = box.y + size.title;
    let body = text(title, cx, y, {
      fill: palette.ink,
      'font-family': FONT_DISPLAY,
      'font-size': size.title,
      'font-weight': 800,
      'text-anchor': 'middle',
    });
    if (subtitle !== '') {
      y += size.subtitle * 1.45;
      body += text(subtitle, cx, y, {
        fill: palette.inkSoft,
        'font-family': FONT_TEXT,
        'font-size': size.subtitle,
        'font-weight': 600,
        'text-anchor': 'middle',
      });
    }
    body += tempoReadout(context, cx, box.y + box.height, 'middle');
    return group({}, body);
  }

  // Landscape: the title clears the mark, the readout hugs the right.
  const textLeft = hasLogo ? mark.x + mark.width + gutter(canvas) * 0.6 : box.x;
  let body = text(title, textLeft, box.y + size.title, {
    fill: palette.ink,
    'font-family': FONT_DISPLAY,
    'font-size': size.title,
    'font-weight': 800,
  });
  if (subtitle !== '') {
    body += text(subtitle, textLeft, box.y + size.title + size.subtitle * 1.4, {
      fill: palette.inkSoft,
      'font-family': FONT_TEXT,
      'font-size': size.subtitle,
      'font-weight': 600,
    });
  }
  body += tempoReadout(context, box.x + box.width, box.y + size.stat * 0.85, 'end');
  return group({}, body);
}

/**
 * The mark, always in the TOP-LEFT corner.
 *
 * Always, and not per design: a logo that moves between designs is a
 * logo the eye has to hunt for, and on a channel's worth of videos the
 * corner it sits in IS the branding. `header` reserves room for it, so
 * nothing is drawn over it.
 *
 * Nothing is drawn when there is no logo: a placeholder box in an
 * exported video is worse than empty space.
 */
export function logo(context: DesignContext): string {
  const { canvas, logoUrl } = context;
  if (logoUrl === undefined || logoUrl === '') return '';
  const box = logoBox(canvas);
  return `<image href="${logoUrl.replace(/"/g, '&quot;')}" x="${n(box.x)}" y="${n(box.y)}" width="${n(box.width)}" height="${n(box.height)}" preserveAspectRatio="xMidYMid meet"/>`;
}
