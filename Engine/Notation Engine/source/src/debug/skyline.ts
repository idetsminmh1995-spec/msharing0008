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

/** The x-width of one skyline sample. Fine enough to show a single notehead's own profile, coarse enough not to emit a segment per hundredth of a staff space. */
const SAMPLE_WIDTH = 0.25;

function nearestStaffIndex(centreY: number, staffBottomYs: readonly number[]): number {
  let best = 0;
  let bestDistance = Infinity;
  staffBottomYs.forEach((y, i) => {
    const d = Math.abs(centreY - y);
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  });
  return best;
}

/** Merges adjacent samples that share a y into one segment, so a flat run is one entry rather than hundreds. */
function toSegments(
  samples: ReadonlyMap<number, number>,
  sampleWidth: number,
): DebugSkylineSegment[] {
  const keys = [...samples.keys()].sort((a, b) => a - b);
  const out: DebugSkylineSegment[] = [];
  for (const key of keys) {
    const y = samples.get(key);
    if (y === undefined) continue;
    const xStart = key * sampleWidth;
    const last = out[out.length - 1];
    if (last !== undefined && last.y === y && Math.abs(last.xEnd - xStart) < 1e-9) {
      out[out.length - 1] = { xStart: last.xStart, xEnd: xStart + sampleWidth, y };
    } else {
      out.push({ xStart, xEnd: xStart + sampleWidth, y });
    }
  }
  return out;
}

/**
 * One north and one south skyline per staff, from the measured boxes.
 *
 * `staffBottomYs` are the absolute y of each staff's bottom line, in the
 * order the caller wants the result in -- the renderer passes every staff
 * of every system, so a page-mode score gets a skyline per staff per
 * system rather than one averaged over the page.
 */
export function computeDebugSkylines(
  boxes: readonly DebugBox[],
  staffBottomYs: readonly number[],
  sampleWidth: number = SAMPLE_WIDTH,
): readonly DebugStaffSkyline[] {
  if (staffBottomYs.length === 0) return [];
  const north = staffBottomYs.map(() => new Map<number, number>());
  const south = staffBottomYs.map(() => new Map<number, number>());

  for (const box of boxes) {
    if (box.width <= 0 && box.height <= 0) continue;
    const staffIndex = nearestStaffIndex(box.y + box.height / 2, staffBottomYs);
    const from = Math.floor(box.x / sampleWidth);
    const to = Math.max(from, Math.ceil((box.x + box.width) / sampleWidth) - 1);
    const n = north[staffIndex];
    const s = south[staffIndex];
    if (n === undefined || s === undefined) continue;
    for (let k = from; k <= to; k++) {
      const currentN = n.get(k);
      if (currentN === undefined || box.y < currentN) n.set(k, box.y);
      const bottom = box.y + box.height;
      const currentS = s.get(k);
      if (currentS === undefined || bottom > currentS) s.set(k, bottom);
    }
  }

  return staffBottomYs.map((staffBottomY, i) => ({
    staffBottomY,
    north: toSegments(north[i] ?? new Map(), sampleWidth),
    south: toSegments(south[i] ?? new Map(), sampleWidth),
  }));
}
