import { type Skyline, type SkylineSide } from './skyline.js';
export interface PlaceElementResult {
    readonly y: number;
    readonly skyline: Skyline;
}
/**
 * §15.1's four-step placement procedure, steps 2-4 (step 1, "compute its
 * default offset for its type," is the caller's own job -- it depends
 * on the element's category, e.g. a dynamic's default offset is nothing
 * this generic function should know about):
 * query the skyline over the element's x-range; if `defaultY` would
 * collide, push it outward just enough to clear plus `padding`; add the
 * placed element to the skyline.
 */
export declare function placeElement(skyline: Skyline, xStart: number, xEnd: number, defaultY: number, padding: number): PlaceElementResult;
/**
 * §15.2's alignment groups: some element types must stay on one line
 * even if only one member needed pushing -- lyrics always, and
 * dynamics/hairpins when adjacent. After the per-element placement
 * pass, the group takes its most-extreme member's own y -- the same
 * "more extreme" comparison the skyline itself uses (smaller for
 * north, larger for south), so a group and an individually-placed
 * element behave consistently.
 */
export declare function alignedGroupY(side: SkylineSide, memberYs: readonly number[]): number;
/**
 * §15.1's staff-distance formula:
 * `max(config.minStaffDistance, upperSouth.minDistance(lowerNorth))`.
 *
 * This is NOT implemented by calling `minDistance` directly on the two
 * skylines as given. `minDistance` (above) answers "the smallest gap
 * between two skylines already expressed in one SHARED coordinate
 * frame" -- exactly right for comparing two things placed above/below
 * the SAME staff, whose positions are already both known. But two
 * ADJACENT STAVES' own skylines are each expressed relative to THEIR
 * OWN staff (upperSouth's y is a real distance below upper's own
 * bottom line; lowerNorth's y is a real distance above lower's own top
 * line) -- their relationship is exactly what this function exists to
 * determine, so calling `minDistance` on them directly would compare
 * two values in two different, not-yet-related frames, and the result
 * would depend on an arbitrary, meaningless choice of reference point.
 *
 * Instead: at any x where both skylines have content, the two staves
 * must be at least `upperSouth's own downward reach + lowerNorth's own
 * upward reach` apart to avoid that content overlapping -- the required
 * distance is the MAXIMUM of that sum across every such x (the single
 * tightest point governs, since the staff distance is one shared
 * number for the whole system, not adjustable per x).
 */
export declare function computeStaffDistance(upperSouth: Skyline, lowerNorth: Skyline, minStaffDistance: number): number;
