import { PickStroke } from "./../../model/PickStroke";
import { MusicFontGlyph } from "./MusicFontGlyph";
/**
 * @internal
 */
export declare class PickStrokeGlyph extends MusicFontGlyph {
    constructor(x: number, y: number, pickStroke: PickStroke);
    doLayout(): void;
    private static _getSymbol;
}
