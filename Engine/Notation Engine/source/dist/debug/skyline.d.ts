import type { DebugBox } from './measure.js';
/**
 * Phase 51/§18.3: "`config.debug.drawSkyline` overlays the north/south
 * skylines (§15)."
 *
 * §15's skyline is "the highest point of content at every x", per staff
 * and per side. Here it is derived from the SAME measured boxes the
 * bounding-box overlay draws, which is what keeps the two overlays
 * honest about each other: a skyline that disagreed with the boxes under
 * it would be worse than no skyline at all.
 *
 * Boxes are assigned to the staff whose bottom line their own vertical
 * centre is nearest. That is a heuristic, and it is the right one for a
 * debug overlay: a note sitting between two staves of a grand staff
 * genuinely belongs to whichever it was drawn for, and nothing in the
 * emitted SVG says which -- but "nearest staff" gets it right in every
 * case except deliberately crossed hands, where the ambiguity is the
 * point.
 */
export interface DebugSkylineSegment {
    readonly xStart: number;
    readonly xEnd: number;
    /** Absolute SVG y of the content's own edge on this side. */
    readonly y: number;
}
export interface DebugStaffSkyline {
    /** The staff's own bottom-line y, as passed in. */
    readonly staffBottomY: number;
    /** Above the staff: the smallest (highest on the page) y at each x. */
    readonly north: readonly DebugSkylineSegment[];
    /** Below the staff: the largest (lowest on the page) y at each x. */
    readonly south: readonly DebugSkylineSegment[];
}
/**
 * One north and one south skyline per staff, from the measured boxes.
 *
 * `staffBottomYs` are the absolute y of each staff's bottom line, in the
 * order the caller wants the result in -- the renderer passes every staff
 * of every system, so a page-mode score gets a skyline per staff per
 * system rather than one averaged over the page.
 */
export declare function computeDebugSkylines(boxes: readonly DebugBox[], staffBottomYs: readonly number[], sampleWidth?: number): readonly DebugStaffSkyline[];
