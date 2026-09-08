import type { Note } from "./../../model/Note";
import type { NoteXPosition, NoteYPosition } from "./../BarRendererBase";
import { BeatGlyphBase } from "./BeatGlyphBase";
import type { BeatBounds } from "./../utils/BeatBounds";
/**
 * @internal
 */
export declare abstract class BeatOnNoteGlyphBase extends BeatGlyphBase {
    onTimeX: number;
    middleX: number;
    stemX: number;
    abstract buildBoundingsLookup(_beatBounds: BeatBounds, _cx: number, _cy: number): void;
    abstract getNoteX(note: Note, requestedPosition: NoteXPosition): number;
    abstract getNoteY(note: Note, requestedPosition: NoteYPosition): number;
    abstract getRestY(requestedPosition: NoteYPosition): number;
    abstract getHighestNoteY(requestedPosition: NoteYPosition): number;
    abstract getLowestNoteY(requestedPosition: NoteYPosition): number;
}
