import { AccidentalType } from "./../../model/AccidentalType";
import { BeatSubElement } from "./../../model/Beat";
import { type Note } from "./../../model/Note";
import { NoteXPosition, NoteYPosition } from "./../BarRendererBase";
import { BeatGlyphBase } from "./BeatGlyphBase";
import { BeatOnNoteGlyphBase } from "./BeatOnNoteGlyphBase";
import { DeadSlappedBeatGlyph } from "./DeadSlappedBeatGlyph";
import { NumberedNoteHeadGlyph } from "./NumberedNoteHeadGlyph";
import type { BeatBounds } from "./../utils/BeatBounds";
/**
 * @internal
 */
export declare class NumberedBeatPreNotesGlyph extends BeatGlyphBase {
    accidental: AccidentalType;
    skipLayout: boolean;
    protected get effectElement(): BeatSubElement;
    doLayout(): void;
}
/**
 * @internal
 */
export declare class NumberedBeatGlyph extends BeatOnNoteGlyphBase {
    noteHeads: NumberedNoteHeadGlyph | null;
    deadSlapped: DeadSlappedBeatGlyph | null;
    protected get effectElement(): BeatSubElement;
    getNoteX(_note: Note, requestedPosition: NoteXPosition): number;
    buildBoundingsLookup(beatBounds: BeatBounds, cx: number, cy: number): void;
    getLowestNoteY(requestedPosition: NoteYPosition): number;
    getHighestNoteY(requestedPosition: NoteYPosition): number;
    getNoteY(_note: Note, requestedPosition: NoteYPosition): number;
    getRestY(requestedPosition: NoteYPosition): number;
    private _internalGetNoteY;
    private static readonly _majorKeySignatureOneValues;
    private static readonly _minorKeySignatureOneValues;
    doLayout(): void;
}
