import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('ledger lines (Phase 14)', () => {
  test('middle C in treble clef needs exactly one ledger line below, at y=+1', () => {
    const position = NE.staffPositionForPitch(NE.TREBLE_CLEF, 'C', 4);
    assert.equal(position, 1);
    const lines = NE.computeLedgerLines(position, 5);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].y, 1);
  });

  test('middle C in bass clef needs exactly one ledger line above, at y=-5 (symmetric with the treble case)', () => {
    const position = NE.staffPositionForPitch(NE.BASS_CLEF, 'C', 4);
    assert.equal(position, -5);
    const lines = NE.computeLedgerLines(position, 5);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].y, -5);
  });

  test('C4 in alto clef (the clef\'s own reference, on the middle line) needs no ledger lines', () => {
    const position = NE.staffPositionForPitch(NE.ALTO_CLEF, 'C', 4);
    assert.equal(position, -2);
    const lines = NE.computeLedgerLines(position, 5);
    assert.equal(lines.length, 0);
  });

  test('a note 3 ledger lines above the staff gets 3 segments at consecutive integers', () => {
    // Treble top line is y=-4; three ledger lines above lands at y=-7.
    const lines = NE.computeLedgerLines(-7, 5);
    assert.deepEqual([...lines].map((l) => l.y), [-5, -6, -7]);
  });

  test('a note 3 ledger lines below the staff gets 3 segments at consecutive integers', () => {
    const lines = NE.computeLedgerLines(3, 5);
    assert.deepEqual([...lines].map((l) => l.y), [1, 2, 3]);
  });

  test('a note in the space just outside the staff (not yet on a ledger line) needs none', () => {
    assert.equal(NE.computeLedgerLines(0.5, 5).length, 0); // just below bottom line
    assert.equal(NE.computeLedgerLines(-4.5, 5).length, 0); // just above top line
  });

  test('a note in the second space beyond the staff still needs the nearer ledger line drawn', () => {
    const below = NE.computeLedgerLines(1.5, 5);
    assert.deepEqual([...below].map((l) => l.y), [1]);
    const above = NE.computeLedgerLines(-5.5, 5);
    assert.deepEqual([...above].map((l) => l.y), [-5]);
  });

  test('works for a non-5-line staff (e.g. a 1-line percussion staff)', () => {
    assert.deepEqual([...NE.computeLedgerLines(2, 1)].map((l) => l.y), [1, 2]);
    assert.deepEqual([...NE.computeLedgerLines(-2, 1)].map((l) => l.y), [-1, -2]);
  });

  test('a note inside the staff yields an empty list', () => {
    assert.equal(NE.computeLedgerLines(-2, 5).length, 0);
    assert.equal(NE.computeLedgerLines(0, 5).length, 0);
    assert.equal(NE.computeLedgerLines(-4, 5).length, 0);
  });

  test('rejects an invalid line count', () => {
    assert.throws(() => NE.computeLedgerLines(1, 0), /positive integer/);
    assert.throws(() => NE.computeLedgerLines(1, -3), /positive integer/);
    assert.throws(() => NE.computeLedgerLines(1, 2.5), /positive integer/);
  });
});
