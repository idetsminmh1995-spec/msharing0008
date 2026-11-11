export type StemDirection = 'up' | 'down';
/** The middle line's Y (Phase 9 convention) for a staff of `numLines` lines -- e.g. -2 for a standard 5-line staff. */
export declare function middleLineY(numLines: number): number;
/**
 * §9.8's automatic rule: a note ABOVE the middle line (more negative Y)
 * gets a stem pointing DOWN; a note on or below it gets a stem pointing UP.
 */
export declare function automaticStemDirection(position: number, staffMiddleLineY: number): StemDirection;
/**
 * For a chord (multiple simultaneous positions sharing one stem), the
 * automatic direction is decided by whichever note sits FURTHEST from the
 * middle line -- not by averaging or by any individual note in isolation.
 */
export declare function chordStemDirection(positions: readonly number[], staffMiddleLineY: number): StemDirection;
export interface StemDirectionInput {
    /** One position for a single note, or several for a chord. */
    readonly positions: readonly number[];
    readonly numLines: number;
    /**
     * Tier 1 (highest priority): an explicit per-voice forced direction from
     * config or the parser -- this is what makes the drum hand/foot split
     * work (hands always up, feet always down), overriding everything below.
     */
    readonly forcedDirection?: StemDirection;
    /** Tier 2: an explicit <stem> element from MusicXML for this specific note/chord. */
    readonly explicitDirection?: StemDirection;
}
/** The full §9.8 direction priority chain: forced > explicit XML > automatic (by the chord's outermost note). */
export declare function resolveStemDirection(input: StemDirectionInput): StemDirection;
/**
 * Exported (not just module-private) because Phase 24's beam geometry
 * needs this exact "natural, unbeamed" length as its own reference point
 * -- beam endpoints are computed from where each note's stem would end
 * WITHOUT the far-note middle-line-reaching extension computeStemLength
 * below applies, per §9.13.
 */
export declare const DEFAULT_STEM_LENGTH = 3.5;
/**
 * §9.8's length rule: default 3.5sp, extended so the stem's far end
 * reaches at least the middle line when the note is far outside the
 * staff, shortened never below 2.5sp.
 *
 * The "shortened" half of that rule was a deliberately deferred gap
 * through Phase 16/24 (their own doc records call the 2.5 floor
 * "currently redundant... kept for a future shortening phase") --
 * closed here, once a real case actually needed it: §9.14's forced
 * per-voice direction ("hands up, feet down") can point a stem AWAY
 * from the middle line for a note that already sits outside the staff
 * on that side (a hi-hat pattern sitting above the staff, voice 1
 * always forced up, is exactly this). Extending such a stem further
 * (the existing "reach the middle" branch) makes no sense when the
 * middle line is in the OPPOSITE direction from where the stem is
 * headed -- confirmed as a real, visible bug against a real drum
 * chart, see Doc/integration-o-stem-shortening.md.
 *
 * `direction` decides which branch applies:
 * - **Heading toward the middle** (the ordinary case: automatic
 *   direction always points this way, and this is what the original
 *   "reach the middle" rule was built for) -- unchanged: extend past
 *   3.5sp only as far as needed to reach the middle line, never below
 *   2.5sp either.
 * - **Heading away from the middle** (only reachable via a forced or
 *   explicit direction that disagrees with the note's own automatic
 *   choice) -- shortened below the 3.5sp default by exactly how far
 *   the notehead already lies beyond the staff's own edge on that
 *   side (a note still inside the staff needs no shortening at all),
 *   floored at 2.5sp so it never disappears into the notehead.
 */
export declare function computeStemLength(notePosition: number, staffMiddleLineY: number, direction: StemDirection): number;
