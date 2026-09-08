import { WahPedal } from "./../../model/WahPedal";
import { MusicFontGlyph } from "./MusicFontGlyph";
import type { ICanvas } from "./../../platform/ICanvas";
/**
 * @internal
 */
export declare class WahPedalGlyph extends MusicFontGlyph {
    constructor(wahPedal: WahPedal);
    private static _getSymbol;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
