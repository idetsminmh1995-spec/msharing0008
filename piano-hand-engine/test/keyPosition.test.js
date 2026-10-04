import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { loadEngine } from './helper.js';

const E = loadEngine();
const near = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} !== ${b}`);
const BOARD = E.buildKeyboard(88);

const note = (over = {}) => ({
  id: 'n1',
  midi: 60,
  timeMs: 1000,
  durationMs: 500,
  ...over,
});

describe('Phase 2: a note becomes a place on the instrument', () => {
  test('a strike point is centred across the key, on its playing surface', () => {
    const key = E.keyOf(BOARD, 60);
    const strike = E.keyStrikePoint(key);
    near(strike.x, key.x + key.width / 2);
    near(strike.y, 0, 1e-9);
    assert.ok(strike.z > key.z && strike.z < key.z + key.depth);
  });

  test('a white key is struck in front of the black keys, where a hand can actually reach', () => {
    const white = E.keyStrikePoint(E.keyOf(BOARD, 60));
    const blackFront = E.keyOf(BOARD, 61).z;
    assert.ok(white.z < blackFront, `${white.z} should be in front of ${blackFront}`);
  });

  test('a black key is struck on its own surface, 11mm above the whites', () => {
    const strike = E.keyStrikePoint(E.keyOf(BOARD, 61));
    near(strike.y, E.BLACK_KEY_RISE_MM);
  });

  test('a pressed key takes its strike point down with it, and no further than the key goes', () => {
    const key = E.keyOf(BOARD, 60);
    near(E.keyStrikePoint(key, 4).y, -4);
    // Asking for more travel than a key has does not push the finger
    // through the keybed.
    near(E.keyStrikePoint(key, 999).y, -E.KEY_DIP_MM);
  });

  test('the approach point clears a black key, so a finger travelling does not drag through one', () => {
    const approach = E.keyApproachPoint(E.keyOf(BOARD, 60));
    assert.ok(approach.y > E.BLACK_KEY_RISE_MM, 'above the black keys');
    near(approach.x, E.keyStrikePoint(E.keyOf(BOARD, 60)).x);
  });

  test('distance is measured in millimetres along the keyboard, not in semitones', () => {
    // An octave is seven white keys wide whatever accidentals are in it.
    near(E.keyDistanceMm(BOARD, 60, 72), 7 * E.WHITE_KEY_WIDTH_MM, 1e-9);
    near(E.keyDistanceWhites(BOARD, 60, 72), 7, 1e-9);
    // C to C# is barely any distance; E to F is a whole key. Twelve
    // semitones and one semitone say nothing about either.
    assert.ok(Math.abs(E.keyDistanceMm(BOARD, 60, 61)) < E.WHITE_KEY_WIDTH_MM);
    near(E.keyDistanceMm(BOARD, 64, 65), E.WHITE_KEY_WIDTH_MM, 1e-9);
  });

  test('distance is signed, so a hand moving left is not a hand moving right', () => {
    const up = E.keyDistanceMm(BOARD, 60, 67);
    const down = E.keyDistanceMm(BOARD, 67, 60);
    near(up, -down, 1e-9);
    assert.ok(up > 0, 'to the right is positive');
  });

  test('every note of a performance is placed, in the order it was given', () => {
    const notes = [note({ id: 'a', midi: 60 }), note({ id: 'b', midi: 64 }), note({ id: 'c', midi: 67 })];
    const result = E.keyPositionsFor(notes, BOARD);
    assert.equal(result.positions.length, 3);
    // Copied out of the sandbox first: a cross-realm array has the same
    // structure but is not reference-equal, which deepEqual minds.
    assert.deepEqual([...result.positions.map((p) => String(p.id))], ['a', 'b', 'c']);
    assert.equal(result.outOfRange.length, 0);
    for (const placed of result.positions) {
      assert.equal(placed.key.midi, placed.midi);
      assert.ok(placed.approach.y > placed.strike.y, 'the approach is above the strike');
    }
  });

  test('a note the instrument has not got is reported, not thrown and not silently moved', () => {
    const small = E.buildKeyboard(61);
    const result = E.keyPositionsFor([note({ id: 'low', midi: 21 })], small);
    assert.equal(result.positions.length, 0);
    assert.equal(result.outOfRange.length, 1);
    assert.equal(result.outOfRange[0].id, 'low');
    assert.equal(result.outOfRange[0].nearest, small.first, 'and says which key is nearest');
  });

  test('a key goes down fast and comes up slower, and is at rest outside its note', () => {
    const n = { timeMs: 1000, durationMs: 500 };
    assert.equal(E.keyPressDepthMm(999, n), 0, 'nothing before the note');
    assert.equal(E.keyPressDepthMm(1500, n), E.KEY_DIP_MM, 'fully down while it sounds');
    assert.equal(E.keyPressDepthMm(5000, n), 0, 'and back up long after');

    // Half way through a 28ms attack the key is already more than half
    // down; half way through a 70ms release it is still more than half
    // down. That asymmetry is the finger driving it and a spring
    // returning it.
    assert.ok(E.keyPressDepthMm(1014, n) > E.KEY_DIP_MM * 0.5);
    assert.ok(E.keyPressDepthMm(1535, n) > 0);
    assert.ok(E.keyPressDepthMm(1535, n) < E.KEY_DIP_MM);
  });

  test('key travel is monotone down through the attack and monotone up through the release', () => {
    const n = { timeMs: 0, durationMs: 200 };
    let last = -1;
    for (let t = 0; t <= 28; t += 2) {
      const depth = E.keyPressDepthMm(t, n);
      assert.ok(depth >= last, `down at ${t}`);
      last = depth;
    }
    last = E.KEY_DIP_MM + 1;
    for (let t = 200; t <= 270; t += 2) {
      const depth = E.keyPressDepthMm(t, n);
      assert.ok(depth <= last, `up at ${t}`);
      last = depth;
    }
  });
});
