/**
 * Design 3 — Pulse Ring.
 *
 * Rings thrown outward from the centre, one per beat, fading as they
 * grow. Nothing tells you a beat LANDED as clearly as something that
 * starts at that instant and decays — it reads at a glance even with
 * the sound off.
 */

import { bands, centreOf, FONT_DISPLAY, logo, typeScale } from '../layout.js';
import { circle, easeOut, group, lerp, text } from '../svg.js';
import type { Design, DesignContext } from '../types.js';

/** Three in flight at once: the current beat's, and the two before it. */
const RINGS = 3;

export const pulseRing: Design = {
  id: 'pulse-ring',
  name: 'Pulse Ring',
  description: 'Rings thrown outward on each beat, fading as they grow.',
  look: 'Night blue',
  draw(context: DesignContext): string {
    const { canvas, palette, frame } = context;
    const { stage } = bands(canvas);
    const [cx, cy] = centreOf(stage);
    const size = typeScale(canvas);
    const maxRadius = Math.min(stage.width, stage.height) * 0.46;

    const rings: string[] = [];
    for (let age = RINGS - 1; age >= 0; age--) {
      // `phase` is how far into the CURRENT beat we are, so a ring
      // thrown `age` beats ago has travelled that much further.
      const travel = (frame.phase + age) / RINGS;
      if (travel > 1) continue;
      const eased = easeOut(travel);
      const wasDownbeat =
        (((frame.beat - 1 - age) % frame.beatsPerBar) + frame.beatsPerBar) % frame.beatsPerBar ===
        0;
      rings.push(
        circle(cx, cy, lerp(maxRadius * 0.16, maxRadius, eased), {
          fill: 'none',
          stroke: wasDownbeat ? palette.accent : palette.ink,
          'stroke-width': lerp(canvas.short * 0.018, canvas.short * 0.002, eased),
          opacity: Math.max(0, 1 - travel) * (wasDownbeat ? 0.95 : 0.55),
        }),
      );
    }

    const core = circle(cx, cy, maxRadius * lerp(0.2, 0.14, easeOut(frame.phase)), {
      fill: frame.beat === 1 ? palette.accent : palette.ink,
    });

    const number = text(String(frame.beat), cx, cy + size.readout * 0.36, {
      fill: frame.beat === 1 ? palette.onAccent : palette.background,
      'font-family': FONT_DISPLAY,
      'font-size': size.readout,
      'font-weight': 800,
      'text-anchor': 'middle',
    });

    return group({}, rings.join('')) + core + number + logo(context);
  },
};
