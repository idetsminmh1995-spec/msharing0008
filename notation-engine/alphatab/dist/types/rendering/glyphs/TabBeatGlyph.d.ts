import { BeatSubElement } from "./../../model/Beat";
import { type Note } from "./../../model/Note";
import { NoteXPosition, NoteYPosition } from "./../BarRendererBase";
import { BeatOnNoteGlyphBase } from "./BeatOnNoteGlyphBase";
import { SlashNoteHeadGlyph } from "./SlashNoteHeadGlyph";
import { TabNoteChordGlyph } from "./TabNoteChordGlyph";
import { TabRestGlyph } from "./TabRestGlyph";
import type { BeatBounds } from "./../utils/BeatBounds";
/**
 * @internal
 */
export declare class TabBeatGlyph extends BeatOnNoteGlyphBase {
    slash: SlashNoteHeadGlyph | null;
    noteNumbers: TabNoteChordGlyph | null;
    restGlyph: TabRestGlyph | null;
    protected get effectElement(): BeatSubElement;
    getNoteX(note: Note, requestedPosition: NoteXPosition): number;
    getNoteY(note: Note, requestedPosition: NoteYPosition): number;
    getRestY(requestedPosition: NoteYPosition): number;
    getLowestNoteY(requestedPosition: NoteYPosition): number;
    getHighestNoteY(requestedPosition: NoteYPosition): number;
    buildBoundingsLookup(beatBounds: BeatBounds, cx: number, cy: number): void;
    doLayout(): void;
    private _createNoteGlyph;
}
