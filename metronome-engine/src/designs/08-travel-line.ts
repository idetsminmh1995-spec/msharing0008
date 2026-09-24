/**
 * Design 8 — Travel Line.
 *
 * A marker travelling along a track, ticked at every beat, resetting
 * each bar. The track runs across the frame in landscape, down it in
 * portrait, and all the way round the edge in square — the one design
 * whose shape changes completely with the ratio rather than just its
 * proportions.
 */

import { bands, FONT_DISPLAY, logo, typeScale } from '../layout.js';
import type { Rect } from '../layout.js';
import { circle, group, line, n, path, rect, text } from '../svg.js';
import type { Design, DesignContext } from '../types.js';

/** Where a fraction `t` of the way round a rectangle's edge lands. */
function aroundRect(box: Rect, t: number): [number, number] {
  const left = box.x;
  const top = box.y;
  const right = box.x + box.width;
  const bottom = box.y + box.height;
  const w = right - left;
  const h = bottom - top;
  const perimeter = (w + h) * 2;
  const along = (((t % 1) + 1) % 1) * perimeter;
  if (along < w) return [left + along, top];
  if (along < w + h) return [right, top + (along - w)];
  if (along < w * 2 + h) return [right - (along - w - h), bottom];
  return [left, bottom - (along - w * 2 - h)];
}

export const travelLine: Design = {
  id: 'travel-line',
  name: 'Travel Line',
  description: 'A marker travelling a track — across, down, or right round the frame.',
  draw(context: DesignContext): string {
    const { canvas, palette, frame } = context;
    const { stage } = bands(canvas);
    const size = typeScale(canvas);
    const count = Math.max(1, frame.beatsPerBar);
    const throughBar = (frame.beat - 1 + frame.phase) / count;
    const stroke = canvas.short * 0.006;
    const marker = canvas.short * 0.028;

    if (canvas.isSquare) {
      // A square inside the stage, so the loop reads as one shape
      // rather than as a box drawn around the whole frame.
      const side = Math.min(stage.width, stage.height) * 0.94;
      const loop: Rect = {
        x: stage.x + (stage.width - side) / 2,
        y: stage.y + (stage.height - side) / 2,
        width: side,
        height: side,
      };
      const track = rect(loop.x, loop.y, loop.width, loop.height, {
        fill: 'none',
        stroke: palette.inkSoft,
        'stroke-width': stroke,
        opacity: 0.35,
        rx: canvas.short * 0.04,
      });
      const ticks = Array.from({ length: count }, (_, i) => {
        const [x, y] = aroundRect(loop, i / count);
        return circle(x, y, marker * (i === 0 ? 0.55 : 0.4), {
          fill: i <= frame.beat - 1 ? palette.accent : palette.inkSoft,
          opacity: i <= frame.beat - 1 ? 1 : 0.4,
        });
      }).join('');
      const [mx, my] = aroundRect(loop, throughBar);
      const head = circle(mx, my, marker, { fill: palette.accent });
      const number = text(
        String(frame.beat),
        canvas.width / 2,
        canvas.height / 2 + size.huge * 0.25,
        {
          fill: palette.ink,
          'font-family': FONT_DISPLAY,
          'font-size': size.huge * 0.72,
          'font-weight': 800,
          'text-anchor': 'middle',
          opacity: 0.16,
        },
      );
      return number + track + ticks + head + logo(context);
    }

    const vertical = canvas.isPortrait;
    const runway = (vertical ? stage.height : stage.width) * 0.8;
    const along =
      (vertical ? stage.y : stage.x) + ((vertical ? stage.height : stage.width) - runway) / 2;
    const across = vertical ? stage.x + stage.width / 2 : stage.y + stage.height / 2;

    const track = vertical
      ? line(across, along, across, along + runway, {
          stroke: palette.inkSoft,
          'stroke-width': stroke,
          opacity: 0.35,
        })
      : line(along, across, along + runway, across, {
          stroke: palette.inkSoft,
          'stroke-width': stroke,
          opacity: 0.35,
        });

    const ticks = Array.from({ length: count + 1 }, (_, i) => {
      const at = along + (runway * i) / count;
      const passed = i <= frame.beat - 1;
      const size2 = marker * (i % count === 0 ? 0.6 : 0.42);
      return vertical
        ? circle(across, at, size2, {
            fill: passed ? palette.accent : palette.inkSoft,
            opacity: passed ? 1 : 0.4,
          })
        : circle(at, across, size2, {
            fill: passed ? palette.accent : palette.inkSoft,
            opacity: passed ? 1 : 0.4,
          });
    }).join('');

    const at = along + runway * throughBar;
    const head = vertical
      ? circle(across, at, marker, { fill: palette.accent })
      : circle(at, across, marker, { fill: palette.accent });
    // A short trail behind the marker, so the direction of travel is
    // readable in a still frame.
    const tailFrom = along + runway * Math.max(0, throughBar - 0.08);
    const trail = path(
      vertical
        ? `M ${n(across)} ${n(tailFrom)} L ${n(across)} ${n(at)}`
        : `M ${n(tailFrom)} ${n(across)} L ${n(at)} ${n(across)}`,
      {
        stroke: palette.accent,
        'stroke-width': marker * 0.7,
        'stroke-linecap': 'round',
        opacity: 0.35,
      },
    );

    const number = text(
      String(frame.beat),
      vertical ? stage.x + stage.width * 0.5 : stage.x + stage.width * 0.5,
      vertical ? stage.y + stage.height * 0.06 : across - marker * 3.2,
      {
        fill: palette.ink,
        'font-family': FONT_DISPLAY,
        'font-size': size.readout,
        'font-weight': 800,
        'text-anchor': 'middle',
      },
    );

    return group({}, track + ticks + trail + head) + number + logo(context);
  },
};
