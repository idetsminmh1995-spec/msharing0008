import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('chord symbols (Phase 33)', () => {
  test('chordSymbolSide is always above', () => {
    assert.equal(NE.chordSymbolSide(), 'above');
  });

  test('every alter value resolves to its own real csym accidental glyph', () => {
    for (const alter of [-2, -1, 0, 1, 2]) {
      const name = NE.chordSymbolAccidentalGlyphName(alter);
      assert.notEqual(NE.getGlyph(name), undefined, String(alter));
      assert.ok(name.startsWith('csym'), name);
    }
  });

  test('the csym accidental glyphs are a SEPARATE set from the plain notehead accidentals (Sec9.11), not aliased', () => {
    for (const alter of [-2, -1, 0, 1, 2]) {
      const csymName = NE.chordSymbolAccidentalGlyphName(alter);
      const plainName = NE.accidentalGlyphName(alter);
      assert.notEqual(csymName, plainName);
    }
  });

  test('chordSymbolAccidentalGlyphName throws for an out-of-range alter', () => {
    assert.throws(() => NE.chordSymbolAccidentalGlyphName(3), /No chord-symbol accidental glyph/);
  });

  test('all five quality glyphs resolve to real, mutually distinct glyphs', () => {
    const qualities = ['minor', 'diminished', 'halfDiminished', 'augmented', 'majorSeventh'];
    const seen = new Set();
    for (const q of qualities) {
      const name = NE.chordSymbolQualityGlyphName(q);
      assert.notEqual(NE.getGlyph(name), undefined, q);
      assert.ok(!seen.has(name), `duplicate glyph name: ${name}`);
      seen.add(name);
    }
    assert.equal(seen.size, qualities.length);
  });

  test('a chord-symbol quality glyph renders via the shared renderMark function', () => {
    const name = NE.chordSymbolQualityGlyphName('minor');
    const svg = NE.renderMark(name, { x: 8, y: 2, color: '#000000', fontFamily: 'Bravura' });
    assert.match(svg, /x="8" y="2"/);
  });
});
