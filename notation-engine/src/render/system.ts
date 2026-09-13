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

  const inner = svgGlyphText(0, 0, glyph.char, options.fontFamily, { fill: options.color });
  return `<g transform="translate(${shape.x} ${shape.topY}) scale(1 ${scaleY})">${inner}</g>`;
}
