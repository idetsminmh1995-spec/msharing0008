export interface PartStaffPosition {
    readonly partIndex: number;
    readonly staffIndexInPart: number;
    readonly y: number;
}
export interface SystemLayout {
    readonly positions: readonly PartStaffPosition[];
}
/**
 * §9.18's vertical stacking: every part's own staff (or staves, for a
 * braced multi-staff part -- geometry's `needsBrace`) gets a distinct,
 * non-overlapping Y, parts stacked top to bottom in score order. Gaps
 * are fixed defaults, not content-aware -- §15's skyline (itself still
 * `[TODO]`) is what would make this respect actual content extents;
 * this is the same "deliberately naive, thrown away later" spirit as
 * Phase 21's `naiveMeasureLayout`.
 */
export declare function computeSystemLayout(partStaffCounts: readonly number[], staffGap?: number, partGap?: number): SystemLayout;
/**
 * Phase 44 wiring: the same vertical stacking as `computeSystemLayout`,
 * but the gap AFTER a given staff (before the next staff within the
 * same part) is supplied per-pair by `staffGapForPair`, rather than one
 * fixed value applied everywhere. This is the "§15's skyline is what
 * would make this respect actual content extents" the plain function's
 * own docstring names -- kept as a separate, additive function instead
 * of changing `computeSystemLayout`'s signature, so every existing
 * caller (including its own tests) is completely unaffected.
 */
export declare function computeSystemLayoutVariableGaps(partStaffCounts: readonly number[], staffGapForPair: (partIndex: number, staffIndexInPart: number) => number, partGap?: number): SystemLayout;
