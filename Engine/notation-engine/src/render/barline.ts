import type { BarlineGeometry } from '../geometry/barline.js';
import { getGlyph } from '../glyphs/glyph-table.js';
import { svgGlyphText, svgGroup, svgLine, svgText } from './svg-primitives.js';

export interface RenderBarlineOptions {
  /** X position of the barline's left edge. */
  readonly x: number;
  /** Y-coordinate of the staff's bottom line. */
  readonly staffBottomY: number;
  /** How tall the barline spans -- typically the staff's height (Phase 9's StaffGeometry.height), but can extend further for a multi-staff system in a later phase. */
  readonly height: number;
  readonly color: string;
  readonly fontFamily: string;
}

const REPEAT_DOT_UPPER_Y = -1.5; // 2nd space from the bottom
const REPEAT_DOT_LOWER_Y = -2.5; // 3rd space from the bottom

/** Draws every stroke (lines, dashed lines, repeat-dot pairs) in a BarlineGeometry. */
export function renderBarline(geometry: BarlineGeometry, options: RenderBarlineOptions): string {
  const { x, staffBottomY, height, color, fontFamily } = options;
  const parts: string[] = [];

  for (const stroke of geometry.strokes) {
    if (stroke.kind === 'line') {
      parts.push(
        svgLine(x + stroke.x, staffBottomY, x + stroke.x, staffBottomY - height, {
          stroke: color,
          'stroke-width': stroke.thickness,
        }),
      );
    } else if (stroke.kind === 'dashedLine') {
      parts.push(
        svgLine(x + stroke.x, staffBottomY, x + stroke.x, staffBottomY - height, {
          stroke: color,
          'stroke-width': stroke.thickness,
          'stroke-dasharray': `${stroke.dashLength},${stroke.gapLength}`,
        }),
      );
    } else {
      const glyph = getGlyph('repeatDot');
      if (glyph === undefined) {
        throw new Error('No glyph found for repeatDot');
      }
      parts.push(
        svgGlyphText(x + stroke.x, staffBottomY + REPEAT_DOT_UPPER_Y, glyph.char, fontFamily, {
          fill: color,
        }),
      );
      parts.push(
        svgGlyphText(x + stroke.x, staffBottomY + REPEAT_DOT_LOWER_Y, glyph.char, fontFamily, {
          fill: color,
        }),
      );
    }
  }

  return svgGroup(parts);
}

export interface RenderBarNumberOptions {
  readonly x: number;
  /** Y-coordinate of the staff's bottom line. */
  readonly staffBottomY: number;
  /** How far ABOVE the top line the number sits, in staff-space units (added on top of the staff's own height). */
  readonly offsetAboveStaff: number;
  readonly staffHeight: number;
  readonly color: string;
  readonly fontFamily: string;
  readonly fontSize: number;
}

/** Draws a measure number as plain text (not a SMuFL glyph -- ordinary digits, any text font) above the staff. */
export function renderBarNumber(measureNumber: number, options: RenderBarNumberOptions): string {
  const y = options.staffBottomY - options.staffHeight - options.offsetAboveStaff;
  return svgText(options.x, y, String(measureNumber), {
    fill: options.color,
    'font-family': options.fontFamily,
    'font-size': options.fontSize,
  });
}
