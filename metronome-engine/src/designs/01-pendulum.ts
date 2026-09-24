/**
 * Design 1 — Pendulum.
 *
 * The instrument itself, lit on a dark stage: a neon-red case with a
 * white arm hanging from its top, swinging over a fan of tick marks,
 * with the beat number standing in the case's own window.
 *
 * This is the one design that owns its whole frame. The shared header
 * would put the title top-left and the readout top-right, and the
 * arrangement here is the point -- the readout flanks the instrument
 * in landscape and gathers into a bar along the bottom in the two
 * narrow shapes, where there is no room beside it.
 *
 * Nothing is drawn with a gradient. A gradient needs an id, an id is
 * document-wide, and these frames are rendered both inline in a page
 * and inside an <img> for capture; two frames in one document would
 * fight over the name. Stacked translucent shapes cost a few more
 * bytes and cannot collide.
 */

import {
  advanceWidth,
  FONT_DISPLAY,
  FONT_TEXT,
  gutter,
  logo,
  logoBox,
  typeScale,
} from '../layout.js';
import { circle, easeInOut, group, lerp, line, path, polar, rect, tag, text } from '../svg.js';
import type { Canvas, Design, DesignContext, Palette } from '../types.js';

/**
 * Turns either side of vertical.
 *
 * Small on purpose: the arm hangs INSIDE the case here, and at much
 * more than this the weight at its end swings through the case wall.
 */
const MAX_SWING = 0.045;

/** How many marks in the fan the arm swings over. */
const TICKS = 31;

/** The fan's half-span, in turns either side of vertical. */
const FAN_SPAN = 0.3;

/** How much of the fan, either side of straight up, the cap gets to itself. */
const CAP_GAP = 0.045;

/** The case, in the proportions of a real metronome: steep and narrow-topped. */
interface Case {
  readonly cx: number;
  /** The top edge of the case body, under the cap. */
  readonly top: number;
  readonly height: number;
  readonly halfTop: number;
  readonly halfBottom: number;
}

/** Half the case's width at `t` of the way down it. */
function halfWidthAt(box: Case, t: number): number {
  return lerp(box.halfTop, box.halfBottom, t);
}

/** A point in the case: `t` down from the top, `x` offset from the centre line. */
function pointAt(box: Case, t: number, x = 0): [number, number] {
  return [box.cx + x, box.top + box.height * t];
}

/** The soft red bloom the instrument sits in. */
function bloom(cx: number, cy: number, radius: number, palette: Palette): string {
  let out = '';
  for (let i = 5; i >= 1; i--) {
    const scale = i / 5;
    out += tag('ellipse', {
      cx,
      cy,
      rx: radius * scale,
      ry: radius * scale * 0.78,
      fill: palette.accentSoft,
      opacity: 0.055 + (1 - scale) * 0.05,
    });
  }
  return out;
}

/**
 * The halo of marks around the case.
 *
 * It is not decoration: the bright mark travels left to right across
 * the fan over one BAR, and the marks behind it stay warm, so the halo
 * says how far through the bar the music is while the arm says where
 * the beat is. The few marks nearest straight up are left out, so the
 * cap has clean air above it instead of ticks growing out of it.
 */
function fan(box: Case, progress: number, canvas: Canvas, palette: Palette): string {
  const [fx, fy] = pointAt(box, 0.5);
  const inner = box.height * 0.5;
  const outer = box.height * 0.565;
  const step = (FAN_SPAN * 2) / (TICKS - 1);
  const head = lerp(-FAN_SPAN, FAN_SPAN, progress);
  const marks: string[] = [];
  for (let i = 0; i < TICKS; i++) {
    const turns = -FAN_SPAN + i * step;
    if (Math.abs(turns) < CAP_GAP) continue;
    const isHead = Math.abs(turns - head) < step * 1.1;
    const passed = turns < head;
    const atLimit = i < 2 || i >= TICKS - 2;
    const reach = isHead ? outer * 1.08 : outer;
    const [x1, y1] = polar(fx, fy, inner, turns);
    const [x2, y2] = polar(fx, fy, reach, turns);
    marks.push(
      line(x1, y1, x2, y2, {
        stroke: isHead || passed || atLimit ? palette.accent : palette.ink,
        'stroke-width': canvas.short * (isHead ? 0.008 : 0.0045),
        opacity: isHead ? 1 : atLimit ? 0.7 : passed ? 0.45 : 0.26,
      }),
    );
  }
  return group({ 'stroke-linecap': 'round' }, marks.join(''));
}

