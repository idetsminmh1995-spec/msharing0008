import { Skyline } from "./Skyline";
import type { SkylineSegmentPool } from "./SkylineSegmentPool";
/** @internal */
export declare enum StaffSide {
    Top = 0,
    Bottom = 1
}
/**
 * Bar-local Skyline pair (renderer-local x).
 * @internal
 */
export declare class BarLocalSkyline {
    readonly upSky: Skyline;
    readonly downSky: Skyline;
    constructor(xMin: number, xMax: number, pool: SkylineSegmentPool);
    insertPlaced(side: StaffSide, xStart: number, xEnd: number, outerEdgeHeight: number, pad: number): void;
    reset(): void;
}
