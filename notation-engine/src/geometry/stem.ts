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

const DEFAULT_STEM_LENGTH = 3.5;
const MIN_STEM_LENGTH = 2.5;

/**
 * §9.8's length rule: default 3.5sp, extended so the stem's far end reaches
 * at least the middle line when the note is far outside the staff, never
 * shortened below 2.5sp (the floor is redundant against the 3.5 default
 * today, since nothing yet shortens a stem below it, but is kept explicit
 * because a future phase -- e.g. beam-slant adjustment -- may shorten
 * stems and must not go below it).
 */
export function computeStemLength(notePosition: number, staffMiddleLineY: number): number {
  const requiredToReachMiddle = Math.abs(notePosition - staffMiddleLineY);
  return Math.max(DEFAULT_STEM_LENGTH, requiredToReachMiddle, MIN_STEM_LENGTH);
}
