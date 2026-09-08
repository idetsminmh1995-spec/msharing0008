import type { Beat } from "./../../model/Beat";
import type { GraceGroup } from "./../../model/GraceGroup";
import type { GraceType } from "./../../model/GraceType";
import type { Note } from "./../../model/Note";
import type { TupletGroup } from "./../../model/TupletGroup";
import type { ICanvas } from "./../../platform/ICanvas";
import type { NoteXPosition, NoteYPosition } from "./../BarRendererBase";
import { BeatXPosition } from "./../BeatXPosition";
import type { BeatGlyphBase } from "./BeatGlyphBase";
import type { BeatOnNoteGlyphBase } from "./BeatOnNoteGlyphBase";
import { Glyph } from "./Glyph";
import type { ITieGlyph } from "./TieGlyph";
import type { BarLayoutingInfo } from "./../staves/BarLayoutingInfo";
import type { BarBounds } from "./../utils/BarBounds";
import type { BeamingHelper } from "./../utils/BeamingHelper";
/**
 * Per-beat effect-glyph overflow; consumed by the per-beat skyline emission
 * walk in {@link BarRendererBase.scaleToWidth}.
 *
 * @record
 * @internal
 */
export interface BeatEffectOverflow {
    minY: number;
    maxY: number;
}
/**
 * @internal
 */
export declare abstract class BeatContainerGlyphBase extends Glyph {
    pendingEffectOverflows: BeatEffectOverflow[];
    /** Drain pending overflows before the next producer pass; consumer may not run. */
    prepareForOverflowPass(): void;
    abstract get beatId(): number;
    abstract get absoluteDisplayStart(): number;
    abstract get displayDuration(): number;
    abstract get onTimeX(): number;
    abstract get graceType(): GraceType;
    abstract get graceIndex(): number;
    abstract get graceGroup(): GraceGroup | null;
    abstract get voiceIndex(): number;
    abstract get isFirstOfTupletGroup(): boolean;
    abstract get tupletGroup(): TupletGroup | null;
    abstract get isLastOfVoice(): boolean;
    abstract getNoteY(note: Note, requestedPosition: NoteYPosition): number;
    abstract doMultiVoiceLayout(): void;
    abstract getRestY(requestedPosition: NoteYPosition): number;
    abstract getNoteX(note: Note, requestedPosition: NoteXPosition): number;
    abstract getBeatX(requestedPosition: BeatXPosition, useSharedSizes: boolean): number;
    abstract getLowestNoteY(requestedPosition: NoteYPosition): number;
    abstract getHighestNoteY(requestedPosition: NoteYPosition): number;
    abstract registerLayoutingInfo(layoutings: BarLayoutingInfo): void;
    abstract applyLayoutingInfo(info: BarLayoutingInfo): void;
    abstract buildBoundingsLookup(barBounds: BarBounds, cx: number, cy: number): void;
    scaleToWidth(beatWidth: number): void;
    /**
     * Repositions this beat so its {@link onTimeX} anchor lands at `target`, used for the
     * centered full-bar note/rest (see {@link BarLayoutingInfo.isCenteredFullBar}). The default
     * shifts the whole container, matching the regular (non-centered) positioning formula.
     * {@link BeatContainerGlyph} overrides this to shift only its ink, keeping `x`/`width`
     * spanning the full bar so bounds lookups and skyline emission stay correct.
     */
    applyCenterOffset(target: number): void;
}
/**
 * @internal
 */
export declare class BeatContainerGlyph extends BeatContainerGlyphBase {
    private _ties;
    private _tieWidth;
    beat: Beat;
    preNotes: BeatGlyphBase;
    onNotes: BeatOnNoteGlyphBase;
    getLowestNoteY(requestedPosition: NoteYPosition): number;
    getHighestNoteY(requestedPosition: NoteYPosition): number;
    get beatId(): number;
    get isLastOfVoice(): boolean;
    get displayDuration(): number;
    get graceIndex(): number;
    get graceType(): GraceType;
    get absoluteDisplayStart(): number;
    get graceGroup(): GraceGroup | null;
    get voiceIndex(): number;
    get isFirstOfTupletGroup(): boolean;
    get tupletGroup(): TupletGroup | null;
    get onTimeX(): number;
    constructor(beat: Beat);
    getNoteY(note: Note, requestedPosition: NoteYPosition): number;
    getRestY(requestedPosition: NoteYPosition): number;
    getNoteX(note: Note, requestedPosition: NoteXPosition): number;
    addTie(tie: ITieGlyph): void;
    getBoundingBoxTop(): number;
    getBoundingBoxBottom(): number;
    protected drawBeamHelperAsFlags(helper: BeamingHelper): boolean;
    protected get postBeatStretch(): number;
    registerLayoutingInfo(layoutings: BarLayoutingInfo): void;
    applyLayoutingInfo(_info: BarLayoutingInfo): void;
    doLayout(): void;
    /**
     * Resets `preNotes.x`/`onNotes.x` to their natural (un-centered) baseline.
     * Shared by {@link doLayout} and {@link applyCenterOffset} so the latter can be called
     * repeatedly (once per `_scaleToForce` pass) without compounding a previous offset.
     */
    private _layoutOnsetX;
    applyCenterOffset(target: number): void;
    protected createBeatTies(): void;
    doMultiVoiceLayout(): void;
    protected updateWidth(): void;
    protected createTies(_n: Note): void;
    static getGroupId(beat: Beat): string;
    paint(cx: number, cy: number, canvas: ICanvas): void;
    buildBoundingsLookup(barBounds: BarBounds, cx: number, cy: number): void;
    getBeatX(requestedPosition: BeatXPosition, useSharedSizes?: boolean): number;
}
