import type { Bar } from "./../model/Bar";
import type { Beat } from "./../model/Beat";
import type { Note } from "./../model/Note";
import { type Voice } from "./../model/Voice";
import { type ICanvas } from "./../platform/ICanvas";
import type { RenderingResources } from "./../RenderingResources";
import { BeatXPosition } from "./BeatXPosition";
import { EffectBandContainer } from "./EffectBandContainer";
import { type BeatContainerGlyphBase } from "./glyphs/BeatContainerGlyph";
import type { Glyph } from "./glyphs/Glyph";
import { MultiVoiceContainerGlyph } from "./glyphs/MultiVoiceContainerGlyph";
import { ContinuationTieGlyph, type ITieGlyph, type TieGlyph } from "./glyphs/TieGlyph";
import type { ScoreRenderer } from "./ScoreRenderer";
import { BarLocalSkyline } from "./skyline/BarLocalSkyline";
import type { BarLayoutingInfo } from "./staves/BarLayoutingInfo";
import type { RenderStaff } from "./staves/RenderStaff";
import { BarHelpers } from "./utils/BarHelpers";
import type { BeamingHelper } from "./utils/BeamingHelper";
import type { MasterBarBounds } from "./utils/MasterBarBounds";
import type { Settings } from "./../Settings";
/**
 * Lists the different position modes for {@link BarRendererBase.getNoteY}
 * @internal
 */
export declare enum NoteYPosition {
    /**
     * Gets the note y-position on top of the note stem or tab number.
     */
    TopWithStem = 0,
    /**
     * Gets the note y-position on top of the note head or tab number.
     */
    Top = 1,
    /**
     * Gets the note y-position on the center of the note head or tab number.
     */
    Center = 2,
    /**
     * Gets the note y-position on the bottom of the note head or tab number.
     */
    Bottom = 3,
    /**
     * Gets the note y-position on the bottom of the note stem or tab number.
     */
    BottomWithStem = 4,
    /**
     * The position where the upwards stem should be placed.
     */
    StemUp = 5,
    /**
     * The position where the downwards stem should be placed.
     */
    StemDown = 6
}
/**
 * Lists the different position modes for {@link BarRendererBase.getNoteX}
 * @internal
 */
export declare enum NoteXPosition {
    /**
     * Gets the note x-position on left of the note head or tab number.
     */
    Left = 0,
    /**
     * Gets the note x-position on the center of the note head or tab number.
     */
    Center = 1,
    /**
     * Gets the note x-position on the right of the note head or tab number.
     */
    Right = 2
}
/**
 * This is the base public class for creating blocks which can render bars.
 * @internal
 */
