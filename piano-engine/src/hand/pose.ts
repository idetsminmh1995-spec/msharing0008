/**
 * pose.ts — where the hand puts itself to play what it is playing.
 *
 * This is the part that was missing. A hand asked to play a key its
 * thumb cannot reach does not grow a thumb: it MOVES, and it TURNS,
 * and the other four fingers go with it. Everything a drawn hand gets
 * wrong -- a tentacle thumb, a finger crossing its neighbour, a hand
 * that slides along the keys without ever tilting -- comes from
 * posing the fingers one at a time instead of posing the hand once and
 * letting the fingers follow.
 *
 *
 * HOW IT IS SOLVED
 *
 * The hand has three numbers: where it is along the keyboard, how deep
 * it sits, and how far it is turned. Depth is fixed -- a player's hand
 * rests a fixed distance in from the front edge of the keys -- so two
 * are left, and every finger that is playing has an opinion about
 * both.
 *
 * Turning the hand moves a fingertip sideways in proportion to how far
 * FORWARD that fingertip is: the long fingers, which reach well past
 * the knuckles, swing a long way; the thumb, whose tip is beside the
 * palm rather than in front of it, barely swings at all. So a thumb
 * reaching for a distant key is answered mostly by moving the hand,
 * and a little finger reaching for one mostly by turning it. That
 * relationship is linear, so the best position and turn together are
 * one small least-squares fit -- two equations, solved exactly, once
 * per frame.
 *
 * Fingers that are not playing still have an opinion, weighted
 * lightly: they want to stay over the keys the hand is sitting on.
 * Without them a hand playing one note would have nothing to say about
 * where it is.
 */

import { ALL_FINGERS, FINGERS, MAX_TURN, knuckle } from './anatomy.js';
import type { Finger, HandPoint } from './anatomy.js';

/** Where the hand has put itself, in the keyboard's own coordinates. */
export interface HandPose {
  /** The middle knuckle, which is hand space's origin. */
  readonly x: number;
  readonly y: number;
  /** Turned, in radians; positive turns the little-finger side away. */
  readonly turn: number;
  /** One white key, in those same coordinates. */
  readonly unit: number;
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

/** One finger, posed: where it leaves the hand and where it ends up. */
export interface PosedFinger {
  readonly finger: Finger;
  readonly knuckle: HandPoint;
  readonly tip: HandPoint;
  readonly thick: number;
  readonly playing: boolean;
  readonly midi?: number;
  readonly onBlack?: boolean;
}

/** A playing finger is believed four times as much as a resting one. */
const PLAYING_WEIGHT = 4;

function rotate(point: HandPoint, turn: number): HandPoint {
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos };
}

/** Where a finger's tip sits in hand space when the hand is at rest. */
function restingTip(finger: Finger, side: -1 | 1): HandPoint {
  const base = knuckle(finger, side);
  const shape = FINGERS[finger];
  if (finger === 1) {
    // A thumb comes off the SIDE of the palm and reaches forward and
    // outward -- just far enough to sit on the key next to the index
    // finger's, which is where a hand in five-finger position puts it.
    // Its tip is beside the palm rather than in front of it, which is
    // why turning the hand hardly moves it, and why a thumb reaching a
    // distant key is answered by the hand MOVING instead.
    return { x: base.x + side * shape.length * 0.28, y: base.y - shape.length * 0.9 };
  }
  // The four fingers converge a little: their knuckles are further
  // apart than their tips, which is why a hand covers five keys with a
  // palm that is only three and a half wide.
  return { x: base.x * 0.93, y: base.y - shape.length * (1 - shape.curl) };
}

/**
 * Where the hand has to be, and how far turned, to play these keys.
 *
 * `centreY` is the depth of the knuckle line -- fixed by the keyboard,
 * not by the music. `unit` is one white key.
 */
