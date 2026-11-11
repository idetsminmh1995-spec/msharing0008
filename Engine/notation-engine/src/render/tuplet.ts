import type { TupletBracketShape } from '../geometry/tuplet.js';
import { getGlyph } from '../glyphs/glyph-table.js';
import { svgLine, svgGlyphText } from './svg-primitives.js';

export interface RenderTupletBracketOptions {
  readonly thickness: number;
  readonly color: string;
}

/**
 * Draws the bracket as a horizontal line with a short perpendicular hook
 * at each end pointing back toward the notes (down from an "above"
 * bracket, up from a "below" one) -- the visual shape a beam's own line
 * replaces when §9.17's tupletBracketNeeded() says a bracket is
 * redundant.
 */
export function renderTupletBracket(
  shape: TupletBracketShape,
  options: RenderTupletBracketOptions,
): string {
  const towardNotes = shape.side === 'above' ? 1 : -1;
  const hookEndY = shape.y + towardNotes * shape.hookLength;
  const attrs = { stroke: options.color, 'stroke-width': options.thickness };
  return [
    svgLine(shape.startX, shape.y, shape.endX, shape.y, attrs),
    svgLine(shape.startX, shape.y, shape.startX, hookEndY, attrs),
    svgLine(shape.endX, shape.y, shape.endX, hookEndY, attrs),
  ].join('\n');
}

export interface RenderTupletNumberOptions {
  readonly color: string;
  readonly fontFamily: string;
}

/** Draws the tuplet's digit glyph (from geometry's tupletDigitGlyphName) centered at the given position. */
export function renderTupletNumber(
  glyphName: string,
  x: number,
  y: number,
  options: RenderTupletNumberOptions,
): string {
  const glyph = getGlyph(glyphName);
  if (glyph === undefined) {
    throw new Error(`No glyph found for tuplet number "${glyphName}"`);
  }
  return svgGlyphText(x, y, glyph.char, options.fontFamily, { fill: options.color });
}
