import type { BraceShape } from '../geometry/system.js';
import { getGlyph } from '../glyphs/glyph-table.js';
import { svgGlyphText } from './svg-primitives.js';

export interface RenderBraceOptions {
  readonly color: string;
  readonly fontFamily: string;
}

/**
 * Draws the real SMuFL `brace` glyph, vertically scaled (via an SVG
 * transform) to span exactly the height between the top and bottom
 * staves it connects -- Bravura's own brace glyph is drawn at a nominal
 * height, so a plain unscaled draw would only be correct for one
 * specific staff separation.
 */
export function renderBrace(shape: BraceShape, options: RenderBraceOptions): string {
  const glyph = getGlyph('brace');
  if (glyph === undefined) {
    throw new Error('No glyph found for "brace"');
  }
  const nominalHeight = glyph.bBox !== undefined ? glyph.bBox.bBoxNE[1] - glyph.bBox.bBoxSW[1] : 1;
  const targetHeight = shape.bottomY - shape.topY;
  const scaleY = nominalHeight !== 0 ? targetHeight / nominalHeight : 1;

  // Anchored at the BOTTOM, not the top. Bravura's brace sits entirely
  // ABOVE its own origin (bBoxSW y = 0, bBoxNE y = 3.988), so a glyph
  // drawn at `topY` runs UPWARD from there and the brace lands above the
  // system instead of beside it -- amplified by `scaleY`, which on a
  // grand staff put it a dozen staff spaces clear of the music, and in
  // page mode dropped each system's brace onto the PREVIOUS page. Found
  // by Phase 52, reading back an exported PDF of a real piano score.
  const inner = svgGlyphText(0, 0, glyph.char, options.fontFamily, { fill: options.color });
  return `<g transform="translate(${shape.x} ${shape.bottomY}) scale(1 ${scaleY})">${inner}</g>`;
}
