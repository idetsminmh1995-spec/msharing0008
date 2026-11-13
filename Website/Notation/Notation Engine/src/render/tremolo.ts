import { getGlyph } from '../glyphs/glyph-table.js';
import type { TremoloPlacement } from '../geometry/tremolo.js';
import { svgGlyphText } from './svg-primitives.js';

export interface RenderTremoloOptions {
  /** The SMuFL font the `tremolo*` glyphs come from. */
  readonly fontFamily: string;
  readonly color: string;
}

/**
 * Draws a tremolo's strokes centred on a stem (§9.24).
 *
 * At the ordinary 4-staff-space em, NOT at text scale: `tremolo1`-`tremolo3`
 * are designed at music size, each stroke exactly one staff space apart,
 * so that three strokes read as three strokes and not as a smudge.
 *
 * A glyph the font does not carry draws nothing rather than throwing --
 * the same rule every other mark follows, and the parser has already
 * clamped the count to what the font has.
 */
export function renderTremolo(
  glyphName: string,
  placement: TremoloPlacement,
  options: RenderTremoloOptions,
): string {
  const glyph = getGlyph(glyphName);
  if (glyph === undefined) return '';
  return svgGlyphText(placement.x, placement.y, glyph.char, options.fontFamily, {
    fill: options.color,
  });
}
