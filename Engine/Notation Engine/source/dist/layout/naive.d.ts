/**
 * §16.1's "naive" layout for Phase 21 (the vertical-slice milestone) --
 * fixed width per measure regardless of content. PLAN.md §22's sequencing
 * rules say this explicitly: "Phase 21 exists to be thrown away; do not
 * over-build it." Real proportional spacing (§14) and system/page
 * breaking (§16.2) are Stage 8 (Phase 43-47), which replaces this file
 * entirely rather than extending it.
 */
export interface NaiveMeasureLayout {
    readonly measureNumber: number;
    /** Left edge of this measure, in staff-space units. */
    readonly x: number;
    readonly width: number;
}
/** Lays out `measureCount` measures left to right at a fixed width each, starting at x=0. */
export declare function naiveMeasureLayout(measureCount: number, measureWidth?: number): readonly NaiveMeasureLayout[];
