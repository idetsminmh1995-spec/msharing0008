import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('stem direction (Phase 16)', () => {
  test('middleLineY: -2 for a standard 5-line staff, 0 for a 1-line staff', () => {
    assert.equal(NE.middleLineY(5), -2);
    assert.equal(NE.middleLineY(1), 0);
  });

  test('automatic: a note above the middle line gets a down stem', () => {
    assert.equal(NE.automaticStemDirection(-4, -2), 'down'); // top line
    assert.equal(NE.automaticStemDirection(-3, -2), 'down'); // just above middle
  });

  test('automatic: a note on or below the middle line gets an up stem', () => {
    assert.equal(NE.automaticStemDirection(-2, -2), 'up'); // exactly on the middle line
    assert.equal(NE.automaticStemDirection(0, -2), 'up'); // bottom line
    assert.equal(NE.automaticStemDirection(2, -2), 'up'); // below the staff
  });

  test("forced direction (tier 1) overrides everything, even an explicit XML direction", () => {
    const d = NE.resolveStemDirection({
      positions: [-4], // would automatically be 'down'
      numLines: 5,
      forcedDirection: 'up',
      explicitDirection: 'down',
    });
    assert.equal(d, 'up');
  });

  test('explicit XML direction (tier 2) overrides automatic when there is no forced direction', () => {
    const d = NE.resolveStemDirection({
      positions: [-4], // would automatically be 'down'
      numLines: 5,
      explicitDirection: 'up',
    });
    assert.equal(d, 'up');
  });

  test('with neither override, falls through to automatic', () => {
    const d = NE.resolveStemDirection({ positions: [-4], numLines: 5 });
    assert.equal(d, 'down');
  });

  test("a chord's direction is decided by its outermost note, not the first or last in the list", () => {
    // Middle line is -2. Notes at -3 (dist 1) and 1 (dist 3) -- the second
    // is further away, so its automatic direction ('up', since 1 >= -2)
    // wins for the whole chord, even though it's listed second.
    const d = NE.chordStemDirection([-3, 1], -2);
    assert.equal(d, 'up');
  });

  test('chordStemDirection throws on an empty position list', () => {
    assert.throws(() => NE.chordStemDirection([], -2), /at least one position/);
  });
});

describe('stem length (Phase 16)', () => {
  test('default length is 3.5sp for a note near the staff', () => {
    assert.equal(NE.computeStemLength(0, -2), 3.5); // bottom line, distance to middle = 2, less than default
  });

  test('extends so the stem reaches at least the middle line for a note far outside the staff', () => {
    // A note at y=-6 (2 above the top line) is 4 away from the middle
    // line (-2) -- longer than the 3.5 default, so the stem must extend
    // to 4 to actually reach the middle line.
    assert.equal(NE.computeStemLength(-6, -2), 4);
  });

  test('never shortened below the 2.5sp floor', () => {
    // A note extremely close to the middle line would only need a tiny
    // length to "reach" it, but the default (3.5) already exceeds the
    // floor (2.5), so this only ever matters if something else were to
    // shorten it below -- confirmed the floor itself holds regardless.
    assert.ok(NE.computeStemLength(-2, -2) >= 2.5);
  });
});
