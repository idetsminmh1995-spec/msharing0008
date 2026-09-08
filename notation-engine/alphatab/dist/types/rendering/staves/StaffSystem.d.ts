import type { EngravingSettings } from "./../../EngravingSettings";
import { type Track } from "./../../model/Track";
import { type ICanvas } from "./../../platform/ICanvas";
import type { BarRendererBase } from "./../BarRendererBase";
import type { ScoreLayout } from "./../layout/ScoreLayout";
import { MasterBarsRenderers } from "./MasterBarsRenderers";
import type { RenderStaff } from "./RenderStaff";
import { StaffTrackGroup } from "./StaffTrackGroup";
/**
 * @internal
 */
export declare abstract class SystemBracket {
    private _system;
    firstStaffInBracket?: RenderStaff;
    lastStaffInBracket?: RenderStaff;
    firstVisibleStaffInBracket?: RenderStaff;
    lastVisibleStaffInBracket?: RenderStaff;
    drawAsBrace: boolean;
    braceScale: number;
    width: number;
    index: number;
    canPaint: boolean;
    private _initialPaintabilityCaptured;
    reservesAccoladeSpace: boolean;
    constructor(system: StaffSystem);
    abstract includesStaff(s: RenderStaff): boolean;
    updateCanPaint(): void;
    finalizeBracket(smuflMetrics: EngravingSettings): void;
}
/**
 * A StaffSystem consists of a list of different staves and groups
 * them using an accolade.
 * @internal
 */
