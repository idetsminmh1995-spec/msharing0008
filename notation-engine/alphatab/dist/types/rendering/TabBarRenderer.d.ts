import { BarSubElement } from "./../model/Bar";
import { type Beat, BeatSubElement } from "./../model/Beat";
import type { Note } from "./../model/Note";
import type { Voice } from "./../model/Voice";
import { TabRhythmMode } from "./../NotationSettings";
import type { ICanvas } from "./../platform/ICanvas";
import { type BeatContainerGlyphBase } from "./glyphs/BeatContainerGlyph";
import { LineBarRenderer } from "./LineBarRenderer";
import type { ElementDisplay } from "./../model/ElementDisplay";
import { BarNumberDisplay } from "./../model/RenderStylesheet";
import { BeamDirection } from "./utils/BeamDirection";
import type { BeamingHelper } from "./utils/BeamingHelper";
/**
 * This BarRenderer renders a bar using guitar tablature notation
 * @internal
 */
export declare class TabBarRenderer extends LineBarRenderer {
    static readonly StaffId: string;
    private _hasTuplets;
    resolveClefDisplay(): ElementDisplay;
    resolveTimeSignatureDisplay(): ElementDisplay;
    resolveRestsDisplay(): ElementDisplay;
    resolveRhythm(): TabRhythmMode;
    protected resolveBarNumberDisplay(): BarNumberDisplay;
    get showTimeSignature(): boolean;
    get showRests(): boolean;
    get showTiedNotes(): boolean;
    /**
     * Layout-time staff-line gap cache, bucketed by string-line index.
     * `_gapBucketEnd[i]` is the exclusive end-offset into the parallel
     * `_gapRelXAndWidth` / `_gapBeatRefs` arrays for line `i`. Stores the
     * width-invariant payload; absolute x is projected at paint time via
     * `beatGlyphsStart + bg.x + relativeX`.
     */
    private _gapBucketEnd;
    private _gapRelXAndWidth;
    private _gapBeatRefs;
    private _gapCount;
    get showMultiBarRest(): boolean;
    get repeatsBarSubElement(): BarSubElement;
    get barNumberBarSubElement(): BarSubElement;
    get barLineBarSubElement(): BarSubElement;
    get staffLineBarSubElement(): BarSubElement;
    get lineSpacing(): number;
    get heightLineCount(): number;
    get drawnLineCount(): number;
    get rhythmMode(): TabRhythmMode.Hidden | TabRhythmMode.ShowWithBeams | TabRhythmMode.ShowWithBars;
    getNoteLine(note: Note): number;
    minString: number;
    maxString: number;
    /**
     * Legacy adapter projecting the gap cache into the base class
     * `spaces[][]` shape. The real consumer is {@link paintStaffLines}
     * which reads the cache directly.
     */
    protected collectSpaces(spaces: Float32Array[][]): void;
    protected paintStaffLines(cx: number, cy: number, canvas: ICanvas): void;
    private _buildGapCache;
    private _invalidateGapCache;
    invalidateLayoutCache(): void;
    protected recreatePreBeatGlyphs(): void;
    doLayout(): void;
    emitBeatSkyline(beatContainer: BeatContainerGlyphBase): void;
    protected createLinePreBeatGlyphs(): void;
    private _createTimeSignatureGlyphs;
    protected createVoiceGlyphs(v: Voice): void;
    protected get flagsSubElement(): BeatSubElement;
    protected get beamsSubElement(): BeatSubElement;
    protected get tupletSubElement(): BeatSubElement;
    protected paintBeams(cx: number, cy: number, canvas: ICanvas, flagsElement: BeatSubElement, beamsElement: BeatSubElement): void;
    protected paintTuplets(cx: number, cy: number, canvas: ICanvas, beatElement: BeatSubElement, bracketsAsArcs?: boolean): void;
    drawBeamHelperAsFlags(h: BeamingHelper): boolean;
    protected getFlagTopY(beat: Beat, direction: BeamDirection): number;
    protected getFlagBottomY(beat: Beat, direction: BeamDirection): number;
    protected getBeamDirection(_helper: BeamingHelper): BeamDirection;
    protected shouldPaintFlag(beat: Beat): boolean;
    protected paintBeamingStem(beat: Beat, cy: number, x: number, topY: number, bottomY: number, canvas: ICanvas): void;
    protected calculateOverflows(rendererTop: number, rendererBottom: number): void;
    protected emitHelperSkyline(h: BeamingHelper): void;
}
