import { VibratoType } from "./../../model/VibratoType";
import type { ICanvas } from "./../../platform/ICanvas";
import { GroupedEffectGlyph } from "./GroupedEffectGlyph";
import { MusicFontSymbol } from "./../../model/MusicFontSymbol";
/**
 * @internal
 */
export declare abstract class VibratoGlyphBase extends GroupedEffectGlyph {
    private _type;
    private _symbol;
    private _repeatOffsetX;
    private _symbolOffsetY;
    private _partialWaves;
    constructor(x: number, y: number, type: VibratoType, partialWaves?: boolean);
    protected abstract get slightVibratoGlyph(): MusicFontSymbol;
    protected abstract get wideVibratoGlyph(): MusicFontSymbol;
    doLayout(): void;
    protected paintGrouped(cx: number, cy: number, endX: number, canvas: ICanvas): void;
}
/**
 * @internal
 */
export declare class NoteVibratoGlyph extends VibratoGlyphBase {
    protected get slightVibratoGlyph(): MusicFontSymbol;
    protected get wideVibratoGlyph(): MusicFontSymbol;
}
