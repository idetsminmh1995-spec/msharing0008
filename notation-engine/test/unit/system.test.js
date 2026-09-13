import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('grand staff / multi-part systems (Phase 29)', () => {
  test('a single-staff part needs no brace', () => {
    assert.equal(NE.needsBrace(1), false);
  });

  test('a 2-or-more-staff part needs a brace', () => {
    assert.equal(NE.needsBrace(2), true);
    assert.equal(NE.needsBrace(3), true);
  });

  test('barline continuity follows the identical rule as the brace decision, by design', () => {
    for (const n of [1, 2, 3]) {
      assert.equal(NE.needsContinuousBarline(n), NE.needsBrace(n));
    }
  });

  test('computeBraceShape carries its endpoints through unchanged', () => {
    const shape = NE.computeBraceShape(2, 18, 0);
    assert.equal(shape.topY, 2);
    assert.equal(shape.bottomY, 18);
    assert.equal(shape.x, 0);
  });

  test('computeSystemLayout: a single 1-staff part gets one position at y=0', () => {
    const layout = NE.computeSystemLayout([1]);
    assert.equal(layout.positions.length, 1);
    assert.equal(layout.positions[0].partIndex, 0);
    assert.equal(layout.positions[0].staffIndexInPart, 0);
    assert.equal(layout.positions[0].y, 0);
  });

  test('computeSystemLayout: a 2-staff part (piano) gets two distinct, non-overlapping Ys within the same part', () => {
    const layout = NE.computeSystemLayout([2]);
    assert.equal(layout.positions.length, 2);
    assert.equal(layout.positions[0].partIndex, 0);
    assert.equal(layout.positions[1].partIndex, 0);
    assert.notEqual(layout.positions[0].y, layout.positions[1].y);
    assert.ok(layout.positions[1].y > layout.positions[0].y);
  });

  test('computeSystemLayout: a 3-part score stacks each part at a distinct Y, in score order', () => {
    const layout = NE.computeSystemLayout([1, 1, 1]);
    assert.equal(layout.positions.length, 3);
    const ys = [...layout.positions].map((p) => p.y);
    const sorted = [...ys].sort((a, b) => a - b);
    assert.deepEqual(ys, sorted); // already in increasing order (score order)
    assert.equal(new Set(ys).size, 3); // all distinct
  });

  test('computeSystemLayout: a mixed score (piano + 2 single-staff parts) never overlaps any position', () => {
    const layout = NE.computeSystemLayout([2, 1, 1]);
    assert.equal(layout.positions.length, 4);
    const ys = layout.positions.map((p) => p.y);
    assert.equal(new Set(ys).size, 4);
  });
});