export function solvePose(
  targets: readonly FingerTarget[],
  side: -1 | 1,
  unit: number,
  centreY: number,
): HandPose {
  // Each finger says: at turn t and position c, my tip lands at
  //   c + px - py * t      (for a small turn)
  // and I would like that to be my target. Least squares over (c, t).
  let sw = 0;
  let swPy = 0;
  let swPyPy = 0;
  let swA = 0;
  let swPyA = 0;
  for (const target of targets) {
    const tip = restingTip(target.finger, side);
    const px = tip.x * unit;
    const py = tip.y * unit;
    const a = target.x - px;
    const w = target.playing ? PLAYING_WEIGHT : 1;
    sw += w;
    swPy += w * py;
    swPyPy += w * py * py;
    swA += w * a;
    swPyA += w * py * a;
  }
  if (sw === 0) return { x: 0, y: centreY, turn: 0, unit, side };

  // [ sw     -swPy  ] [c]   [ swA   ]
  // [ -swPy   swPyPy] [t] = [ -swPyA]
  const det = sw * swPyPy - swPy * swPy;
  let x = swA / sw;
  let turn = 0;
  if (Math.abs(det) > 1e-9) {
    x = (swA * swPyPy - swPy * swPyA) / det;
    turn = (sw * -swPyA + swPy * swA) / det;
  }
  return { x, y: centreY, turn: Math.max(-MAX_TURN, Math.min(MAX_TURN, turn)), unit, side };
}

/**
 * The five fingers, posed.
 *
 * The hand is where it is; each finger now reaches from its own
 * knuckle towards its own key. What it cannot cover it does not get:
 * a finger may swing `MAX_SPLAY` away from the hand's direction and
 * stretch to `stretch` of its length, and past that it simply points
 * at the key and falls short -- which is exactly what a hand looks
 * like at the edge of its reach, and is the signal that the hand
 * itself should have moved further.
 */
export function poseFingers(
  pose: HandPose,
  targets: readonly FingerTarget[],
): readonly PosedFinger[] {
  const byFinger = new Map(targets.map((t) => [t.finger, t]));
  const out: PosedFinger[] = [];
  for (const finger of ALL_FINGERS) {
    const target = byFinger.get(finger);
    if (target === undefined) continue;
    const shape = FINGERS[finger];
    const base = rotate(knuckle(finger, pose.side), pose.turn);
    const origin = {
      x: pose.x + base.x * pose.unit,
      y: pose.y + base.y * pose.unit,
    };

    // Which way the finger points when it is left alone.
    const rest = rotate(restingTip(finger, pose.side), pose.turn);
    const restAt = { x: pose.x + rest.x * pose.unit, y: pose.y + rest.y * pose.unit };
    const own = Math.atan2(restAt.y - origin.y, restAt.x - origin.x);
    const ownLength = Math.hypot(restAt.x - origin.x, restAt.y - origin.y);

    // Where it is being asked to go.
    const wantY = target.depth ?? restAt.y;
    let angle = Math.atan2(wantY - origin.y, target.x - origin.x);
    let length = Math.hypot(target.x - origin.x, wantY - origin.y);

    // A finger bends at the knuckle, it does not swivel. And it
    // stretches, it does not telescope.
    let swing = angle - own;
    while (swing > Math.PI) swing -= Math.PI * 2;
    while (swing < -Math.PI) swing += Math.PI * 2;
    angle = own + Math.max(-shape.splay, Math.min(shape.splay, swing));
    const full = shape.length * pose.unit;
    length = Math.max(
      full * (1 - shape.curl * 1.6),
      Math.min(length, Math.max(ownLength, full * shape.stretch)),
    );

    out.push({
      finger,
      knuckle: origin,
      tip: { x: origin.x + Math.cos(angle) * length, y: origin.y + Math.sin(angle) * length },
      thick: shape.thick * pose.unit,
      playing: target.playing,
      ...(target.midi !== undefined ? { midi: target.midi } : {}),
      ...(target.onBlack !== undefined ? { onBlack: target.onBlack } : {}),
    });
  }
  return out;
}

/** The heel of the palm, posed, for the drawing to close the hand on. */
export function poseHeel(pose: HandPose, length: number): HandPoint {
  const point = rotate({ x: 0, y: length }, pose.turn);
  return { x: pose.x + point.x * pose.unit, y: pose.y + point.y * pose.unit };
}

/** The hand's own direction: from the heel towards the knuckles. */
export function poseAxis(pose: HandPose): { x: number; y: number } {
  return { x: Math.sin(pose.turn), y: -Math.cos(pose.turn) };
}
