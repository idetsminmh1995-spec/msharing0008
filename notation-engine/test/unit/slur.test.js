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
});
