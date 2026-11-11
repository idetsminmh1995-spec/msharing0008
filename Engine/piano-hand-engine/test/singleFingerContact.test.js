import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { loadEngine } from './helper.js';

const E = loadEngine();
const RIG = E.handRigFor('medium');
const IDENTITY = {
  scale: { x: 1, y: 1, z: 1 },
  rotation: { x: 0, y: 0, z: 0 },
  translation: { x: 0, y: 0, z: 0 },
};
const CALIBRATED = {
  ...E.DEFAULT_GLB_CALIBRATION,
  calibrated: true,
  engineToGlb: IDENTITY,
  glbToEngine: IDENTITY,
};

const baseInput = (over = {}) => ({
  calibration: CALIBRATED,
  hand: 'right',
  rig: RIG,
  wrist: { x: 0, y: 0, z: 0 },
  wristRotation: { x: 0, y: 0, z: 0 },
  fingers: E.POSES.fiveFinger,
  finger: 2,
  targetKeyMidi: 60,
  targetEngine: E.solveHandSkeleton({
    hand: 'right',
    rig: RIG,
    wrist: { x: 0, y: 0, z: 0 },
    wristRotation: { x: 0, y: 0, z: 0 },
    fingers: E.POSES.fiveFinger,
  }).fingers[2].tip,
  toleranceMm: 2,
  ...over,
});

describe('Phase C GLB calibration and single-finger contact', () => {
  test('audited manifest refuses visible contact before calibration', () => {
    const result = E.solveSingleFingerContact({
      ...baseInput(),
      calibration: E.DEFAULT_GLB_CALIBRATION,
    });
    assert.equal(result.converged, false);
    assert.equal(result.reason, 'calibration-required');
    assert.equal(result.residualMm, Infinity);
  });

  test('calibrated identity transform solves a reachable single-finger target', () => {
    const result = E.solveSingleFingerContact(baseInput());
    assert.equal(result.converged, true);
    assert.ok(result.residualMm <= 2, `${result.residualMm}mm`);
    assert.equal(result.targetKeyMidi, 60);
    assert.equal(result.finger, 2);
    assert.equal(result.tipGlb.x, result.tipEngine.x);
    assert.equal(result.tipGlb.y, result.tipEngine.y);
    assert.equal(result.tipGlb.z, result.tipEngine.z);
  });

  test('unreachable target reports residual instead of claiming contact', () => {
    const result = E.solveSingleFingerContact(
      baseInput({ targetEngine: { x: 1000, y: 1000, z: 1000 }, toleranceMm: 0.5 }),
    );
    assert.equal(result.converged, false);
    assert.equal(result.reason, 'unreachable');
    assert.ok(Number.isFinite(result.residualMm));
  });

  test('left hand uses the same engine target convention', () => {
    const target = E.solveHandSkeleton({
      hand: 'left',
      rig: RIG,
      wrist: { x: 0, y: 0, z: 0 },
      wristRotation: { x: 0, y: 0, z: 0 },
      fingers: E.POSES.fiveFinger,
    }).fingers[2].tip;
    const result = E.solveSingleFingerContact(baseInput({ hand: 'left', targetEngine: target }));
    assert.equal(result.hand, 'left');
    assert.equal(result.converged, true);
  });

  test('manifest validation catches a changed bone chain', () => {
    const broken = {
      ...CALIBRATED,
      skeleton: {
        ...CALIBRATED.skeleton,
        boneChains: {
          ...CALIBRATED.skeleton.boneChains,
          2: ['wrong', 'index_prox', 'index_midd', 'index_dist'],
        },
      },
    };
    const result = E.validateGlbCalibration(broken);
    assert.equal(result.valid, false);
    assert.equal(result.reason, 'skeleton-mismatch');
  });
});
