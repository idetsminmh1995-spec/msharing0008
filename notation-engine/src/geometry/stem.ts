export type StemDirection = 'up' | 'down';

/** The middle line's Y (Phase 9 convention) for a staff of `numLines` lines -- e.g. -2 for a standard 5-line staff. */
export function middleLineY(numLines: number): number {
  // `0 - (numLines - 1) / 2` rather than `-(numLines - 1) / 2`: at
  // numLines=1 that's `-(0)/2` which is JavaScript's -0, not a clean 0
  // (same issue Phase 9's computeStaffGeometry hit and fixed the same way).
  return 0 - (numLines - 1) / 2;
}

/**
 * §9.8's automatic rule: a note ABOVE the middle line (more negative Y)
 * gets a stem pointing DOWN; a note on or below it gets a stem pointing UP.
 */
export function automaticStemDirection(position: number, staffMiddleLineY: number): StemDirection {
  return position < staffMiddleLineY ? 'down' : 'up';
}

/**
 * For a chord (multiple simultaneous positions sharing one stem), the
 * automatic direction is decided by whichever note sits FURTHEST from the
 * middle line -- not by averaging or by any individual note in isolation.
 */
export function chordStemDirection(
  positions: readonly number[],
  staffMiddleLineY: number,
): StemDirection {
  const [first, ...rest] = positions;
  if (first === undefined) {
    throw new Error('chordStemDirection needs at least one position');
  }
  let chosen = first;
  let maxDistance = Math.abs(first - staffMiddleLineY);
  for (const p of rest) {
    const distance = Math.abs(p - staffMiddleLineY);
    if (distance > maxDistance) {
      maxDistance = distance;
      chosen = p;
    }
  }
  return automaticStemDirection(chosen, staffMiddleLineY);
}

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
export function resolveStemDirection(input: StemDirectionInput): StemDirection {
  if (input.forcedDirection !== undefined) return input.forcedDirection;
  if (input.explicitDirection !== undefined) return input.explicitDirection;
  return chordStemDirection(input.positions, middleLineY(input.numLines));
}

/**
 * Exported (not just module-private) because Phase 24's beam geometry
 * needs this exact "natural, unbeamed" length as its own reference point
 * -- beam endpoints are computed from where each note's stem would end
 * WITHOUT the far-note middle-line-reaching extension computeStemLength
 * below applies, per §9.13.
 */
export const DEFAULT_STEM_LENGTH = 3.5;
const MIN_STEM_LENGTH = 2.5;

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
export function computeStemLength(
  notePosition: number,
  staffMiddleLineY: number,
  direction: StemDirection,
): number {
  const signedDistance = notePosition - staffMiddleLineY;
  const requiredToReachMiddle = Math.abs(signedDistance);

  // 'up' decreases Y (moves higher up the page); 'down' increases it.
  // The stem heads TOWARD the middle exactly when that movement would
  // shrink |signedDistance| -- i.e. the note sits on the side the
  // direction is moving away FROM, not the side it's heading TO.
  const headingTowardMiddle =
    (direction === 'down' && signedDistance <= 0) || (direction === 'up' && signedDistance >= 0);

  if (headingTowardMiddle) {
    return Math.max(DEFAULT_STEM_LENGTH, requiredToReachMiddle, MIN_STEM_LENGTH);
  }

  // Heading away: shorten by exactly how far outside the staff's own
  // edge the notehead already sits on this side (0 if it's still
  // within the staff -- middleLineY's own magnitude is the staff's
  // half-extent, e.g. 2sp for a standard 5-line staff).
  const staffHalfExtent = Math.abs(staffMiddleLineY);
  const beyondStaff = Math.max(0, requiredToReachMiddle - staffHalfExtent);
  return Math.max(DEFAULT_STEM_LENGTH - beyondStaff, MIN_STEM_LENGTH);
}
