/**
 * anatomy.ts — what a hand IS, before anything is drawn.
 *
 * Every measurement here is in WHITE KEY WIDTHS. A white key is 23mm,
 * which makes it the natural ruler for a hand on a keyboard: a palm is
 * 85mm across the knuckles, so it is 3.7 keys; a hand spans an octave
 * because an octave is 165mm and a stretched hand is 200mm. Writing
 * the hand in keys rather than in pixels is what keeps it in
 * proportion to the instrument in any frame, at any size, which is the
 * one thing a drawn hand must never get wrong.
 *
 * The numbers are a real hand's, with one correction: these are the
 * lengths as seen FROM ABOVE of a hand that is playing. A playing
 * hand's fingers are curled, so an 80mm middle finger covers about
 * 70mm of key. That is the number here, because that is the number the
 * drawing needs.
 *
 * Nothing in this file knows about pixels, keyboards, SVG or time.
 */

/** Thumb, index, middle, ring, little. */
export type Finger = 1 | 2 | 3 | 4 | 5;

/** A point in HAND SPACE: the origin is the middle knuckle, +y is
 * towards the player, +x is towards the little finger. */
export interface HandPoint {
  readonly x: number;
  readonly y: number;
}

/** Across the knuckles. */
export const PALM_WIDTH = 3.6;
/** Knuckle line to the heel of the palm. */
export const PALM_LENGTH = 3.3;
/** How far behind the keys' front edge the knuckles rest. */
export const KNUCKLE_FROM_FRONT = 1.95;

/** How far the rounded heel bulges past the wrist point when drawn. */
export const HEEL_BULGE = 0.75;

/**
 * How far a hand reaches PAST the front edge of the keys.
 *
 * The strip of frame the keyboard has to leave for the hands is this
 * wide and no wider -- a number that belongs to the hand, not to the
 * page, so the layout cannot drift away from the anatomy.
 */
export const REACH_PAST_KEYS = PALM_LENGTH - KNUCKLE_FROM_FRONT + HEEL_BULGE;

/**
 * Each finger, as it is when it is playing.
 *
 * `length` is knuckle to tip seen from above; `thick` is across the
 * finger; `curl` is how much shorter it goes when it is not playing,
 * and `stretch` how much further it can reach when it is. A finger
 * that needs more than its stretch does not get it -- the HAND moves
 * instead, which is what a player does and what `pose.ts` works out.
 */
export const FINGERS: Readonly<
  Record<Finger, { length: number; thick: number; curl: number; stretch: number; splay: number }>
> = {
  1: { length: 2.5, thick: 0.86, curl: 0.1, stretch: 1.3, splay: 0.8 }, // thumb
  2: { length: 2.75, thick: 0.66, curl: 0.08, stretch: 1.18, splay: 0.4 }, // index
  3: { length: 3.0, thick: 0.68, curl: 0.08, stretch: 1.18, splay: 0.34 }, // middle
  4: { length: 2.85, thick: 0.64, curl: 0.09, stretch: 1.18, splay: 0.4 }, // ring
  5: { length: 2.35, thick: 0.58, curl: 0.1, stretch: 1.2, splay: 0.52 }, // little
};

export const ALL_FINGERS: readonly Finger[] = [1, 2, 3, 4, 5];

/**
 * How far the whole hand may turn on the keys.
 *
 * A wrist turns; it does not swivel. Eighteen degrees is about what a
 * player uses to put the thumb under or the little finger over, and
 * past it the drawing stops looking like a hand on a keyboard.
 *
 * How far each FINGER may swing away from the hand's own direction is
 * its own number, in `FINGERS` above: a thumb abducts a very long way,
 * a middle finger hardly at all. Between them, the turn and the splay
 * are what let a hand span an octave -- which is exactly the reach a
 * hand is supposed to have, and the reason an octave is as wide as
 * music asks one hand to be.
 */
export const MAX_TURN = 0.32;

/**
 * Where a finger leaves the hand.
 *
 * The four fingers come off the knuckle line, which arches forward a
 * little in the middle -- that is why the middle finger reaches
 * furthest even before its own length is counted. The thumb does not:
 * its joint is down beside the heel of the palm, which is why a thumb
 * swings across the hand rather than reaching out from it, and why a
 * hand playing with its thumb has to TURN.
 *
 * `side` is -1 when this hand's thumb is on its left (a right hand) and
 * +1 when it is on its right (a left hand).
 */
export function knuckle(finger: Finger, side: -1 | 1): HandPoint {
  if (finger === 1) return { x: side * (PALM_WIDTH * 0.5 + 0.05), y: 1.35 };
  const spacing = (PALM_WIDTH * 0.86) / 3;
  const across = -side * (finger - 3.5) * spacing;
  // The knuckle arch: the middle two sit a touch further from the
  // player than the outer two.
  const arch = -0.16 * (1 - Math.abs(finger - 3.5) / 1.5);
  return { x: across, y: arch };
}

/** The heel of the palm, where the hand meets the wrist. */
export function heel(): HandPoint {
  return { x: 0, y: PALM_LENGTH };
}
