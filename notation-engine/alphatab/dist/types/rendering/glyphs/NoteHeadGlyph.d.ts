import { Duration } from "./../../model/Duration";
import { MusicFontGlyph } from "./MusicFontGlyph";
import { MusicFontSymbol } from "./../../model/MusicFontSymbol";
import type { ICanvas } from "./../../platform/ICanvas";
/**
 * @internal
 */
export declare class NoteHeadGlyphBase extends MusicFontGlyph {
    centerOnStem: boolean;
    constructor(x: number, y: number, isGrace: boolean, symbol: MusicFontSymbol);
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
/**
 * @internal
 */
export declare class NoteHeadGlyph extends NoteHeadGlyphBase {
    constructor(x: number, y: number, duration: Duration, isGrace: boolean);
    static getSymbol(duration: Duration): MusicFontSymbol;
}
