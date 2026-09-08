import { FermataType } from "./../../model/Fermata";
import { MusicFontGlyph } from "./MusicFontGlyph";
/**
 * @internal
 */
export declare class FermataGlyph extends MusicFontGlyph {
    constructor(x: number, y: number, fermata: FermataType);
    private static _getSymbol;
    doLayout(): void;
}
