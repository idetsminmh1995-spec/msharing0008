import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('SMuFL glyph table (Phase 5)', () => {
  test('getFontInfo reports the real bundled Bravura version', () => {
    const info = NE.getFontInfo();
    assert.equal(info.name, 'Bravura');
    assert.equal(info.version, 1.38);
  });

  test('getGlyph resolves real, spec-correct codepoints', () => {
    assert.equal(NE.getGlyph('gClef').codepoint, 'U+E050');
    assert.equal(NE.getGlyph('noteheadBlack').codepoint, 'U+E0A4');
    assert.equal(NE.getGlyph('noteheadXBlack').codepoint, 'U+E0A9');
  });

  test('getGlyph returns real Bravura stem anchors for a notehead', () => {
    const anchors = NE.getGlyph('noteheadBlack').anchors;
    assert.ok(anchors.stemUpSE);
    assert.ok(anchors.stemDownNW);
  });

  test('getGlyph returns undefined for an unknown name, never throws', () => {
    assert.equal(NE.getGlyph('thisIsNotARealGlyphName'), undefined);
  });

  test('getEngravingDefault matches Bravura\'s published defaults', () => {
    assert.equal(NE.getEngravingDefault('stemThickness'), 0.12);
    assert.equal(NE.getEngravingDefault('beamThickness'), 0.5);
    assert.equal(NE.getEngravingDefault('staffLineThickness'), 0.13);
  });

  test('getEngravingDefault returns undefined for an unknown key', () => {
    assert.equal(NE.getEngravingDefault('notARealMetric'), undefined);
  });

  test('codepointToChar round-trips with getGlyph().char', () => {
    const gClef = NE.getGlyph('gClef');
    assert.equal(NE.codepointToChar('U+E050'), gClef.char);
  });
});