export declare class StaffSystem {
    private _trackNamesAccoladeContribution;
    /**
     * Visibility bitset of {@link allStaves} (one bit per staff, MSB first) at
     * the time `accoladeWidth` was last fully recomputed. `-1` = uncomputed.
     * Used by `_calculateAccoladeSpacing` to skip the full recompute when
     * visibility is unchanged. Limit: 53 staves (JS safe-integer range).
     */
    private _accoladeVisibilityFingerprint;
    private _brackets;
    private _staffToBracket;
    private _inlineTuningGlyphs;
    private _inlineTuningWidth;
    private _contentHeight;
    private _hasSystemSeparator;
    x: number;
    y: number;
    index: number;
    /**
     * The width of the whole accolade inclusive text and bar.
     */
    accoladeWidth: number;
    /**
     * Indicates whether this line is full or not. If the line is full the
     * bars can be aligned to the maximum width. If the line is not full
     * the bars will not get stretched.
     */
    isFull: boolean;
    /**
     * The current width of the system to which the content is scaled.
     * Includes accolade (tracknames, brackets etc) and the content.
     *
     * Used to determine the final size needed for rendering.
     */
    width: number;
    /**
     * The minimum/default width to which the system was sized
     * when performing the layout. This is the size of the system if no
     * fitting/resizing is performed.
     *
     * Includes accolade (tracknames, brackets etc) and the content.
     *
     * Used to perform a resizing/refitting of the system.
     */
    computedWidth: number;
    /**
     * This is the simple sum of all display scales of the bars in this system.
     * This value is mainly used in the parchment style layout for correct scaling of the bars.
     */
    totalBarDisplayScale: number;
    /**
     * Sum of per-bar {@link MasterBarsRenderers.maxFixedOverhead} across the system. The layout-mode
     * horizontal scaling pass subtracts this from the available staff width before distributing the
     * remainder across bars.
     */
    totalFixedOverhead: number;
    /**
     * Sum of per-bar {@link MasterBarsRenderers.maxContentWidth} across the system. Used as the
     * denominator when distributing staff width in modes that weight bars by natural content width
     * (Page layout with `SystemsLayoutMode.Automatic`).
     */
    totalContentWidth: number;
    /**
     * Shortest note duration (in ticks) across every bar that has been added to this system, used
     * as the common reference in the Gourlay stretch formula so that rhythmically-equivalent beats
     * in different bars of the same system align column-wise.
     *
     * `-1` means "no bar added yet". The value only moves downward during system assembly; when a
     * new bar introduces a shorter minimum, {@link isMinDurationDirty} is set so that
     * {@link reconcileMinDurationIfDirty} can re-derive spring constants on the previously-added
     * bars before layout distribution runs.
     */
    minDuration: number;
    /**
     * Set when a bar added to this system introduced a shorter {@link minDuration} than previously
     * seen, leaving earlier bars' spring constants stale. Consumed by
     * {@link reconcileMinDurationIfDirty} which is called from `VerticalLayoutBase._fitSystem`
     * once the system is fully assembled.
     */
    isMinDurationDirty: boolean;
    /**
     * Whether this system coordinates a shared minimum-duration reference across its bars for the
     * Gourlay stretch formula. Defaults to `true` for page-style and parchment layouts where bars
     * of a system fight for a common staff width. Set to `false` for horizontal layouts where each
     * bar is sized independently (by `bar.displayWidth` or its intrinsic width) and there is no
     * column-alignment concern - each bar keeps its local minimum so pre-existing rendering is
     * preserved.
     */
    shareMinDurationAcrossBars: boolean;
    isLast: boolean;
    masterBarsRenderers: MasterBarsRenderers[];
    staves: StaffTrackGroup[];
    layout: ScoreLayout;
    topPadding: number;
    bottomPadding: number;
    allStaves: RenderStaff[];
    firstVisibleStaff?: RenderStaff;
    constructor(layout: ScoreLayout);
    get firstBarIndex(): number;
    get lastBarIndex(): number;
    addMasterBarRenderers(tracks: Track[], renderers: MasterBarsRenderers): MasterBarsRenderers | null;
    addBars(tracks: Track[], barIndex: number, additionalMultiBarRestIndexes: number[] | null): MasterBarsRenderers;
    /**
     * Updates {@link minDuration} and {@link isMinDurationDirty} when a bar is added, and brings
     * the just-added bar's {@link BarLayoutingInfo} in line with the current system minimum if the
     * system already saw a shorter reference. The bulk reconcile over previously-added bars is
     * deferred to {@link reconcileMinDurationIfDirty} (called from `_fitSystem`) to avoid
     * re-iterating the system every time a bar is appended.
     */
    private _trackSystemMinDuration;
    /**
     * Re-derives spring constants on bars whose {@link BarLayoutingInfo.computedWithMinDuration}
     * is out of sync with the current {@link minDuration}, and rebuilds the cached system totals
     * (widths, {@link totalFixedOverhead}, {@link totalContentWidth}) from the refreshed bar
     * widths. Called from `VerticalLayoutBase._fitSystem` after the system is fully assembled and
     * before distribution runs. No-op when {@link isMinDurationDirty} is false.
     */
    reconcileMinDurationIfDirty(): void;
    getBarDisplayScale(renderer: BarRendererBase): number;
    revertLastBar(): MasterBarsRenderers | null;
    private _applyLayoutAndUpdateWidth;
    private _calculateAccoladeSpacing;
    /**
     * Resets cross-bar staff state in {@link RenderStaff._sharedLayoutData}
     * before `alignGlyphs` runs, so the max-of-idempotent
     * `EffectInfo.onAlignGlyphs` writers start from a clean slate each cycle.
     * Per-revert resets are handled separately by {@link RenderStaff.revertLastBar}.
     */
    resetAllStavesSharedLayoutData(): void;
    private _computeVisibilityFingerprint;
    private _createInlineTuningGlyphs;
    private _shouldCreateInlineTuningGlyph;
    private _getInlineTuningWidthForTrackGroup;
    private _getStaffTrackGroup;
    addStaff(staff: RenderStaff): void;
    get height(): number;
    paint(cx: number, cy: number, canvas: ICanvas): void;
    paintPartial(cx: number, cy: number, canvas: ICanvas, startIndex: number, count: number): void;
    private _paintInlineTunings;
    private _paintBrackets;
    finalizeSystem(): void;
    private _finalizeTrackGroups;
    buildBoundingsLookup(cx: number, cy: number): void;
    getBarX(index: number): number;
}
