import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('rests (Phase 18)', () => {
  test('restGlyphName maps every duration to its real SMuFL glyph', () => {
    assert.equal(NE.restGlyphName('whole'), 'restWhole');
    assert.equal(NE.restGlyphName('half'), 'restHalf');
    assert.equal(NE.restGlyphName('quarter'), 'restQuarter');
    assert.equal(NE.restGlyphName('eighth'), 'rest8th');
    assert.equal(NE.restGlyphName('16th'), 'rest16th');
    assert.equal(NE.restGlyphName('1024th'), 'rest1024th');
  });

  test('every rest glyph name actually resolves via getGlyph', () => {
    const types = [
      'whole', 'half', 'quarter', 'eighth', '16th', '32nd',
      '64th', '128th', '256th', '512th', '1024th',
    ];
    for (const type of types) {
      const name = NE.restGlyphName(type);
      assert.notEqual(NE.getGlyph(name), undefined, name);
    }
  });

  test('multiMeasureRestGlyphName is the real restHBar glyph', () => {
    assert.equal(NE.multiMeasureRestGlyphName(), 'restHBar');
    assert.notEqual(NE.getGlyph('restHBar'), undefined);
  });

  test('quarter rests and shorter default to the middle line', () => {
    const middle = NE.middleLineY(5);
    for (const type of ['quarter', 'eighth', '16th']) {
      assert.equal(NE.defaultRestY(type, 5), middle, type);
    }
  });

  test('half rest also sits at the middle line -- the same numeric position as the plain default, per real engraving convention', () => {
    assert.equal(NE.defaultRestY('half', 5), NE.middleLineY(5));
  });

  test('whole rest is the one real exception: one staff-space above the middle line', () => {
    assert.equal(NE.defaultRestY('whole', 5), NE.middleLineY(5) - 1);
    // For a standard 5-line staff that's y=-3, the 4th line from the bottom.
    assert.equal(NE.defaultRestY('whole', 5), -3);
  });

  test('the whole-rest exception generalizes to a non-5-line staff', () => {
    assert.equal(NE.defaultRestY('whole', 1), NE.middleLineY(1) - 1);
    assert.equal(NE.defaultRestY('whole', 6), NE.middleLineY(6) - 1);
  });

  test('restY with no voice offset matches defaultRestY exactly', () => {
    assert.equal(NE.restY('quarter', 5), NE.defaultRestY('quarter', 5));
  });

  test("restY applies a per-voice offset so two voices' rests never land on the same Y", () => {
    const handRestY = NE.restY('quarter', 5, 1); // shifted toward the hand register
    const footRestY = NE.restY('quarter', 5, -1); // shifted toward the foot register
    assert.notEqual(handRestY, footRestY);
    assert.equal(handRestY, NE.defaultRestY('quarter', 5) + 1);
    assert.equal(footRestY, NE.defaultRestY('quarter', 5) - 1);
  });
});
