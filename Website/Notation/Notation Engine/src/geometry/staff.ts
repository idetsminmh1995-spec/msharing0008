/**
 * A staff's line positions, in staff-space units. The bottom line is
 * always at y=0, with higher lines at increasingly NEGATIVE y -- this
 * deliberately matches the SMuFL glyph-origin convention (a glyph's own
 * y=0 represents the middle of the bottom staff line, per the SMuFL
 * spec's scoring-metrics section, confirmed while writing Phase 6). Using
 * the same y=0 reference for both staff lines and glyphs means a note
 * glyph placed "on line N" uses exactly this geometry's lineYPositions[N]
 * with no separate offset/flip to reconcile between the two.
 */
export interface StaffGeometry {
  readonly numLines: number;
  /** Y-coordinates of each line, ordered bottom-to-top: index 0 is the bottom line (y=0), later indices are higher (more negative). */
  readonly lineYPositions: readonly number[];
  /** Total vertical span from bottom line to top line, in staff spaces. Zero for a 1-line staff. */
  readonly height: number;
  /** The gap between two adjacent lines, in staff spaces. One, except on tablature. */
  readonly lineDistance: number;
}

/**
 * Computes a staff's line geometry for any line count -- 5 for a standard
 * staff, 1 for a single-line percussion staff, 6 for a tab staff, or
 * anything else a particular instrument/notation style calls for
 * (PLAN.md Phase 9 explicitly calls out 1-6 lines as all needing to work
 * from day one, not just the 5-line default).
 *
 * `lineDistance` is the gap between two adjacent lines, and it is not
 * always one staff space: MuseScore's own TAB staff types space their
 * lines 1.5 apart, because a fret number has to fit BETWEEN two lines
 * where a notehead sits across them. Five-line and percussion staves
 * are 1, which is why that is the default.
 */
export function computeStaffGeometry(numLines: number, lineDistance = 1): StaffGeometry {
  if (!Number.isInteger(numLines) || numLines < 1) {
    throw new Error(`numLines must be a positive integer, got ${numLines}`);
  }
  if (!(lineDistance > 0)) {
    throw new Error(`lineDistance must be greater than zero, got ${lineDistance}`);
  }
  const lineYPositions: number[] = [];
  for (let i = 0; i < numLines; i++) {
    // `0 - i` rather than `-i`: at i=0 that produces a clean positive 0,
    // not -0 (JavaScript's unary negation of 0 yields -0, which prints
    // identically but fails strict/deep-equality checks against a plain
    // 0 -- caught by this phase's own test suite).
    lineYPositions.push(0 - i * lineDistance);
  }
  return { numLines, lineYPositions, height: (numLines - 1) * lineDistance, lineDistance };
}
