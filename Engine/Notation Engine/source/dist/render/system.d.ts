import type { BraceShape } from '../geometry/system.js';
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
export declare function renderBrace(shape: BraceShape, options: RenderBraceOptions): string;
