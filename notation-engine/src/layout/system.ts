export interface PartStaffPosition {
  readonly partIndex: number;
  readonly staffIndexInPart: number;
  readonly y: number;
}

export interface SystemLayout {
  readonly positions: readonly PartStaffPosition[];
}

const DEFAULT_STAFF_GAP = 8;
const DEFAULT_PART_GAP = 12;

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
