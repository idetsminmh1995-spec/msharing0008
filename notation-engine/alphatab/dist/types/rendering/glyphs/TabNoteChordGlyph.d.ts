import { type Beat } from "./../../model/Beat";
import type { Note } from "./../../model/Note";
import { type ICanvas } from "./../../platform/ICanvas";
import { NoteXPosition, NoteYPosition } from "./../BarRendererBase";
import { Glyph } from "./Glyph";
import type { NoteNumberGlyph } from "./NoteNumberGlyph";
import type { BeatBounds } from "./../utils/BeatBounds";
/**
 * @internal
 */
export declare class TabNoteChordGlyph extends Glyph {
    private _notes;
    private _deadSlapped;
    private _isGrace;
    beat: Beat;
    maxStringNote: Note | null;
    minStringNote: Note | null;
    beatEffects: Map<string, Glyph>;
    notesPerString: Map<number, NoteNumberGlyph>;
    noteStringWidth: number;
    constructor(x: number, y: number, isGrace: boolean);
    buildBoundingsLookup(beatBounds: BeatBounds, cx: number, cy: number): void;
    getNoteX(note: Note, requestedPosition: NoteXPosition): number;
    getLowestNoteY(requestedPosition: NoteYPosition): number;
    getHighestNoteY(requestedPosition: NoteYPosition): number;
    getNoteY(note: Note, requestedPosition: NoteYPosition): number;
    calculateTremoloHeightForStem(): number;
    doLayout(): void;
    addNoteGlyph(noteGlyph: NoteNumberGlyph, note: Note): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
