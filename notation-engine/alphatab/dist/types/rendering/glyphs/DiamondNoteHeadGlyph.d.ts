import { Duration } from "./../../model/Duration";
import { NoteHeadGlyphBase } from "./NoteHeadGlyph";
/**
 * @internal
 */
export declare class DiamondNoteHeadGlyph extends NoteHeadGlyphBase {
    constructor(x: number, y: number, duration: Duration, isGrace: boolean);
    private static _getSymbol;
}
