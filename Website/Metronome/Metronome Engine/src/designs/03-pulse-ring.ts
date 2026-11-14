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

    const coreRadius = maxRadius * lerp(0.22, 0.17, easeOut(frame.phase));
    const core = circle(cx, cy, coreRadius, {
      fill: frame.beat === 1 ? palette.accent : palette.ink,
    });
    const coreKeyline = circle(cx, cy, coreRadius * 1.12, {
      fill: 'none',
      stroke: frame.beat === 1 ? palette.onAccent : palette.accent,
      'stroke-width': canvas.short * 0.003,
      opacity: 0.8,
    });

    const numberSize = Math.min(
      size.readout * 0.72,
      (coreRadius * 1.2) / Math.max(1, String(frame.beat).length) / 0.62,
    );
    const number = text(String(frame.beat), cx, cy + numberSize * 0.34, {
      fill: frame.beat === 1 ? palette.onAccent : palette.background,
      'font-family': FONT_DISPLAY,
      'font-size': numberSize,
      'font-weight': 800,
      'text-anchor': 'middle',
    });

    const count = Math.max(1, frame.beatsPerBar);
    const railWidth = Math.min(stage.width * 0.76, canvas.short * 0.72);
    const slot = railWidth / count;
    const railY = stage.y + stage.height * 0.91;
    const railHeight = canvas.short * 0.012;
    const rail = Array.from({ length: count }, (_, i) => {
      const x = cx - railWidth / 2 + i * slot;
      const w = slot * 0.72;
      const current = i === frame.beat - 1;
      const played = i < frame.beat - 1;
      const activeWidth = current ? w * lerp(0.18, 1, easeOut(frame.phase)) : played ? w : 0;
      return (
        `<rect x="${x}" y="${railY}" width="${w}" height="${railHeight}" rx="${railHeight / 2}" fill="${palette.inkSoft}" opacity="0.22"/>` +
        (activeWidth > 0
          ? `<rect x="${x}" y="${railY}" width="${activeWidth}" height="${railHeight}" rx="${railHeight / 2}" fill="${current ? palette.accent : palette.ink}" opacity="${current ? 1 : 0.72}"/>`
          : '')
      );
    }).join('');

    return (
      group({}, rings.join('')) + coreKeyline + core + number + group({}, rail) + logo(context)
    );
  },
};
