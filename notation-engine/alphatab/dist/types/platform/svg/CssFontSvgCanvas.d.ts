import { MusicFontSymbol } from "./../../model/MusicFontSymbol";
import { SvgCanvas } from "./SvgCanvas";
/**
 * This SVG canvas renders the music symbols by adding a CSS class 'at' to all elements.
 * @internal
 */
export declare class CssFontSvgCanvas extends SvgCanvas {
    fillMusicFontSymbol(x: number, y: number, relativeScale: number, symbol: MusicFontSymbol, centerAtPosition?: boolean): void;
    fillMusicFontSymbols(x: number, y: number, relativeScale: number, symbols: MusicFontSymbol[], centerAtPosition?: boolean): void;
    private _fillMusicFontSymbolText;
}
