import { MusicFontSymbol } from "./../../model/MusicFontSymbol";
import { Glyph } from "./Glyph";
import { type ICanvas, TextBaseline } from "./../../platform/ICanvas";
/**
 * @internal
 */
export declare class NumberGlyph extends Glyph {
    private _scale;
    private _baseline;
    private _symbols;
    constructor(x: number, y: number, num: number, baseline: TextBaseline, scale?: number);
    static getSymbols(number: number): MusicFontSymbol[];
    static getSymbol(digit: number): MusicFontSymbol;
    doLayout(): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
