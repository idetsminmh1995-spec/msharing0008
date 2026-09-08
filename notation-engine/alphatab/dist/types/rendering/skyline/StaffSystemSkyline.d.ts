import { StaffSide } from "./BarLocalSkyline";
import { Skyline } from "./Skyline";
import type { SkylineSegmentPool } from "./SkylineSegmentPool";
/**
 * Skyline pair for system-level placement. Assembled by unioning per-bar
 * local skylines shifted by `renderer.x`.
 * @internal
 */
export declare class StaffSystemSkyline {
    readonly staffIndex: number;
    readonly systemIndex: number;
    readonly upSky: Skyline;
    readonly downSky: Skyline;
    constructor(staffIndex: number, systemIndex: number, xMin: number, xMax: number, pool: SkylineSegmentPool);
    insertPlaced(side: StaffSide, xStart: number, xEnd: number, outerEdgeHeight: number, pad: number): void;
    reset(): void;
}
