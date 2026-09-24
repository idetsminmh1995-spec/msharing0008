/**
 * Design 4 — Bar Meter.
 *
 * The bar as a row of columns that fill in as it goes, like a level
 * meter. Unlike the dot designs this one keeps the beats already
 * played FILLED, so you can see how much of the bar is left rather
 * than only where you are.
 */

import { bands, FONT_DISPLAY, logo, typeScale } from '../layout.js';
import { easeOut, group, lerp, rect, text } from '../svg.js';
import type { Design, DesignContext } from '../types.js';

export const barMeter: Design = {
  id: 'bar-meter',
  name: 'Bar Meter',
  description: 'Columns that fill through the bar, so you see what is left of it.',
  look: 'Paper & ink',
  draw(context: DesignContext): string {
    const { canvas, palette, frame } = context;
    const { stage } = bands(canvas);
    const size = typeScale(canvas);
    const count = Math.max(1, frame.beatsPerBar);
    const grow = easeOut(Math.min(1, frame.phase * 2.5));

    const bars: string[] = [];
    // Portrait lays the columns on their side and stacks them, because
    // tall thin columns in a tall thin frame is all frame and no meter.
    const horizontal = canvas.isPortrait;
    const slot = (horizontal ? stage.height : stage.width) / count;
    const thickness = slot * 0.62;
    const runway = (horizontal ? stage.width : stage.height) * 0.78;

    for (let i = 0; i < count; i++) {
      const played = i < frame.beat - 1;
      const current = i === frame.beat - 1;
      const fill = played ? 1 : current ? lerp(0.55, 1, grow) : 0.16;
      const offset = (horizontal ? stage.y : stage.x) + slot * i + (slot - thickness) / 2;
      const length = runway * fill;
      const colour = current ? palette.accent : played ? palette.ink : palette.inkSoft;
      const opacity = current ? 1 : played ? 0.7 : 0.25;
      if (horizontal) {
        const x = stage.x + (stage.width - runway) / 2;
        bars.push(
          rect(x, offset, runway, thickness, {
            fill: palette.inkSoft,
            opacity: 0.12,
            rx: thickness * 0.3,
          }) + rect(x, offset, length, thickness, { fill: colour, opacity, rx: thickness * 0.3 }),
        );
      } else {
        const bottom = stage.y + stage.height * 0.9;
        bars.push(
          rect(offset, bottom - runway, thickness, runway, {
            fill: palette.inkSoft,
            opacity: 0.12,
            rx: thickness * 0.3,
          }) +
            rect(offset, bottom - length, thickness, length, {
              fill: colour,
              opacity,
              rx: thickness * 0.3,
            }),
        );
      }
    }

    const labels = Array.from({ length: count }, (_, i) => {
      const offset = (horizontal ? stage.y : stage.x) + slot * (i + 0.5);
      return horizontal
        ? text(String(i + 1), stage.x + stage.width * 0.055, offset + size.label * 0.5, {
            fill: i === frame.beat - 1 ? palette.accent : palette.inkSoft,
            'font-family': FONT_DISPLAY,
            'font-size': size.label * 1.4,
            'font-weight': 800,
            'text-anchor': 'middle',
          })
        : text(String(i + 1), offset, stage.y + stage.height * 0.98, {
            fill: i === frame.beat - 1 ? palette.accent : palette.inkSoft,
            'font-family': FONT_DISPLAY,
            'font-size': size.label * 1.4,
            'font-weight': 800,
            'text-anchor': 'middle',
          });
    }).join('');

    return group({}, bars.join('')) + labels + logo(context, 'top-left');
  },
};
