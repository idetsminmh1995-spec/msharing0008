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
/** The SMuFL glyph for one augmentation dot. */
export declare function augmentationDotGlyphName(): string;
/** From the notehead's right edge to the first dot. */
export declare const DOT_NOTE_DISTANCE: 0.5;
/** Between one dot and the next. */
export declare const DOT_DOT_DISTANCE: 0.65;
/** From a REST's right edge to its first dot -- closer, since a rest has no notehead to clear. */
export declare const DOT_REST_DISTANCE: 0.25;
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
export declare function dotPosition(position: number): number;
/**
 * Every dot for one note or rest, left to right.
 *
 * `rightEdge` is where the notehead (or rest glyph) ends -- the dots
 * start a fixed distance past it, so a wide notehead pushes its own
 * dots further right without any caller having to know which glyph was
 * drawn.
 */
export declare function dotPlacements(dots: number, rightEdge: number, position: number, kind?: 'note' | 'rest'): readonly DotPlacement[];
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
export declare function chordDotPlacements(dots: number, rightEdge: number, positions: readonly number[]): readonly DotPlacement[];
