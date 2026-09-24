/**
 * Design 2 — Beat Dots.
 *
 * One dot per beat of the bar, the current one lit and swollen. The
 * plainest possible answer to "where am I", and the one that survives
 * being watched on a phone at arm's length.
 *
 * The row becomes a column in portrait and an arc in square, because a
 * long horizontal row of dots wastes a tall frame and looks lost in a
 * square one.
 */

import { bands, centreOf, FONT_DISPLAY, logo, typeScale } from '../layout.js';
import { circle, easeOut, group, lerp, polar, text } from '../svg.js';
import type { Design, DesignContext } from '../types.js';

export const beatDots: Design = {
  id: 'beat-dots',
  name: 'Beat Dots',
  description: 'One dot per beat, the current one lit — a row, a column or an arc.',
  look: 'Black & red',
  draw(context: DesignContext): string {
    const { canvas, palette, frame } = context;
    const { stage } = bands(canvas);
    const [cx, cy] = centreOf(stage);
    const size = typeScale(canvas);
    const count = Math.max(1, frame.beatsPerBar);

    // The lit dot settles rather than snapping, so a slow tempo does
    // not look like a slideshow.
    const settle = easeOut(Math.min(1, frame.phase * 3));
    const litScale = lerp(1.9, 1.45, settle);

    const dots: string[] = [];
    const radius = Math.min(
      canvas.short * 0.055,
      (canvas.isPortrait ? stage.height : stage.width) / (count * 3.4),
    );
    const gap = radius * 3.2;

    for (let i = 0; i < count; i++) {
      const isLit = i === frame.beat - 1;
      const offset = (i - (count - 1) / 2) * gap;
      let x = cx;
      let y = cy;
      if (canvas.isSquare) {
        // A shallow arc, read left to right like a bar of music. A big
        // radius and a small sweep: a tight arc turns into a swoosh and
        // stops looking like a row of beats at all.
        const spread = Math.min(0.3, count * 0.07);
        const turns = 0.5 + (count === 1 ? 0 : (i / (count - 1) - 0.5) * -spread);
        [x, y] = polar(cx, cy - stage.height * 0.34, stage.height * 0.55, turns);
      } else if (canvas.isPortrait) {
        y = cy + offset;
      } else {
        x = cx + offset;
      }
      dots.push(
        circle(x, y, radius * (isLit ? litScale : 1), {
          fill: isLit ? palette.accent : 'none',
          stroke: isLit ? 'none' : palette.inkSoft,
          'stroke-width': radius * 0.22,
          opacity: isLit ? 1 : 0.5,
        }),
      );
    }

    // Square puts the count in the hollow of the arc, where there is
    // real space for it; the other two run it behind the dots as a
    // watermark, where there is not.
    const number = canvas.isSquare
      ? text(String(frame.beat), cx, cy - stage.height * 0.06, {
          fill: palette.ink,
          'font-family': FONT_DISPLAY,
          'font-size': size.readout * 1.3,
          'font-weight': 800,
          'text-anchor': 'middle',
        })
      : text(String(frame.beat), cx, cy + size.huge * 0.33, {
          fill: palette.ink,
          'font-family': FONT_DISPLAY,
          'font-size': size.huge * 0.42,
          'font-weight': 800,
          'text-anchor': 'middle',
          opacity: 0.12,
        });

    return number + group({}, dots.join('')) + logo(context);
  },
};
