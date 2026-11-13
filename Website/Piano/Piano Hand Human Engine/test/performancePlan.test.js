import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { loadEngine } from './helper.js';

const E = loadEngine();
const BOARD = E.buildKeyboard(88);
let counter = 0;
const note = (midi, timeMs, over = {}) => ({
  id: `plan-${counter++}`,
  midi,
  timeMs,
  durationMs: 300,
  ...over,
});

const plan = (notes, over = {}) =>
  E.solvePerformancePlan(notes, { keyboard: BOARD, ...over });

describe('serialisable Phase 1–3 performance plan', () => {
  test('keeps hand, finger, source and key strike point together', () => {
    const notes = [
      note(60, 0, { staff: 1, statedFinger: 1 }),
      note(62, 300, { staff: 2 }),
    ];
    const result = plan(notes);
    assert.equal(result.version, 1);
    assert.equal(result.incomplete, false);
    assert.equal(result.notes[0].hand, 'right');
    assert.equal(result.notes[0].handReason, 'staff');
    assert.equal(result.notes[0].finger, 1);
    assert.equal(result.notes[0].fingerSource, 'stated');
    assert.equal(result.notes[0].fingerConfidence, 1);
    assert.deepEqual(Object.keys(result.notes[0].keyPosition).sort(), ['x', 'y', 'z']);
    assert.equal(result.notes[0].diagnostics.length, 0);
  });

  test('records a caller finger override as a distinct source', () => {
    const input = note(64, 0, { statedFinger: 2 });
    const result = plan([input], { overrides: new Map([[input.id, 5]]) });
    assert.equal(result.notes[0].finger, 5);
    assert.equal(result.notes[0].fingerSource, 'override');
    assert.equal(result.notes[0].fingerConfidence, 1);
  });

  test('marks automatic fingering with lower confidence', () => {
    const result = plan([note(60, 0)]);
    assert.equal(result.notes[0].fingerSource, 'automatic');
    assert.equal(result.notes[0].fingerConfidence, 0.6);
  });

  test('reports notes outside the keyboard without clamping the key position', () => {
    const result = plan([note(10, 0)]);
    assert.equal(result.incomplete, true);
    assert.equal(result.notes[0].keyPosition, undefined);
    assert.deepEqual([...result.notes[0].diagnostics], ['out-of-range']);
  });
});
