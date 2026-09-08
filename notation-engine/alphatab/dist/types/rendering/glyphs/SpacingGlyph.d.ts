import { Glyph } from "./Glyph";
/**
 * This simple glyph allows to put an empty region in to a BarRenderer.
 * @internal
 */
export declare class SpacingGlyph extends Glyph {
    constructor(x: number, y: number, width: number);
    getBoundingBoxTop(): number;
    getBoundingBoxBottom(): number;
}
