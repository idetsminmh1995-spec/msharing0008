import { type Beat } from "./../../model/Beat";
import type { Note } from "./../../model/Note";
import type { ICanvas } from "./../../platform/ICanvas";
import { NoteXPosition, NoteYPosition } from "./../BarRendererBase";
import type { EffectGlyph } from "./EffectGlyph";
import type { NoteHeadGlyphBase } from "./NoteHeadGlyph";
import { ScoreChordNoteHeadInfo, ScoreNoteChordGlyphBase } from "./ScoreNoteChordGlyphBase";
import { BeamDirection } from "./../utils/BeamDirection";
import type { BeatBounds } from "./../utils/BeatBounds";
/**
 * @internal
 */
export declare class ScoreNoteChordGlyph extends ScoreNoteChordGlyphBase {
    private _noteGlyphLookup;
    private _notes;
    private _deadSlapped;
    private _tremoloPicking;
    private _stemLengthExtension;
    aboveBeatEffects: Map<string, EffectGlyph>;
    belowBeatEffects: Map<string, EffectGlyph>;
    beat: Beat;
    get direction(): BeamDirection;
    get hasFlag(): boolean;
    get hasStem(): boolean;
    get scale(): number;
    protected getScoreChordNoteHeadInfo(): ScoreChordNoteHeadInfo;
    getNoteX(note: Note, requestedPosition: NoteXPosition): number;
    getNoteY(note: Note, requestedPosition: NoteYPosition): number;
    getLowestNoteY(requestedPosition: NoteYPosition): number;
    getHighestNoteY(requestedPosition: NoteYPosition): number;
    private _internalGetNoteY;
    addMainNoteGlyph(noteGlyph: NoteHeadGlyphBase, note: Note, noteLine: number): void;
    addEffectNoteGlyph(noteGlyph: NoteHeadGlyphBase, noteLine: number): void;
    doLayout(): void;
    private _alignTremoloPickingGlyph;
    buildBoundingsLookup(beatBounds: BeatBounds, cx: number, cy: number): void;
    paint(cx: number, cy: number, canvas: ICanvas): void;
    private _paintEffects;
}
