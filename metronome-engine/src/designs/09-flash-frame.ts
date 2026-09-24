/**
 * Design 9 — Flash Frame.
 *
 * The whole frame answers the beat: a border that flares and decays,
 * strong on the downbeat and gentle off it. The one design meant to be
 * caught in peripheral vision — you can be looking at your hands and
 * still see the bar turn over.
 */

import { bands, centreOf, FONT_DISPLAY, FONT_TEXT, logo, typeScale } from '../layout.js';
import { easeOut, group, lerp, rect, text } from '../svg.js';
import type { Design, DesignContext } from '../types.js';

export const flashFrame: Design = {
  id: 'flash-frame',
  name: 'Flash Frame',
  description: 'A border that flares on every beat and hard on the downbeat.',
  draw(context: DesignContext): string {
    const { canvas, palette, frame } = context;
    const { stage } = bands(canvas);
    const [cx, cy] = centreOf(stage);
    const size = typeScale(canvas);
    const isDownbeat = frame.beat === 1;

    // Decays across the beat rather than staying lit: a border that is
    // always on says nothing at all.
    const decay = 1 - easeOut(Math.min(1, frame.phase * 1.6));
    const thickness = canvas.short * (isDownbeat ? 0.055 : 0.03) * lerp(0.35, 1, decay);

    const border = rect(
      thickness / 2,
      thickness / 2,
      canvas.width - thickness,
      canvas.height - thickness,
      {
        fill: 'none',
        stroke: palette.accent,
        'stroke-width': thickness,
        opacity: lerp(0.15, 1, decay),
      },
    );

    // A wash over the whole frame on the downbeat only, so the bar line
    // is unmistakable without the other beats becoming noise.
    const wash = isDownbeat
      ? rect(0, 0, canvas.width, canvas.height, { fill: palette.accent, opacity: 0.1 * decay })
      : '';

    const number = text(String(frame.beat), cx, cy + size.huge * 0.32, {
      fill: isDownbeat ? palette.accent : palette.ink,
      'font-family': FONT_DISPLAY,
      'font-size': Math.min(size.huge * 0.9, stage.height * 0.66),
      'font-weight': 800,
      'text-anchor': 'middle',
    });

    const of = text(`${frame.beat} / ${frame.beatsPerBar}`, cx, stage.y + stage.height * 0.96, {
      fill: palette.inkSoft,
      'font-family': FONT_TEXT,
      'font-size': size.label * 1.2,
      'font-weight': 700,
      'letter-spacing': size.label * 0.12,
      'text-anchor': 'middle',
    });

    return group({}, wash + border) + number + of + logo(context);
  },
};
