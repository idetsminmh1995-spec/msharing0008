import { Color } from "./../../model/Color";
import { Font } from "./../../model/Font";
import { MusicFontSymbol } from "./../../model/MusicFontSymbol";
import { type ICanvas, TextAlign, TextBaseline, MeasuredText } from "./../ICanvas";
import type { Settings } from "./../../Settings";
import type * as alphaSkia from '@coderline/alphaskia';
/**
 * Describes the members of the alphaSkia module.
 * @target web
 * @internal
 */
export interface AlphaSkiaModule {
    AlphaSkiaCanvas: typeof alphaSkia.AlphaSkiaCanvas;
    AlphaSkiaImage: typeof alphaSkia.AlphaSkiaImage;
    AlphaSkiaTextAlign: typeof alphaSkia.AlphaSkiaTextAlign;
    AlphaSkiaTextBaseline: typeof alphaSkia.AlphaSkiaTextBaseline;
    AlphaSkiaTypeface: typeof alphaSkia.AlphaSkiaTypeface;
    AlphaSkiaTextStyle: typeof alphaSkia.AlphaSkiaTextStyle;
    AlphaSkiaTextMetrics: typeof alphaSkia.AlphaSkiaTextMetrics;
}
/**
 * A canvas implementation using alphaSkia as rendering backend
 * @partial
 * @internal
 */
export declare class SkiaCanvas implements ICanvas {
    /**
     * @target web
     * @delegated csharp
     * @delegated kotlin
     */
    private static _alphaSkia;
    private static _defaultMusicTextStyle;
    /**
     * @target web
     * @partial
     */
    static enable(musicFontData: ArrayBuffer, alphaSkia: unknown): void;
    static initializeMusicFont(musicFont: alphaSkia.AlphaSkiaTypeface): void;
    static registerFont(fontData: Uint8Array, fontInfo?: Font | undefined): Font;
    private _canvas;
    private _color;
    private _lineWidth;
    private _textStyle;
    private _scale;
    private _textStyles;
    private _font;
    private _musicTextStyle;
    settings: Settings;
    get font(): Font;
    set font(value: Font);
    private _textStyleKey;
    constructor();
    destroy(): void;
    onRenderFinished(): unknown;
    beginRender(width: number, height: number): void;
    endRender(): unknown;
    get color(): Color;
    set color(value: Color);
    get lineWidth(): number;
    set lineWidth(value: number);
    fillRect(x: number, y: number, w: number, h: number): void;
    strokeRect(x: number, y: number, w: number, h: number): void;
    beginPath(): void;
    closePath(): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
    bezierCurveTo(cp1X: number, cp1Y: number, cp2X: number, cp2Y: number, x: number, y: number): void;
    fillCircle(x: number, y: number, radius: number): void;
    strokeCircle(x: number, y: number, radius: number): void;
    fill(): void;
    stroke(): void;
    textAlign: TextAlign;
    textBaseline: TextBaseline;
    beginGroup(_identifier: string): void;
    endGroup(): void;
    fillText(text: string, x: number, y: number): void;
    measureText(text: string): MeasuredText;
    private _getTextWidthAndHeight;
    fillMusicFontSymbol(x: number, y: number, relativeScale: number, symbol: MusicFontSymbol, centerAtPosition?: boolean): void;
    fillMusicFontSymbols(x: number, y: number, relativeScale: number, symbols: MusicFontSymbol[], centerAtPosition?: boolean): void;
    private _fillMusicFontSymbolText;
    beginRotate(centerX: number, centerY: number, angle: number): void;
    endRotate(): void;
}
