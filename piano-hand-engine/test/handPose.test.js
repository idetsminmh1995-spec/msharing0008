import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { loadEngine } from './helper.js';

const E = loadEngine();
const near = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} !== ${b}`);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

const RIG = E.MEDIUM_HAND_RIG;
const FLAT = {
  1: { mcp: 0, pip: 0, dip: 0, spread: 0 },
  2: { mcp: 0, pip: 0, dip: 0, spread: 0 },
  3: { mcp: 0, pip: 0, dip: 0, spread: 0 },
  4: { mcp: 0, pip: 0, dip: 0, spread: 0 },
  5: { mcp: 0, pip: 0, dip: 0, spread: 0 },
};
const pose = (over = {}) =>
  E.solveHandSkeleton({
    hand: 'right',
    rig: RIG,
    wrist: { x: 0, y: 0, z: 0 },
    wristRotation: { x: 0, y: 0, z: 0 },
    fingers: FLAT,
    ...over,
  });

describe('Module 6: the hand is a skeleton, not a picture', () => {
  test('every finger has four points, knuckle to tip', () => {
    const skeleton = pose();
    for (const finger of [1, 2, 3, 4, 5]) {
      const chain = skeleton.fingers[finger];
      for (const joint of ['mcp', 'pip', 'dip', 'tip']) {
        assert.ok(Number.isFinite(chain[joint].x), `${finger}.${joint}.x`);
        assert.ok(Number.isFinite(chain[joint].y), `${finger}.${joint}.y`);
        assert.ok(Number.isFinite(chain[joint].z), `${finger}.${joint}.z`);
      }
    }
  });

  test('the bones keep their length whatever the joints are doing', () => {
    // The whole reason angles are stored and points are computed: a
    // finger cannot stretch.
    const curled = {
      1: { mcp: 0.4, pip: 0.5, dip: 0.3, spread: 0.1 },
      2: { mcp: 0.9, pip: 1.2, dip: 0.6, spread: -0.2 },
      3: { mcp: 1.1, pip: 1.4, dip: 0.7, spread: 0 },
      4: { mcp: 0.8, pip: 1.0, dip: 0.5, spread: 0.2 },
      5: { mcp: 0.6, pip: 0.8, dip: 0.4, spread: 0.3 },
    };
    for (const fingers of [FLAT, curled]) {
      const skeleton = pose({ fingers });
      for (const finger of [1, 2, 3, 4, 5]) {
        const chain = skeleton.fingers[finger];
        const bones = RIG.fingers[finger].bones;
        near(dist(chain.mcp, chain.pip), bones.proximal, 1e-6);
        near(dist(chain.pip, chain.dip), bones.intermediate, 1e-6);
        near(dist(chain.dip, chain.tip), bones.distal, 1e-6);
      }
    }
  });

  test('a flat hand points its fingers forward, away from the player', () => {
    const skeleton = pose();
    for (const finger of [2, 3, 4, 5]) {
      const chain = skeleton.fingers[finger];
      assert.ok(chain.tip.z > chain.mcp.z, `finger ${finger} points forward`);
      near(chain.tip.y, chain.mcp.y, 1e-6);
    }
  });

  test('curling a finger brings its tip back and down, which is what a finger does', () => {
    const flat = pose().fingers[3].tip;
    const curled = pose({
      fingers: { ...FLAT, 3: { mcp: 0.9, pip: 1.2, dip: 0.6, spread: 0 } },
    }).fingers[3].tip;
    assert.ok(curled.z < flat.z, 'back toward the hand');
    assert.ok(curled.y < flat.y, 'and down');
  });

  test('spread fans a finger across the keys without lifting it', () => {
    const base = pose().fingers[5].tip;
    const fanned = pose({
      fingers: { ...FLAT, 5: { mcp: 0, pip: 0, dip: 0, spread: 0.35 } },
    }).fingers[5].tip;
    assert.ok(Math.abs(fanned.x) > Math.abs(base.x), 'further across');
    near(fanned.y, base.y, 1e-6);
  });

  test('the left hand is the right one mirrored, not a second skeleton', () => {
    const right = pose();
    const left = pose({ hand: 'left' });
    for (const finger of [1, 2, 3, 4, 5]) {
      near(left.fingers[finger].tip.x, -right.fingers[finger].tip.x, 1e-9);
      near(left.fingers[finger].tip.z, right.fingers[finger].tip.z, 1e-9);
    }
  });

  test("the thumb's knuckle is low and to the side -- it is not a short finger", () => {
    const thumb = RIG.fingers[1].knuckle;
    const index = RIG.fingers[2].knuckle;
    assert.ok(Math.abs(thumb.x) > Math.abs(index.x), 'further across the hand');
    assert.ok(thumb.z < index.z - 50, 'and much further back toward the wrist');
  });

  test('a joint cannot bend further than a joint bends', () => {
    const impossible = { mcp: 99, pip: -99, dip: 99, spread: 99 };
    const held = E.clampFingerState(impossible);
    assert.equal(held.mcp, E.JOINT_LIMITS.mcp.max);
    assert.equal(held.pip, E.JOINT_LIMITS.pip.min);
    assert.equal(held.dip, E.JOINT_LIMITS.dip.max);
    assert.equal(held.spread, E.JOINT_LIMITS.spread.max);
    // And the middle joint does not extend past straight at all.
    assert.equal(E.JOINT_LIMITS.pip.min, 0);
  });

  test('a bigger hand is the same hand, longer', () => {
    const small = E.handRigFor('small');
    const large = E.handRigFor('large');
    for (const finger of [1, 2, 3, 4, 5]) {
      const ratio = large.fingers[finger].bones.proximal / small.fingers[finger].bones.proximal;
      near(ratio, 1.1 / 0.9, 1e-9);
      // The splay is an angle, not a length: it does not scale.
      near(large.fingers[finger].restSplay, small.fingers[finger].restSplay, 1e-12);
    }
    assert.ok(large.palmWidth > small.palmWidth);
  });

  test('the octave pose spans further than the five-finger one, which is what it is for', () => {
    const five = pose({ fingers: E.POSES.fiveFinger });
    const octave = pose({ fingers: E.POSES.octave });
    const span = (s) => Math.abs(s.fingers[1].tip.x - s.fingers[5].tip.x);
    assert.ok(span(octave) > span(five), `${span(octave)} should exceed ${span(five)}`);
    // And an octave is seven white keys, so the span has to be able to
    // cover roughly that much of a real keyboard.
    assert.ok(span(octave) > 5 * E.WHITE_KEY_WIDTH_MM, `${span(octave)}mm is too narrow`);
  });

  test('a pressing finger reaches DOWN, and only that finger moves', () => {
    const base = E.POSES.fiveFinger;
    const pressed = E.pressedPose(base, 3);
    for (const finger of [1, 2, 4, 5]) {
      assert.deepEqual(
        { ...pressed[finger] },
        { ...base[finger] },
        `finger ${finger} should be untouched`,
      );
    }
    const before = pose({ fingers: base }).fingers[3].tip;
    const after = pose({ fingers: pressed }).fingers[3].tip;
    assert.ok(after.y < before.y, 'the pressing fingertip goes down');
    // A finger presses by driving from the knuckle, not by curling. It
    // still swings its tip back a few millimetres -- a real one does
    // too, and the wrist moving forward is what cancels it (Phase 5).
    // What matters here is that the drift stays inside the key: a white
    // key's strike zone is 55mm deep.
    const drift = before.z - after.z;
    assert.ok(drift < 10, `${drift}mm of drift is off the key`);
    assert.ok(after.y < before.y - 5, 'and the press is mostly downward');
  });
});
