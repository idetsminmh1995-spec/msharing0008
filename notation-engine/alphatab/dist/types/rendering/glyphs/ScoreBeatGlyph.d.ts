import { BeatSubElement } from "./../../model/Beat";
import { type Note } from "./../../model/Note";
import type { ICanvas } from "./../../platform/ICanvas";
import { type NoteXPosition, NoteYPosition } from "./../BarRendererBase";
import { BeatOnNoteGlyphBase } from "./BeatOnNoteGlyphBase";
import { ScoreNoteChordGlyph } from "./ScoreNoteChordGlyph";
import { ScoreRestGlyph } from "./ScoreRestGlyph";
import type { BeatBounds } from "./../utils/BeatBounds";
/**
 * @internal
 */
export declare class ScoreBeatGlyph extends BeatOnNoteGlyphBase {
    private _collisionOffset;
    private _skipPaint;
    private _whammy?;
    noteHeads: ScoreNoteChordGlyph | null;
    restGlyph: ScoreRestGlyph | null;
    protected get effectElement(): BeatSubElement;
    buildBoundingsLookup(beatBounds: BeatBounds, cx: number, cy: number): void;
    getBoundingBoxTop(): number;
    getBoundingBoxBottom(): number;
    getLowestNoteY(requestedPosition: NoteYPosition): number;
    getHighestNoteY(requestedPosition: NoteYPosition): number;
    getNoteY(note: Note, requestedPosition: NoteYPosition): number;
    getNoteX(note: Note, requestedPosition: NoteXPosition): number;
    getRestY(requestedPosition: NoteYPosition): number;
    applyRestCollisionOffset(): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
    doMultiVoiceLayout(): void;
    doLayout(): void;
    private _updatePositions;
    private _createGlyphs;
    private _createNoteGlyphs;
    private _createRestGlyphs;
    private _createBeatDot;
    private _createNoteHeadGlyph;
    private _createNoteGlyph;
}
