import type { RenderStaff } from "./staves/RenderStaff";
/**
 * Priority-ordered skyline oracle that positions every {@link EffectBand} on
 * a staff line. Fires from {@link RenderStaff.finalizeStaff}.
 * @internal
 */
export declare class EffectSystemPlacement {
    private readonly _staff;
    private readonly _top;
    private readonly _bottom;
    private readonly _contentTop;
    private readonly _contentBottom;
    private readonly _groupBands;
    private readonly _groupXStarts;
    private readonly _groupXEnds;
    private readonly _xRangeScratch;
    constructor(staff: RenderStaff);
    placeAndApply(): void;
    /** Sort by precomputed {@link EffectBand.sortKey} (placementCategory, order desc, voice, renderer). */
    private static _sortByPriority;
    private _placeSide;
}
