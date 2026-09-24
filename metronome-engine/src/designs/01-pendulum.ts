/**
 * Design 1 — Pendulum.
 *
 * The instrument itself: a wooden case with an arm swinging over a
 * scale. One swing per beat, left on the odd beats and right on the
 * even ones, so the arm's direction tells you where you are in the bar
 * the way a real metronome's does.
 */

import { bands, centreOf, FONT_DISPLAY, logo, typeScale } from '../layout.js';
import { circle, easeInOut, group, lerp, line, path, polar, rect, text } from '../svg.js';
import type { Design, DesignContext } from '../types.js';

/**
 * Turns either side of vertical. A real metronome swings about 25
 * degrees; much more and the arm sweeps outside its own case, which
 * stops reading as a metronome and starts reading as a windscreen
 * wiper.
 */
const MAX_SWING = 0.072;

export const pendulum: Design = {
  id: 'pendulum',
  name: 'Pendulum',
  description: 'The instrument itself — a weighted arm swinging over a scale.',
  draw(context: DesignContext): string {
    const { canvas, palette, frame } = context;
    const { stage } = bands(canvas);
    const [cx] = centreOf(stage);
    const size = typeScale(canvas);

    // The case is as tall as the stage allows and as wide as it needs
    // to be to stay a metronome rather than a spike.
    const caseHeight = Math.min(stage.height * 0.88, stage.width * 1.35);
    const baseWidth = Math.min(stage.width * 0.62, caseHeight * 0.62);
    const topWidth = baseWidth * 0.3;
    const baseY = stage.y + (stage.height + caseHeight) / 2;
    const topY = baseY - caseHeight;
    const pivotY = baseY - caseHeight * 0.12;
    const armLength = caseHeight * 0.78;

    // Odd beats swing one way, even beats the other -- so a 4/4 bar is
    // left, right, left, right and the eye can count without reading.
    const goingRight = frame.beat % 2 === 1;
    const eased = easeInOut(frame.phase);
    const turns = lerp(
      goingRight ? -MAX_SWING : MAX_SWING,
      goingRight ? MAX_SWING : -MAX_SWING,
      eased,
    );
    const [tipX, tipY] = polar(cx, pivotY, armLength, turns);
    // The weight rides two thirds up the arm, as it does on the real thing.
    const [weightX, weightY] = polar(cx, pivotY, armLength * 0.62, turns);

    const body =
      path(
        `M ${cx - baseWidth / 2} ${baseY} L ${cx - topWidth / 2} ${topY} ` +
          `L ${cx + topWidth / 2} ${topY} L ${cx + baseWidth / 2} ${baseY} Z`,
        {
          fill: palette.accentSoft,
          stroke: palette.accent,
          'stroke-width': canvas.short * 0.006,
          'stroke-linejoin': 'round',
        },
      ) +
      // The scale the arm swings over.
      group(
        { stroke: palette.inkSoft, 'stroke-width': canvas.short * 0.0025, opacity: 0.55 },
        Array.from({ length: 9 }, (_, i) => {
          const t = (i / 8) * 2 * MAX_SWING - MAX_SWING;
          const [x1, y1] = polar(cx, pivotY, armLength * 0.86, t);
          const [x2, y2] = polar(cx, pivotY, armLength * 0.94, t);
          return line(x1, y1, x2, y2);
        }).join(''),
      ) +
      line(cx, pivotY, tipX, tipY, {
        stroke: palette.ink,
        'stroke-width': canvas.short * 0.009,
        'stroke-linecap': 'round',
      }) +
      circle(weightX, weightY, canvas.short * 0.035, { fill: palette.accent }) +
      circle(cx, pivotY, canvas.short * 0.018, { fill: palette.ink }) +
      rect(cx - baseWidth * 0.58, baseY, baseWidth * 1.16, canvas.short * 0.022, {
        fill: palette.accent,
        rx: canvas.short * 0.008,
      });

    const count = text(String(frame.beat), cx, topY - size.label * 0.9, {
      fill: palette.accent,
      'font-family': FONT_DISPLAY,
      'font-size': size.readout,
      'font-weight': 800,
      'text-anchor': 'middle',
    });

    return body + count + logo(context);
  },
};
