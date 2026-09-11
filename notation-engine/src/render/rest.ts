import { getGlyph } from '../glyphs/glyph-table.js';
import { svgGlyphText } from './svg-primitives.js';

export interface RenderRestOptions {
  readonly x: number;
  /** Y-coordinate the rest sits at -- typically staffBottomY + restY(...) (this phase's geometry). */
  readonly y: number;
  readonly color: string;
  readonly fontFamily: string;
}

/** Draws one rest glyph (from restGlyphName or multiMeasureRestGlyphName) at the given position. */
export function renderRest(glyphName: string, options: RenderRestOptions): string {
  const glyph = getGlyph(glyphName);
  if (glyph === undefined) {
    throw new Error(`No glyph found for rest "${glyphName}"`);
  }
  return svgGlyphText(options.x, options.y, glyph.char, options.fontFamily, {
    fill: options.color,
  });
}
