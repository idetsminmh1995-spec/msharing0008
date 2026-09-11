/** The real SMuFL accidental glyph for an alter value. Throws for anything outside double-flat..double-sharp (microtonal accidentals are a future extension, see Phase 3's Pitch.alter comment). */
export function accidentalGlyphName(alter: number): string {
  switch (alter) {
    case -2:
      return 'accidentalDoubleFlat';
    case -1:
      return 'accidentalFlat';
    case 0:
      return 'accidentalNatural';
    case 1:
      return 'accidentalSharp';
    case 2:
      return 'accidentalDoubleSharp';
    default:
      throw new Error(`No accidental glyph for alter=${alter} (only -2..2 are supported).`);
  }
}

export interface AccidentalPlacement {
  /** Which column this accidental sits in: 0 is closest to the notehead, higher numbers are further left. */
  readonly column: number;
  /** The Y this accidental was placed at -- the same value passed in, returned for convenience. */
  readonly y: number;
}

/**
 * §9.11's stacking rule for a chord's several accidentals: sort by pitch
 * descending (highest Y magnitude toward the top first -- i.e. most
 * negative Y first, since higher pitch = more negative Y), then place
 * each in the leftmost column where it doesn't vertically collide (within
 * 2.5sp) with an already-placed accidental in that column, opening a new
 * column if none fits.
 *
 * Returns placements in the SAME order as the input `positions` array
 * (not sorted order) so callers can zip the result back against their
 * original note list directly.
 */
export function assignAccidentalColumns(
  positions: readonly number[],
): readonly AccidentalPlacement[] {
  const COLLISION_DISTANCE = 2.5;

  const entries = positions.map((y, index) => ({ y, index }));
  entries.sort((a, b) => a.y - b.y); // ascending Y = descending pitch (highest/most-negative first)

  const columnContents: number[][] = [];
  const result: AccidentalPlacement[] = positions.map((y) => ({ column: -1, y }));

  for (const entry of entries) {
    let placedColumn = -1;
    for (let c = 0; c < columnContents.length; c++) {
      const existing = columnContents[c];
      if (existing === undefined) continue;
      const collides = existing.some(
        (existingY) => Math.abs(existingY - entry.y) < COLLISION_DISTANCE,
      );
      if (!collides) {
        placedColumn = c;
        break;
      }
    }
    if (placedColumn === -1) {
      placedColumn = columnContents.length;
      columnContents.push([]);
    }
    columnContents[placedColumn]?.push(entry.y);
    result[entry.index] = { column: placedColumn, y: entry.y };
  }

  return result;
}

/**
 * §9.11's horizontal placement: immediately left of the notehead's own
 * left edge (`noteX` -- the same drawing-origin convention as every other
 * glyph in this engine, confirmed against noteheadBlack's own bounding box
 * having its left edge at x=0), with a 0.16sp gap, and each additional
 * column (from assignAccidentalColumns) stepping one more accidental-width
 * further left again.
 */
export function accidentalX(noteX: number, accidentalWidth: number, column: number): number {
  const GAP = 0.16;
  return noteX - GAP - accidentalWidth * (column + 1);
}
