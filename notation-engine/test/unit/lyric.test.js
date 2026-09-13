import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('lyrics (Phase 32)', () => {
  test('lyricSide is always below', () => {
    assert.equal(NE.lyricSide(), 'below');
  });

  test('the hyphen and elision glyph names both resolve to real, distinct glyphs', () => {
    const hyphen = NE.lyricHyphenGlyphName();
    const elision = NE.lyricElisionGlyphName();
    assert.notEqual(NE.getGlyph(hyphen), undefined, hyphen);
    assert.notEqual(NE.getGlyph(elision), undefined, elision);
    assert.notEqual(hyphen, elision);
  });

  test('a hyphen renders via the shared renderMark function (no new rendering function needed)', () => {
    const svg = NE.renderMark(NE.lyricHyphenGlyphName(), { x: 5, y: 12, color: '#000000', fontFamily: 'Bravura' });
    assert.match(svg, /x="5" y="12"/);
  });

  test('computeHyphenX sits exactly midway between two syllable endpoints', () => {
    assert.equal(NE.computeHyphenX(4, 10), 7);
    assert.equal(NE.computeHyphenX(0, 1), 0.5);
  });

  test('computeExtenderLine passes its endpoints through unchanged', () => {
    const shape = NE.computeExtenderLine(3, 20, 12);
    assert.equal(shape.startX, 3);
    assert.equal(shape.endX, 20);
    assert.equal(shape.y, 12);
  });

  test('renderExtenderLine draws a plain horizontal line at the given Y with the given thickness', () => {
    const shape = NE.computeExtenderLine(3, 20, 12);
    const svg = NE.renderExtenderLine(shape, { thickness: 0.16, color: '#000000' });
    assert.match(svg, /x1="3" y1="12" x2="20" y2="12"/);
    assert.match(svg, /stroke-width="0\.16"/);
  });
});
