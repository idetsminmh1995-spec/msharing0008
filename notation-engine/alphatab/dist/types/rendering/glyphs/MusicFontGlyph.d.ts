import type { Color } from "./../../model/Color";
import type { MusicFontSymbol } from "./../../model/MusicFontSymbol";
import type { ICanvas } from "./../../platform/ICanvas";
import { EffectGlyph } from "./EffectGlyph";
/**
 * @internal
 */
export declare class MusicFontGlyph extends EffectGlyph {
    glyphScale: number;
    symbol: MusicFontSymbol;
    center: boolean;
    colorOverride?: Color;
    offsetX: number;
    offsetY: number;
    constructor(x: number, y: number, glyphScale: number, symbol: MusicFontSymbol);
    getBoundingBoxLeft(): number;
    getBoundingBoxRight(): number;
    getBoundingBoxTop(): number;
    doLayout(): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
/**
 * @internal
 */
export declare class MusicFontTextGlyph extends EffectGlyph {
    protected glyphScale: number;
    symbols: MusicFontSymbol[];
    center: boolean;
    colorOverride?: Color;
    offsetX: number;
    offsetY: number;
    constructor(x: number, y: number, glyphScale: number, symbols: MusicFontSymbol[]);
    getBoundingBoxTop(): number;
    doLayout(): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
