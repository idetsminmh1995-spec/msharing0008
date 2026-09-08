import type { Font } from "./../../model/Font";
import { type ICanvas, TextAlign } from "./../../platform/ICanvas";
import { EffectGlyph } from "./EffectGlyph";
/**
 * @internal
 */
export declare class LyricsGlyph extends EffectGlyph {
    private _lines;
    private _linePositions;
    private _maxLineWidth;
    font: Font;
    textAlign: TextAlign;
    constructor(x: number, y: number, lines: string[], font: Font, textAlign?: TextAlign);
    doLayout(): void;
    getBoundingBoxLeft(): number;
    getBoundingBoxRight(): number;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
