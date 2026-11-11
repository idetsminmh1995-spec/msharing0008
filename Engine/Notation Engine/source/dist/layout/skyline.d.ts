/**
 * §15's skyline: for one side of a staff, an ordered list of
 * `{ xStart, xEnd, y }` segments describing the OUTERMOST extent of
 * everything already placed there. "Outermost" for a `'north'`
 * (above-the-staff) skyline means the SMALLEST y (this engine's own
 * established convention throughout -- confirmed empirically in
 * Integration A -- has "up" as smaller/more-negative y, and that holds
 * just as much across a whole system of stacked staves as it does
 * within one); for `'south'` it means the LARGEST y.
 */
export type SkylineSide = 'north' | 'south';
export interface SkylineSegment {
    readonly xStart: number;
    readonly xEnd: number;
    readonly y: number;
}
/** Segments are sorted by xStart, non-overlapping. A gap between two segments (or before the first/after the last) means nothing has been placed there yet -- not a segment with some default y. */
export interface Skyline {
    readonly side: SkylineSide;
    readonly segments: readonly SkylineSegment[];
}
export declare function emptySkyline(side: SkylineSide): Skyline;
/**
 * §15.1's `addToSkyline`: merges `shape`'s bounding segment into the
 * skyline, taking the extreme y wherever the new shape's x-range
 * overlaps existing coverage. Implemented as a sweep over every
 * critical x-boundary (every existing segment's own edges, plus the new
 * shape's own edges) rather than a direct segment-by-segment patch --
 * the new shape can partially overlap several existing segments at
 * once, split some of them, and fill gaps between others, and a sweep
 * handles all of those cases uniformly rather than as separate special
 * cases.
 */
export declare function addToSkyline(skyline: Skyline, shape: SkylineSegment): Skyline;
/**
 * §15.1's `minDistance`: the smallest vertical gap between two
 * skylines, across their overlapping x-range only (x-ranges with no
 * coverage on both sides contribute nothing -- there is no meaningful
 * "gap" where neither skyline has any content). Computed as `b.y - a.y`
 * at each overlapping sub-range, NOT an absolute value -- a genuinely
 * negative result means the two skylines already overlap there.
 *
 * This answers "given two skylines ALREADY expressed in one shared
 * coordinate frame (e.g. two marks placed above the same staff, both
 * using that staff's own absolute y), how close do they actually come."
 * It is deliberately NOT used to compute the distance between two
 * DIFFERENT staves' own skylines -- see `computeStaffDistance` in
 * `skyline-placement.ts` for why that needs a different calculation
 * (each staff's skyline is in its OWN frame; their relationship is
 * exactly the unknown quantity being solved for).
 */
export declare function minDistance(a: Skyline, b: Skyline): number | undefined;
