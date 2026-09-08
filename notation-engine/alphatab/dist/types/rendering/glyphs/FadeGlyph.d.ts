import { FadeType } from "./../../model/FadeType";
import { MusicFontGlyph } from "./MusicFontGlyph";
import type { ICanvas } from "./../../platform/ICanvas";
/**
 * @internal
 */
export declare class FadeGlyph extends MusicFontGlyph {
    constructor(type: FadeType);
    private static _getSymbol;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
