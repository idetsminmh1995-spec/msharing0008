import { getGlyph } from '../glyphs/glyph-table.js';
import { svgGlyphText, svgRect } from './svg-primitives.js';

export interface RenderTabNumberOptions {
  readonly x: number;
  /** The Y of the string's own line -- the digits sit centred ON it. */
  readonly y: number;
  readonly color: string;
  /**
   * Page colour, painted as a small rectangle behind the digits so the
   * staff line does not run through them. Real engraving BREAKS the line
   * instead; masking achieves the same visual result without the
   * renderer having to know every number's position before it draws the
   * staff, which the current per-measure draw order doesn't allow.
   */
  readonly backgroundColor: string;
  readonly fontFamily: string;
}

/** A digit's own drawn width, from the real font metrics -- the same bBox-derived measure the rest of the renderer uses for glyph widths. */
function digitWidth(glyphName: string): number {
  const bbox = getGlyph(glyphName)?.bBox;
  return bbox !== undefined ? bbox.bBoxNE[0] - bbox.bBoxSW[0] : 0;
}

/** Vertical half-height of the mask, in staff spaces -- enough to clear the digits without eating the neighbouring lines. */
const MASK_HALF_HEIGHT = 0.42;
/** Horizontal padding either side of the digits, so the line stops slightly clear of the glyphs. */
const MASK_PADDING = 0.12;

/**
 * Draws a fret number on its string's line: a background-coloured mask
 * to interrupt the line, then the digit glyphs centred over it. Digit
 * advance widths come from the real font metrics, so a two-digit fret
 * (e.g. 12) is spaced and centred correctly rather than overprinted.
 */
export function renderTabNumber(
  glyphNames: readonly string[],
  options: RenderTabNumberOptions,
): string {
  const widths = glyphNames.map(digitWidth);
  const totalWidth = widths.reduce((sum, w) => sum + w, 0);

  const parts: string[] = [
    svgRect(
      options.x - totalWidth / 2 - MASK_PADDING,
      options.y - MASK_HALF_HEIGHT,
      totalWidth + MASK_PADDING * 2,
      MASK_HALF_HEIGHT * 2,
      { fill: options.backgroundColor },
    ),
  ];

  let cursorX = options.x - totalWidth / 2;
  glyphNames.forEach((name, i) => {
    const glyph = getGlyph(name);
    if (glyph === undefined) {
      throw new Error(`No glyph found for tab digit "${name}"`);
    }
    parts.push(
      svgGlyphText(cursorX, options.y, glyph.char, options.fontFamily, { fill: options.color }),
    );
    cursorX += widths[i] ?? 0;
  });

  return parts.join('\n');
}
