/**
 * artwork.ts — the hand this engine draws, as the owner drew it.
 *
 * The outline is the owner's own `Hands.svg` (Adobe Illustrator, two
 * mirrored paths on a 2100×2100 canvas), converted once, by hand, into
 * the only form this engine can use: absolute cubic segments in WHITE
 * KEYS, measured from the wrist.
 *
 * Nothing here was drawn by this engine. The earlier procedural hand —
 * an outline assembled from five posed fingers — is gone, and with it
 * the whole class of problem it had: a shape built from parts can
 * always come apart, and no amount of solving stops a drawn thumb from
 * looking drawn. An artist's outline cannot come apart, so the engine's
 * job shrinks to one thing it can actually do well: deciding where the
 * hand goes.
 *
 *
 * HOW THE NUMBERS WERE TAKEN
 *
 * The SVG was rendered in a real browser and its outline sampled with
 * `getPointAtLength`, 4000 points around, which is about one point per
 * unit of a 5715-unit path. The fingertips are the five local minima of
 * that outline's top profile; the wrist is where the forearm's two
 * edges stop narrowing (x bottoms out at 412 on one side and 697 on the
 * other, both at y ≈ 1420).
 *
 *   wrist          (556, 1420) in the artwork's own units
 *   per white key   120 of those units
 *
 * 120 comes from the hand's LENGTH, not its width: wrist crease to
 * middle fingertip is 947 units here, and on a real hand it is about
 * 185mm against a 23.5mm white key — 7.9 keys. Length is the honest
 * anchor because this hand is drawn SPLAYED, which stretches every
 * width measurement and leaves the length alone.
 *
 * The right hand in the file is the left one mirrored, so only the left
 * is stored; `side: -1` draws the other.
 */

import type { Finger } from '../fingering.js';

/** One absolute path command, already in white keys from the wrist. */
export type HandCommand =
  | readonly ['M', number, number]
  | readonly ['C', number, number, number, number, number, number]
  | readonly ['Z'];

/**
 * The hand's outline, left hand, fingers pointing away from the player.
 *
 * x runs along the keyboard (positive toward the player's right), y
 * away from the player and NEGATIVE up the keys, which is the stage's
 * own convention — so the fingertips are at about y = -7.9 and the
 * forearm runs off the bottom at y = +2.6.
 */
export const HAND_OUTLINE: readonly HandCommand[] = [
  ['M', -0.2133, -4.3908],
  ['C', -0.2133, -4.3908, -0.0117, -4.4083, -0.0117, -4.4083],
  ['C', -0.0092, -4.5483, 0.1292, -5.0967, 0.1567, -5.4525],
  ['C', 0.1825, -5.7908, 0.3158, -6.1208, 0.3558, -6.465],
  ['C', 0.3967, -6.815, 0.4, -7.2592, 0.5875, -7.4675],
  ['C', 0.7017, -7.595, 0.8983, -7.6433, 1.0575, -7.5317],
  ['C', 1.2083, -7.4258, 1.2033, -7.2475, 1.1992, -6.9925],
  ['C', 1.1858, -6.2392, 1.0142, -5.2992, 0.9192, -4.5433],
  ['C', 0.9108, -4.4733, 0.8908, -4.3875, 0.8925, -4.2767],
  ['C', 0.895, -4.0525, 1.0108, -3.4733, 1.0858, -3.2733],
  ['C', 1.2908, -2.7258, 1.59, -3.2642, 1.6967, -3.5258],
  ['C', 1.9333, -4.1083, 2.3783, -4.7092, 3.0825, -4.645],
  ['C', 3.1817, -4.6358, 3.2825, -4.6117, 3.3225, -4.5042],
  ['C', 3.4158, -4.2517, 3.2783, -4.0508, 3.12, -3.865],
  ['C', 2.4475, -3.0742, 2.455, -3.1258, 2.2467, -2.1375],
  ['C', 2.1142, -1.6367, 1.6967, -1.2492, 1.355, -0.8292],
  ['C', 1.15, -0.5767, 1.0858, -0.6058, 1.1583, -0.1825],
  ['C', 1.1892, -0.0033, 1.45, 1.4067, 1.6667, 2.5967],
  ['C', 1.6667, 2.5967, -0.9975, 2.5967, -0.9975, 2.5967],
  ['C', -1.0808, 1.395, -1.1817, -0.0425, -1.265, -0.2133],
  ['C', -1.265, -0.2133, -2.0725, -1.69, -2.0725, -1.69],
  ['C', -2.1883, -1.9458, -2.2908, -2.2792, -2.3542, -2.5592],
  ['C', -2.3542, -2.5592, -2.8558, -3.7583, -2.8558, -3.7583],
  ['C', -3.0583, -4.1125, -3.5733, -5.035, -3.5758, -5.35],
  ['C', -3.5783, -5.7033, -3.255, -5.7767, -3.0783, -5.5183],
  ['C', -2.7375, -5.02, -2.1317, -4.1683, -1.9592, -3.7708],
  ['C', -1.8183, -3.7858, -1.9592, -3.7667, -1.825, -3.8383],
  ['C', -1.825, -3.8383, -2.0142, -4.405, -2.0142, -4.405],
  ['C', -2.205, -4.9667, -2.3175, -5.6408, -2.49, -6.2817],
  ['C', -2.5525, -6.5142, -2.6683, -7.0533, -2.4217, -7.1667],
  ['C', -2.2742, -7.235, -2.0817, -7.1858, -1.9933, -7.095],
  ['C', -1.9042, -7.0033, -1.8642, -6.8375, -1.8317, -6.7],
  ['C', -1.6308, -5.8617, -1.3308, -5.1683, -1.1208, -4.3417],
  ['C', -1.1017, -4.3758, -1.1883, -6.9042, -1.2075, -7.0325],
  ['C', -1.37, -8.12, -0.5967, -8.1317, -0.485, -7.3108],
  ['C', -0.4308, -6.9142, -0.2792, -5.73, -0.2817, -5.3833],
  ['C', -0.2825, -5.0217, -0.2767, -4.685, -0.2133, -4.3908],
];

