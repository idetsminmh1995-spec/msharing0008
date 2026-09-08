import { type Note } from "./../../model/Note";
import type { ICanvas } from "./../../platform/ICanvas";
import { Glyph } from "./Glyph";
import type { BeatBounds } from "./../utils/BeatBounds";
/**
 * @internal
 */
export declare class NoteNumberGlyph extends Glyph {
    private _note;
    private _noteString;
    private _trillNoteString;
    private _trillNoteStringWidth;
    isEmpty: boolean;
    noteStringWidth: number;
    constructor(x: number, y: number, note: Note);
    private get _padding();
    getBoundingBoxTop(): number;
    getBoundingBoxBottom(): number;
    doLayout(): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
    paintTrill(x: number, cy: number, canvas: ICanvas): void;
    buildBoundingsLookup(beatBounds: BeatBounds, cx: number, cy: number): void;
}