/** The case: a red frame round a near-black window, capped and based. */
function instrument(box: Case, canvas: Canvas, palette: Palette): string {
  const bottom = box.top + box.height;
  const shape =
    `M ${box.cx - box.halfBottom} ${bottom} L ${box.cx - box.halfTop} ${box.top} ` +
    `L ${box.cx + box.halfTop} ${box.top} L ${box.cx + box.halfBottom} ${bottom} Z`;
  const frameWidth = canvas.short * 0.016;
  const capWidth = box.halfTop * 2.3;
  const capHeight = box.height * 0.042;
  const baseWidth = box.halfBottom * 2.35;
  const baseHeight = box.height * 0.055;

  return (
    // The window, then the frame over its edge, then a wider dim stroke
    // outside it for the bloom the neon throws onto the dark.
    path(shape, { fill: '#0C0A0B' }) +
    path(shape, {
      fill: 'none',
      stroke: palette.accent,
      'stroke-width': frameWidth * 2.6,
      'stroke-linejoin': 'round',
      opacity: 0.16,
    }) +
    path(shape, {
      fill: 'none',
      stroke: palette.accent,
      'stroke-width': frameWidth,
      'stroke-linejoin': 'round',
    }) +
    // The cap, and the little tab on top of it.
    rect(box.cx - capWidth / 2, box.top - capHeight, capWidth, capHeight, {
      fill: palette.accent,
      rx: capHeight * 0.35,
    }) +
    rect(box.cx - capWidth * 0.22, box.top - capHeight * 1.7, capWidth * 0.44, capHeight * 0.8, {
      fill: palette.accent,
      rx: capHeight * 0.25,
    }) +
    // The floor the base glows onto, then the base itself.
    tag('ellipse', {
      cx: box.cx,
      cy: bottom + baseHeight * 1.1,
      rx: baseWidth * 0.75,
      ry: baseHeight * 0.9,
      fill: palette.accent,
      opacity: 0.22,
    }) +
    rect(box.cx - baseWidth / 2, bottom - baseHeight * 0.15, baseWidth, baseHeight, {
      fill: palette.accent,
      rx: baseHeight * 0.35,
    }) +
    rect(
      box.cx - baseWidth * 0.42,
      bottom + baseHeight * 0.8,
      baseWidth * 0.84,
      baseHeight * 0.45,
      { fill: palette.accent, rx: baseHeight * 0.22, opacity: 0.85 },
    )
  );
}

/** The arm: white rod, red slider, white weight, hung from the case's top. */
function arm(box: Case, turns: number, canvas: Canvas, palette: Palette): string {
  const [px, py] = pointAt(box, 0.045);
  const length = box.height * 0.835;
  // Hung, not stood up: zero turns is twelve o'clock, so straight down
  // is half a turn and the swing is either side of THAT.
  const hang = 0.5 + turns;
  const [tipX, tipY] = polar(px, py, length, hang);
  const [sliderX, sliderY] = polar(px, py, length * 0.42, hang);
  return (
    line(px, py, tipX, tipY, {
      stroke: palette.ink,
      'stroke-width': canvas.short * 0.009,
      'stroke-linecap': 'round',
    }) +
    circle(sliderX, sliderY, box.height * 0.055, { fill: palette.accent }) +
    circle(sliderX, sliderY, box.height * 0.016, { fill: '#7A0A11' }) +
    circle(tipX, tipY, box.height * 0.045, { fill: palette.ink })
  );
}

