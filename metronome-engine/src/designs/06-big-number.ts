/**
 * Design 6 — Big Number.
 *
 * The count, as large as the frame allows, and almost nothing else.
 * For a lesson video watched on a phone this is the one that still
 * reads when everything else has become too small to see.
 */

import { bands, centreOf, FONT_DISPLAY, FONT_TEXT, logo, typeScale } from '../layout.js';
import { easeOut, group, lerp, rect, text } from '../svg.js';
import type { Design, DesignContext } from '../types.js';

export const bigNumber: Design = {
  id: 'big-number',
  name: 'Big Number',
  description: 'The count filling the frame, with the rest of the bar as a thin rail.',
  look: 'White & red',
  draw(context: DesignContext): string {
    const { canvas, palette, frame } = context;
    const { stage } = bands(canvas);
    const [cx, cy] = centreOf(stage);
    const size = typeScale(canvas);
    const count = Math.max(1, frame.beatsPerBar);

    // The number lands big and settles, so the eye catches the instant
    // of the beat rather than just its value.
    const settle = easeOut(Math.min(1, frame.phase * 2.2));
    const scale = lerp(1.12, 1, settle);
    const glyph = Math.min(size.huge, stage.height * 0.72) * scale;
    const isDownbeat = frame.beat === 1;

    const number = text(String(frame.beat), cx, cy + glyph * 0.35, {
      fill: isDownbeat ? palette.accent : palette.ink,
      'font-family': FONT_DISPLAY,
      'font-size': glyph,
      'font-weight': 800,
      'text-anchor': 'middle',
    });

    // The rail: one segment per beat, along the bottom in landscape and
    // square, down the side in portrait where the height is going spare.
    const rail: string[] = [];
    const thickness = canvas.short * 0.014;
    for (let i = 0; i < count; i++) {
      const on = i <= frame.beat - 1;
      if (canvas.isPortrait) {
        const runway = stage.height * 0.7;
        const slot = runway / count;
        const x = stage.x + stage.width - thickness * 2;
        const y = cy - runway / 2 + slot * i;
        rail.push(
          rect(x, y + slot * 0.1, thickness, slot * 0.8, {
            fill: on ? palette.accent : palette.inkSoft,
            opacity: on ? 1 : 0.3,
            rx: thickness / 2,
          }),
        );
      } else {
        const runway = stage.width * 0.56;
        const slot = runway / count;
        const x = cx - runway / 2 + slot * i;
        const y = stage.y + stage.height * 0.9;
        rail.push(
          rect(x + slot * 0.1, y, slot * 0.8, thickness, {
            fill: on ? palette.accent : palette.inkSoft,
            opacity: on ? 1 : 0.3,
            rx: thickness / 2,
          }),
        );
      }
    }

    const barLabel = text(`BAR ${frame.bar}`, cx, stage.y + size.label * 1.6, {
      fill: palette.inkSoft,
      'font-family': FONT_TEXT,
      'font-size': size.label,
      'font-weight': 700,
      'letter-spacing': size.label * 0.16,
      'text-anchor': 'middle',
    });

    return barLabel + number + group({}, rail.join('')) + logo(context);
  },
};