/**
 * Where each fingertip sits on that outline, in the same units.
 *
 * Read off the sampled outline rather than guessed. For the four long
 * fingers a tip is the local minimum of the outline's TOP profile,
 * because they point up the keys. The THUMB does not: it comes off the
 * side of the hand and points sideways, so its tip is the outline's
 * extreme in X instead -- (958, 890) in the drawing's own units.
 * Taking it off the top profile like the others put it 46 units short,
 * at the thumb's upper corner rather than at its pad, and the mark on
 * the pressing fingertip landed just outside the drawing.
 *
 * These are what the placement fit aims at the keys, so they have to be
 * the real tips of the real drawing and not an idea of where a tip
 * ought to be.
 */
export const ARTWORK_TIPS: Readonly<Record<Finger, { readonly x: number; readonly y: number }>> = {
  1: { x: 3.35, y: -4.4167 },
  2: { x: 0.8667, y: -7.5917 },
  3: { x: -0.9, y: -7.8917 },
  4: { x: -2.2667, y: -7.2 },
  5: { x: -3.3333, y: -5.675 },
};

/** The outline's own bounding box, for anything that needs the hand's extent without walking every curve. */
export const ARTWORK_BOX = { minX: -3.58, maxX: 3.42, minY: -8.13, maxY: 2.6 } as const;

/**
 * The drawing is a FLAT hand, held open. A hand at a keyboard is
 * neither, and these two numbers are the difference.
 *
 * PLAY_SCALE_Y is foreshortening, and it is real geometry rather than a
 * fudge: a flat hand measures about 185mm from the wrist crease to the
 * middle fingertip, and the same hand curved over the keys puts that
 * fingertip only about 105mm FORWARD of the wrist. Seen from above --
 * which is how this stage sees it -- that is all the length there is.
 * 105/185 is 0.57; 0.5 is that, pulled in a little further because the
 * drawn keyboard is 7 key-widths deep where a real one is 6.4, and a
 * hand that fills two thirds of it reads as a hand lying on the keys
 * rather than playing them.
 *
 * PLAY_SCALE_X closes the splay. The drawing's thumb and little finger
 * are six white keys apart, which is a hand reaching for a tenth rather
 * than a hand playing. Closing it all the way to a real playing span
 * would mean 0.63, and that is where a rigid outline stops being able
 * to tell the truth: it would narrow the FINGERS by the same factor as
 * the gaps between them, and a hand with 13mm fingers reads as a rake.
 * 0.72 is the compromise -- a hand that is open, as this drawing is,
 * but no longer reaching, with fingers still thick enough to read as
 * fingers at video size.
 */
export const PLAY_SCALE_X = 0.72;
export const PLAY_SCALE_Y = 0.5;

/**
 * How far the hand reaches PAST the near edge of the keys, in white
 * keys: the wrist and the top of the forearm. The stage reserves this
 * much below the keyboard so the arm has somewhere to come from, and
 * the rest of the forearm runs off the bottom of the frame, which is
 * where an arm comes from.
 */
export const REACH_PAST_KEYS = ARTWORK_BOX.maxY * PLAY_SCALE_Y;

/** Wrist to fingertip: how far up the keys a hand covers. */
export const HAND_LENGTH = -ARTWORK_BOX.minY * PLAY_SCALE_Y;
