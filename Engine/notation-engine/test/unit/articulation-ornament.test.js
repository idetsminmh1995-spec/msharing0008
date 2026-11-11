import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('articulations (Phase 30)', () => {
  test('accent/staccato/tenuto/staccatissimo all follow the same opposite-of-stem rule as tieSide', () => {
    for (const type of ['accent', 'staccato', 'tenuto', 'staccatissimo']) {
      assert.equal(NE.articulationSide(type, 'down'), NE.tieSide('down'), type);
      assert.equal(NE.articulationSide(type, 'up'), NE.tieSide('up'), type);
    }
  });

  test('marcato is ALWAYS above, regardless of stem direction -- confirmed for BOTH directions', () => {
    assert.equal(NE.articulationSide('marcato', 'down'), 'above');
    assert.equal(NE.articulationSide('marcato', 'up'), 'above');
  });

  test('every articulation type x side combination resolves to a real, distinct glyph', () => {
    const types = ['accent', 'staccato', 'tenuto', 'marcato', 'staccatissimo'];
    const seen = new Set();
    for (const type of types) {
      for (const side of ['above', 'below']) {
        const name = NE.articulationGlyphName(type, side);
        assert.notEqual(NE.getGlyph(name), undefined, name);
        assert.ok(!seen.has(name), `duplicate glyph name: ${name}`);
        seen.add(name);
      }
    }
    assert.equal(seen.size, types.length * 2);
  });
});

describe('ornaments (Phase 30)', () => {
  test('every ornament type resolves to its own real, distinct glyph', () => {
    const types = ['trill', 'mordent', 'turn', 'turnInverted'];
    const seen = new Set();
    for (const type of types) {
      const name = NE.ornamentGlyphName(type);
      assert.notEqual(NE.getGlyph(name), undefined, name);
      assert.ok(!seen.has(name), `duplicate glyph name: ${name}`);
      seen.add(name);
    }
    assert.equal(seen.size, types.length);
  });

  test('ornamentGlyphName takes no stem-direction parameter at all, unlike articulationGlyphName', () => {
    // Confirmed structurally: calling with just the type is the full,
    // correct call -- there is no second parameter to omit.
    assert.equal(NE.ornamentGlyphName.length, 1);
  });
});

describe('mark rendering (Phase 30)', () => {
  test('renderMark draws the given glyph at the given position for an articulation', () => {
    const name = NE.articulationGlyphName('staccato', 'above');
    const svg = NE.renderMark(name, { x: 5, y: 3, color: '#000000', fontFamily: 'Bravura' });
    assert.match(svg, /x="5" y="3"/);
    assert.match(svg, /fill="#000000"/);
  });

  test('renderMark draws the given glyph at the given position for an ornament', () => {
    const name = NE.ornamentGlyphName('trill');
    const svg = NE.renderMark(name, { x: 10, y: 1, color: '#000000', fontFamily: 'Bravura' });
    assert.match(svg, /x="10" y="1"/);
  });

  test('renderMark throws for an unknown glyph name rather than silently drawing nothing', () => {
    assert.throws(() => NE.renderMark('notARealGlyph', { x: 0, y: 0, color: '#000000', fontFamily: 'Bravura' }));
  });
});
