/**
 * place.ts — where the owner's hand goes to play what it is playing.
 *
 * The hand is now one artist's outline (`artwork.ts`), not five posed
 * fingers, so there is nothing left to pose. What remains is the part
 * that was always the real work: a hand asked for a key its thumb
 * cannot reach does not grow a thumb. It MOVES along the keys, it
 * TURNS, and it OPENS or CLOSES — and the other four fingers go with
 * it, because a hand is one object.
 *
 * Those are the three numbers this file solves for, plus the depth,
 * which the keyboard fixes rather than the music:
 *
 *   x       where the wrist sits along the keyboard
 *   turn    how far the hand is tilted
 *   spread  how wide the fingers are opened, as a multiple of the
 *           drawing's own splay
 *
 * Every finger that is playing has an opinion about all three, and the
 * relationship is linear for small turns, so the three together are one
 * least-squares fit — a 3×3 system, solved exactly, once per frame.
 *
 * Why those three and nothing more: turning the hand moves a fingertip
 * sideways in proportion to how far FORWARD it is, so the long fingers
 * swing a long way and the thumb, whose tip is beside the palm, barely
 * swings at all. A thumb reaching a distant key is therefore answered
 * mostly by the hand MOVING; a little finger reaching one, mostly by
 * the hand TURNING; and a chord wider than the drawing's own splay, by
 * the hand OPENING. That is what a player does, in the order a player
 * does it.
 */

import { ARTWORK_TIPS, PLAY_SCALE_X, PLAY_SCALE_Y } from './artwork.js';
import type { Finger } from '../fingering.js';

/** Where the hand has put itself, in the keyboard's own coordinates. */
export interface HandPlacement {
  /** The wrist, which is the artwork's own origin and what it turns about. */
  readonly x: number;
  readonly y: number;
  /** Turned, in radians; positive turns the little-finger side away. */
  readonly turn: number;
  /** How far the fingers are opened, as a multiple of the drawing's own splay. */
  readonly spread: number;
  /** One white key, in those same coordinates. */
  readonly unit: number;
  /** -1 draws the mirror image, which is the right hand. */
  readonly side: -1 | 1;
}

/** What one finger is being asked to do this frame. */
export interface FingerTarget {
  readonly finger: Finger;
  /** Where along the keyboard its key is. */
  readonly x: number;
  /** How far up the key it must reach, when the key demands one. */
  readonly depth?: number;
  readonly playing: boolean;
  /** The key it is playing, if it is. */
  readonly midi?: number;
  readonly onBlack?: boolean;
}

/**
 * A playing finger is believed ten times as much as a resting one.
 *
 * Not a tuning knob: a hand goes where the notes are. The resting
 * fingers are in the fit at all only so that a hand playing ONE note
 * still has an opinion about where the rest of it should sit -- they
 * must never be able to pull a playing finger off its key, and at an
 * octave, where two fingers play and three rest, four to one was not
 * enough to stop them.
 */
const PLAYING_WEIGHT = 10;

/**
 * How far the hand may turn, in radians (about 18°).
 *
 * A hand at the keyboard turns; it does not pivot. Past this a drawing
 * reads as a hand lying on its side, and the honest answer to a key
 * this far away is that the hand should have MOVED, which the fit will
 * then do instead.
 */
export const MAX_TURN = 0.32;

/**
 * How far the hand may open and close.
 *
 * The drawing is splayed — its thumb and little finger are about six
 * white keys apart — so most of this range is CLOSING. The floor is a
 * hand in five-finger position; the ceiling is a real stretch, and
 * past it the fingers would start to look pulled rather than spread.
 */
export const MIN_SPREAD = 0.8;
export const MAX_SPREAD = 1.45;

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

/**
 * Where the hand has to be, how far turned, and how far open, to play
 * these keys.
 *
 * `centreY` is where the wrist sits — fixed by the keyboard, not by the
 * music. `unit` is one white key.
 */
