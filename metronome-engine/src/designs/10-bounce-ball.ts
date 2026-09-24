/**
 * Design 10 — Bounce Ball.
 *
 * A ball that arcs from beat to beat and lands on each one, the way a
 * bouncing-ball lyric video marks a syllable. Where the Travel Line
 * moves at a constant speed, this one is fastest in the air and still
 * at the moment of contact — so the landing, not the motion, is what
 * you read.
 */

import { bands, FONT_DISPLAY, logo, typeScale } from '../layout.js';
import { easeOut, group, lerp, n, rect, text } from '../svg.js';
import type { Design, DesignContext } from '../types.js';

export const bounceBall: Design = {
  id: 'bounce-ball',
  name: 'Bounce Ball',
  description: 'A ball arcing from beat to beat and landing on each one.',
  draw(context: DesignContext): string {
    const { canvas, palette, frame } = context;
    const { stage } = bands(canvas);
    const size = typeScale(canvas);
    const count = Math.max(1, frame.beatsPerBar);

    // Portrait stands the run of pads on its side; the ball then arcs
    // out to the left and back rather than up and over.
    const vertical = canvas.isPortrait;
    const runway = (vertical ? stage.height : stage.width) * 0.76;
    const start =
      (vertical ? stage.y : stage.x) + ((vertical ? stage.height : stage.width) - runway) / 2;
    const baseline = vertical ? stage.x + stage.width * 0.72 : stage.y + stage.height * 0.72;
    const slot = runway / Math.max(1, count - 1 === 0 ? 1 : count - 1);
    const at = (i: number) => (count === 1 ? start + runway / 2 : start + slot * i);

    const pads = Array.from({ length: count }, (_, i) => {
      const current = i === frame.beat - 1;
      const padLength = Math.min(slot * 0.55, canvas.short * 0.16);
      const padThickness = canvas.short * 0.016;
      const p = at(i);
      return vertical
        ? rect(baseline, p - padLength / 2, padThickness, padLength, {
            fill: current ? palette.accent : palette.inkSoft,
            opacity: current ? 1 : 0.35,
            rx: padThickness / 2,
          })
        : rect(p - padLength / 2, baseline, padLength, padThickness, {
            fill: current ? palette.accent : palette.inkSoft,
            opacity: current ? 1 : 0.35,
            rx: padThickness / 2,
          });
    }).join('');

    // From this beat's pad to the next one, over an arc. The height is
    // a sine of the phase, which is zero at both ends -- so the ball is
    // exactly on the pad at the instant of the beat.
    const fromIndex = frame.beat - 1;
    const toIndex = frame.beat % count;
    const travel = count === 1 ? 0 : frame.phase;
    const along = lerp(at(fromIndex), at(toIndex), travel);
    const hop = Math.sin(Math.PI * frame.phase) * Math.min(runway * 0.24, canvas.short * 0.26);
    const radius = canvas.short * 0.032;
    const ballX = vertical ? baseline - hop - radius * 1.2 : along;
    const ballY = vertical ? along : baseline - hop - radius * 1.2;

    // A squash at the moment of contact, so the landing has weight.
    const squash = 1 - 0.22 * (1 - easeOut(Math.min(1, frame.phase * 5)));
    const ball = `<ellipse cx="${n(ballX)}" cy="${n(ballY)}" rx="${n(radius * (vertical ? squash : 2 - squash))}" ry="${n(radius * (vertical ? 2 - squash : squash))}" fill="${palette.accent}"/>`;

    const shadowWidth = radius * lerp(1.5, 0.7, Math.sin(Math.PI * frame.phase));
    const shadow = vertical
      ? `<ellipse cx="${n(baseline + canvas.short * 0.006)}" cy="${n(along)}" rx="${n(radius * 0.35)}" ry="${n(shadowWidth)}" fill="${palette.ink}" opacity="0.18"/>`
      : `<ellipse cx="${n(along)}" cy="${n(baseline + canvas.short * 0.006)}" rx="${n(shadowWidth)}" ry="${n(radius * 0.35)}" fill="${palette.ink}" opacity="0.18"/>`;

    const numbers = Array.from({ length: count }, (_, i) => {
      const p = at(i);
      const current = i === frame.beat - 1;
      return vertical
        ? text(String(i + 1), baseline + canvas.short * 0.06, p + size.label * 0.4, {
            fill: current ? palette.accent : palette.inkSoft,
            'font-family': FONT_DISPLAY,
            'font-size': size.label * 1.3,
            'font-weight': 800,
            'text-anchor': 'middle',
          })
        : text(String(i + 1), p, baseline + canvas.short * 0.075, {
            fill: current ? palette.accent : palette.inkSoft,
            'font-family': FONT_DISPLAY,
            'font-size': size.label * 1.3,
            'font-weight': 800,
            'text-anchor': 'middle',
          });
    }).join('');

    return group({}, pads) + shadow + ball + numbers + logo(context, 'top-left');
  },
};
