import { DynamicValue } from "./../../model/DynamicValue";
import { MusicFontGlyph } from "./MusicFontGlyph";
/**
 * @internal
 */
export declare class DynamicsGlyph extends MusicFontGlyph {
    constructor(x: number, y: number, dynamics: DynamicValue);
    doLayout(): void;
    private static _getSymbol;
}
