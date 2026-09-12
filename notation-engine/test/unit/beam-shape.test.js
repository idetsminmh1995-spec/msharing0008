import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('beam shape geometry (Phase 24)', () => {
  test('flat style has zero slope, both ends at the extreme natural stem tip', () => {
    // Up-stem group; natural tips (position - 3.5) for positions [0, -1, 1]:
    // -3.5, -4.5, -2.5 -- the most extreme (most negative, furthest "up") is -4.5.
    const shape = NE.computeBeamShape([0, -1, 1], [0, 5, 10], 'up', 'flat', 3.5);
    assert.equal(shape.startY, shape.endY);
    assert.equal(shape.startY, -4.5);
  });

  test('straight style with a small interval keeps its natural (unclamped) slope', () => {
    // positions [0, -0.5] (a small, half-space difference) -- natural tips -3.5, -4.
    const shape = NE.computeBeamShape([0, -0.5], [0, 10], 'up', 'straight', 3.5);
    assert.equal(shape.startY, -3.5);
    assert.equal(shape.endY, -4); // NOT clamped -- the natural difference (0.5) is under the 1.0 cap
  });

  test('straight style with a large interval gets its slope clamped to exactly 1.0sp', () => {
    // positions [0, -5] (a large interval) -- natural tips -3.5, -8.5 (a 5sp difference).
    const shape = NE.computeBeamShape([0, -5], [0, 10], 'up', 'straight', 3.5);
    assert.equal(shape.startY, -3.5);
    assert.equal(shape.endY, -4.5); // clamped to exactly startY - 1.0
    assert.ok(Math.abs(shape.endY - shape.startY) <= 1.0 + 1e-9);
  });

  test('a downward-sloping straight beam clamps in the correct (positive) direction', () => {
    const shape = NE.computeBeamShape([0, 5], [0, 10], 'down', 'straight', 3.5);
    // Natural tips: 3.5, 8.5 (a 5sp difference) -- clamped to +1.0 from start.
    assert.equal(shape.startY, 3.5);
    assert.equal(shape.endY, 4.5);
  });

  test('curved style has EXACTLY the same endpoints as straight (only the drawing differs)', () => {
    const straight = NE.computeBeamShape([0, -5], [0, 10], 'up', 'straight', 3.5);
    const curved = NE.computeBeamShape([0, -5], [0, 10], 'up', 'curved', 3.5);
    assert.equal(curved.startY, straight.startY);
    assert.equal(curved.endY, straight.endY);
    assert.equal(curved.startX, straight.startX);
    assert.equal(curved.endX, straight.endX);
  });

  test('beamYAtX interpolates linearly along the beam', () => {
    const shape = NE.computeBeamShape([0, -1], [0, 10], 'up', 'straight', 3.5);
    // startY=-3.5 at x=0, endY=-4.5 at x=10 -- halfway (x=5) should be -4.0.
    assert.ok(Math.abs(NE.beamYAtX(shape, 5) - -4.0) < 1e-9);
    assert.equal(NE.beamYAtX(shape, 0), shape.startY);
    assert.equal(NE.beamYAtX(shape, 10), shape.endY);
  });

  test('numBeamLines matches the flag count for every beamable duration', () => {
    assert.equal(NE.numBeamLines('eighth'), 1);
    assert.equal(NE.numBeamLines('16th'), 2);
    assert.equal(NE.numBeamLines('32nd'), 3);
    assert.equal(NE.numBeamLines('1024th'), 8);
  });

  test('numBeamLines throws for a duration that is never beamed', () => {
    assert.throws(() => NE.numBeamLines('quarter'), /never beamed/);
  });

  test('computeBeamShape throws on an empty group', () => {
    assert.throws(() => NE.computeBeamShape([], [], 'up', 'straight', 3.5));
  });
});

describe('beam rendering (Phase 24)', () => {
  test('renderBeam draws exactly lineCount lines for a straight/flat beam', () => {
    const shape = NE.computeBeamShape([0, -1], [0, 10], 'up', 'straight', 3.5);
    const svg = NE.renderBeam(shape, { lineCount: 2, thickness: 0.5, spacing: 0.25, color: '#000000' });
    assert.equal((svg.match(/<line/g) || []).length, 2);
  });

  test('renderBeam draws paths (not lines) for a curved beam', () => {
    const shape = NE.computeBeamShape([0, -1], [0, 10], 'up', 'curved', 3.5);
    const svg = NE.renderBeam(shape, { lineCount: 1, thickness: 0.5, spacing: 0.25, color: '#000000' });
    assert.equal((svg.match(/<path/g) || []).length, 1);
    assert.equal((svg.match(/<line/g) || []).length, 0);
  });

  test('secondary beam centres are thickness+spacing apart, NOT spacing alone (they must not overlap)', () => {
    const shape = NE.computeBeamShape([0, 0], [0, 10], 'up', 'flat', 3.5); // flat at y=-3.5
    const svg = NE.renderBeam(shape, { lineCount: 2, thickness: 0.5, spacing: 0.25, color: '#000000' });
    // SMuFL's beamSpacing is the GAP between beams, not their centre-to-
    // centre distance, so with thickness 0.5 the centres sit 0.75 apart.
    // Up-stem: primary at y=-3.5, secondary toward the notehead at y=-2.75.
    assert.match(svg, /y1="-3\.5"/);
    assert.match(svg, /y1="-2\.75"/);
    // The bug this guards against: using spacing (0.25) as the centre step
    // would put the second beam at -3.25, overlapping the first by half its
    // own thickness. Assert that value is specifically absent.
    assert.ok(!svg.includes('y1="-3.25"'), 'second beam must not overlap the first');

    // Independent check of the same property: the two centres' gap must be
    // at least the beam thickness, or they visually merge.
    const ys = [...svg.matchAll(/y1="(-?[\d.]+)"/g)].map((m) => Number(m[1]));
    assert.equal(ys.length, 2);
    assert.ok(Math.abs(ys[0] - ys[1]) >= 0.5, 'beam centres must be at least one thickness apart');
  });
});
