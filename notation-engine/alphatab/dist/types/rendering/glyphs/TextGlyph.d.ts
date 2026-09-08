import type { Color } from "./../../model/Color";
import type { Font } from "./../../model/Font";
import { type ICanvas, TextAlign, type TextBaseline } from "./../../platform/ICanvas";
import { EffectGlyph } from "./EffectGlyph";
/**
 * @internal
 */
export declare class TextGlyph extends EffectGlyph {
    private _lines;
    private _lineHeights;
    font: Font;
    textAlign: TextAlign;
    textBaseline: TextBaseline | null;
    colorOverride?: Color;
    constructor(x: number, y: number, text: string, font: Font, textAlign?: TextAlign, testBaseline?: TextBaseline | null, color?: Color);
    doLayout(): void;
    getBoundingBoxLeft(): number;
    getBoundingBoxRight(): number;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
