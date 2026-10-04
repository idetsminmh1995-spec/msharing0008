/**
 * handPose.ts — one hand, as bones and joint angles.
 *
 * Module 6's skeleton, and Phase 1's "one rigged hand + static poses".
 * It does no solving: given a hand's wrist, its rotation and its five
 * fingers' joint angles, it says where every joint and fingertip ends
 * up. The solver (`fingerIK.ts`, Phase 4) is the inverse of this, and
 * it has to have this first -- an IK that cannot be checked by running
 * the pose forward is an IK nobody can debug.
 *
 *
 * WHY ANGLES AND NOT POINTS
 *
 * A finger is a chain of three bones hinged at MCP, PIP and DIP. Store
 * the tip's position and you have two sources of truth for where the
 * middle joint is; store the angles and the tip is wherever the bones
 * put it, which is the only arrangement that cannot contradict itself.
 * It is also what makes a hand's limits sayable: a PIP joint bends 110
 * degrees and not 190, and that is a bound on an angle.
 *
 *
 * WHERE THE BONE LENGTHS COME FROM
 *
 * Anthropometric means for an adult hand, in millimetres, rounded to
 * the nearest half. They are a MEDIUM hand: `HAND_PROFILES` scales the
 * whole skeleton for a smaller or larger player, because a hand that
 * reaches a ninth and a hand that reaches a seventh finger the same
 * passage differently and the engine has to be able to say so.
 *
 * The numbers matter more than they look. The span between thumb and
 * little finger is what decides whether a chord is reachable; the
 * middle finger's length against the index's is what makes 2-3-4 on
 * three black keys sit at an angle rather than square.
 */

import type { Euler, Finger, FingerState, Hand, Vec3 } from '../core/types.js';
import { ALL_FINGERS } from '../core/types.js';

/** The three bones of a finger, knuckle outwards, in millimetres. */
export interface FingerBones {
  readonly proximal: number;
  readonly intermediate: number;
  readonly distal: number;
}

/**
 * Where a finger leaves the hand, relative to the wrist, and how long
 * its bones are.
 *
 * `knuckle` is in the hand's own frame: x across the palm (positive
 * toward the little finger), y up out of the back of the hand, z
 * forward along the fingers. The thumb's knuckle is low and far to the
 * side, which is what makes it a different joint from the other four
 * rather than a shorter version of them.
 */
export interface FingerRig {
  readonly knuckle: Vec3;
  readonly bones: FingerBones;
  /**
   * How far the finger is fanned sideways at rest, in radians, in the
   * RIGHT hand's frame: negative toward the thumb, positive toward the
   * little finger. A relaxed hand is already fanned before any spread
   * is asked for, and the fan goes OUTWARD from the middle finger --
   * whose own splay is zero, which is why it is the finger a hand is
   * measured from. The thumb's is much the largest, because a thumb
   * leaves the hand sideways rather than forwards.
   */
  readonly restSplay: number;
}

export interface HandRig {
  readonly fingers: Readonly<Record<Finger, FingerRig>>;
  /** Wrist to the knuckle line, in millimetres: the length of the palm. */
  readonly palmLength: number;
  readonly palmWidth: number;
}

/**
 * A medium adult hand.
 *
 * The thumb is the one that is not like the others. Its knuckle sits
 * 32mm to the side of the index's and 28mm back toward the wrist, and
 * its first bone is the metacarpal rather than a proximal phalanx --
 * which is why a thumb can swing UNDER the palm and no other finger
 * can. `thumbIK.ts` (Phase 4) will use that; this file only has to
 * place it.
 */
