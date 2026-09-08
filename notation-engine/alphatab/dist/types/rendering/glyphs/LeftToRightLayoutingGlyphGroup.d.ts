import type { Glyph } from "./Glyph";
import { GlyphGroup } from "./GlyphGroup";
/**
 * @internal
 */
export declare class LeftToRightLayoutingGlyphGroup extends GlyphGroup {
    gap: number;
    constructor();
    doLayout(): void;
    addGlyph(g: Glyph): void;
}
