import {
  charAdvance,
  denominatorText,
  glyphForTimeSigChar,
  numeratorText,
  textWidth,
  type TimeSignature,
} from '../geometry/time-signature.js';
import { getGlyph } from '../glyphs/glyph-table.js';
import { svgGlyphText } from './svg-primitives.js';

/** Draws a display string's characters left to right, each immediately after the previous one's real width, starting at `x`. Returns the markup only -- see textWidth() to know how much horizontal space it used. */
function renderDigitString(
  text: string,
  x: number,
  y: number,
  fontFamily: string,
  color: string,
): string {
  const parts: string[] = [];
  let cursor = x;
  for (const ch of text) {
    const glyph = glyphForTimeSigChar(ch);
    parts.push(svgGlyphText(cursor, y, glyph.char, fontFamily, { fill: color }));
    cursor += charAdvance(ch);
  }
  return parts.join('\n');
}

export interface RenderTimeSignatureOptions {
  /** X position the (wider of the two, horizontally centered) numerator/denominator block starts at. */
  readonly x: number;
  /** Y-coordinate of the staff's bottom line (Phase 9/10 convention). */
  readonly staffBottomY: number;
  readonly color: string;
  readonly fontFamily: string;
}

/**
 * Draws a time signature: for a plain numeric signature, the numerator
 * centered on the upper half of the staff (y=-3, i.e. spanning the
 * middle line to the top line) and the denominator centered on the lower
 * half (y=-1, bottom line to middle line), with the narrower of the two
 * strings horizontally centered under/over the wider one. For a
 * 'common'/'cut' symbol, draws the single glyph vertically centered on
 * the whole staff (y=-2, the middle line) instead.
 */
export function renderTimeSignature(
  sig: TimeSignature,
  options: RenderTimeSignatureOptions,
): string {
  const { x, staffBottomY, color, fontFamily } = options;

  if (sig.symbol === 'common' || sig.symbol === 'cut') {
    const glyphName = sig.symbol === 'common' ? 'timeSigCommon' : 'timeSigCutCommon';
    const glyph = getGlyph(glyphName);
    if (glyph === undefined) {
      throw new Error(
        `No glyph found for time signature symbol "${sig.symbol}" (glyph name "${glyphName}")`,
      );
    }
    return svgGlyphText(x, staffBottomY - 2, glyph.char, fontFamily, { fill: color });
  }

  const numText = numeratorText(sig);
  const denText = denominatorText(sig);
  const numWidth = textWidth(numText);
  const denWidth = textWidth(denText);
  const blockWidth = Math.max(numWidth, denWidth);

  const numX = x + (blockWidth - numWidth) / 2;
  const denX = x + (blockWidth - denWidth) / 2;

  const numerator = renderDigitString(numText, numX, staffBottomY - 3, fontFamily, color);
  const denominator = renderDigitString(denText, denX, staffBottomY - 1, fontFamily, color);
  return `${numerator}\n${denominator}`;
}
