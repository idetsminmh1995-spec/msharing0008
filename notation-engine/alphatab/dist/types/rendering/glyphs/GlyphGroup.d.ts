import type { ICanvas } from "./../../platform/ICanvas";
import { Glyph } from "./Glyph";
/**
 * This glyph allows to group several other glyphs to be
 * drawn at the same x position
 * @internal
 */
export declare class GlyphGroup extends Glyph {
    glyphs: Glyph[] | null;
    get isEmpty(): boolean;
    getBoundingBoxTop(): number;
    getBoundingBoxBottom(): number;
    doLayout(): void;
    addGlyph(g: Glyph): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
