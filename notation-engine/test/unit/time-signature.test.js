import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('time signature engine (Phase 12)', () => {
  test('plain numeric time signatures store numerator/denominator as given', () => {
    const sig = NE.timeSignature(7, 8);
    assert.equal(sig.numerator, 7);
    assert.equal(sig.denominator, 8);
    assert.equal(sig.symbol, undefined);
    assert.equal(NE.numeratorText(sig), '7');
    assert.equal(NE.denominatorText(sig), '8');
  });

  test('rejects a non-positive-integer numerator', () => {
    assert.throws(() => NE.timeSignature(0, 4), /positive integer/);
    assert.throws(() => NE.timeSignature(-3, 4), /positive integer/);
    assert.throws(() => NE.timeSignature(4.5, 4), /positive integer/);
  });

  test('rejects a denominator that is not a positive power of 2', () => {
    assert.throws(() => NE.timeSignature(4, 3), /power of 2/);
    assert.throws(() => NE.timeSignature(4, 0), /power of 2/);
    assert.throws(() => NE.timeSignature(4, -4), /power of 2/);
  });

  test('accepts every common power-of-2 denominator', () => {
    for (const d of [1, 2, 4, 8, 16, 32, 64]) {
      assert.doesNotThrow(() => NE.timeSignature(4, d));
    }
  });

  test("'common' symbol only applies to 4/4", () => {
    const sig = NE.timeSignature(4, 4, { symbol: 'common' });
    assert.equal(sig.symbol, 'common');
    assert.throws(() => NE.timeSignature(3, 4, { symbol: 'common' }), /'common'.*4\/4/);
    assert.throws(() => NE.timeSignature(4, 8, { symbol: 'common' }), /'common'.*4\/4/);
  });

  test("'cut' symbol only applies to 2/2", () => {
    const sig = NE.timeSignature(2, 2, { symbol: 'cut' });
    assert.equal(sig.symbol, 'cut');
    assert.throws(() => NE.timeSignature(4, 4, { symbol: 'cut' }), /'cut'.*2\/2/);
  });

  test('additive/irregular meters use numeratorDisplay for text but the real numeric total for numerator', () => {
    const sig = NE.timeSignature(7, 8, { numeratorDisplay: '3+2+2' });
    assert.equal(sig.numerator, 7); // real total, for beat-duration math elsewhere
    assert.equal(NE.numeratorText(sig), '3+2+2'); // what actually gets drawn
    assert.equal(NE.denominatorText(sig), '8'); // denominator display is never overridden
  });

  test('textWidth uses each character\'s real glyph width, so "10" is wider than "7"', () => {
    const w7 = NE.textWidth('7');
    const w10 = NE.textWidth('10');
    assert.ok(w10 > w7, `expected "10" (${w10}) to be wider than "7" (${w7})`);
  });

  test('textWidth handles the "+" character used in additive meters', () => {
    assert.ok(NE.textWidth('3+2+2') > NE.textWidth('3'));
  });
});