export function placeHand(
  targets: readonly FingerTarget[],
  side: -1 | 1,
  unit: number,
  centreY: number,
): HandPlacement {
  // Each finger says: at position c, turn t and spread s, my tip lands
  // at
  //     c + s * (side * tipX * unit) - t * (tipY * unit)
  // and it would like that to be its target. Three unknowns, one
  // weighted least-squares fit over all five.
  //
  // The basis vector per finger, in (c, s, t):
  const rows: {
    readonly b: readonly [number, number, number];
    readonly v: number;
    readonly w: number;
  }[] = [];
  for (const target of targets) {
    const tip = ARTWORK_TIPS[target.finger];
    rows.push({
      b: [1, side * tip.x * PLAY_SCALE_X * unit, -tip.y * PLAY_SCALE_Y * unit],
      v: target.x,
      w: target.playing ? PLAYING_WEIGHT : 1,
    });
  }
  if (rows.length === 0) {
    return { x: 0, y: centreY, turn: 0, spread: 1, unit, side };
  }

  // Normal equations, built straight rather than through a matrix type:
  // three unknowns is small enough that naming them is clearer than
  // generalising.
  const a = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const rhs = [0, 0, 0];
  for (const row of rows) {
    for (let i = 0; i < 3; i++) {
      const bi = row.b[i] ?? 0;
      for (let j = 0; j < 3; j++) {
        const bj = row.b[j] ?? 0;
        (a[i] as number[])[j] = (a[i]?.[j] ?? 0) + row.w * bi * bj;
      }
      rhs[i] = (rhs[i] ?? 0) + row.w * bi * row.v;
    }
  }

  const solved = solve3(a, rhs);
  // A degenerate fit (one finger playing, nothing else to say) leaves
  // the hand as it is and simply moves it: that is the right answer,
  // not a failure.
  const spread = clamp(solved?.[1] ?? 1, MIN_SPREAD, MAX_SPREAD);
  const turn = clamp(solved?.[2] ?? 0, -MAX_TURN, MAX_TURN);

  // Spread and turn were clamped, so the position is re-solved against
  // the values actually used. Without this a clamped hand sits where an
  // unclamped one would have, which is beside the keys it is playing.
  let sw = 0;
  let sr = 0;
  for (const row of rows) {
    sw += row.w;
    sr += row.w * (row.v - spread * (row.b[1] ?? 0) - turn * (row.b[2] ?? 0));
  }
  const x = sw === 0 ? 0 : sr / sw;

  // Depth. The keyboard fixes it -- a hand rests with its wrist at the
  // front edge of the keys -- with ONE exception, which is the whole
  // reason this is not simply `centreY`: a BLACK key ends part way down
  // the board, so a finger pressing one cannot be out in front of where
  // its key stops. The hand draws itself back until that finger is
  // actually on the key. It only ever moves back, never forward: a hand
  // further in than it needs to be is still a hand on the keys, and one
  // further out is a finger pressing the air past the end of a black
  // key, which is the thing being prevented.
  let y = centreY;
  for (const target of targets) {
    if (target.depth === undefined) continue;
    const tip = ARTWORK_TIPS[target.finger];
    y = Math.min(y, target.depth - tipOffsetY(tip, spread, turn, side, unit));
  }

  return { x, y, turn, spread, unit, side };
}

/** How far a fingertip sits from the wrist, along the keys, once the hand is turned and opened. */
function tipOffsetY(
  tip: { readonly x: number; readonly y: number },
  spread: number,
  turn: number,
  side: -1 | 1,
  unit: number,
): number {
  const px = side * spread * tip.x * PLAY_SCALE_X * unit;
  const py = tip.y * PLAY_SCALE_Y * unit;
  return px * Math.sin(turn) + py * Math.cos(turn);
}

/** Gaussian elimination on a 3×3, or undefined when it is singular. */
function solve3(a: number[][], b: number[]): [number, number, number] | undefined {
  const m = [
    [a[0]?.[0] ?? 0, a[0]?.[1] ?? 0, a[0]?.[2] ?? 0, b[0] ?? 0],
    [a[1]?.[0] ?? 0, a[1]?.[1] ?? 0, a[1]?.[2] ?? 0, b[1] ?? 0],
    [a[2]?.[0] ?? 0, a[2]?.[1] ?? 0, a[2]?.[2] ?? 0, b[2] ?? 0],
  ];
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(m[row]?.[col] ?? 0) > Math.abs(m[pivot]?.[col] ?? 0)) pivot = row;
    }
    if (Math.abs(m[pivot]?.[col] ?? 0) < 1e-9) return undefined;
    const tmp = m[col] as number[];
    m[col] = m[pivot] as number[];
    m[pivot] = tmp;
    const pivotRow = m[col] as number[];
    const pivotValue = pivotRow[col] as number;
    for (let row = 0; row < 3; row++) {
      if (row === col) continue;
      const target = m[row] as number[];
      const factor = (target[col] as number) / pivotValue;
      for (let k = col; k < 4; k++) {
        target[k] = (target[k] as number) - factor * (pivotRow[k] as number);
      }
    }
  }
  return [
    (m[0]?.[3] ?? 0) / (m[0]?.[0] ?? 1),
    (m[1]?.[3] ?? 0) / (m[1]?.[1] ?? 1),
    (m[2]?.[3] ?? 0) / (m[2]?.[2] ?? 1),
  ];
}

/** Where a finger's tip actually lands once the hand is placed — the fit's own answer, read back. */
export function placedTip(
  placement: HandPlacement,
  finger: Finger,
): { readonly x: number; readonly y: number } {
  const tip = ARTWORK_TIPS[finger];
  return transformPoint(placement, tip.x, tip.y);
}

/** One point of the artwork, in the keyboard's coordinates. */
export function transformPoint(
  placement: HandPlacement,
  x: number,
  y: number,
): { readonly x: number; readonly y: number } {
  const { unit, side, spread, turn } = placement;
  // PLAY_SCALE_* turns the drawing's flat, fully-open hand into a hand
  // at a keyboard (see `artwork.ts`); `spread` is what the fit then
  // varies around it, note by note.
  const px = side * spread * x * PLAY_SCALE_X * unit;
  const py = y * PLAY_SCALE_Y * unit;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  return {
    x: placement.x + px * cos - py * sin,
    y: placement.y + px * sin + py * cos,
  };
}
