import { getGlyph } from '../glyphs/glyph-table.js';
import { hasBackground, svgGlyphText, svgRect } from './svg-primitives.js';

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
  /**
   * What the mask behind the digits is painted in -- the page's own
   * background, so the string line appears to break for them.
   *
   * `'none'`/`'transparent'` draws NO mask, and the string line then
   * runs straight through the digits. That is the honest outcome of a
   * transparent render: the engine cannot paint over a line in a colour
   * it does not know. `renderFromMusicXml` reports
   * `TAB_MASK_ON_TRANSPARENT_BACKGROUND` when it happens rather than
   * leaving the reader to notice.
   */
  readonly backgroundColor: string;
  readonly fontFamily: string;
}

interface TabGlyphMetrics {
  readonly advanceWidth: number;
  readonly inkLeft: number;
  readonly inkRight: number;
}

/** Both font advance and ink bounds are required; one must not be inferred from the other. */
function tabGlyphMetrics(glyphName: string): TabGlyphMetrics {
  const glyph = getGlyph(glyphName);
  if (glyph === undefined) throw new Error(`No glyph found for tab digit "${glyphName}"`);
  if (glyph.advanceWidth === undefined || glyph.bBox === undefined) {
    throw new Error(`Incomplete Bravura metrics for tab digit "${glyphName}"`);
  }
  return {
    advanceWidth: glyph.advanceWidth,
    inkLeft: glyph.bBox.bBoxSW[0],
    inkRight: glyph.bBox.bBoxNE[0],
  };
}

/** Vertical half-height of the mask, in staff spaces -- enough to clear the digits without eating the neighbouring lines. */
const MASK_HALF_HEIGHT = 0.42;
/** Horizontal padding either side of the digits, so the line stops slightly clear of the glyphs. */
const MASK_PADDING = 0.12;

/**
 * Draws a fret number on its string's line: a background-coloured mask
 * to interrupt the line, then the digit glyphs centred over it. Glyph origins
 * advance by Bravura's actual hmtx-derived advance widths; centring and the
 * mask use the combined ink bounds, which are a different metric.
 */
export function renderTabNumber(
  glyphNames: readonly string[],
  options: RenderTabNumberOptions,
): string {
  if (glyphNames.length === 0) return '';
  const metrics = glyphNames.map(tabGlyphMetrics);
  let pen = 0;
  let inkLeft = Number.POSITIVE_INFINITY;
  let inkRight = Number.NEGATIVE_INFINITY;
  for (const metric of metrics) {
    inkLeft = Math.min(inkLeft, pen + metric.inkLeft);
    inkRight = Math.max(inkRight, pen + metric.inkRight);
    pen += metric.advanceWidth;
  }
  const inkWidth = inkRight - inkLeft;
  const originX = options.x - (inkLeft + inkRight) / 2;

  const parts: string[] = hasBackground(options.backgroundColor)
    ? [
        svgRect(
          originX + inkLeft - MASK_PADDING,
          options.y - MASK_HALF_HEIGHT,
          inkWidth + MASK_PADDING * 2,
          MASK_HALF_HEIGHT * 2,
          { fill: options.backgroundColor },
        ),
      ]
    : [];

  let cursorX = originX;
  glyphNames.forEach((name, i) => {
    const glyph = getGlyph(name);
    if (glyph === undefined) {
      throw new Error(`No glyph found for tab digit "${name}"`);
    }
    parts.push(
      svgGlyphText(cursorX, options.y, glyph.char, options.fontFamily, { fill: options.color }),
    );
    cursorX += metrics[i]?.advanceWidth ?? 0;
  });

  return parts.join('\n');
}
