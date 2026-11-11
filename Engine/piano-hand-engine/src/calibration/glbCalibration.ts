import type { Euler, Finger, Vec3 } from '../core/types.js';

export interface CalibrationTransform {
  readonly scale: Vec3;
  readonly rotation: Euler;
  readonly translation: Vec3;
}

export interface GlbSkeletonManifest {
  readonly jointCount: number;
  readonly wristBone: string;
  readonly boneChains: Readonly<Record<Finger, readonly string[]>>;
  readonly animationClips: readonly string[];
}

export interface GlbCalibrationManifest {
  readonly version: 1;
  readonly model: string;
  readonly calibrated: boolean;
  readonly skeleton: GlbSkeletonManifest;
  readonly engineToGlb?: CalibrationTransform;
  readonly glbToEngine?: CalibrationTransform;
}

export type CalibrationFailure =
  'invalid-manifest' | 'skeleton-mismatch' | 'calibration-required' | 'missing-transform';

export interface CalibrationValidation {
  readonly valid: boolean;
  readonly calibrated: boolean;
  readonly reason?: CalibrationFailure;
}

export const EXPECTED_GLB_BONE_CHAINS: Readonly<Record<Finger, readonly string[]>> = {
  1: ['thumb_trapez', 'thumb_meta', 'thumb_prox', 'thumb_dist'],
  2: ['index_meta', 'index_prox', 'index_midd', 'index_dist'],
  3: ['midd_meta', 'midd_prox', 'midd_midd', 'midd_dist'],
  4: ['ring_meta', 'ring_prox', 'ring_midd', 'ring_dist'],
  5: ['pinky_meta', 'pinky_prox', 'pinky_midd', 'pinky_dist'],
};

/** Uncalibrated skeleton template; no matching model asset is checked in. */
export const DEFAULT_GLB_CALIBRATION: GlbCalibrationManifest = {
  version: 1,
  model: 'unassigned.glb',
  calibrated: false,
  skeleton: {
    jointCount: 21,
    wristBone: 'radius_ulna',
    boneChains: EXPECTED_GLB_BONE_CHAINS,
    animationClips: ['Pose_OK', 'RigAction'],
  },
};

export function validateGlbCalibration(manifest: GlbCalibrationManifest): CalibrationValidation {
  if (manifest.version !== 1 || !manifest.model || !manifest.skeleton) {
    return { valid: false, calibrated: false, reason: 'invalid-manifest' };
  }
  if (!skeletonMatches(manifest.skeleton)) {
    return { valid: false, calibrated: false, reason: 'skeleton-mismatch' };
  }
  if (!manifest.calibrated) {
    return { valid: true, calibrated: false, reason: 'calibration-required' };
  }
  if (!manifest.engineToGlb || !manifest.glbToEngine) {
    return { valid: false, calibrated: false, reason: 'missing-transform' };
  }
  return { valid: true, calibrated: true };
}

export function transformEngineToGlb(manifest: GlbCalibrationManifest, point: Vec3): Vec3 {
  const transform = manifest.engineToGlb;
  if (!transform) throw new Error('GLB calibration transform is not available');
  return applyTransform(transform, point);
}

export function transformGlbToEngine(manifest: GlbCalibrationManifest, point: Vec3): Vec3 {
  const transform = manifest.glbToEngine;
  if (!transform) throw new Error('GLB calibration transform is not available');
  return applyTransform(transform, point);
}

function skeletonMatches(skeleton: GlbSkeletonManifest): boolean {
  if (skeleton.jointCount !== 21 || skeleton.wristBone !== 'radius_ulna') return false;
  for (const finger of [1, 2, 3, 4, 5] as const) {
    const expected = EXPECTED_GLB_BONE_CHAINS[finger];
    const actual = skeleton.boneChains[finger];
    if (
      !actual ||
      actual.length !== expected.length ||
      actual.some((name, i) => name !== expected[i])
    ) {
      return false;
    }
  }
  return true;
}

function applyTransform(transform: CalibrationTransform, point: Vec3): Vec3 {
  const scaled = {
    x: point.x * transform.scale.x,
    y: point.y * transform.scale.y,
    z: point.z * transform.scale.z,
  };
  const rotated = rotateXYZ(scaled, transform.rotation);
  return {
    x: rotated.x + transform.translation.x,
    y: rotated.y + transform.translation.y,
    z: rotated.z + transform.translation.z,
  };
}

function rotateXYZ(point: Vec3, rotation: Euler): Vec3 {
  const cx = Math.cos(rotation.x);
  const sx = Math.sin(rotation.x);
  const cy = Math.cos(rotation.y);
  const sy = Math.sin(rotation.y);
  const cz = Math.cos(rotation.z);
  const sz = Math.sin(rotation.z);
  const y1 = point.y * cx - point.z * sx;
  const z1 = point.y * sx + point.z * cx;
  const x2 = point.x * cy + z1 * sy;
  const z2 = -point.x * sy + z1 * cy;
  return {
    x: x2 * cz - y1 * sz,
    y: x2 * sz + y1 * cz,
    z: z2,
  };
}
