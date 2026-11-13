import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('slurs (Phase 27)', () => {
  test('all up-stem notes -> slur goes below', () => {
    assert.equal(NE.slurSide(['up', 'up', 'up']), 'below');
  });

  test('all down-stem notes -> slur goes above', () => {
    assert.equal(NE.slurSide(['down', 'down']), 'above');
  });

  test('a mixed group (some up, some down) -> slur goes above, matching the explicit tie-break rule', () => {
    assert.equal(NE.slurSide(['up', 'down']), 'above');
    assert.equal(NE.slurSide(['down', 'up', 'up']), 'above');
  });

  test('a single-note span still resolves a side (all-up rule applies trivially)', () => {
    assert.equal(NE.slurSide(['up']), 'below');
    assert.equal(NE.slurSide(['down']), 'above');
  });

  test('slurSide throws on an empty span rather than guessing', () => {
    assert.throws(() => NE.slurSide([]), /at least one/);
  });

  test('computeSlurShape carries side and a real bulge height through unchanged', () => {
    const shape = NE.computeSlurShape(5, 20, 8, 'above');
    assert.equal(shape.startX, 5);
    assert.equal(shape.endX, 20);
    assert.equal(shape.y, 8);
    assert.equal(shape.side, 'above');
    assert.ok(shape.bulgeHeight > 0);
  });

  test('renderSlur produces a filled path using the shared Y as its baseline, same primitive as renderTie', () => {
    const shape = NE.computeSlurShape(5, 20, 8, 'above');
    const svg = NE.renderSlur(shape, { color: '#000000', midpointThickness: 0.22 });
    assert.match(svg, /<path /);
    assert.match(svg, /fill="#000000"/);
    assert.match(svg, /stroke="none"/);
    assert.match(svg, /M 5 8/);
  });

  test("renderSlur's 'above' side bulges above (more negative Y) than the baseline", () => {
    const shape = NE.computeSlurShape(5, 20, 8, 'above');
    const svg = NE.renderSlur(shape, { color: '#000000', midpointThickness: 0.22 });
    const ys = [...svg.matchAll(/Q [\d.]+ (-?[\d.]+)/g)].map((m) => Number(m[1]));
    assert.equal(ys.length, 2);
    assert.ok(ys.every((y) => y < 8));
  });

  test("renderSlur's 'below' side bulges below (more positive Y) than the baseline", () => {
    const shape = NE.computeSlurShape(5, 20, 8, 'below');
    const svg = NE.renderSlur(shape, { color: '#000000', midpointThickness: 0.22 });
    const ys = [...svg.matchAll(/Q [\d.]+ (-?[\d.]+)/g)].map((m) => Number(m[1]));
    assert.equal(ys.length, 2);
    assert.ok(ys.every((y) => y > 8));
  });

  test('a slur spans arbitrary distance (unlike a tie, which is always 2 same-pitch notes close together)', () => {
    const shape = NE.computeSlurShape(0, 100, 8, 'above');
    assert.equal(shape.endX - shape.startX, 100);
  });
  /**
   * MuseScore shapes a slur from its LENGTH -- a short one's shoulder
   * rises straight with the span, a longer one's logarithmically, and
   * the rise is capped so a slur across a system is not a dome. The
   * engine used to give every slur the same half-space arc regardless.
   */
  test('a slur over half a bar arcs higher than one over two notes', () => {
    const twoNotes = NE.computeSlurShape(0, 3, 8, 'above').bulgeHeight;
    const halfBar = NE.computeSlurShape(0, 16, 8, 'above').bulgeHeight;
    assert.ok(halfBar > twoNotes * 1.5, `${String(halfBar)} vs ${String(twoNotes)}`);
  });

  test('the arc stops growing rather than running away on a system-long slur', () => {
    // The log term reaches its cap at about 63 staff spaces -- past that
    // a longer slur is no taller, which is what keeps a slur across a
    // whole system a curve rather than a dome over the staff above.
    const long = NE.arcHeightForSpan(100);
    const absurd = NE.arcHeightForSpan(1000);
    assert.equal(long, absurd);
    assert.ok(absurd < 3, `capped height ${String(absurd)} should stay inside a staff`);
  });

  test('the drawn curve reaches the stated height and thickness, not half of each', () => {
    const shape = NE.computeSlurShape(5, 20, 8, 'above');
    const svg = NE.renderSlur(shape, { color: '#000000', midpointThickness: 0.21 });
    const peaks = [...svg.matchAll(/Q [\d.-]+ (-?[\d.]+)/g)].map((m) => (8 + Number(m[1])) / 2);
    const centre = (peaks[0] + peaks[1]) / 2;
    assert.ok(Math.abs(8 - centre - shape.bulgeHeight) < 1e-4);
    assert.ok(Math.abs(Math.abs(peaks[0] - peaks[1]) - 0.21) < 1e-4);
  });
});
