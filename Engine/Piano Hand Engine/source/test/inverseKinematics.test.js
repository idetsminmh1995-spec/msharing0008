import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { loadEngine } from './helper.js';

const E = loadEngine();
const ZERO = { x: 0, y: 0, z: 0 };
const RIG = E.MEDIUM_HAND_RIG;
const BASE = E.POSES.fiveFinger;
const forward = (fingers, hand = 'right') =>
  E.solveHandSkeleton({
    hand,
    rig: RIG,
    wrist: ZERO,
    wristRotation: ZERO,
    fingers,
  });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

describe('constrained finger inverse kinematics', () => {
  test('recovers a reachable fingertip target within the requested millimetre tolerance', () => {
    const targetPose = {
      ...BASE,
      3: { mcp: 0.64, pip: 0.82, dip: 0.41, spread: 0.08 },
    };
    const target = forward(targetPose).fingers[3].tip;
    const solved = E.solveFingerTarget({
      hand: 'right',
      rig: RIG,
      wrist: ZERO,
      wristRotation: ZERO,
      fingers: BASE,
      finger: 3,
      target,
      toleranceMm: 1,
      maxIterations: 80,
    });

    assert.ok(solved.converged, `residual ${solved.errorMm.toFixed(3)} mm`);
    assert.ok(solved.errorMm <= 1);
    assert.ok(distance(solved.tip, target) <= 1);
    assert.ok(solved.state.pip >= E.JOINT_LIMITS.pip.min);
    assert.ok(solved.state.pip <= E.JOINT_LIMITS.pip.max);
  });

  test('does not use spread when the renderer cannot actuate its uncalibrated axis', () => {
    const targetPose = {
      ...BASE,
      3: { mcp: 0.64, pip: 0.82, dip: 0.41, spread: BASE[3].spread },
    };
    const target = forward(targetPose).fingers[3].tip;
    const solved = E.solveFingerTarget({
      hand: 'right',
      rig: RIG,
      wrist: ZERO,
      wristRotation: ZERO,
      fingers: BASE,
      finger: 3,
      target,
      allowSpread: false,
      toleranceMm: 1,
      maxIterations: 80,
    });

    assert.ok(solved.converged, `residual ${solved.errorMm.toFixed(3)} mm`);
    assert.equal(solved.state.spread, BASE[3].spread);
  });

  test('solves several assigned fingers in one chord without changing untargeted fingers', () => {
    const targetPose = {
      ...BASE,
      2: { mcp: 0.58, pip: 0.76, dip: 0.34, spread: -0.04 },
      4: { mcp: 0.62, pip: 0.8, dip: 0.38, spread: 0.12 },
    };
    const skeleton = forward(targetPose);
    const result = E.solveFingerTargets({
      hand: 'right',
      rig: RIG,
      wrist: ZERO,
      wristRotation: ZERO,
      fingers: BASE,
      targets: [
        { finger: 2, target: skeleton.fingers[2].tip },
        { finger: 4, target: skeleton.fingers[4].tip },
      ],
      toleranceMm: 1,
      maxIterations: 80,
    });

    assert.equal(result.results.length, 2);
    assert.ok(result.converged, `worst residual ${result.maxErrorMm.toFixed(3)} mm`);
    assert.deepEqual({ ...result.fingers[1] }, { ...BASE[1] });
    assert.deepEqual({ ...result.fingers[3] }, { ...BASE[3] });
  });

  test('reports conflicting targets when two notes are assigned to the same finger', () => {
    const tip = forward(BASE).fingers[3].tip;
    const result = E.solveFingerTargets({
      hand: 'right',
      rig: RIG,
      wrist: ZERO,
      wristRotation: ZERO,
      fingers: BASE,
      targets: [
        { finger: 3, target: tip },
        { finger: 3, target: { ...tip, x: tip.x + 20 } },
      ],
      toleranceMm: 1,
    });

    assert.equal(result.results.length, 1, 'one solve is made for this finger');
    assert.equal(result.converged, false, 'the conflicting assignment is not hidden');
    assert.ok(result.maxErrorMm > 9, `residual ${result.maxErrorMm.toFixed(3)} mm`);
  });

  test('reports an unreachable target instead of claiming exact contact', () => {
    const result = E.solveFingerTarget({
      hand: 'right',
      rig: RIG,
      wrist: ZERO,
      wristRotation: ZERO,
      fingers: BASE,
      finger: 2,
      target: { x: 1000, y: 1000, z: 1000 },
      toleranceMm: 1,
      maxIterations: 20,
    });

    assert.equal(result.converged, false);
    assert.ok(result.errorMm > 1);
    for (const joint of ['mcp', 'pip', 'dip', 'spread']) {
      assert.ok(result.state[joint] >= E.JOINT_LIMITS[joint].min);
      assert.ok(result.state[joint] <= E.JOINT_LIMITS[joint].max);
    }
  });

  test('mirrored left-hand targets solve in the same engine coordinate convention', () => {
    const targetPose = {
      ...BASE,
      1: { mcp: 0.22, pip: 0.3, dip: 0.18, spread: -0.08 },
    };
    const target = forward(targetPose, 'left').fingers[1].tip;
    const solved = E.solveFingerTarget({
      hand: 'left',
      rig: RIG,
      wrist: ZERO,
      wristRotation: ZERO,
      fingers: BASE,
      finger: 1,
      target,
      toleranceMm: 1,
      maxIterations: 80,
    });

    assert.ok(solved.converged, `residual ${solved.errorMm.toFixed(3)} mm`);
  });
});
