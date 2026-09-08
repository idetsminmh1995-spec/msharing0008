import { TextAlign } from "./../../platform/ICanvas";
import { GlyphGroup } from "./GlyphGroup";
import type { Glyph } from "./Glyph";
/**
 * @internal
 */
export declare class RowGlyphContainer extends GlyphGroup {
    private _glyphWidth;
    private _align;
    constructor(x: number, y: number, align?: TextAlign);
    doLayout(): void;
    addGlyphToRow(glyph: Glyph): void;
}
