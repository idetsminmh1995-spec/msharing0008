/** One ledger line, at a given staff-space Y (Phase 9's bottom-line-at-0 convention). */
export interface LedgerLine {
  readonly y: number;
}

/**
 * Computes which ledger lines a note at `position` needs, for a staff with
 * `numLines` lines (occupying y = 0 … −(numLines−1)).
 *
 * A note exactly ON an integer y beyond the staff needs a ledger line AT
 * that y. A note in the space just beyond the staff (the first half-step
 * past the last real line) needs none — there's nothing to mark yet. A note
 * further out, in a space beyond the first ledger position, still needs
 * every ledger line between the staff and itself, inclusive of the nearest
 * one to the staff, even though the note itself isn't sitting on that line
 * (e.g. a note in the second space above the staff needs the first ledger
 * line drawn below it, for the same reason the staff's own space notes
 * don't need lines redrawn under them).
 */
export function computeLedgerLines(position: number, numLines: number): readonly LedgerLine[] {
  if (!Number.isInteger(numLines) || numLines < 1) {
    throw new Error(`numLines must be a positive integer, got ${numLines}`);
  }
  // `0 - (numLines - 1)` rather than `-(numLines - 1)`: at numLines=1
  // that's `-(0)`, JavaScript's -0. Doesn't currently escape into any
  // returned value here (only used in a comparison and as a subtraction
  // base, both of which normalize away from -0), but kept consistent
  // with the same fix in Phase 9's computeStaffGeometry and Phase 16's
  // middleLineY rather than leaving a third differently-styled instance
  // of the identical shape.
  const topLine = 0 - (numLines - 1);
  const lines: LedgerLine[] = [];

  if (position > 0) {
    const last = Math.floor(position);
    for (let y = 1; y <= last; y++) {
      lines.push({ y });
    }
  } else if (position < topLine) {
    const last = Math.ceil(position);
    for (let y = topLine - 1; y >= last; y--) {
      lines.push({ y });
    }
  }

  return lines;
}
