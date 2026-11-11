import { getGlyph } from '../glyphs/glyph-table.js';
import { svgGlyphText } from './svg-primitives.js';

export interface RenderMarkOptions {
  readonly x: number;
  readonly y: number;
  readonly color: string;
  readonly fontFamily: string;
}

/** Draws any single glyph-based mark (an articulation or ornament) at the given position -- both are just "one glyph near a note," differing only in which geometry function chose the glyph name and position. */
export function renderMark(glyphName: string, options: RenderMarkOptions): string {
  const glyph = getGlyph(glyphName);
  if (glyph === undefined) {
    throw new Error(`No glyph found for mark "${glyphName}"`);
  }
  return svgGlyphText(options.x, options.y, glyph.char, options.fontFamily, {
    fill: options.color,
  });
}
