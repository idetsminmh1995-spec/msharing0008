import { NoteOrnament } from "./../../model/NoteOrnament";
import { MusicFontGlyph } from "./MusicFontGlyph";
/**
 * @internal
 */
export declare class NoteOrnamentGlyph extends MusicFontGlyph {
    constructor(ornament: NoteOrnament);
    private static _getSymbol;
    doLayout(): void;
}
