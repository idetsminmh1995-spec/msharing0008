import { BeatSubElement } from "./../../model/Beat";
import type { Note } from "./../../model/Note";
import type { ICanvas } from "./../../platform/ICanvas";
import { NoteXPosition, NoteYPosition } from "./../BarRendererBase";
import { BeatOnNoteGlyphBase } from "./BeatOnNoteGlyphBase";
import { DeadSlappedBeatGlyph } from "./DeadSlappedBeatGlyph";
import { SlashNoteHeadGlyph } from "./SlashNoteHeadGlyph";
import { SlashRestGlyph } from "./SlashRestGlyph";
import type { BeatBounds } from "./../utils/BeatBounds";
/**
 * @internal
 */
export declare class SlashBeatGlyph extends BeatOnNoteGlyphBase {
    private _tremoloPicking?;
    private _stemLengthExtension;
    noteHeads: SlashNoteHeadGlyph | null;
    deadSlapped: DeadSlappedBeatGlyph | null;
    restGlyph: SlashRestGlyph | null;
    protected get effectElement(): BeatSubElement;
    getNoteX(_note: Note, requestedPosition: NoteXPosition): number;
    buildBoundingsLookup(beatBounds: BeatBounds, cx: number, cy: number): void;
    getLowestNoteY(requestedPosition: NoteYPosition): number;
    getHighestNoteY(requestedPosition: NoteYPosition): number;
    getRestY(requestedPosition: NoteYPosition): number;
    getNoteY(_note: Note, requestedPosition: NoteYPosition): number;
    _internalGetNoteY(requestedPosition: NoteYPosition): number;
    doLayout(): void;
    private _alignTremoloPickingGlyph;
    paint(cx: number, cy: number, canvas: ICanvas): void;
}
