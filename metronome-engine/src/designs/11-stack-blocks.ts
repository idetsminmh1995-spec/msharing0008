/**
 * Design 11 — Stack Blocks.
 *
 * A block added on every beat, the stack knocked down at the bar line.
 * The only design that accumulates: where the meter fills a fixed
 * number of slots, this one BUILDS, so a bar of 7 looks visibly
 * different from a bar of 3 rather than just differently divided.
 */

import { bands, centreOf, FONT_DISPLAY, FONT_TEXT, logo, typeScale } from '../layout.js';
import { easeOut, group, lerp, rect, text } from '../svg.js';
import type { Design, DesignContext } from '../types.js';

export const stackBlocks: Design = {
  id: 'stack-blocks',
  name: 'Stack Blocks',
  description: 'A block laid on every beat, the stack cleared at the bar line.',
  look: 'Slate & violet',
  draw(context: DesignContext): string {
    const { canvas, palette, frame } = context;
    const { stage } = bands(canvas);
    const [cx, cy] = centreOf(stage);
    const size = typeScale(canvas);
    const count = Math.max(1, frame.beatsPerBar);
    const land = easeOut(Math.min(1, frame.phase * 3));

    // Landscape builds sideways (there is width to spare), portrait and
    // square build upwards, which is what "stack" means to the eye.
    const upward = !canvas.isPortrait ? canvas.isSquare : true;
    const span = upward ? Math.min(stage.height * 0.8, canvas.short * 0.9) : stage.width * 0.8;
    const slot = span / count;
    const blockLong = slot * 0.82;
    const blockShort = Math.min(canvas.short * 0.3, slot * 2.6);

    const blocks: string[] = [];
    for (let i = 0; i < count; i++) {
      const placed = i < frame.beat - 1;
      const current = i === frame.beat - 1;
      if (!placed && !current) continue;
      // The newest block drops in rather than appearing.
      const drop = current ? lerp(slot * 0.9, 0, land) : 0;
      const fade = current ? lerp(0.4, 1, land) : 0.75;
      if (upward) {
        const bottom = cy + span / 2;
        const y = bottom - slot * (i + 1) - drop;
        blocks.push(
          rect(cx - blockShort / 2, y + (slot - blockLong) / 2, blockShort, blockLong, {
            fill: current ? palette.accent : palette.ink,
            opacity: fade,
            rx: canvas.short * 0.012,
          }),
        );
      } else {
        const left = cx - span / 2;
        const x = left + slot * i + drop;
        blocks.push(
          rect(x + (slot - blockLong) / 2, cy - blockShort / 2, blockLong, blockShort, {
            fill: current ? palette.accent : palette.ink,
            opacity: fade,
            rx: canvas.short * 0.012,
          }),
        );
      }
    }

    // The empty slots, so the size of the bar is visible from beat one.
    const ghosts: string[] = [];
    for (let i = 0; i < count; i++) {
      if (i <= frame.beat - 1) continue;
      if (upward) {
        const bottom = cy + span / 2;
        const y = bottom - slot * (i + 1);
        ghosts.push(
          rect(cx - blockShort / 2, y + (slot - blockLong) / 2, blockShort, blockLong, {
            fill: 'none',
            stroke: palette.inkSoft,
            'stroke-width': canvas.short * 0.0025,
            opacity: 0.25,
            rx: canvas.short * 0.012,
          }),
        );
      } else {
        const left = cx - span / 2;
        const x = left + slot * i;
        ghosts.push(
          rect(x + (slot - blockLong) / 2, cy - blockShort / 2, blockLong, blockShort, {
            fill: 'none',
            stroke: palette.inkSoft,
            'stroke-width': canvas.short * 0.0025,
            opacity: 0.25,
            rx: canvas.short * 0.012,
          }),
        );
      }
    }

    const label = text(`BAR ${frame.bar}`, cx, stage.y + size.label * 1.5, {
      fill: palette.inkSoft,
      'font-family': FONT_TEXT,
      'font-size': size.label,
      'font-weight': 700,
      'letter-spacing': size.label * 0.16,
      'text-anchor': 'middle',
    });
    const number = text(
      String(frame.beat),
      upward ? cx + blockShort * 0.78 : cx,
      upward ? cy + size.readout * 0.35 : cy - blockShort * 0.72,
      {
        fill: palette.accent,
        'font-family': FONT_DISPLAY,
        'font-size': size.readout,
        'font-weight': 800,
        'text-anchor': 'middle',
      },
    );

    return label + group({}, ghosts.join('')) + group({}, blocks.join('')) + number + logo(context);
  },
};
