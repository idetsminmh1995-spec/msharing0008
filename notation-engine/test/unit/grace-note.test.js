import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('grace notes (Phase 34)', () => {
  test('all 4 kind x direction combinations resolve to real, mutually distinct glyphs', () => {
    const kinds = ['acciaccatura', 'appoggiatura'];
    const directions = ['up', 'down'];
    const seen = new Set();
    for (const kind of kinds) {
      for (const direction of directions) {
        const name = NE.graceNoteGlyphName(kind, direction);
        assert.notEqual(NE.getGlyph(name), undefined, `${kind}/${direction}`);
        assert.ok(!seen.has(name), `duplicate glyph name: ${name}`);
        seen.add(name);
      }
    }
    assert.equal(seen.size, 4);
  });

  test('acciaccatura and appoggiatura never resolve to the same glyph for the same direction (the slash distinction is real)', () => {
    assert.notEqual(NE.graceNoteGlyphName('acciaccatura', 'up'), NE.graceNoteGlyphName('appoggiatura', 'up'));
    assert.notEqual(NE.graceNoteGlyphName('acciaccatura', 'down'), NE.graceNoteGlyphName('appoggiatura', 'down'));
  });

  test('the same kind resolves to a different glyph for each direction (direction-aware, not a single shared glyph)', () => {
    assert.notEqual(NE.graceNoteGlyphName('acciaccatura', 'up'), NE.graceNoteGlyphName('acciaccatura', 'down'));
    assert.notEqual(NE.graceNoteGlyphName('appoggiatura', 'up'), NE.graceNoteGlyphName('appoggiatura', 'down'));
  });

  test('a grace note renders via the shared renderMark function', () => {
    const name = NE.graceNoteGlyphName('acciaccatura', 'up');
    const svg = NE.renderMark(name, { x: 4, y: 6, color: '#000000', fontFamily: 'Bravura' });
    assert.match(svg, /x="4" y="6"/);
  });
});
