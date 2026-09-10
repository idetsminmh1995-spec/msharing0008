import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

// Real Bravura values (Phase 5), matching what a caller would actually pass.
const METRICS = {
  thinThickness: 0.16,
  thickThickness: 0.5,
  separation: 0.4,
  dotWidth: 0.4,
  dashLength: 0.5,
  gapLength: 0.25,
};

describe('barline engine (Phase 13)', () => {
  test('single barline is one thin line', () => {
    const g = NE.computeBarlineGeometry('single', METRICS);
    assert.equal(g.strokes.length, 1);
    assert.equal(g.strokes[0].kind, 'line');
    assert.equal(g.strokes[0].thickness, 0.16);
    assert.equal(g.width, 0.16);
  });

  test('double barline is two thin lines separated by barlineSeparation', () => {
    const g = NE.computeBarlineGeometry('double', METRICS);
    assert.equal(g.strokes.length, 2);
    assert.ok(g.strokes.every((s) => s.kind === 'line' && s.thickness === 0.16));
    assert.equal(g.strokes[1].x, 0.16 + 0.4);
    assert.equal(g.width, 0.16 + 0.4 + 0.16);
  });

  test('final barline is thin then thick', () => {
    const g = NE.computeBarlineGeometry('final', METRICS);
    assert.equal(g.strokes.length, 2);
    assert.equal(g.strokes[0].thickness, 0.16);
    assert.equal(g.strokes[1].thickness, 0.5);
  });

  test('repeatBegin is thick, thin, then dots -- dots pointing forward into the repeat', () => {
    const g = NE.computeBarlineGeometry('repeatBegin', METRICS);
    assert.equal(g.strokes.length, 3);
    assert.equal(g.strokes[0].kind, 'line');
    assert.equal(g.strokes[0].thickness, 0.5); // thick first
    assert.equal(g.strokes[1].kind, 'line');
    assert.equal(g.strokes[1].thickness, 0.16); // thin second
    assert.equal(g.strokes[2].kind, 'dots'); // dots last (pointing into what follows)
  });

  test('repeatEnd is dots, thin, then thick -- dots pointing back at what just played', () => {
    const g = NE.computeBarlineGeometry('repeatEnd', METRICS);
    assert.equal(g.strokes.length, 3);
    assert.equal(g.strokes[0].kind, 'dots'); // dots first
    assert.equal(g.strokes[0].x, 0);
    assert.equal(g.strokes[1].kind, 'line');
    assert.equal(g.strokes[1].thickness, 0.16);
    assert.equal(g.strokes[2].kind, 'line');
    assert.equal(g.strokes[2].thickness, 0.5); // thick last
  });

  test('repeatBoth is dots-thin-thick-thick-thin-dots, symmetric', () => {
    const g = NE.computeBarlineGeometry('repeatBoth', METRICS);
    assert.equal(g.strokes.length, 6);
    const kinds = [...g.strokes].map((s) => s.kind);
    assert.deepEqual(kinds, ['dots', 'line', 'line', 'line', 'line', 'dots']);
    const thicknesses = [...g.strokes].map((s) => (s.kind === 'line' ? s.thickness : null));
    assert.deepEqual(thicknesses, [null, 0.16, 0.5, 0.5, 0.16, null]);
  });

  test('dashed barline is one dashed line using the real Bravura dash/gap lengths', () => {
    const g = NE.computeBarlineGeometry('dashed', METRICS);
    assert.equal(g.strokes.length, 1);
    assert.equal(g.strokes[0].kind, 'dashedLine');
    assert.equal(g.strokes[0].dashLength, 0.5);
    assert.equal(g.strokes[0].gapLength, 0.25);
  });

  test('shouldShowBarNumber: off never shows', () => {
    assert.equal(NE.shouldShowBarNumber(1, { display: 'off' }, true), false);
    assert.equal(NE.shouldShowBarNumber(5, { display: 'off' }, true), false);
  });

  test('shouldShowBarNumber: everyBar always shows', () => {
    assert.equal(NE.shouldShowBarNumber(1, { display: 'everyBar' }, false), true);
    assert.equal(NE.shouldShowBarNumber(42, { display: 'everyBar' }, false), true);
  });

  test('shouldShowBarNumber: systemStart only shows when isSystemStart is true', () => {
    assert.equal(NE.shouldShowBarNumber(5, { display: 'systemStart' }, true), true);
    assert.equal(NE.shouldShowBarNumber(5, { display: 'systemStart' }, false), false);
  });

  test('shouldShowBarNumber: everyNBars shows at 1, N+1, 2N+1...', () => {
    const config = { display: 'everyNBars', everyNBars: 4 };
    assert.equal(NE.shouldShowBarNumber(1, config, false), true);
    assert.equal(NE.shouldShowBarNumber(2, config, false), false);
    assert.equal(NE.shouldShowBarNumber(4, config, false), false);
    assert.equal(NE.shouldShowBarNumber(5, config, false), true);
    assert.equal(NE.shouldShowBarNumber(9, config, false), true);
  });
});