export const MEDIUM_HAND_RIG: HandRig = {
  palmLength: 95,
  palmWidth: 84,
  fingers: {
    1: {
      knuckle: { x: -32, y: -4, z: 28 },
      bones: { proximal: 46, intermediate: 32, distal: 25 },
      restSplay: -0.8,
    },
    2: {
      knuckle: { x: -27, y: 0, z: 95 },
      bones: { proximal: 45, intermediate: 25, distal: 19 },
      restSplay: -0.1,
    },
    3: {
      knuckle: { x: -9, y: 0, z: 99 },
      bones: { proximal: 50, intermediate: 29, distal: 20 },
      restSplay: 0,
    },
    4: {
      knuckle: { x: 9, y: 0, z: 95 },
      bones: { proximal: 46, intermediate: 27, distal: 19 },
      restSplay: 0.09,
    },
    5: {
      knuckle: { x: 26, y: 0, z: 86 },
      bones: { proximal: 36, intermediate: 20, distal: 17 },
      restSplay: 0.22,
    },
  },
};

export type HandProfile = 'small' | 'medium' | 'large';

/**
 * One multiplier over the whole skeleton, not a table per size.
 *
 * The same decision `finger-engine/src/core/hand-profiles.ts` made for
 * the guitar, and for the same reason: a bigger hand is not a hand with
 * a differently shaped reach, it is the same reach, longer. A table of
 * twenty numbers per profile would be twenty chances for two of them to
 * disagree about the same hand.
 */
export const HAND_PROFILES: Readonly<Record<HandProfile, number>> = {
  small: 0.9,
  medium: 1,
  large: 1.1,
};

export function handRigFor(profile: HandProfile = 'medium'): HandRig {
  const scale = HAND_PROFILES[profile];
  if (scale === 1) return MEDIUM_HAND_RIG;
  const fingers = {} as Record<Finger, FingerRig>;
  for (const finger of ALL_FINGERS) {
    const rig = MEDIUM_HAND_RIG.fingers[finger];
    fingers[finger] = {
      knuckle: scaleVec(rig.knuckle, scale),
      bones: {
        proximal: rig.bones.proximal * scale,
        intermediate: rig.bones.intermediate * scale,
        distal: rig.bones.distal * scale,
      },
      // An angle is not a length: a bigger hand splays the same way.
      restSplay: rig.restSplay,
    };
  }
  return {
    palmLength: MEDIUM_HAND_RIG.palmLength * scale,
    palmWidth: MEDIUM_HAND_RIG.palmWidth * scale,
    fingers,
  };
}

/**
 * How far each joint may bend, in radians.
 *
 * A pose outside these is not a hand, and the difference between a
 * generated performance that looks human and one that looks like a
 * puppet is mostly here. `clampFingerState` is what everything that
 * produces a pose should hand its answer through.
 */
export const JOINT_LIMITS: Readonly<
  Record<keyof FingerState, { readonly min: number; readonly max: number }>
> = {
  // The knuckle extends a little past straight -- a flat hand on a
  // table is already slightly past zero -- and curls to a right angle.
  mcp: { min: -0.35, max: 1.6 },
  // The middle joint does not extend past straight at all, and closes
  // further than any other.
  pip: { min: 0, max: 1.92 },
  dip: { min: -0.17, max: 1.4 },
  // Fanning out, either way from the finger's own rest splay.
  spread: { min: -0.35, max: 0.4 },
};

export function clampFingerState(state: FingerState): FingerState {
  return {
    mcp: clamp(state.mcp, JOINT_LIMITS.mcp.min, JOINT_LIMITS.mcp.max),
    pip: clamp(state.pip, JOINT_LIMITS.pip.min, JOINT_LIMITS.pip.max),
    dip: clamp(state.dip, JOINT_LIMITS.dip.min, JOINT_LIMITS.dip.max),
    spread: clamp(state.spread, JOINT_LIMITS.spread.min, JOINT_LIMITS.spread.max),
  };
}

/** The four points of one finger, knuckle to tip, in world millimetres. */
export interface FingerChain {
  readonly mcp: Vec3;
  readonly pip: Vec3;
  readonly dip: Vec3;
  readonly tip: Vec3;
}

