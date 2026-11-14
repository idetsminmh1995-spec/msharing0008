/**
 * Design 9 — Flash Frame.
 *
 * The whole frame answers the beat: a border that flares and decays,
 * strong on the downbeat and gentle off it. The one design meant to be
 * caught in peripheral vision — you can be looking at your hands and
 * still see the bar turn over.
 */

import {
  advanceWidth,
  bands,
  centreOf,
  FONT_DISPLAY,
  FONT_TEXT,
  logo,
  typeScale,
} from '../layout.js';
import { easeOut, group, lerp, rect, text } from '../svg.js';
import type { Design, DesignContext } from '../types.js';

export const flashFrame: Design = {
  id: 'flash-frame',
  name: 'Flash Frame',
  description: 'A border that flares on every beat and hard on the downbeat.',
  look: 'True black & hot red',
  draw(context: DesignContext): string {
    const { canvas, palette, frame } = context;
    const { stage } = bands(canvas);
    const [cx, cy] = centreOf(stage);
    const size = typeScale(canvas);
    const isDownbeat = frame.beat === 1;

    // Decays across the beat rather than staying lit: a border that is
    // always on says nothing at all.
    const decay = 1 - easeOut(Math.min(1, frame.phase * 1.6));
    const thickness = canvas.short * (isDownbeat ? 0.04 : 0.024) * lerp(0.35, 1, decay);
    const inset = canvas.short * 0.035;

    const border = rect(
      stage.x + inset,
      stage.y + inset,
      stage.width - inset * 2,
      stage.height - inset * 2,
      {
        fill: 'none',
        stroke: palette.accent,
        'stroke-width': thickness,
        opacity: lerp(0.15, 1, decay),
        rx: canvas.short * 0.035,
      },
    );

    // A wash over the whole frame on the downbeat only, so the bar line
    // is unmistakable without the other beats becoming noise.
    const wash = isDownbeat
      ? rect(stage.x + inset, stage.y + inset, stage.width - inset * 2, stage.height - inset * 2, {
          fill: palette.accent,
          opacity: 0.045 * decay,
          rx: canvas.short * 0.035,
        })
      : '';

    const numberSize = Math.min(
      size.huge * 0.82,
      stage.height * 0.58,
      (stage.width * 0.72) / advanceWidth(String(frame.beat), 1),
    );
    const number = text(String(frame.beat), cx, cy + numberSize * 0.34, {
      fill: isDownbeat ? palette.accent : palette.ink,
      'font-family': FONT_DISPLAY,
      'font-size': numberSize,
      'font-weight': 800,
      'text-anchor': 'middle',
    });

    const count = Math.max(1, frame.beatsPerBar);
    const railWidth = stage.width * 0.54;
    const railY = stage.y + stage.height * 0.9;
    const slot = railWidth / count;
    const progress = easeOut(frame.phase);
    const rail = Array.from({ length: count }, (_, i) => {
      const x = cx - railWidth / 2 + i * slot;
      const w = slot * 0.76;
      const current = i === frame.beat - 1;
      const played = i < frame.beat - 1;
      const fill = played ? 1 : current ? Math.max(0.14, progress) : 0;
      return (
        rect(x, railY, w, canvas.short * 0.014, {
          fill: palette.inkSoft,
          opacity: 0.2,
          rx: canvas.short * 0.007,
        }) +
        (fill > 0
          ? rect(x, railY, w * fill, canvas.short * 0.014, {
              fill: current ? palette.accent : palette.ink,
              opacity: current ? 1 : 0.72,
              rx: canvas.short * 0.007,
            })
          : '')
      );
    }).join('');

    const of = text(`${frame.beat} / ${frame.beatsPerBar}`, cx, stage.y + stage.height * 0.97, {
      fill: palette.inkSoft,
      'font-family': FONT_TEXT,
      'font-size': size.label * 1.2,
      'font-weight': 700,
      'letter-spacing': size.label * 0.12,
      'text-anchor': 'middle',
    });

    return group({}, wash + border) + number + group({}, rail) + of + logo(context);
  },
};
