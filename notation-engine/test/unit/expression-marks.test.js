import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('dynamics (Phase 31)', () => {
  test('dynamicSide is always below', () => {
    assert.equal(NE.dynamicSide(), 'below');
  });

  test('every dynamic level resolves to its own real, distinct glyph', () => {
    const levels = ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sfz'];
    const seen = new Set();
    for (const level of levels) {
      const name = NE.dynamicGlyphName(level);
      assert.notEqual(NE.getGlyph(name), undefined, level);
      assert.ok(!seen.has(name), `duplicate glyph name: ${name}`);
      seen.add(name);
    }
    assert.equal(seen.size, levels.length);
  });

  test('a dynamic renders via the shared renderMark function', () => {
    const svg = NE.renderMark(NE.dynamicGlyphName('mf'), { x: 5, y: 10, color: '#000000', fontFamily: 'Bravura' });
    assert.match(svg, /x="5" y="10"/);
  });
});

describe('hairpins (Phase 31)', () => {
  test('a crescendo opens narrow-to-wide left to right', () => {
    const shape = NE.computeHairpinShape(0, 10, 5, 'crescendo');
    const svg = NE.renderHairpin(shape, { thickness: 0.16, color: '#000000' });
    const starts = [...svg.matchAll(/x1="([\d.]+)"/g)].map((m) => Number(m[1]));
    const ends = [...svg.matchAll(/x2="([\d.]+)"/g)].map((m) => Number(m[1]));
    assert.deepEqual(starts, [0, 0]);
    assert.deepEqual(ends, [10, 10]);
  });

  test('a decrescendo closes wide-to-narrow left to right (mirror image of a crescendo)', () => {
    const shape = NE.computeHairpinShape(0, 10, 5, 'decrescendo');
    const svg = NE.renderHairpin(shape, { thickness: 0.16, color: '#000000' });
    const starts = [...svg.matchAll(/x1="([\d.]+)"/g)].map((m) => Number(m[1]));
    const ends = [...svg.matchAll(/x2="([\d.]+)"/g)].map((m) => Number(m[1]));
    assert.deepEqual(starts, [10, 10]);
    assert.deepEqual(ends, [0, 0]);
  });

  test('the two lines of a hairpin spread to opposite Y sides of its own baseline', () => {
    const shape = NE.computeHairpinShape(0, 10, 5, 'crescendo');
    const svg = NE.renderHairpin(shape, { thickness: 0.16, color: '#000000' });
    const y2s = [...svg.matchAll(/y2="(-?[\d.]+)"/g)].map((m) => Number(m[1]));
    assert.equal(y2s.length, 2);
    assert.ok(y2s[0] < 5 && y2s[1] > 5, 'one line above the baseline, one below');
  });

  test('crescendo and decrescendo shapes are true mirror images given the same endpoints', () => {
    const cresc = NE.computeHairpinShape(0, 10, 5, 'crescendo');
    const decresc = NE.computeHairpinShape(0, 10, 5, 'decrescendo');
    const crescSvg = NE.renderHairpin(cresc, { thickness: 0.16, color: '#000000' });
    const decrescSvg = NE.renderHairpin(decresc, { thickness: 0.16, color: '#000000' });
    assert.equal(cresc.spread, decresc.spread);
    assert.notEqual(crescSvg, decrescSvg);
  });
});

describe('tempo and rehearsal mark placement (Phase 31)', () => {
  test('tempoMarkSide is always above', () => {
    assert.equal(NE.tempoMarkSide(), 'above');
  });

  test('rehearsalMarkSide is always above', () => {
    assert.equal(NE.rehearsalMarkSide(), 'above');
  });
});
