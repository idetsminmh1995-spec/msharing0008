/**
 * augmentation-dot.ts -- where a dotted note's dots go.
 *
 * A dot was the one thing in a `Duration` this engine computed with and
 * never drew: `duration.dots` reached the tick maths, the beam grouping
 * and the playback timeline, and then the notehead was drawn without
 * it. A dotted quarter and a quarter came out as the same picture.
 *
 * The rule is small and old. A dot sits to the RIGHT of the notehead,
 * in a SPACE: if the note is already in a space the dot stays on its own
 * line of sight, and if the note is on a staff line the dot moves up
 * half a space into the space above it, because a dot drawn on a line
 * cannot be seen. Further dots follow the first, evenly spaced.
 *
 * The distances are MuseScore's own (`musescore/style.ts`):
 * `dotNoteDistance` 0.5sp from the notehead, `dotDotDistance` 0.65sp
 * between dots, and `dotRestDistance` 0.25sp for a rest, which has no
 * notehead to clear.
 */

import { MUSESCORE_STYLE } from '../musescore/style.js';

/** The SMuFL glyph for one augmentation dot. */
export function augmentationDotGlyphName(): string {
  return 'augmentationDot';
}

/** From the notehead's right edge to the first dot. */
export const DOT_NOTE_DISTANCE = MUSESCORE_STYLE.note.dotNoteDistance;
/** Between one dot and the next. */
export const DOT_DOT_DISTANCE = MUSESCORE_STYLE.note.dotDotDistance;
/** From a REST's right edge to its first dot -- closer, since a rest has no notehead to clear. */
export const DOT_REST_DISTANCE = MUSESCORE_STYLE.note.dotRestDistance;

export interface DotPlacement {
  readonly x: number;
  /** In staff positions, the same units as a notehead's own `position`. */
  readonly position: number;
}

/**
 * The staff position a dot takes for a note (or rest) sitting at
 * `position`.
 *
 * Staff positions here run in half-spaces, with whole numbers on the
 * LINES (0 is the bottom line, -4 the top one) and halves in the
 * spaces. So "is this note on a line?" is "is its position a whole
 * number?", and a dot that would land on a line moves up half a space
 * to the space above.
 */
export function dotPosition(position: number): number {
  return Number.isInteger(position) ? position - 0.5 : position;
}

/**
 * Every dot for one note or rest, left to right.
 *
 * `rightEdge` is where the notehead (or rest glyph) ends -- the dots
 * start a fixed distance past it, so a wide notehead pushes its own
 * dots further right without any caller having to know which glyph was
 * drawn.
 */
export function dotPlacements(
  dots: number,
  rightEdge: number,
  position: number,
  kind: 'note' | 'rest' = 'note',
): readonly DotPlacement[] {
  if (dots <= 0) return [];
  const first = rightEdge + (kind === 'rest' ? DOT_REST_DISTANCE : DOT_NOTE_DISTANCE);
  const y = dotPosition(position);
  const placements: DotPlacement[] = [];
  for (let i = 0; i < dots; i++) {
    placements.push({ x: first + i * DOT_DOT_DISTANCE, position: y });
  }
  return placements;
}

/**
 * A chord's dots.
 *
 * Every member gets its own dots, but they share ONE column -- measured
 * from the WIDEST notehead in the chord, so a chord whose notes sit on
 * both sides of its stem still has its dots in a straight line rather
 * than stepped. That is how it is engraved, and it is also the only way
 * the dots of a second (two notes one step apart, drawn on opposite
 * sides of the stem) end up readable.
 *
 * Two members whose dots would land in the SAME space -- a second, where
 * one note is on a line and its neighbour in the space above -- would
 * otherwise print one dot on top of the other. The lower of the two is
 * pushed down a space instead, which is what an engraver does.
 */
export function chordDotPlacements(
  dots: number,
  rightEdge: number,
  positions: readonly number[],
): readonly DotPlacement[] {
  if (dots <= 0 || positions.length === 0) return [];
  // Highest first (a smaller position is higher up the staff), so a
  // clash is resolved downward, away from the notes already placed.
  const ordered = [...positions].sort((a, b) => a - b);
  const taken = new Set<number>();
  const rows: number[] = [];
  for (const position of ordered) {
    let y = dotPosition(position);
    while (taken.has(y)) y += 1;
    taken.add(y);
    rows.push(y);
  }

  const first = rightEdge + DOT_NOTE_DISTANCE;
  const placements: DotPlacement[] = [];
  for (const y of rows) {
    for (let i = 0; i < dots; i++) {
      placements.push({ x: first + i * DOT_DOT_DISTANCE, position: y });
    }
  }
  return placements;
}
