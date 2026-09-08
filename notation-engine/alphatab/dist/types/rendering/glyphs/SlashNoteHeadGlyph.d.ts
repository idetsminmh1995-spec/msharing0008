import { type Beat, BeatSubElement } from "./../../model/Beat";
import { Duration } from "./../../model/Duration";
import { MusicFontSymbol } from "./../../model/MusicFontSymbol";
import { NoteSubElement } from "./../../model/Note";
import type { ICanvas } from "./../../platform/ICanvas";
import type { Glyph } from "./Glyph";
import { NoteHeadGlyphBase } from "./NoteHeadGlyph";
/**
 * @internal
 */
export declare class SlashNoteHeadGlyph extends NoteHeadGlyphBase {
    beatEffects: Map<string, Glyph>;
    noteHeadElement: NoteSubElement;
    effectElement: BeatSubElement;
    stemX: number;
    constructor(x: number, y: number, beat: Beat);
    paint(cx: number, cy: number, canvas: ICanvas): void;
    private _paintEffects;
    doLayout(): void;
    static getSymbol(duration: Duration): MusicFontSymbol;
}
