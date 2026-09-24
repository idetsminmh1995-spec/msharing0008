/**
 * Design 5 — Sweep Dial.
 *
 * A clock face for one bar: a hand sweeping once round while the bar
 * plays, with a tick at each beat. The only design here that shows the
 * WHOLE bar as one continuous motion rather than as discrete steps.
 */

import { bands, centreOf, FONT_DISPLAY, logo, typeScale } from '../layout.js';
import { arcPath, circle, group, line, path, polar, text } from '../svg.js';
import type { Design, DesignContext } from '../types.js';

export const sweepDial: Design = {
  id: 'sweep-dial',
  name: 'Sweep Dial',
  description: 'A hand sweeping once round the bar, ticked at every beat.',
  look: 'Charcoal & amber',
  draw(context: DesignContext): string {
    const { canvas, palette, frame } = context;
    const { stage } = bands(canvas);
    const [cx, cy] = centreOf(stage);
    const size = typeScale(canvas);
    const radius = Math.min(stage.width, stage.height) * 0.42;
    const count = Math.max(1, frame.beatsPerBar);

    // Where the hand is, as a fraction of one whole bar.
    const throughBar = (frame.beat - 1 + frame.phase) / count;

    const face =
      circle(cx, cy, radius, {
        fill: 'none',
        stroke: palette.inkSoft,
        'stroke-width': canvas.short * 0.004,
        opacity: 0.35,
      }) +
      path(arcPath(cx, cy, radius, 0, throughBar), {
        fill: 'none',
        stroke: palette.accent,
        'stroke-width': canvas.short * 0.012,
        'stroke-linecap': 'round',
      });

    const ticks = Array.from({ length: count }, (_, i) => {
      const turns = i / count;
      const passed = i <= frame.beat - 1;
      const inner = radius * (i === 0 ? 0.82 : 0.88);
      const [x1, y1] = polar(cx, cy, inner, turns);
      const [x2, y2] = polar(cx, cy, radius * 1.06, turns);
      return line(x1, y1, x2, y2, {
        stroke: passed ? palette.accent : palette.inkSoft,
        'stroke-width': canvas.short * (i === 0 ? 0.008 : 0.005),
        'stroke-linecap': 'round',
        opacity: passed ? 1 : 0.45,
      });
    }).join('');

    const [handX, handY] = polar(cx, cy, radius * 0.9, throughBar);
    const hand =
      line(cx, cy, handX, handY, {
        stroke: palette.ink,
        'stroke-width': canvas.short * 0.007,
        'stroke-linecap': 'round',
      }) +
      circle(handX, handY, canvas.short * 0.022, { fill: palette.accent }) +
      circle(cx, cy, canvas.short * 0.014, { fill: palette.ink });

    const number = text(String(frame.beat), cx, cy + radius * 0.46, {
      fill: palette.ink,
      'font-family': FONT_DISPLAY,
      'font-size': size.readout * 0.95,
      'font-weight': 800,
      'text-anchor': 'middle',
    });
    const barLabel = text(`BAR ${frame.bar}`, cx, cy - radius * 0.3, {
      fill: palette.inkSoft,
      'font-family': FONT_DISPLAY,
      'font-size': size.label,
      'font-weight': 700,
      'letter-spacing': size.label * 0.14,
      'text-anchor': 'middle',
    });

    return group({}, face + ticks + hand) + barLabel + number + logo(context);
  },
};
