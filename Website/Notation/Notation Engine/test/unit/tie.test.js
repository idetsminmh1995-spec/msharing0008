import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('ties (Phase 26)', () => {
  test('a down-stem note gets its tie above (opposite the stem)', () => {
    assert.equal(NE.tieSide('down'), 'above');
  });

  test('an up-stem note gets its tie below (opposite the stem)', () => {
    assert.equal(NE.tieSide('up'), 'below');
  });

  test("a whole note (no stem) still resolves a side via its automatic direction, matching 'imagine where the stem would go'", () => {
    // A high note's automatic direction would be 'down' (above middle
    // line), so its tie -- computed the same way as any other note's --
    // goes above.
    const middle = NE.middleLineY(5);
    const highNotePosition = -4; // above the middle line
    const wouldBeDirection = NE.automaticStemDirection(highNotePosition, middle);
    assert.equal(NE.tieSide(wouldBeDirection), 'above');
  });

  test('computeTieShape carries the side and a real bulge height through unchanged', () => {
    const shape = NE.computeTieShape(5, 10, 8, 'above');
    assert.equal(shape.startX, 5);
    assert.equal(shape.endX, 10);
    assert.equal(shape.y, 8);
    assert.equal(shape.side, 'above');
    assert.ok(shape.bulgeHeight > 0);
  });

  test('renderTie produces a filled path (not a stroked line) using the notehead Y as its baseline', () => {
    const shape = NE.computeTieShape(5, 10, 8, 'above');
    const svg = NE.renderTie(shape, { color: '#000000', midpointThickness: 0.22 });
    assert.match(svg, /<path /);
    assert.match(svg, /fill="#000000"/);
    assert.match(svg, /stroke="none"/);
    assert.match(svg, /M 5 8/);
  });

  test("renderTie's 'above' side bulges to a smaller (more negative) Y than the baseline", () => {
    const shape = NE.computeTieShape(5, 10, 8, 'above');
    const svg = NE.renderTie(shape, { color: '#000000', midpointThickness: 0.22 });
    // Both control points should be < 8 (above, in this engine's Y-down convention).
    const ys = [...svg.matchAll(/Q [\d.]+ (-?[\d.]+)/g)].map((m) => Number(m[1]));
    assert.equal(ys.length, 2);
    assert.ok(ys.every((y) => y < 8));
  });

  test("renderTie's 'below' side bulges to a larger (more positive) Y than the baseline", () => {
    const shape = NE.computeTieShape(5, 10, 8, 'below');
    const svg = NE.renderTie(shape, { color: '#000000', midpointThickness: 0.22 });
    const ys = [...svg.matchAll(/Q [\d.]+ (-?[\d.]+)/g)].map((m) => Number(m[1]));
    assert.equal(ys.length, 2);
    assert.ok(ys.every((y) => y > 8));
  });

  test('the two curves forming the lens have different heights (the taper), not the same value twice', () => {
    const shape = NE.computeTieShape(5, 10, 8, 'above');
    const svg = NE.renderTie(shape, { color: '#000000', midpointThickness: 0.22 });
    const ys = [...svg.matchAll(/Q [\d.]+ (-?[\d.]+)/g)].map((m) => Number(m[1]));
    assert.notEqual(ys[0], ys[1]);
  });
  /**
   * The drawn curve, not the path's control points: a quadratic peaks at
   * half its control point's height, which is exactly what used to make
   * every tie in the engine half as thick and half as high as it said it
   * was. These read the shape back off the path the way a renderer does.
   *
   * Tolerances are a ten-thousandth because `svgNumber` writes four
   * decimals -- the path on the page is the rounded one, so the rounding
   * is part of what is being checked, not noise to see past.
   */
  const quadPeak = (y0, control) => (y0 + control) / 2;

  const controlYs = (svg) => [...svg.matchAll(/Q [\d.-]+ (-?[\d.]+)/g)].map((m) => Number(m[1]));

  test('the drawn curve reaches the height the shape states, not half of it', () => {
    const shape = NE.computeTieShape(5, 10, 8, 'above');
    const svg = NE.renderTie(shape, { color: '#000000', midpointThickness: 0.21 });
    const [inner, outer] = controlYs(svg).map((c) => quadPeak(8, c));
    const centre = (inner + outer) / 2;
    assert.ok(
      Math.abs(8 - centre - shape.bulgeHeight) < 1e-4,
      `curve peaks ${String(8 - centre)} above the baseline, shape says ${String(shape.bulgeHeight)}`,
    );
  });

  test('the drawn lens is as thick at its middle as the midpoint thickness asks', () => {
    const shape = NE.computeTieShape(5, 10, 8, 'above');
    const svg = NE.renderTie(shape, { color: '#000000', midpointThickness: 0.21 });
    const [inner, outer] = controlYs(svg).map((c) => quadPeak(8, c));
    assert.ok(Math.abs(Math.abs(inner - outer) - 0.21) < 1e-4, `drawn ${String(Math.abs(inner - outer))}`);
  });

  test('a longer tie arcs higher than a short one, and a very short one still arcs', () => {
    const short = NE.computeTieShape(0, 1.2, 8, 'above').bulgeHeight;
    const long = NE.computeTieShape(0, 12, 8, 'above').bulgeHeight;
    assert.ok(long > short, `${String(long)} should exceed ${String(short)}`);
    // Flatter than it is thick reads as a smudge, not a curve.
    assert.ok(short >= 0.21 * 2);
  });
});
