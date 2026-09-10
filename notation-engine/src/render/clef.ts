import type { ClefDefinition } from '../geometry/clef.js';
import { getGlyph } from '../glyphs/glyph-table.js';
import { svgGlyphText } from './svg-primitives.js';

export interface RenderClefOptions {
  readonly x: number;
  /**
   * Y-coordinate of the staff's BOTTOM line -- matches Phase 9's
   * renderStaff `y` option exactly. Every clef glyph (G, F, C,
   * percussion...) is anchored here regardless of which line it
   * "belongs" to: Bravura's clef glyphs are each pre-designed (per the
   * SMuFL spec's scoring-application metrics) relative to a nominal
   * 5-line staff with its bottom line at the font's own baseline (y=0 in
   * font design space) -- so anchoring every clef's SVG text baseline at
   * the staff's bottom line is what correctly positions each clef's
   * curl/dots at the right height, with no per-clef Y adjustment needed
   * here. (staffPositionForPitch's referenceY, in geometry/clef.ts, is a
   * separate concern -- that's for computing NOTE positions, not for
   * placing the clef glyph itself.)
   */
  readonly y: number;
  readonly color: string;
  readonly fontFamily: string;
}

/** Draws a clef's glyph at the staff's bottom line. Throws if the clef's glyphName isn't a real SMuFL glyph (should never happen for the built-in clef constants -- only relevant if a caller defines a custom ClefDefinition with a typo). */
export function renderClef(clefDef: ClefDefinition, options: RenderClefOptions): string {
  const glyph = getGlyph(clefDef.glyphName);
  if (glyph === undefined) {
    throw new Error(
      `No glyph found for clef "${clefDef.name}" (glyph name "${clefDef.glyphName}")`,
    );
  }
  return svgGlyphText(options.x, options.y, glyph.char, options.fontFamily, {
    fill: options.color,
  });
}
