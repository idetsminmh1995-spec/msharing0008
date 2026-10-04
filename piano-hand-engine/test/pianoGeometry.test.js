import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { loadEngine } from './helper.js';

const E = loadEngine();
const near = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} !== ${b}`);

describe('Module 1: the instrument, in millimetres', () => {
  test('an octave is 165mm across its seven white keys, which every other dimension follows from', () => {
    near(E.OCTAVE_SPAN_MM, 165);
    near(E.WHITE_KEY_WIDTH_MM * 7, 165);
  });

  test('an 88 has 88 keys, 52 of them white, A0 to C8', () => {
    const board = E.buildKeyboard(88);
    assert.equal(board.keys.length, 88);
    assert.equal(board.first, 21);
    assert.equal(board.last, 108);
    assert.equal(board.keys.filter((k) => !k.isBlack).length, 52);
    assert.equal(board.keys.filter((k) => k.isBlack).length, 36);
  });

  test('the cut-down keyboards start where those instruments really start', () => {
    // A 61 starts on a C and a 73/76 on an E. Getting this wrong puts
    // every note a few semitones off its own key.
    assert.equal(E.buildKeyboard(61).first, 36);
    assert.equal(E.buildKeyboard(73).first, 28);
    assert.equal(E.buildKeyboard(76).first, 28);
  });

  test('white keys tile the keyboard with no gap and no overlap', () => {
    const board = E.buildKeyboard(88);
    const whites = board.keys.filter((k) => !k.isBlack).sort((a, b) => a.x - b.x);
    for (let i = 1; i < whites.length; i++) {
      near(whites[i].x, whites[i - 1].x + whites[i - 1].width, 1e-9);
    }
    near(whites[0].x, 0);
    near(E.keyboardWidthMm(88), 52 * E.WHITE_KEY_WIDTH_MM);
  });

  test('a black key stands proud of its neighbours and is short at the player end', () => {
    const board = E.buildKeyboard(88);
    const cSharp = E.keyOf(board, 61);
    assert.equal(cSharp.isBlack, true);
    near(cSharp.y, E.BLACK_KEY_RISE_MM);
    assert.ok(cSharp.width < E.WHITE_KEY_WIDTH_MM, 'narrower than a white key');
    // Flush at the back, so its front end stops short -- which is the
    // whole reason a thumb can sit in front of one.
    near(cSharp.z + cSharp.depth, E.WHITE_KEY_DEPTH_MM);
    assert.ok(cSharp.z > 0, 'and starts behind the white keys front edge');
  });

  test('each black key is centred on the line between the two white keys it sits between', () => {
    const board = E.buildKeyboard(88);
    for (const black of board.keys.filter((k) => k.isBlack)) {
      const rightWhite = E.keyOf(board, black.midi + 1);
      near(black.x + black.width / 2, rightWhite.x, 1e-9);
    }
  });

  test('every key of the instrument is there exactly once', () => {
    const board = E.buildKeyboard(88);
    const seen = new Set(board.keys.map((k) => k.midi));
    assert.equal(seen.size, 88);
    for (let midi = 21; midi <= 108; midi++) assert.ok(seen.has(midi), `midi ${midi}`);
  });

  test('isBlackKey names the five black keys of every octave and nothing else', () => {
    const blacks = [];
    for (let midi = 60; midi < 72; midi++) if (E.isBlackKey(midi)) blacks.push(midi - 60);
    assert.deepEqual([...blacks], [1, 3, 6, 8, 10]);
  });
});
