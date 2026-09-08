import type { BeatSubElement } from "./../../model/Beat";
import type { Note } from "./../../model/Note";
import type { BeatContainerGlyph } from "./BeatContainerGlyph";
import type { Glyph } from "./Glyph";
import { GlyphGroup } from "./GlyphGroup";
import type { ICanvas } from "./../../platform/ICanvas";
/**
 * @internal
 */
export declare class BeatGlyphBase extends GlyphGroup {
    private _effectGlyphs;
    private _normalGlyphs;
    container: BeatContainerGlyph;
    computedWidth: number;
    constructor();
    doLayout(): void;
    protected noteLoop(action: (note: Note) => void): void;
    addEffect(g: Glyph): void;
    addNormal(g: Glyph): void;
    protected get effectElement(): BeatSubElement | undefined;
    paint(cx: number, cy: number, canvas: ICanvas): void;
    private _paintNormal;
    private _paintEffects;
}
