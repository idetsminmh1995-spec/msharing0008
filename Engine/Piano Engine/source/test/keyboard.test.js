import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

// The BUILT bundle, in a bare sandbox -- the same file the page loads.
const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../dist/piano-engine.js', import.meta.url), 'utf8'), sandbox);
const P = sandbox.PianoEngine;

const BOX = { width: 1000, height: 150 };

test('each size has exactly the number of keys it is named after', () => {
  for (const size of P.KEYBOARD_SIZES) {
    const keys = P.keyboardGeometry(size, BOX);
    assert.equal(keys.length, size, `${size} keys`);
  }
});

test('the ranges are the instruments people own, not the middle of a piano', () => {
  // 61 starts on a C, 73 and 76 on an E, 88 on the bottom A.
  assert.deepEqual({ ...P.keyboardRange(61) }, { first: 36, last: 96 }); // C2 - C7
  assert.deepEqual({ ...P.keyboardRange(73) }, { first: 28, last: 100 }); // E1 - E7
  assert.deepEqual({ ...P.keyboardRange(76) }, { first: 28, last: 103 }); // E1 - G7
  assert.deepEqual({ ...P.keyboardRange(88) }, { first: 21, last: 108 }); // A0 - C8
  assert.equal(P.whiteKeyCount(88), 52);
  assert.equal(P.whiteKeyCount(61), 36);
});

test('a full-size keyboard starts and ends on a white key, and has 36 black ones', () => {
  const keys = P.keyboardGeometry(88, BOX);
  const black = keys.filter((k) => k.black);
  assert.equal(black.length, 36);
  assert.equal(P.isBlackKey(21), false); // A0
  assert.equal(P.isBlackKey(108), false); // C8
  assert.equal(P.isBlackKey(22), true); // A#0
});

test('white keys tile the box exactly, left to right, with no gap or overlap', () => {
  const keys = P.keyboardGeometry(76, BOX).filter((k) => !k.black);
  assert.equal(keys[0].x, 0);
  const last = keys[keys.length - 1];
  assert.ok(Math.abs(last.x + last.width - BOX.width) < 1e-9, 'the last key ends at the right edge');
  for (let i = 1; i < keys.length; i++) {
    assert.ok(keys[i].midi > keys[i - 1].midi, 'keys are in pitch order');
    assert.ok(Math.abs(keys[i].x - (keys[i - 1].x + keys[i - 1].width)) < 1e-9, 'no gaps');
  }
});

test('black keys are narrower, shorter, and sit over the join between two whites', () => {
  const keys = P.keyboardGeometry(61, BOX);
  const whiteWidth = keys.find((k) => !k.black).width;
  for (const key of keys.filter((k) => k.black)) {
    assert.ok(key.width < whiteWidth, 'narrower than a white key');
    assert.ok(key.height < BOX.height, 'does not reach the bottom');
    const rightWhite = keys.find((k) => !k.black && k.midi === key.midi + 1);
    assert.ok(rightWhite !== undefined, 'every black key has a white key above it');
    const centre = key.x + key.width / 2;
    assert.ok(Math.abs(centre - rightWhite.x) < 1e-9, 'centred on the join');
  }
});

test('blacks come after whites, so drawing in order paints them on top', () => {
  const keys = P.keyboardGeometry(88, BOX);
  const firstBlack = keys.findIndex((k) => k.black);
  const lastWhite = keys.map((k) => k.black).lastIndexOf(false);
  assert.ok(firstBlack > lastWhite);
});

test('a box with no size draws nothing rather than dividing by zero', () => {
  assert.equal(P.keyboardGeometry(88, { width: 0, height: 100 }).length, 0);
  assert.equal(P.keyboardGeometry(88, { width: 100, height: 0 }).length, 0);
});

test('pressedAt holds a key for exactly its own note, and the right hand wins a shared key', () => {
  const notes = [
    { midi: 60, startSeconds: 1, endSeconds: 2, hand: 'left' },
    { midi: 64, startSeconds: 1.5, endSeconds: 3, hand: 'right' },
    { midi: 60, startSeconds: 1, endSeconds: 2, hand: 'right' },
  ];
  assert.equal(P.pressedAt(notes, 0.9).size, 0, 'nothing before it starts');
  assert.equal(P.pressedAt(notes, 1).get(60), 'right', 'both hands on one key reads as the right');
  assert.equal(P.pressedAt(notes, 1.6).get(64), 'right');
  assert.equal(P.pressedAt(notes, 2).has(60), false, 'the end of a note is not part of it');
  assert.equal(P.pressedAt(notes, 2.5).size, 1);
});
