import type { TupletBracketShape } from '../geometry/tuplet.js';
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
export declare function renderTupletBracket(shape: TupletBracketShape, options: RenderTupletBracketOptions): string;
export interface RenderTupletNumberOptions {
    readonly color: string;
    readonly fontFamily: string;
}
/** Draws the tuplet's digit glyph (from geometry's tupletDigitGlyphName) centered at the given position. */
export declare function renderTupletNumber(glyphName: string, x: number, y: number, options: RenderTupletNumberOptions): string;
