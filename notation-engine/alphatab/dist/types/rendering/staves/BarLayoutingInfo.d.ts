import type { Beat } from "./../../model/Beat";
import type { ICanvas } from "./../../platform/ICanvas";
import type { BeatContainerGlyphBase } from "./../glyphs/BeatContainerGlyph";
import { Spring } from "./Spring";
/**
 * @internal
 * @record
 */
interface BarLayoutingInfoBeatSizes {
    preBeatSize: number;
    onBeatSize: number;
}
/**
 * This public class stores size information about a stave.
 * It is used by the layout engine to collect the sizes of score parts
 * to align the parts across multiple staves.
 * @internal
 */
export declare class BarLayoutingInfo {
    private static readonly _defaultMinDuration;
    private static readonly _defaultMinDurationWidth;
    private static readonly _spacingRatioMin;
    private static readonly _spacingRatioMax;
    /**
     * Power-law exponent for the spring formula, from `DisplaySettings.spacingRatio`.
     * Clamps to `[_spacingRatioMin, _spacingRatioMax]`. By construction
     * `phi(2*dmin, dmin) === spacingRatio`.
     */
    static spacingExponentFromRatio(spacingRatio: number): number;
    private _timeSortedSprings;
    private _minTime;
    private _onTimePositionsForce;
    private _onTimePositions;
    private _incompleteGraceRodsWidth;
    private _beatSizes;
    /**
     * Overlay rods bucketed per visual band. Outer key is a `bandKey` (typically the
     * band's `NotationElement` stringified). Inner map keyed by `Spring.timePosition`.
     * Rods in different bands occupy different vertical tracks and never collide;
     * pair-overlap evaluates each band independently. Same-band, same-timePosition
     * registrations (lyric-on-score + lyric-on-tab for one beat) max-merge.
     */
    private _overlayRodsByBand;
    /**
     * Per-band time-sorted view of {@link _overlayRodsByBand}. Maintained on insert
     * via the same insertion-sort {@link addSpring} uses on {@link _timeSortedSprings}.
     */
    private _timeSortedOverlayRodsByBand;
    private _minDuration;
    /** Precomputed `log2(spacingRatio)`. Default matches `DisplaySettings.spacingRatio = √2`. */
    private readonly _spacingExponent;
    private static readonly _overlayMinPadding;
    constructor(spacingRatio?: number);
    /**
     * an internal version number that increments whenever a change was made.
     */
    version: number;
    preBeatSize: number;
    postBeatSize: number;
    minStretchForce: number;
    totalSpringConstant: number;
    /**
     * The smallest note duration encountered within this bar's springs, used as the reference in
     * the Gourlay stretch formula. Read by the owning {@link StaffSystem} so that the system can
     * aggregate a shared minimum across all bars and trigger a reconcile if an added bar introduces
     * a shorter duration than previously seen.
     */
    get localMinDuration(): number;
    /**
     * The minimum-duration reference against which the spring constants currently held by this info
     * were computed. Set by {@link finish} and {@link recomputeSpringConstants}. The owning
     * StaffSystem compares this against its system-wide minimum to decide whether spring constants
     * need re-derivation.
     */
    computedWithMinDuration: number;
    private _updateMinStretchForce;
    getBeatSizes(beat: Beat): BarLayoutingInfoBeatSizes | undefined;
    setBeatSizes(beat: BeatContainerGlyphBase, sizes: BarLayoutingInfoBeatSizes): void;
    getPreBeatSize(beat: Beat): number;
    getPostBeatSize(beat: Beat): number;
    incompleteGraceRods: Map<string, Spring[]>;
    allGraceRods: Map<string, Spring[]>;
    springs: Map<number, Spring>;
    addSpring(start: number, duration: number, graceBeatWidth: number, preBeatWidth: number, postSpringSize: number): Spring;
    addBeatSpring(beat: BeatContainerGlyphBase, preBeatSize: number, postBeatSize: number): void;
    /**
     * Registers an overlay rod for a beat into the bucket identified by `bandKey`
     * (typically `String(band.info.notationElement)`). Same-band, same-timePosition
     * duplicates max-merge.
     */
    addOverlayRod(bandKey: string, timePosition: number, leftExtent: number, rightExtent: number): void;
    finish(): void;
    /**
     * Re-derives the spring constants (and {@link minStretchForce} / {@link totalSpringConstant})
     * using a caller-supplied minimum-duration reference rather than this bar's local minimum.
     *
     * Called by {@link StaffSystem.reconcileMinDurationIfDirty} when a bar added later to the
     * system introduced a shorter note than previously seen, invalidating this bar's spring
     * constants. Grace-rod data is not recomputed — it is independent of the minimum-duration
     * reference. The internal {@link version} is bumped so downstream consumers (e.g.
     * {@link BarRendererBase.applyLayoutingInfo}) pick up the refreshed positions.
     */
    recomputeSpringConstants(minDuration: number): void;
    private _calculateSpringConstants;
    /**
     * Pair-overlap + last-rod phantom-next-beat for a single band's rod list.
     * Called once per band by {@link _calculateSpringConstants}.
     */
    private _applyOverlayRodConstraints;
    height: number;
    paint(_cx: number, _cy: number, _canvas: ICanvas): void;
    private _calculateSpringConstant;
    spaceToForce(space: number): number;
    calculateVoiceWidth(force: number): number;
    private _calculateWidth;
    buildOnTimePositions(force: number): Map<number, number>;
}
export {};
