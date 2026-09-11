import { getGlyph } from '../glyphs/glyph-table.js';
import { svgGlyphText } from './svg-primitives.js';

export interface RenderAccidentalOptions {
  readonly x: number;
  readonly y: number;
  readonly color: string;
  readonly fontFamily: string;
}

/** Draws one accidental glyph (from geometry's accidentalGlyphName) at the given position. */
export function renderAccidental(glyphName: string, options: RenderAccidentalOptions): string {
  const glyph = getGlyph(glyphName);
  if (glyph === undefined) {
    throw new Error(`No glyph found for accidental "${glyphName}"`);
  }
  return svgGlyphText(options.x, options.y, glyph.char, options.fontFamily, {
    fill: options.color,
  });
}
