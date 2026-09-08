import { type IPoolable, ObjectPool } from "./../utils/ObjectPool";
/**
 * One segment of a piecewise-constant skyline. segment[i] covers
 * `[xStart, segments[i+1].xStart)`; final entry is a sentinel.
 * @internal
 */
export declare class SkylineSegment implements IPoolable {
    xStart: number;
    height: number;
    reset(): void;
}
/** @internal */
export declare class SkylineSegmentPool extends ObjectPool<SkylineSegment> {
    constructor();
}
