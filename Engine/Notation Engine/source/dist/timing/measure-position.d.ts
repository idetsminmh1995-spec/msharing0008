export interface MusicalPosition {
    readonly measureNumber: number;
    /** 1-based and fractional -- beat 2.5 is "the and of 2" in 4/4 (§12.3). */
    readonly beat: number;
    readonly tickInMeasure: number;
}
export interface TimeSignatureSegment {
    readonly startTick: number;
    /** The measure number of the measure that begins exactly at startTick. */
    readonly startMeasureNumber: number;
    readonly numerator: number;
    readonly denominator: number;
}
/** Sorted, contiguous by startTick -- the same shape TempoMap already uses, applied here to time-signature ranges instead of tempo ranges. */
export interface MeasureMap {
    readonly segments: readonly TimeSignatureSegment[];
}
export interface RawTimeSignatureEvent {
    readonly tick: number;
    readonly numerator: number;
    readonly denominator: number;
}
/**
 * §12.3: builds the sparse segment list `tickToPosition`/`positionToTick`
 * search over -- one segment per time-signature era, each knowing which
 * measure number begins its own span, rather than a boundary entry for
 * every individual measure (which would be wasteful for a long piece
 * with few time-signature changes). Measure numbers within a span are
 * then a simple division, not a lookup.
 */
export declare function buildMeasureMap(rawEvents: readonly RawTimeSignatureEvent[], firstMeasureNumber?: number): MeasureMap;
/** §12.3: converts a tick into a human-readable measure+beat position. */
export declare function tickToPosition(measureMap: MeasureMap, tick: number): MusicalPosition;
/** The exact inverse of tickToPosition. */
export declare function positionToTick(measureMap: MeasureMap, position: MusicalPosition): number;
