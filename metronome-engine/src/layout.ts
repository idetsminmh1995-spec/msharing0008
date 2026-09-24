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
  const headerHeight = canvas.isPortrait
    ? canvas.height * 0.11
    : canvas.isSquare
      ? canvas.height * 0.15
      : canvas.height * 0.18;
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
  };
}

export const FONT_DISPLAY = "'Sora', 'Trebuchet MS', sans-serif";
export const FONT_TEXT = "'Manrope', 'Segoe UI', sans-serif";

/**
 * Title, subtitle and the BPM / time-signature readout.
 *
 * Landscape puts the readout on the right of the title; portrait and
 * square stack it under, because a narrow frame has no room beside the
 * words and a centred stack is what a phone video wants anyway.
 */
export function header(context: DesignContext): string {
  const { canvas, palette, frame, title, subtitle } = context;
  const { header: box } = bands(canvas);
  const size = typeScale(canvas);
  const readout = `${frame.bpm} BPM  ·  ${frame.timeSignature.numerator}/${frame.timeSignature.denominator}`;

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
    body += text(readout, cx, box.y + box.height, {
      fill: palette.accent,
      'font-family': FONT_TEXT,
      'font-size': size.label,
      'font-weight': 700,
      'letter-spacing': n(size.label * 0.08),
      'text-anchor': 'middle',
    });
    return group({}, body);
  }

  let body = text(title, box.x, box.y + size.title, {
    fill: palette.ink,
    'font-family': FONT_DISPLAY,
    'font-size': size.title,
    'font-weight': 800,
  });
  if (subtitle !== '') {
    body += text(subtitle, box.x, box.y + size.title + size.subtitle * 1.4, {
      fill: palette.inkSoft,
      'font-family': FONT_TEXT,
      'font-size': size.subtitle,
      'font-weight': 600,
    });
  }
  body += text(readout, box.x + box.width, box.y + size.title, {
    fill: palette.accent,
    'font-family': FONT_TEXT,
    'font-size': size.label * 1.15,
    'font-weight': 700,
    'letter-spacing': n(size.label * 0.08),
    'text-anchor': 'end',
  });
  return group({}, body);
}

/**
 * The logo, placed in a corner of the stage rather than over it.
 *
 * Nothing is drawn when there is no logo: a placeholder box in an
 * exported video is worse than empty space.
 */
export function logo(
  context: DesignContext,
  where: 'top-left' | 'bottom-right' = 'bottom-right',
): string {
  const { canvas, logoUrl } = context;
  if (logoUrl === undefined || logoUrl === '') return '';
  const size = canvas.short * 0.11;
  const pad = gutter(canvas);
  const x = where === 'top-left' ? pad : canvas.width - pad - size;
  const y = where === 'top-left' ? pad : canvas.height - pad - size;
  return `<image href="${logoUrl.replace(/"/g, '&quot;')}" x="${n(x)}" y="${n(y)}" width="${n(size)}" height="${n(size)}" preserveAspectRatio="xMidYMid meet"/>`;
}
