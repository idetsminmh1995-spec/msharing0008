import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('tuplets (Phase 28)', () => {
  test('a fully-beamed group needs no bracket', () => {
    assert.equal(NE.tupletBracketNeeded(true), false);
  });

  test('a group with an unbeamed note or a rest needs a bracket', () => {
    assert.equal(NE.tupletBracketNeeded(false), true);
  });

  test("tupletSide: up-stem group -> bracket ABOVE (same side as the stem, opposite ties/slurs)", () => {
    assert.equal(NE.tupletSide('up'), 'above');
  });

  test('tupletSide: down-stem group -> bracket below', () => {
    assert.equal(NE.tupletSide('down'), 'below');
  });

  test('tupletSide is the OPPOSITE relationship from tieSide/slurSide for the same direction', () => {
    // A down-stem note's tie/slur goes above; a down-stem tuplet's
    // bracket goes below. Confirming these are genuinely different rules,
    // not accidentally the same one.
    assert.notEqual(NE.tupletSide('down'), NE.tieSide('down'));
    assert.notEqual(NE.tupletSide('up'), NE.tieSide('up'));
  });

  test('every digit 0-9 resolves to its own real tuplet glyph, distinct from the time-signature digit', () => {
    for (let d = 0; d <= 9; d++) {
      const name = NE.tupletDigitGlyphName(d);
      assert.equal(name, `tuplet${d}`);
      assert.notEqual(NE.getGlyph(name), undefined, name);
      assert.notEqual(name, `timeSig${d}`);
    }
  });

  test('tupletDigitGlyphName rejects anything outside a single digit 0-9', () => {
    assert.throws(() => NE.tupletDigitGlyphName(10), /single digit/);
    assert.throws(() => NE.tupletDigitGlyphName(-1), /single digit/);
    assert.throws(() => NE.tupletDigitGlyphName(3.5), /single digit/);
  });

  test('computeTupletBracketShape carries side and a real hook length through unchanged', () => {
    const shape = NE.computeTupletBracketShape(5, 15, 3, 'above');
    assert.equal(shape.startX, 5);
    assert.equal(shape.endX, 15);
    assert.equal(shape.y, 3);
    assert.equal(shape.side, 'above');
    assert.ok(shape.hookLength > 0);
  });

  test('renderTupletBracket draws a horizontal line plus two hooks pointing toward the notes', () => {
    const shape = NE.computeTupletBracketShape(5, 15, 3, 'above');
    const svg = NE.renderTupletBracket(shape, { thickness: 0.16, color: '#000000' });
    const lines = [...svg.matchAll(/<line /g)];
    assert.equal(lines.length, 3); // the horizontal bar + 2 hooks
  });

  test("an 'above' bracket's hooks point toward larger Y (down, toward the notes below it)", () => {
    const shape = NE.computeTupletBracketShape(5, 15, 3, 'above');
    const svg = NE.renderTupletBracket(shape, { thickness: 0.16, color: '#000000' });
    const ys = [...svg.matchAll(/y2="([\d.]+)"/g)].map((m) => Number(m[1]));
    assert.ok(ys.some((y) => y > 3));
  });

  test("a 'below' bracket's hooks point toward smaller Y (up, toward the notes above it)", () => {
    const shape = NE.computeTupletBracketShape(5, 15, 3, 'below');
    const svg = NE.renderTupletBracket(shape, { thickness: 0.16, color: '#000000' });
    const ys = [...svg.matchAll(/y2="(-?[\d.]+)"/g)].map((m) => Number(m[1]));
    assert.ok(ys.some((y) => y < 3));
  });

  test('renderTupletNumber draws the correct glyph at the given position', () => {
    const svg = NE.renderTupletNumber('tuplet3', 10, 5, { color: '#000000', fontFamily: 'Bravura' });
    assert.match(svg, /x="10" y="5"/);
    assert.match(svg, /fill="#000000"/);
  });
});
