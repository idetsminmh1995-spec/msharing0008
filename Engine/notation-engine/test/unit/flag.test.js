import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('flags (Phase 17)', () => {
  test('eighth notes and shorter need a flag when unbeamed', () => {
    for (const type of ['eighth', '16th', '32nd', '64th', '128th', '256th', '512th', '1024th']) {
      assert.equal(NE.needsFlag(type, false), true, type);
    }
  });

  test('quarter notes and longer never need a flag', () => {
    for (const type of ['whole', 'half', 'quarter']) {
      assert.equal(NE.needsFlag(type, false), false, type);
    }
  });

  test('a beamed note never needs a flag, regardless of duration', () => {
    assert.equal(NE.needsFlag('eighth', true), false);
    assert.equal(NE.needsFlag('16th', true), false);
    assert.equal(NE.needsFlag('1024th', true), false);
  });

  test('flagGlyphName maps duration+direction to the real SMuFL glyph name', () => {
    assert.equal(NE.flagGlyphName('eighth', 'up'), 'flag8thUp');
    assert.equal(NE.flagGlyphName('eighth', 'down'), 'flag8thDown');
    assert.equal(NE.flagGlyphName('16th', 'up'), 'flag16thUp');
    assert.equal(NE.flagGlyphName('1024th', 'down'), 'flag1024thDown');
  });

  test('every real flag glyph name actually resolves via getGlyph', () => {
    for (const type of ['eighth', '16th', '32nd', '64th', '128th', '256th', '512th', '1024th']) {
      for (const dir of ['up', 'down']) {
        const name = NE.flagGlyphName(type, dir);
        assert.notEqual(NE.getGlyph(name), undefined, name);
      }
    }
  });

  test('flagGlyphName throws for a duration that never has a flag', () => {
    assert.throws(() => NE.flagGlyphName('quarter', 'up'), /never has a flag/);
    assert.throws(() => NE.flagGlyphName('whole', 'down'), /never has a flag/);
  });
});
