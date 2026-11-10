import type { Euler, Finger, FingerState, Hand, Vec3 } from '../core/types.js';
import { solveFingerTarget, type FingerIKResult } from '../kinematics/inverseKinematics.js';
import type { HandRig } from '../kinematics/handPose.js';
import {
  transformEngineToGlb,
  validateGlbCalibration,
  type GlbCalibrationManifest,
} from './glbCalibration.js';

export interface SingleFingerContactInput {
  readonly calibration: GlbCalibrationManifest;
  readonly hand: Hand;
  readonly rig: HandRig;
  readonly wrist: Vec3;
  readonly wristRotation: Euler;
  readonly fingers: Readonly<Record<Finger, FingerState>>;
  readonly finger: Finger;
  readonly targetKeyMidi: number;
  /** The piano strike point in Engine millimetres. */
  readonly targetEngine: Vec3;
  readonly toleranceMm?: number;
}

export type SingleFingerContactFailure =
  | 'calibration-required'
  | 'invalid-manifest'
  | 'skeleton-mismatch'
  | 'missing-transform'
  | 'unreachable';

export interface SingleFingerContactResult {
  readonly hand: Hand;
  readonly finger: Finger;
  readonly targetKeyMidi: number;
  readonly calibrationVersion: 1;
  readonly converged: boolean;
  readonly residualMm: number;
  readonly tipEngine?: Vec3;
  readonly tipGlb?: Vec3;
  readonly state?: FingerState;
  readonly ik?: FingerIKResult;
  readonly reason?: SingleFingerContactFailure;
}

/**
 * Solve one assigned finger against one piano strike target.
 *
 * The solver refuses to claim GLB contact until the manifest is calibrated.
 * This prevents the synthetic Engine rig residual from being mistaken for a
 * measured fingertip-to-key error on the skinned GLB.
 */
export function solveSingleFingerContact(
  input: SingleFingerContactInput,
): SingleFingerContactResult {
  const validation = validateGlbCalibration(input.calibration);
  if (!validation.valid || !validation.calibrated) {
    return {
      hand: input.hand,
      finger: input.finger,
      targetKeyMidi: input.targetKeyMidi,
      calibrationVersion: 1,
      converged: false,
      residualMm: Number.POSITIVE_INFINITY,
      reason: validation.reason ?? 'calibration-required',
    };
  }

  const ik = solveFingerTarget({
    hand: input.hand,
    rig: input.rig,
    wrist: input.wrist,
    wristRotation: input.wristRotation,
    fingers: input.fingers,
    finger: input.finger,
    target: input.targetEngine,
    ...(input.toleranceMm === undefined ? {} : { toleranceMm: input.toleranceMm }),
  });
  if (!ik.converged) {
    return {
      hand: input.hand,
      finger: input.finger,
      targetKeyMidi: input.targetKeyMidi,
      calibrationVersion: 1,
      converged: false,
      residualMm: ik.errorMm,
      state: ik.state,
      tipEngine: ik.tip,
      ik,
      reason: 'unreachable',
    };
  }

  return {
    hand: input.hand,
    finger: input.finger,
    targetKeyMidi: input.targetKeyMidi,
    calibrationVersion: 1,
    converged: true,
    residualMm: ik.errorMm,
    state: ik.state,
    tipEngine: ik.tip,
    tipGlb: transformEngineToGlb(input.calibration, ik.tip),
    ik,
  };
}
