import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { loadEngine } from './helper.js';

const E = loadEngine();

const segment = (hand, over = {}) => ({
  hand,
  startMs: 0,
  endMs: 100,
  phase: 'TRAVEL',
  anchorKey: hand === 'left' ? 48 : 72,
  wristPosition: { x: 0, y: 0, z: 0 },
  wristRotation: { x: 0, y: 0, z: 0 },
  targetWristPosition: { x: hand === 'left' ? -100 : 100, y: 20, z: 40 },
  targetWristRotation: { x: 0.2, y: 0.3, z: 0.1 },
  technique: 'NORMAL',
  ...over,
});

describe('Phase B deterministic motion sampler', () => {
  test('interpolates a hand from absolute timestamp', () => {
    const plan = {
      version: 1,
      trajectories: [segment('left'), segment('right')],
      contacts: [],
    };
    const sample = E.sampleHandMotion(plan, 50);
    assert.equal(sample.timestampMs, 50);
    assert.equal(sample.hands.left.phase, 'TRAVEL');
    assert.equal(sample.hands.left.wristPosition.x, -50);
    assert.equal(sample.hands.right.wristPosition.x, 50);
    assert.equal(sample.hands.right.progress, 0.5);
  });

  test('same plan and timestamp produce the same state after seek-back', () => {
    const plan = {
      version: 1,
      trajectories: [segment('left'), segment('right')],
      contacts: [],
    };
    const first = E.sampleHandMotion(plan, 25);
    E.sampleHandMotion(plan, 90);
    const again = E.sampleHandMotion(plan, 25);
    assert.equal(again.hands.left.wristPosition.x, first.hands.left.wristPosition.x);
    assert.equal(again.hands.right.wristRotation.y, first.hands.right.wristRotation.y);
  });

  test('contact boundaries are explicit and release is not active after releaseEndMs', () => {
    const contact = {
      noteId: 'n1',
      hand: 'right',
      finger: 1,
      targetKeyMidi: 60,
      approachStartMs: 20,
      contactMs: 40,
      holdEndMs: 80,
      releaseEndMs: 120,
      target: { x: 1, y: 2, z: 3 },
      approach: { x: 1, y: 10, z: 3 },
      pressDepthMm: 10,
    };
    const plan = { version: 1, trajectories: [], contacts: [contact] };
    assert.equal(E.sampleHandMotion(plan, 19).contacts.length, 0);
    assert.equal(E.sampleHandMotion(plan, 20).contacts[0].state, 'APPROACH');
    assert.equal(E.sampleHandMotion(plan, 40).contacts[0].state, 'CONTACT');
    assert.equal(E.sampleHandMotion(plan, 80).contacts[0].state, 'RELEASE');
    assert.equal(E.sampleHandMotion(plan, 120).contacts.length, 0);
  });

  test('left and right trajectories are independent', () => {
    const plan = {
      version: 1,
      trajectories: [
        segment('left', { targetWristPosition: { x: -200, y: 0, z: 0 } }),
        segment('right', { targetWristPosition: { x: 20, y: 0, z: 0 } }),
      ],
      contacts: [],
    };
    const sample = E.sampleHandMotion(plan, 100);
    assert.equal(sample.hands.left.wristPosition.x, -200);
    assert.equal(sample.hands.right.wristPosition.x, 20);
  });
});