export declare class BarRendererBase {
    private _preBeatGlyphs;
    protected readonly voiceContainer: MultiVoiceContainerGlyph;
    private readonly _postBeatGlyphs;
    private _ties;
    private _multiSystemSlurs?;
    /** Set by {@link RenderStaff._finalizeRendererTies} when a tie write grew this renderer's overflow. */
    private _tiesDirty;
    /** Ties whose start beat lives on this renderer. */
    get ties(): ITieGlyph[];
    markTiesDirty(): void;
    get tiesDirty(): boolean;
    clearTiesDirty(): void;
    /** Multi-system slur continuations attached to this renderer. Only populated on renderer 0 of a staff. */
    get multiSystemSlurs(): ContinuationTieGlyph[] | undefined;
    topEffects: EffectBandContainer;
    bottomEffects: EffectBandContainer;
    get nextRenderer(): BarRendererBase | null;
    get previousRenderer(): BarRendererBase | null;
    scoreRenderer: ScoreRenderer;
    staff?: RenderStaff;
    layoutingInfo: BarLayoutingInfo;
    bar: Bar;
    additionalMultiRestBars: Bar[] | null;
    get lastBar(): Bar;
    x: number;
    /** Renderer y is staff-relative and shared by every renderer in the staff: `staff.topPadding + staff.topOverflow`. */
    get y(): number;
    width: number;
    computedWidth: number;
    height: number;
    index: number;
    private _contentTopOverflow;
    private _contentBottomOverflow;
    beatEffectsMinY: number;
    beatEffectsMaxY: number;
    private _barLocalSkyline;
    private _preBeatLocalSkyline;
    private _postBeatLocalSkyline;
    /** Per-bar local skyline of non-effect-band glyphs (renderer-local x). */
    get barLocalSkyline(): BarLocalSkyline;
    /** Pre-beat glyphs' skyline contribution. Separate from {@link barLocalSkyline} so the latter's per-cycle reset doesn't wipe it. */
    get preBeatLocalSkyline(): BarLocalSkyline;
    /** Post-beat glyphs' skyline in post-beat-group-local x; shifted by {@link postBeatGroupOffset} when unioned. */
    get postBeatLocalSkyline(): BarLocalSkyline;
    get postBeatGroupOffset(): number;
    /** Per-cycle reset of skylines and ties. Called from {@link doLayout}; not from {@link reLayout}. */
    resetCycleState(): void;
    /** Emit a glyph's current bbox into {@link barLocalSkyline}. */
    insertSkylineFromBbox(glyph: Glyph): void;
    get topOverflow(): number;
    get bottomOverflow(): number;
    protected helpers: BarHelpers;
    get collisionHelper(): import("./utils/BarCollisionHelper").BarCollisionHelper;
    /**
     * Gets or sets whether this renderer is linked to the next one
     * by some glyphs like a vibrato effect
     */
    isLinkedToPrevious: boolean;
    get showMultiBarRest(): boolean;
    constructor(renderer: ScoreRenderer, bar: Bar);
    registerTie(tie: ITieGlyph): void;
    get middleYPosition(): number;
    registerBeatEffectOverflows(beatEffectsMinY: number, beatEffectsMaxY: number): void;
    registerBeatEffectOverflowsForBeat(beat: Beat, minY: number, maxY: number): void;
    registerOverflowTop(topOverflow: number): boolean;
    registerOverflowBottom(bottomOverflow: number): boolean;
    /** Post-{@link scaleToWidth} only: also inserts into the bar-local skyline. */
    registerOverflowRangeTop(xStart: number, xEnd: number, topHeight: number): boolean;
    registerOverflowRangeBottom(xStart: number, xEnd: number, bottomHeight: number): boolean;
    /** Emit a top-skyline segment into {@link barLocalSkyline}. */
    insertSkylineTop(xStart: number, xEnd: number, topHeight: number): void;
    /** Emit a bottom-skyline segment into {@link barLocalSkyline}. */
    insertSkylineBottom(xStart: number, xEnd: number, bottomHeight: number): void;
    /**
     * The fixed-overhead width of this renderer: glyphs that do not stretch when
     * the bar is scaled (clef, key signature, time signature, barlines, courtesy
     * accidentals, etc). Treated as a fixed allocation by the system-level layout
     * before distributing remaining width across bars by {@link Bar.displayScale}.
     */
    get fixedOverhead(): number;
    scaleToWidth(width: number): void;
    protected emitHelperSkyline(_h: BeamingHelper): void;
    emitBeatSkyline(_beatContainer: BeatContainerGlyphBase): void;
    protected emitSubclassBarLocalSkyline(): void;
    get resources(): RenderingResources;
    get smuflMetrics(): import("../EngravingSettings").EngravingSettings;
    get settings(): Settings;
    protected wasFirstOfStaff: boolean;
    get isFirstOfStaff(): boolean;
    get isLastOfStaff(): boolean;
    get isLast(): boolean;
    /**
     * Gates the voice-container walk in {@link _registerLayoutingInfo}.
     * Broker outputs from the walk are bar-local invariant; only the
     * pre/post-beat `max` writes need to run each resize cycle (the broker
     * zeroes `preBeatSize` at the head of every resize).
     */
    private _voiceWalkDone;
    _registerLayoutingInfo(): void;
    _registerOverlayRods(): void;
    private _collectOverlayRods;
    afterReverted(): void;
    afterStaffBarReverted(): void;
    /**
     * Pull the current {@link BarLayoutingInfo} broker state into this
     * renderer's positions. Value-idempotent on a stable broker; callers
     * must gate themselves to skip unchanged bars.
     */
    applyLayoutingInfo(): void;
    isFinalized: boolean;
    /**
     * Set once {@link doLayout} has populated the bar-local invariant state
     * (`_preBeatGlyphs.width`, `_postBeatGlyphs.width`, broker per-beat sizes,
     * local pre/post-beat skylines). Lets {@link reLayout} skip the bar-local
     * re-walk on width-only changes.
     */
    private _layoutInvariantCached;
    invalidateLayoutCache(): void;
    registerMultiSystemSlurs(startedTies: Generator<TieGlyph> | undefined): void;
    /** Republish each effect band's cross-renderer chain spans. */
    finalizeEffectBandSpans(): void;
    finalizeOwnedTies(): void;
    private _emitTies;
    private _registerStaffOverflow;
    /** Public wrapper for `_registerStaffOverflow`. */
    registerStaffOverflows(): void;
    /**
     * Public wrapper for `updateSizes`. Cannot widen `updateSizes` directly
     * because `LineBarRenderer.updateSizes` is `protected override` and the
     * transpiler does not consistently widen visibility across overrides.
     */
    refreshSizes(): void;
    doLayout(): void;
    protected calculateOverflows(_rendererTop: number, rendererBottom: number): void;
    /** Emit per-glyph overflow into the given group skyline. Shared by pre- and post-beat groups. */
    private _emitGroupOverflows;
    protected updateSizes(): void;
    protected addPreBeatGlyph(g: Glyph): void;
    protected addBeatGlyph(g: BeatContainerGlyphBase): void;
    getBeatContainer(beat: Beat): BeatContainerGlyphBase | undefined;
    paint(cx: number, cy: number, canvas: ICanvas): void;
    protected paintContent(cx: number, cy: number, canvas: ICanvas): void;
    private _paintMultiSystemSlurs;
    protected paintBackground(cx: number, cy: number, canvas: ICanvas): void;
    buildBoundingsLookup(masterBarBounds: MasterBarBounds, cx: number, cy: number): void;
    protected addPostBeatGlyph(g: Glyph): void;
    protected createPreBeatGlyphs(): void;
    protected createBeatGlyphs(): void;
    protected createVoiceGlyphs(voice: Voice): void;
    protected createPostBeatGlyphs(): void;
    get beatGlyphsStart(): number;
    get postBeatGlyphsStart(): number;
    getBeatX(beat: Beat, requestedPosition?: BeatXPosition, useSharedSizes?: boolean): number;
    getRatioPositionX(ratio: number): number;
    getNoteX(note: Note, requestedPosition: NoteXPosition): number;
    getNoteY(note: Note, requestedPosition: NoteYPosition): number;
    getRestY(beat: Beat, requestedPosition: NoteYPosition): number;
    reLayout(): void;
    protected recreatePreBeatGlyphs(): void;
    protected paintSimileMark(cx: number, cy: number, canvas: ICanvas): void;
    completeBeamingHelper(_helper: BeamingHelper): void;
}