export interface HandSkeleton {
  readonly wrist: Vec3;
  readonly palm: Vec3;
  readonly fingers: Readonly<Record<Finger, FingerChain>>;
}

export interface PoseInput {
  readonly hand: Hand;
  readonly rig: HandRig;
  readonly wrist: Vec3;
  readonly wristRotation: Euler;
  readonly fingers: Readonly<Record<Finger, FingerState>>;
}

/**
 * Forward kinematics: angles in, points out.
 *
 * Each finger is walked bone by bone. The direction starts along the
 * palm's forward axis, turned sideways by the finger's rest splay plus
 * whatever spread it has been given, and then pitched DOWN by each
 * joint in turn -- a joint's flexion is relative to the bone before it,
 * which is what makes the angles add up along the chain and a curled
 * finger curl rather than fold flat.
 *
 * A LEFT hand is the right one mirrored in x. Mirroring here rather
 * than keeping a second rig means the two hands cannot drift apart, and
 * it is also true: they are the same hand.
 */
export function solveHandSkeleton(input: PoseInput): HandSkeleton {
  const mirror = input.hand === 'left' ? -1 : 1;
  const rotate = eulerRotator(input.wristRotation);
  const place = (local: Vec3): Vec3 => add(input.wrist, rotate({ ...local, x: local.x * mirror }));

  const fingers = {} as Record<Finger, FingerChain>;
  for (const finger of ALL_FINGERS) {
    const rig = input.rig.fingers[finger];
    const state = clampFingerState(input.fingers[finger]);

    const mcpLocal = rig.knuckle;
    // Sideways first: the splay is a rotation about the palm's own up
    // axis, so it fans the finger across the keys rather than lifting
    // it. Built in the RIGHT hand's frame whichever hand this is --
    // `place` mirrors the finished chain exactly once, and mirroring
    // here as well would put the knuckle on one side of the hand and
    // the fingertip on the other.
    const splay = rig.restSplay + state.spread;
    let pitch = 0;
    let point = mcpLocal;
    const chain: Vec3[] = [];
    const bones = [rig.bones.proximal, rig.bones.intermediate, rig.bones.distal];
    const joints = [state.mcp, state.pip, state.dip];
    for (let i = 0; i < bones.length; i++) {
      pitch += joints[i] ?? 0;
      const length = bones[i] ?? 0;
      point = {
        x: point.x + Math.sin(splay) * Math.cos(pitch) * length,
        y: point.y - Math.sin(pitch) * length,
        z: point.z + Math.cos(splay) * Math.cos(pitch) * length,
      };
      chain.push(point);
    }

    fingers[finger] = {
      mcp: place(mcpLocal),
      pip: place(chain[0] ?? mcpLocal),
      dip: place(chain[1] ?? mcpLocal),
      tip: place(chain[2] ?? mcpLocal),
    };
  }

  return {
    wrist: input.wrist,
    palm: place({ x: 0, y: 0, z: input.rig.palmLength / 2 }),
    fingers,
  };
}

/**
 * The static poses Phase 1 has to be able to strike.
 *
 * Four, and no more: they are what a later phase interpolates BETWEEN,
 * not a library of positions to play from. A motion planner that had to
 * pick from twenty canned poses would produce twenty-position motion.
 *
 *  - `rest`      hand off the keys, fingers relaxed and curved.
 *  - `fiveFinger` the position a beginner's piece lives in: five
 *                 fingers over five adjacent white keys, nothing
 *                 stretched.
 *  - `octave`    thumb and little finger apart, the middle three
 *                lifted clear.
 *  - `press`     the five-finger position with one finger down.
 */
export const POSES: Readonly<
  Record<'rest' | 'fiveFinger' | 'octave', Readonly<Record<Finger, FingerState>>>
