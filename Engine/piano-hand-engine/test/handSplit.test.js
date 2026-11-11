import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { loadEngine } from './helper.js';

const E = loadEngine();
const BOARD = E.buildKeyboard(88);

let counter = 0;
const n = (midi, timeMs, over = {}) => ({
  id: `n${counter++}`,
  midi,
  timeMs,
  durationMs: 400,
  ...over,
});
const split = (notes, over = {}) => E.splitHands(notes, { keyboard: BOARD, ...over });
const handOf = (result, id) => result.byNoteId.get(id)?.hand;

describe('Module 2: which hand, and never by pitch alone', () => {
  test('a grand staff decides it outright: upper staff right, lower staff left', () => {
    const top = n(72, 0, { staff: 1 });
    const bottom = n(48, 0, { staff: 2 });
    const result = split([top, bottom]);
    assert.equal(handOf(result, top.id), 'right');
    assert.equal(handOf(result, bottom.id), 'left');
    assert.equal(result.byNoteId.get(top.id).reason, 'staff');
    assert.ok(result.byNoteId.get(top.id).confidence > 0.9);
  });

  test('ONE staff says nothing about hands, so it is not treated as evidence', () => {
    // The bug this replaces: `staff >= 2 ? 'left' : 'right'` answered
    // "right" for every note of every single-staff part, including a
    // bass line written on its own staff.
    const low = n(36, 0, { staff: 1 });
    const result = split([low]);
    assert.notEqual(result.byNoteId.get(low.id).reason, 'staff');
  });

  test('a stated hand beats everything, including a staff that disagrees', () => {
    const note = n(72, 0, { staff: 2, statedHand: 'right' });
    const other = n(40, 0, { staff: 1 });
    const result = split([note, other]);
    assert.equal(handOf(result, note.id), 'right');
    assert.equal(result.byNoteId.get(note.id).reason, 'stated');
    assert.equal(result.byNoteId.get(note.id).confidence, 1);
  });

  test('two MIDI tracks whose ranges separate are two hands; two that overlap are not', () => {
    const separated = split([
      n(40, 0, { track: 0 }),
      n(43, 500, { track: 0 }),
      n(72, 0, { track: 1 }),
      n(74, 500, { track: 1 }),
    ]);
    assert.equal([...separated.decisions].every((d) => d.reason === 'track'), true);
    assert.equal(separated.decisions.filter((d) => d.hand === 'left').length, 2);

    const overlapping = split([
      n(60, 0, { track: 0 }),
      n(62, 500, { track: 0 }),
      n(61, 0, { track: 1 }),
      n(63, 500, { track: 1 }),
    ]);
    assert.equal([...overlapping.decisions].every((d) => d.reason !== 'track'), true);
  });

  test('with no evidence at all, a chord no hand can span is split between them', () => {
    // Two octaves apart: no hand reaches it, so the split is forced and
    // the result is the only one that is physically possible.
    const low = n(36, 0);
    const high = n(84, 0);
    const result = split([low, high]);
    assert.equal(handOf(result, low.id), 'left');
    assert.equal(handOf(result, high.id), 'right');
    assert.equal(result.byNoteId.get(low.id).reason, 'inferred');
  });

  test('a chord one hand CAN span stays in one hand rather than being cut in half', () => {
    const notes = [n(60, 0), n(64, 0), n(67, 0)];
    const result = split(notes);
    const hands = new Set(notes.map((note) => handOf(result, note.id)));
    assert.equal(hands.size, 1, 'a C major triad is one hand');
  });

  test('the hands do not teleport: notes go to whichever hand is already there', () => {
    // The left hand establishes itself low and the right high; then a
    // middle note arrives. A pitch split would send it by a fixed line.
    // Where the hands ARE is what decides it.
    const result = split([
      n(40, 0),
      n(41, 200),
      n(79, 0),
      n(81, 200),
      n(43, 400), // nearer the left hand's position than the right's
    ]);
    const middle = result.decisions[result.decisions.length - 1];
    assert.equal(middle.hand, 'left');
  });

  test('a crossing is reported rather than prevented', () => {
    // The left hand climbs above the right -- a real thing players do,
    // and something the motion planner has to be told about.
    const result = split([
      n(84, 0, { staff: 2 }), // left hand, very high
      n(60, 0, { staff: 1 }), // right hand, below it
    ]);
    assert.equal(result.crossings.length, 1);
    assert.equal(result.crossings[0], 0);
  });

  test('every note gets exactly one decision, whatever the evidence', () => {
    const notes = [
      n(60, 0, { staff: 1 }),
      n(48, 0, { staff: 2 }),
      n(64, 300),
      n(52, 300, { track: 3 }),
    ];
    const result = split(notes);
    assert.equal(result.decisions.length, notes.length);
    for (const note of notes) assert.ok(result.byNoteId.has(note.id), note.id);
  });

  test('a smaller hand splits an octave that a bigger one takes alone', () => {
    // An octave is 165mm, which is exactly a medium hand's comfortable
    // reach and past a small one's. This is the hand size actually
    // changing the answer, which is the whole reason it is a setting.
    const octave = () => [n(60, 0), n(72, 0)];
    for (const [profile, hands] of [
      ['small', 2],
      ['medium', 1],
      ['large', 1],
    ]) {
      const notes = octave();
      const result = split(notes, { profile });
      assert.equal(
        new Set(notes.map((x) => handOf(result, x.id))).size,
        hands,
        `${profile} hand`,
      );
    }
  });

  test('a span no hand of any size reaches is always two hands', () => {
    const notes = [n(36, 0), n(84, 0)];
    for (const profile of ['small', 'medium', 'large']) {
      const result = split(notes, { profile });
      assert.equal(new Set(notes.map((x) => handOf(result, x.id))).size, 2, profile);
    }
  });
});
