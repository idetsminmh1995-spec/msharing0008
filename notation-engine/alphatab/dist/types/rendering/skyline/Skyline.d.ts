import type { SkylineSegmentPool } from "./SkylineSegmentPool";
/**
 * Piecewise-constant step-function skyline used as a placement oracle.
 * Heights are non-negative magnitudes measured outward from a reference edge.
 * @internal
 */
export declare class Skyline {
    readonly xMin: number;
    readonly xMax: number;
    private readonly _pool;
    private readonly _segments;
    constructor(xMin: number, xMax: number, pool: SkylineSegmentPool);
    get segmentCount(): number;
    forEachSegment(cb: (xStart: number, xEnd: number, height: number) => void): void;
    /**
     * Index-based segment accessors. `segmentCount` returns the number of
     * non-sentinel segments; valid indices are `[0, segmentCount)`. These
     * exist so hot consumers can iterate without allocating a closure (as
     * `forEachSegment` does), which matters in transpile targets (C#/Kotlin)
     * where closures are not free. The sentinel segment at the tail is not
     * exposed.
     */
    segmentXStart(i: number): number;
    segmentXEnd(i: number): number;
    segmentHeight(i: number): number;
    placeAbove(xStart: number, xEnd: number, _intrinsicHeight: number, pad: number): number;
    placeBelow(xStart: number, xEnd: number, _intrinsicHeight: number, pad: number): number;
    insert(xStart: number, xEnd: number, outerEdgeHeight: number, _pad: number): void;
    union(other: Skyline): void;
    /**
     * Unions every segment of `other` into `this`, shifted by `dx` on the
     * x-axis (i.e. each other-segment `[xs, xe)` contributes height `h` to
     * the range `[xs + dx, xe + dx)`). Clamps to `[xMin, xMax]`.
     *
     * Pair-merge implementation: walks `this._segments` and `other._segments`
     * in lockstep and emits a fresh segment list in O(s_this + s_other) time.
     * Each emitted segment's height is `max(thisH, otherH)` for that span;
     * adjacent equal-height pieces are coalesced inline so the result stays
     * in canonical form (no two consecutive segments with equal height). The
     * sentinel structure is preserved by appending a fresh sentinel at
     * `xMax` after the sweep. Old segments are returned to the pool.
     *
     * This replaces the previous "iterate other + raise per segment" path,
     * which was O(s_other * s_this) due to repeated split+raise on `this`.
     */
    unionShifted(other: Skyline, dx: number): void;
    /**
     * Three-input variant of {@link unionShifted} fused into a single 4-way
     * pair-merge pass: one result list and one segment rebuild instead of
     * three.
     */
    unionShifted3(o1: Skyline, dx1: number, o2: Skyline, dx2: number, o3: Skyline, dx3: number): void;
    maxHeightInRange(xStart: number, xEnd: number): number;
    maxHeight(): number;
    reset(): void;
    private _initBaseline;
    private _maxHeightInRange;
    private _raiseRange;
    /**
     * Splits the skyline at `x` so that some segment afterwards has
     * `xStart === x`. Returns the index of that segment. If `x <= xMin`
     * the baseline (index 0) is returned. If `x >= xMax` the sentinel
     * index (`_segments.length - 1`) is returned.
     */
    private _splitAt;
}