/** One figure with its label under it, centred -- the landscape readout. */
function stack(
  value: string,
  label: string,
  cx: number,
  cy: number,
  canvas: Canvas,
  palette: Palette,
): string {
  const big = canvas.short * 0.185;
  const small = canvas.short * 0.055;
  return (
    text(value, cx, cy, {
      fill: palette.ink,
      'font-family': FONT_DISPLAY,
      'font-size': big,
      'font-weight': 800,
      'text-anchor': 'middle',
    }) +
    text(label, cx, cy + small * 1.65, {
      fill: palette.accent,
      'font-family': FONT_DISPLAY,
      'font-size': small,
      'font-weight': 700,
      'text-anchor': 'middle',
      'letter-spacing': small * 0.06,
    })
  );
}

/** One figure with its label beside it -- the bar along the bottom. */
function inline(
  value: string,
  label: string,
  cx: number,
  baseline: number,
  valueFill: string,
  canvas: Canvas,
  palette: Palette,
): string {
  const big = canvas.short * 0.085;
  const small = canvas.short * 0.032;
  const gap = small * 0.5;
  const valueWidth = advanceWidth(value, big);
  const labelWidth = advanceWidth(label, small);
  const left = cx - (valueWidth + gap + labelWidth) / 2;
  return (
    text(value, left, baseline, {
      fill: valueFill,
      'font-family': FONT_DISPLAY,
      'font-size': big,
      'font-weight': 800,
    }) +
    text(label, left + valueWidth + gap, baseline, {
      fill: palette.inkSoft,
      'font-family': FONT_DISPLAY,
      'font-size': small,
      'font-weight': 700,
      'letter-spacing': small * 0.06,
    })
  );
}

