/**
 * Design 7 — Segment Ring.
 *
 * The bar cut into wedges of a donut, the current one filled. Where
 * the Sweep Dial shows one continuous motion, this shows the bar as
 * discrete slices — the same circle, read a different way.
 */

import { bands, centreOf, FONT_DISPLAY, logo, typeScale } from '../layout.js';
import { easeOut, group, lerp, n, path, polar, text } from '../svg.js';
import type { Design, DesignContext } from '../types.js';

/** A wedge of a donut: outer arc, in, inner arc back, out. */
function wedge(
  cx: number,
  cy: number,
  inner: number,
  outer: number,
  fromTurns: number,
  toTurns: number,
): string {
  const [ox1, oy1] = polar(cx, cy, outer, fromTurns);
  const [ox2, oy2] = polar(cx, cy, outer, toTurns);
  const [ix2, iy2] = polar(cx, cy, inner, toTurns);
  const [ix1, iy1] = polar(cx, cy, inner, fromTurns);
  const large = toTurns - fromTurns > 0.5 ? 1 : 0;
  return (
    `M ${n(ox1)} ${n(oy1)} A ${n(outer)} ${n(outer)} 0 ${large} 1 ${n(ox2)} ${n(oy2)} ` +
    `L ${n(ix2)} ${n(iy2)} A ${n(inner)} ${n(inner)} 0 ${large} 0 ${n(ix1)} ${n(iy1)} Z`
  );
}

export const segmentRing: Design = {
  id: 'segment-ring',
  name: 'Segment Ring',
  description: 'The bar cut into wedges, the current beat filled.',
  draw(context: DesignContext): string {
    const { canvas, palette, frame } = context;
    const { stage } = bands(canvas);
    const [cx, cy] = centreOf(stage);
    const size = typeScale(canvas);
    const count = Math.max(1, frame.beatsPerBar);
    const outer = Math.min(stage.width, stage.height) * 0.44;
    const inner = outer * 0.62;
    const gapTurns = Math.min(0.012, 0.35 / count);
    const settle = easeOut(Math.min(1, frame.phase * 2.5));

    const wedges = Array.from({ length: count }, (_, i) => {
      const current = i === frame.beat - 1;
      const played = i < frame.beat - 1;
      const from = i / count + gapTurns;
      const to = (i + 1) / count - gapTurns;
      // The current wedge reaches out past the others as it lands.
      const reach = current ? lerp(outer * 1.07, outer, settle) : outer;
      return path(wedge(cx, cy, inner, reach, from, to), {
        fill: current ? palette.accent : played ? palette.ink : palette.inkSoft,
        opacity: current ? 1 : played ? 0.55 : 0.2,
      });
    }).join('');

    const number = text(String(frame.beat), cx, cy + size.readout * 0.36, {
      fill: palette.ink,
      'font-family': FONT_DISPLAY,
      'font-size': size.readout,
      'font-weight': 800,
      'text-anchor': 'middle',
    });
    const of = text(`of ${count}`, cx, cy + size.readout * 0.36 + size.label * 1.5, {
      fill: palette.inkSoft,
      'font-family': FONT_DISPLAY,
      'font-size': size.label,
      'font-weight': 700,
      'text-anchor': 'middle',
    });

    return group({}, wedges) + number + of + logo(context);
  },
};