> = {
  rest: {
    1: { mcp: 0.18, pip: 0.2, dip: 0.12, spread: 0 },
    2: { mcp: 0.42, pip: 0.5, dip: 0.28, spread: 0 },
    3: { mcp: 0.44, pip: 0.54, dip: 0.3, spread: 0 },
    4: { mcp: 0.46, pip: 0.56, dip: 0.3, spread: 0 },
    5: { mcp: 0.44, pip: 0.5, dip: 0.28, spread: 0 },
  },
  // Curled enough that the fingertips, not the pads, are over the
  // keys -- which is the shape every method book's first page draws.
  fiveFinger: {
    1: { mcp: 0.1, pip: 0.12, dip: 0.08, spread: 0 },
    2: { mcp: 0.5, pip: 0.62, dip: 0.3, spread: 0 },
    3: { mcp: 0.52, pip: 0.66, dip: 0.32, spread: 0 },
    4: { mcp: 0.54, pip: 0.66, dip: 0.32, spread: 0 },
    5: { mcp: 0.5, pip: 0.6, dip: 0.3, spread: 0 },
  },
  // Thumb and little finger fanned to the ends, the middle three
  // straighter so they ride over the keys between rather than
  // catching them.
  octave: {
    1: { mcp: 0.06, pip: 0.08, dip: 0.05, spread: -0.3 },
    2: { mcp: 0.38, pip: 0.42, dip: 0.2, spread: -0.1 },
    3: { mcp: 0.36, pip: 0.4, dip: 0.2, spread: 0 },
    4: { mcp: 0.38, pip: 0.42, dip: 0.2, spread: 0.12 },
    5: { mcp: 0.34, pip: 0.36, dip: 0.18, spread: 0.34 },
  },
};

/**
 * A pose with one finger pressed: that finger reaches, the rest hold
 * their shape.
 *
 * A finger presses by driving down from the KNUCKLE and straightening
 * slightly below it, not by curling -- a curling finger pulls its own
 * tip backwards off the key.
 *
 * It does not come out perfectly vertical even so, and that is not a
 * bug to tune away: a real finger rotating about its knuckle does swing
 * its tip back a few millimetres, and what cancels it on a real hand is
 * the WRIST moving forward a little as the hand sinks. Phase 5's wrist
 * trajectory is where that belongs. Until then the drift is a few
 * millimetres on a 55mm-deep strike zone, which is inside the key.
 */
export function pressedPose(
  base: Readonly<Record<Finger, FingerState>>,
  finger: Finger,
  depth = 1,
): Readonly<Record<Finger, FingerState>> {
  const out = {} as Record<Finger, FingerState>;
  for (const f of ALL_FINGERS) {
    const state = base[f];
    out[f] =
      f === finger
        ? clampFingerState({
            // A finger presses by STRAIGHTENING slightly at the middle
            // joint and driving down from the knuckle, not by curling:
            // a curling finger pulls its tip back off the key.
            mcp: state.mcp + 0.2 * depth,
            pip: state.pip - 0.14 * depth,
            dip: state.dip - 0.06 * depth,
            spread: state.spread,
          })
        : state;
  }
  return out;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scaleVec(v: Vec3, k: number): Vec3 {
  return { x: v.x * k, y: v.y * k, z: v.z * k };
}

/** X then Y then Z, the order the `Euler` type states. */
function eulerRotator(e: Euler): (v: Vec3) => Vec3 {
  const cx = Math.cos(e.x);
  const sx = Math.sin(e.x);
  const cy = Math.cos(e.y);
  const sy = Math.sin(e.y);
  const cz = Math.cos(e.z);
  const sz = Math.sin(e.z);
  return (v: Vec3): Vec3 => {
    const y1 = v.y * cx - v.z * sx;
    const z1 = v.y * sx + v.z * cx;
    const x2 = v.x * cy + z1 * sy;
    const z2 = -v.x * sy + z1 * cy;
    const x3 = x2 * cz - y1 * sz;
    const y3 = x2 * sz + y1 * cz;
    return { x: x3, y: y3, z: z2 };
  };
}