export const pendulum: Design = {
  id: 'pendulum',
  name: 'Pendulum',
  description: 'The instrument itself — a neon case with an arm swinging over its scale.',
  look: 'Black & neon red',
  ownHeader: true,
  draw(context: DesignContext): string {
    const { canvas, palette, frame, title, subtitle } = context;
    const pad = gutter(canvas);
    const size = typeScale(canvas);
    const mark = logoBox(canvas);
    const cx = canvas.width / 2;
    const timeSignature = `${frame.timeSignature.numerator}/${frame.timeSignature.denominator}`;

    // --- the bands this design lays itself out in -------------------
    const titleSize = size.title * (canvas.isPortrait || canvas.isSquare ? 1.15 : 1.3);
    const titleBaseline = mark.y + mark.height * 0.58 + titleSize * 0.34;
    const hasSubtitle = subtitle !== '';
    const headerBottom =
      titleBaseline + titleSize * 0.4 + (hasSubtitle ? size.subtitle * 1.9 : size.subtitle * 0.5);

    // Landscape flanks the instrument with the readout; the two narrow
    // shapes put it in a bar along the bottom, because there is no room
    // beside a case that already fills the width.
    const barHeight = canvas.short * 0.115;
    const usesBar = canvas.isPortrait || canvas.isSquare;
    const barTop = canvas.height - pad - barHeight;
    const footRoom = usesBar ? canvas.height - barTop + pad * 0.35 : pad;

    const roomHigh = canvas.height - headerBottom - footRoom;
    const roomWide = usesBar ? canvas.width - pad * 2 : canvas.width * 0.42;
    // The case is sized by whichever runs out first: the height between
    // the two bands, or the width of the column it stands in. The
    // instrument is taller than its case -- a cap above it, a base and
    // the glow it throws below -- so the fit is measured on the WHOLE
    // of it, or the base lands on the bar along the bottom.
    const overhang = 1.22;
    const caseHeight = Math.min((roomHigh / overhang) * 0.97, roomWide * 1.5);
    const box: Case = {
      cx,
      top: headerBottom + (roomHigh - caseHeight * overhang) / 2 + caseHeight * 0.085,
      height: caseHeight,
      halfTop: caseHeight * 0.13,
      halfBottom: caseHeight * 0.36,
    };

    // --- the arm ----------------------------------------------------
    // Odd beats swing one way and even beats the other, so a bar reads
    // left, right, left, right without anything having to be counted.
    const goingRight = frame.beat % 2 === 1;
    const swing = lerp(
      goingRight ? -MAX_SWING : MAX_SWING,
      goingRight ? MAX_SWING : -MAX_SWING,
      easeInOut(frame.phase),
    );
    // How far through the BAR the music is, for the halo -- so the two
    // moving things say different things: the arm the beat, the halo
    // the bar.
    const barProgress = Math.min(
      1,
      (frame.beat - 1 + frame.phase) / Math.max(1, frame.beatsPerBar),
    );

    // --- the beat, in the case's own window -------------------------
    // Behind the arm, at the height where the case is wide enough for
    // two digits and the arm's rod is still thin.
    const beatDepth = 0.6;
    // Kept inside the window it stands in: a 3 fits at any size, but a
    // 12 in a 6/8 bar would otherwise sit on the case's own walls.
    const beatSize = Math.min(
      caseHeight * 0.21,
      (halfWidthAt(box, beatDepth) * 1.6) / Math.max(1, String(frame.beat).length) / 0.62,
    );
    const [beatX, beatY] = pointAt(box, beatDepth);
    const beat = text(String(frame.beat), beatX, beatY + beatSize * 0.35, {
      fill: palette.ink,
      'font-family': FONT_DISPLAY,
      'font-size': beatSize,
      'font-weight': 800,
      'text-anchor': 'middle',
    });

    // --- the words --------------------------------------------------
    const titleX = usesBar
      ? (mark.x + mark.width + canvas.width - pad) / 2
      : mark.x + mark.width + pad * 0.55;
    const titleAnchor = usesBar ? 'middle' : 'start';
    const ruleWidth = Math.max(canvas.short * 0.06, advanceWidth(title, titleSize) * 0.42);
    const ruleX = usesBar ? titleX - ruleWidth / 2 : titleX;
    const words =
      text(title, titleX, titleBaseline, {
        fill: palette.ink,
        'font-family': FONT_DISPLAY,
        'font-size': titleSize,
        'font-weight': 800,
        'text-anchor': titleAnchor,
      }) +
      (title === ''
        ? ''
        : rect(ruleX, titleBaseline + titleSize * 0.28, ruleWidth, canvas.short * 0.0075, {
            fill: palette.accent,
            rx: canvas.short * 0.004,
          })) +
      text(subtitle, titleX, titleBaseline + titleSize * 0.28 + size.subtitle * 1.5, {
        fill: palette.inkSoft,
        'font-family': FONT_TEXT,
        'font-size': size.subtitle,
        'font-weight': 600,
        'text-anchor': titleAnchor,
      });

    let readout: string;
    if (usesBar) {
      const half = (canvas.width - pad * 2) / 2;
      const baseline = barTop + barHeight * 0.64;
      readout =
        rect(pad, barTop, canvas.width - pad * 2, barHeight, {
          fill: '#100C0E',
          stroke: palette.accentSoft,
          'stroke-width': canvas.short * 0.003,
          rx: barHeight * 0.28,
        }) +
        line(cx, barTop + barHeight * 0.24, cx, barTop + barHeight * 0.76, {
          stroke: palette.inkSoft,
          'stroke-width': canvas.short * 0.002,
          opacity: 0.5,
        }) +
        inline(
          String(frame.bpm),
          'BPM',
          pad + half / 2,
          baseline,
          palette.accent,
          canvas,
          palette,
        ) +
        inline(timeSignature, 'TIME', pad + half * 1.5, baseline, palette.ink, canvas, palette);
    } else {
      const columnCx = (pad + (cx - box.halfBottom * 1.35)) / 2;
      const middle = box.top + box.height * 0.42;
      readout =
        stack(String(frame.bpm), 'BPM', columnCx, middle, canvas, palette) +
        stack(timeSignature, 'TIME', canvas.width - columnCx, middle, canvas, palette);
    }

    const [glowX, glowY] = pointAt(box, 0.45);
    return (
      bloom(glowX, glowY, caseHeight * 1.15, palette) +
      fan(box, barProgress, canvas, palette) +
      instrument(box, canvas, palette) +
      arm(box, swing, canvas, palette) +
      beat +
      words +
      readout +
      logo(context)
    );
  },
};
