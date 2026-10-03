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
  const mark = logoBox(canvas).height;
  // Measured from what the header actually holds, not as a fraction of
  // the frame. The header carries the title and the subtitle and the
  // mark, and nothing else -- the tempo readout left it for its own
  // columns (see `tempoStats`), which is why there is no `stat` term
  // here any more.
  const headerHeight =
    canvas.isPortrait || canvas.isSquare
      ? Math.max(size.title + size.subtitle * 1.6, mark + pad * 0.35)
      : Math.max(size.title + size.subtitle * 1.5, mark);
  const header: Rect = {
    x: pad,
    y: pad,
    width: canvas.width - pad * 2,
    height: headerHeight,
  };
  // What the readout keeps for itself, and the design must not draw
  // into: a column down each side in landscape, a row straight under
  // the title in the two narrow shapes. Reserved from the CANVAS
  // alone, with no reference to the frame's own numbers, because every
  // design asks for its stage before anything knows what the tempo is
  // -- the readout's type is sized to fit this room rather than the
  // other way round.
  //
  // Under the title, and not along the bottom, because that is where
  // the owner drew it: on a phone the eye goes top-down, and a tempo
  // parked at the foot of a 9x16 frame is the last thing read rather
  // than the second.
  const sideways = statRow(canvas) ? 0 : statColumnWidth(canvas) + pad * 0.5;
  const stageTop = header.y + header.height + (statRow(canvas) ? statRowHeight(canvas) : 0);
  return {
    header,
    stage: {
      x: pad + sideways,
      y: stageTop,
      width: canvas.width - (pad + sideways) * 2,
      height: canvas.height - stageTop - pad,
    },
  };
}

/**
 * True when the readout lies in a ROW along the bottom rather than in
 * a column down each side.
 *
 * A 9x16 or 1x1 frame has no width to give away: two columns of type
 * that size would leave the design a slot down the middle. Landscape
 * has width to spare and no height to spare, so there it is the other
 * way about.
 */
export function statRow(canvas: Canvas): boolean {
  return canvas.isPortrait || canvas.isSquare;
}

/** How wide one landscape stat column is -- the room its type is fitted into. */
export function statColumnWidth(canvas: Canvas): number {
  return canvas.width * 0.225 - gutter(canvas);
}

/** How tall the stat row under the title is, in the two narrow shapes. */
export function statRowHeight(canvas: Canvas): number {
  return canvas.short * 0.25;
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

/**
 * How much of the short side the mark takes up.
 *
 * One number, read by both `logoBox` and `bands` -- the band at the top
 * reserves room for the mark, so a size the two disagreed about would
 * put a design's drawing under the logo.
 */
export const LOGO_FRACTION = 0.16;

/** Where the mark goes. Top-left, always -- see `logo`. */
export function logoBox(canvas: Canvas): Rect {
  const size = canvas.short * LOGO_FRACTION;
  const pad = gutter(canvas);
  return { x: pad, y: pad, width: size, height: size };
}

export const FONT_DISPLAY = "'Sora', 'Trebuchet MS', sans-serif";
export const FONT_TEXT = "'Manrope', 'Segoe UI', sans-serif";

/**
 * The tempo and the metre, drawn big, in every design.
 *
 * Two blocks and nothing between them: the tempo figure with the word
 * BPM under it, and the metre on its own. On a lesson video these are
 * the two things a viewer looks for after the count, and they have to
 * survive being watched on a phone -- which is why they are a sixth of
 * the frame rather than a line of small type in a corner, and why they
 * are the SAME yellow and red in all eleven designs instead of taking
 * each design's own accent. A viewer who has watched one of these
 * videos knows where to look in the next.
 *
 * The metre's slash is drawn in the label's red while its figures stay
 * yellow, so "4/4" reads as two numbers rather than as one word.
 *
 * Both blocks hang off ONE size, fitted to the room `bands` reserved
 * for them, so a three-figure tempo and a 12/8 bar cannot push either
 * of them into the design.
 */
export function tempoStats(context: DesignContext): string {
  const { canvas, palette, frame } = context;
  const pad = gutter(canvas);
  const { stage } = bands(canvas);
  const bpm = String(frame.bpm);
  const numerator = String(frame.timeSignature.numerator);
  const denominator = String(frame.timeSignature.denominator);
  const metre = `${numerator}/${denominator}`;
  const row = statRow(canvas);

  // One size for everything here, taken from whichever of the three
  // strings is widest -- a readout whose BPM and metre were at
  // different sizes because one happened to have an extra digit would
  // look like a mistake.
  const widest = Math.max(advanceWidth(bpm, 1), advanceWidth('BPM', 1), advanceWidth(metre, 1));
  const room = row ? (canvas.width - pad * 2) / 2 - pad : statColumnWidth(canvas);
  const size = Math.min(canvas.short * (row ? 0.1 : 0.17), room / widest);

  // Where the two blocks sit. In landscape they flank the stage, level
  // with its middle; in the narrow shapes they share the row between
  // the title and the stage, one to each quarter of the width.
  const leftCx = row ? canvas.width * 0.25 : pad + statColumnWidth(canvas) / 2;
  const rightCx = canvas.width - leftCx;
  const middle = row ? stage.y - statRowHeight(canvas) / 2 : stage.y + stage.height / 2;

  // The tempo is two lines and the metre is one, so they cannot share a
  // baseline: the pair is centred on `middle` as a block, and the metre
  // is centred on it as a single line.
  const valueBaseline = middle - size * 0.19;
  const labelBaseline = middle + size * 0.88;
  const metreBaseline = middle + size * 0.36;

  const figure = {
    'font-family': FONT_DISPLAY,
    'font-size': size,
    'font-weight': 800,
    'text-anchor': 'middle',
  } as const;

  const tempo =
    text(bpm, leftCx, valueBaseline, { fill: palette.statValue, ...figure }) +
    text('BPM', leftCx, labelBaseline, {
      fill: palette.statLabel,
      ...figure,
      'letter-spacing': n(size * 0.02),
    });

  // The metre is three pieces rather than one string, because its
  // middle piece is a different colour. They are hung off the SLASH --
  // centred on `rightCx`, with the two figures anchored against its
  // sides -- rather than laid out left to right from an estimated
  // total width. `advanceWidth` is a per-character estimate, and
  // spending it on all three pieces put a visible hole between the
  // slash and the denominator; this way the estimate is only ever used
  // for the gap either side of one character, and a 12/8 bar stays as
  // centred as a 4/4 one however many digits it has.
  const halfStep = advanceWidth('/', size) * 0.5;
  const piece = { 'font-family': FONT_DISPLAY, 'font-size': size, 'font-weight': 800 } as const;
  const time =
    text(numerator, rightCx - halfStep, metreBaseline, {
      fill: palette.statValue,
      ...piece,
      'text-anchor': 'end',
    }) +
    text('/', rightCx, metreBaseline, {
      fill: palette.statLabel,
      ...piece,
      'text-anchor': 'middle',
    }) +
    text(denominator, rightCx + halfStep, metreBaseline, {
      fill: palette.statValue,
      ...piece,
      'text-anchor': 'start',
    });

  return group({}, tempo + time);
}

/**
 * Title and subtitle.
 *
 * Landscape runs them along the top beside the mark; portrait and
 * square centre them, because a narrow frame has no room beside the
 * words and a centred stack is what a phone video wants anyway.
 *
 * The tempo readout is NOT here: it is `tempoStats`, drawn for every
 * design by the renderer, so a design that owns its own header still
 * carries the same readout as the other ten.
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
