import { AccidentalType } from "./../../model/AccidentalType";
import { MusicFontGlyph } from "./MusicFontGlyph";
import { MusicFontSymbol } from "./../../model/MusicFontSymbol";
/**
 * @internal
 */
export declare class AccidentalGlyph extends MusicFontGlyph {
    constructor(x: number, y: number, accidentalType: AccidentalType, scale: number);
    static getMusicSymbol(accidentalType: AccidentalType): MusicFontSymbol;
}
