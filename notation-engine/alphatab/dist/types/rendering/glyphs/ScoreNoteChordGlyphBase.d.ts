import type { EngravingSettings } from "./../../EngravingSettings";
import type { ICanvas } from "./../../platform/ICanvas";
import { Glyph } from "./Glyph";
import type { NoteHeadGlyphBase } from "./NoteHeadGlyph";
import { BeamDirection } from "./../utils/BeamDirection";
/**
 * @internal
 * @record
 */
export interface ScoreChordNoteHeadGroupSide {
    /**
     * A lookup for the notes located at particular steps.
     * If we have more than 2 filled voices at the same spot, we might have the additional voices
     * placed where the secondary voice already is.
     */
    notes: Map<number, ScoreNoteGlyphInfo[]>;
    /**
     * The width of this individual side.
     */
    width: number;
    /**
     * The smallest X-coordinate of all glyphs. Used later to calculate
     * the overall shift needed to place notes within the bounds.
     */
    minX: number;
}
/**
 * @internal
 * @record
 */
export interface ScoreChordNoteHeadGroup {
    /**
     * All notes on the "correct" side of the stem,
     * that's left for upwards stems, and right for downward stems.
     */
    correctNotes: ScoreChordNoteHeadGroupSide;
    /**
     * All displaced notes (the other side of the stem compared to {@link correctNotes})
     */
    displacedNotes?: ScoreChordNoteHeadGroupSide;
    /**
     * The direction this group defines.
     */
    direction: BeamDirection;
    minStep: number;
    maxStep: number;
    /**
     * The offset of the stem for this group.
     * Offset is relative to the group.
     */
    stemX: number;
    /**
     * Smallest X-coordinate in this group.
     * Offset is relative to the group.
     */
    minX: number;
    /**
     * Largest X-coordinate in this group.
     * Offset is relative to the group.
     */
    maxX: number;
    /**
     * The shift applied for the group to avoid overlaps.
     */
    multiVoiceShiftX: number;
    hasFlag: boolean;
    hasStem: boolean;
}
/**
 * @internal
 */
export declare class ScoreChordNoteHeadInfo {
    /**
     * The direction of the main voice.
     */
    mainVoiceDirection: BeamDirection;
    /**
     * All groups respective to their direction.
     */
    readonly groups: Map<BeamDirection, ScoreChordNoteHeadGroup>;
    minX: number;
    maxX: number;
    private _isFinished;
    constructor(mainVoiceDirection: BeamDirection);
    update(): void;
    finish(smufl: EngravingSettings): void;
    private _checkForGroupDisplacement;
    private static _canShareNoteHead;
    private static _canShareNoteHeadGlyph;
    private static _checkIntersection;
}
/**
 * @internal
 * @record
 */
interface ScoreNoteGlyphInfo {
    glyph: NoteHeadGlyphBase;
    steps: number;
}
/**
 * @internal
 */
export declare abstract class ScoreNoteChordGlyphBase extends Glyph {
    private _infos;
    private _noteHeadInfo?;
    protected noteGroup?: ScoreChordNoteHeadGroup;
    minStepsNote: ScoreNoteGlyphInfo | null;
    maxStepsNote: ScoreNoteGlyphInfo | null;
    get stemX(): number;
    noteStartX: number;
    onTimeX: number;
    constructor();
    abstract get direction(): BeamDirection;
    abstract get hasFlag(): boolean;
    abstract get hasStem(): boolean;
    abstract get scale(): number;
    getBoundingBoxTop(): number;
    getBoundingBoxBottom(): number;
    protected add(noteGlyph: NoteHeadGlyphBase, noteSteps: number): void;
    protected abstract getScoreChordNoteHeadInfo(): ScoreChordNoteHeadInfo;
    private _prepareForLayout;
    doLayout(): void;
    private _updateSizes;
    doMultiVoiceLayout(): void;
    private _alignNoteHeadsGroup;
    private _alignNoteHeads;
    private static _hasCollision;
    private _collectNoteDisplacements;
    private _updateGroupStemXPosition;
    paint(cx: number, cy: number, canvas: ICanvas): void;
    private _paintLedgerLines;
}
export {};
