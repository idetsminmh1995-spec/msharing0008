import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('staff geometry (Phase 9)', () => {
  test('a standard 5-line staff spans 4 staff-spaces, bottom line at y=0', () => {
    const g = NE.computeStaffGeometry(5);
    assert.equal(g.numLines, 5);
    assert.equal(g.height, 4);
    // Spread (executed in this file's own realm) rather than .slice()
    // (which would run on the sandboxed array's own Array.prototype) --
    // see Doc/phase-08-testing-harness.md on why a sandboxed array/object
    // compared via deepEqual against a same-file literal needs this.
    assert.deepEqual([...g.lineYPositions], [0, -1, -2, -3, -4]);
  });

  test('a 1-line percussion staff has zero height and just the one line at y=0', () => {
    const g = NE.computeStaffGeometry(1);
    assert.equal(g.numLines, 1);
    assert.equal(g.height, 0);
    assert.deepEqual([...g.lineYPositions], [0]);
  });

  test('a 6-line tab staff spans 5 staff-spaces', () => {
    const g = NE.computeStaffGeometry(6);
    assert.equal(g.numLines, 6);
    assert.equal(g.height, 5);
    assert.deepEqual([...g.lineYPositions], [0, -1, -2, -3, -4, -5]);
  });

  test('rejects zero, negative, and non-integer line counts', () => {
    assert.throws(() => NE.computeStaffGeometry(0), /positive integer/);
    assert.throws(() => NE.computeStaffGeometry(-3), /positive integer/);
    assert.throws(() => NE.computeStaffGeometry(2.5), /positive integer/);
  });
});
