export interface PartStaffPosition {
  readonly partIndex: number;
  readonly staffIndexInPart: number;
  readonly y: number;
}

export interface SystemLayout {
  readonly positions: readonly PartStaffPosition[];
}

const DEFAULT_STAFF_GAP = 8;
/**
 * The gap between two PARTS in the same system, exported because a caller
 * that has to grow it for its own content (Phase 55's lyric rows below
 * one part and chord symbols above the next) needs the floor it is
 * growing FROM, not a second copy of the number.
 */
export const DEFAULT_PART_GAP = 12;

/**
 * §9.18's vertical stacking: every part's own staff (or staves, for a
 * braced multi-staff part -- geometry's `needsBrace`) gets a distinct,
 * non-overlapping Y, parts stacked top to bottom in score order. Gaps
 * are fixed defaults, not content-aware -- §15's skyline (itself still
 * `[TODO]`) is what would make this respect actual content extents;
 * this is the same "deliberately naive, thrown away later" spirit as
 * Phase 21's `naiveMeasureLayout`.
 */
export function computeSystemLayout(
  partStaffCounts: readonly number[],
  staffGap: number = DEFAULT_STAFF_GAP,
  partGap: number = DEFAULT_PART_GAP,
): SystemLayout {
  const positions: PartStaffPosition[] = [];
  let y = 0;
  partStaffCounts.forEach((staffCount, partIndex) => {
    for (let staffIndexInPart = 0; staffIndexInPart < staffCount; staffIndexInPart++) {
      positions.push({ partIndex, staffIndexInPart, y });
      y += staffGap;
    }
    y += partGap - staffGap;
  });
  return { positions };
}

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
export function computeSystemLayoutVariableGaps(
  partStaffCounts: readonly number[],
  staffGapForPair: (partIndex: number, staffIndexInPart: number) => number,
  partGap: number = DEFAULT_PART_GAP,
  /**
   * Phase 55: the gap AFTER each part, when it differs per part. A lyric
   * row under part 1 and a chord symbol above part 2 both live in the
   * same space, and one shared number cannot hold both. Omitted means
   * `partGap` for every part, so every existing caller is unaffected.
   */
  partGapForPart?: (partIndex: number) => number,
): SystemLayout {
  const positions: PartStaffPosition[] = [];
  let y = 0;
  partStaffCounts.forEach((staffCount, partIndex) => {
    for (let staffIndexInPart = 0; staffIndexInPart < staffCount; staffIndexInPart++) {
      positions.push({ partIndex, staffIndexInPart, y });
      if (staffIndexInPart < staffCount - 1) {
        y += staffGapForPair(partIndex, staffIndexInPart);
      }
    }
    y += partGapForPart === undefined ? partGap : partGapForPart(partIndex);
  });
  return { positions };
}
