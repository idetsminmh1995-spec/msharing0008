/**
 * Design 10 — Bounce Ball.
 *
 * A ball that arcs from beat to beat and lands on each one, the way a
 * bouncing-ball lyric video marks a syllable. Where the Travel Line
 * moves at a constant speed, this one is fastest in the air and still
 * at the moment of contact — so the landing, not the motion, is what
 * you read.
 *
 * It stays HORIZONTAL in all three ratios. Standing the run on its end
 * in portrait was tried and reads as a column of ticks with something
 * floating beside it: a bounce is a thing that happens ALONG a line,
 * and turning the line sideways turns the arc into a detour. Rotating
 * with the frame is Travel Line's idea (design 8); keeping the line and
 * changing everything around it is this one's.
 */

import { bands, FONT_DISPLAY, logo, typeScale } from '../layout.js';
import { easeOut, group, lerp, n, rect, text } from '../svg.js';
import type { Design, DesignContext } from '../types.js';

export const bounceBall: Design = {
  id: 'bounce-ball',
  name: 'Bounce Ball',
  description: 'A ball arcing from beat to beat and landing on each one.',
  look: 'Cream & orange',
  draw(context: DesignContext): string {
    const { canvas, palette, frame } = context;
    const { stage } = bands(canvas);
    const size = typeScale(canvas);
    const count = Math.max(1, frame.beatsPerBar);

    // What the ratio changes: how much of the width the run takes, how
    // far down the frame it sits, and how big everything is. A tall
    // frame gets a wider run lower down, because the space above it is
    // what the arc has to play with.
    const widthFraction = canvas.isPortrait ? 0.92 : canvas.isSquare ? 0.84 : 0.76;
    const baselineFraction = canvas.isPortrait ? 0.7 : canvas.isSquare ? 0.72 : 0.7;

    const runway = stage.width * widthFraction;
    const start = stage.x + (stage.width - runway) / 2;
    const baseline = stage.y + stage.height * baselineFraction;
    const gaps = Math.max(1, count - 1);
    const slot = runway / gaps;
    const at = (i: number) => (count === 1 ? start + runway / 2 : start + slot * i);

    const padThickness = canvas.short * 0.016;
    const padLength = Math.min(slot * 0.62, canvas.short * 0.17);
    const pads = Array.from({ length: count }, (_, i) => {
      const current = i === frame.beat - 1;
      return rect(at(i) - padLength / 2, baseline, padLength, padThickness, {
        fill: current ? palette.accent : palette.inkSoft,
        opacity: current ? 1 : 0.35,
        rx: padThickness / 2,
      });
    }).join('');

    // From this beat's pad to the next, over an arc whose height is a
    // sine of the phase -- zero at both ends, so the ball is exactly on
    // the pad at the instant of the beat.
    const fromIndex = frame.beat - 1;
    const toIndex = frame.beat % count;
    const along = count === 1 ? at(0) : lerp(at(fromIndex), at(toIndex), frame.phase);
    // The arc's height belongs to the GAP BETWEEN PADS, not to the whole
    // run: tied to the run, a bar of two beats threw the ball off the
    // top of the frame and a bar of twelve barely lifted it.
    // ...and a portrait frame has height going spare, so the ball is
    // allowed a taller arc there rather than a low skim across a lot of
    // empty space.
    const hop =
      Math.sin(Math.PI * frame.phase) *
      Math.min(slot * (canvas.isPortrait ? 0.9 : 0.5), stage.height * 0.42);
    const radius = canvas.short * 0.034;
    const ballY = baseline - hop - radius * 1.2;

    // A squash at the moment of contact, so the landing has weight.
    const squash = 1 - 0.22 * (1 - easeOut(Math.min(1, frame.phase * 5)));
    const ball = `<ellipse cx="${n(along)}" cy="${n(ballY)}" rx="${n(radius * (2 - squash))}" ry="${n(radius * squash)}" fill="${palette.accent}"/>`;

    const shadowWidth = radius * lerp(1.5, 0.7, Math.sin(Math.PI * frame.phase));
    const shadow = `<ellipse cx="${n(along)}" cy="${n(baseline + padThickness * 1.6)}" rx="${n(shadowWidth)}" ry="${n(radius * 0.32)}" fill="${palette.ink}" opacity="0.16"/>`;

    const numbers = Array.from({ length: count }, (_, i) =>
      text(String(i + 1), at(i), baseline + canvas.short * 0.085, {
        fill: i === frame.beat - 1 ? palette.accent : palette.inkSoft,
        'font-family': FONT_DISPLAY,
        'font-size': size.label * 1.5,
        'font-weight': 800,
        'text-anchor': 'middle',
      }),
    ).join('');

    return group({}, pads) + shadow + ball + numbers + logo(context);
  },
};
