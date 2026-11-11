import { getGlyph } from '../glyphs/glyph-table.js';
import { augmentationDotGlyphName, type DotPlacement } from '../geometry/augmentation-dot.js';
import { svgGlyphText } from './svg-primitives.js';

export interface RenderDotsOptions {
  /** The staff's bottom line, which a `DotPlacement.position` is measured from. */
  readonly staffBottomY: number;
  readonly color: string;
  readonly fontFamily: string;
}

/** Draws one note's (or chord's, or rest's) augmentation dots. */
export function renderAugmentationDots(
  placements: readonly DotPlacement[],
  options: RenderDotsOptions,
): string {
  if (placements.length === 0) return '';
  const glyph = getGlyph(augmentationDotGlyphName());
  if (glyph === undefined) {
    throw new Error('No glyph found for the augmentation dot.');
  }
  return placements
    .map((p) =>
      svgGlyphText(p.x, options.staffBottomY + p.position, glyph.char, options.fontFamily, {
        fill: options.color,
      }),
    )
    .join('\n');
}
