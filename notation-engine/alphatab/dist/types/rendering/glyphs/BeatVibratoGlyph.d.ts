import { MusicFontSymbol } from "./../../model/MusicFontSymbol";
import { VibratoGlyphBase } from "./NoteVibratoGlyph";
/**
 * @internal
 */
export declare class BeatVibratoGlyph extends VibratoGlyphBase {
    protected get slightVibratoGlyph(): MusicFontSymbol;
    protected get wideVibratoGlyph(): MusicFontSymbol;
}
