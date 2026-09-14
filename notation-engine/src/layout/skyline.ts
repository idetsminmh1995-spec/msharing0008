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

export function emptySkyline(side: SkylineSide): Skyline {
  return { side, segments: [] };
}

/** Whichever of two y values is more extreme for this skyline's own side -- smaller for north, larger for south. */
function moreExtreme(side: SkylineSide, a: number, b: number): number {
  return side === 'north' ? Math.min(a, b) : Math.max(a, b);
}

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
export function addToSkyline(skyline: Skyline, shape: SkylineSegment): Skyline {
  if (shape.xEnd <= shape.xStart) return skyline;

  const boundaries = new Set<number>([shape.xStart, shape.xEnd]);
  for (const seg of skyline.segments) {
    boundaries.add(seg.xStart);
    boundaries.add(seg.xEnd);
  }
  const sorted = [...boundaries].sort((a, b) => a - b);

  const rawSegments: SkylineSegment[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const xStart = sorted[i];
    const xEnd = sorted[i + 1];
    if (xStart === undefined || xEnd === undefined || xEnd <= xStart) continue;

    const existing = skyline.segments.find((s) => s.xStart <= xStart && s.xEnd >= xEnd);
    const shapeCoversHere = shape.xStart <= xStart && shape.xEnd >= xEnd;

    let y: number | undefined;
    if (existing !== undefined && shapeCoversHere) {
      y = moreExtreme(skyline.side, existing.y, shape.y);
    } else if (existing !== undefined) {
      y = existing.y;
    } else if (shapeCoversHere) {
      y = shape.y;
    }
    if (y !== undefined) rawSegments.push({ xStart, xEnd, y });
  }

  // Merge adjacent sub-intervals that ended up with the same y --
  // keeps the segment list from growing unboundedly as more shapes are
  // added, without changing what the skyline actually describes.
  const merged: SkylineSegment[] = [];
  for (const seg of rawSegments) {
    const last = merged[merged.length - 1];
    if (last !== undefined && last.xEnd === seg.xStart && last.y === seg.y) {
      merged[merged.length - 1] = { xStart: last.xStart, xEnd: seg.xEnd, y: seg.y };
    } else {
      merged.push(seg);
    }
  }

  return { side: skyline.side, segments: merged };
}

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
export function minDistance(a: Skyline, b: Skyline): number | undefined {
  let result: number | undefined;
  for (const segA of a.segments) {
    for (const segB of b.segments) {
      const xStart = Math.max(segA.xStart, segB.xStart);
      const xEnd = Math.min(segA.xEnd, segB.xEnd);
      if (xEnd <= xStart) continue;
      const gap = segB.y - segA.y;
      result = result === undefined ? gap : Math.min(result, gap);
    }
  }
  return result;
}
