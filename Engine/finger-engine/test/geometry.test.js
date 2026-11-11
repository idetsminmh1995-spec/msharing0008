// Plan Part 04. Phase 0 is "done when the geometry numbers match the
// table in 04 §3", so this file IS that table.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../dist/finger-engine.js', import.meta.url), 'utf8'), sandbox);
const E = sandbox.FingerEngine;

const L = 648;
const guitar = E.defaultInstrument();
const geometry = { fingertipBehindFret: 0.3 };
const near = (actual, expected, tolerance, what) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${what}: expected ${expected} ± ${tolerance}, got ${actual.toFixed(3)}`,
  );

test('[GEO-01] fret distances match the plan table', () => {
  const table = [
    [1, 36.4],
    [3, 103.1],
    [5, 162.5],
    [7, 215.5],
    [9, 262.7],
    [12, 324.0],
    [15, 375.5],
    [17, 405.3],
    [19, 431.8],
    [22, 466.2],
    [24, 486.0],
  ];
  for (const [fret, mm] of table) {
    near(E.fretDistanceMm(L, fret), mm, 0.05, `fret ${fret}`);
  }
  // The twelfth fret is half the scale -- the one number that is not
  // an estimate but a physical fact.
  assert.equal(E.fretDistanceMm(L, 12), L / 2);
  assert.equal(E.fretDistanceMm(L, 0), 0, 'the nut is the origin');
});

test('[GEO-02] fret widths match the plan table, and narrow as they climb', () => {
  const table = [
    [1, 36.4],
    [3, 32.4],
    [5, 28.9],
    [7, 25.7],
    [9, 22.9],
    [12, 19.3],
    [15, 16.2],
    [17, 14.4],
    [19, 12.9],
    [22, 10.8],
    [24, 9.6],
  ];
  for (const [fret, mm] of table) {
    near(E.fretWidthMm(L, fret), mm, 0.05, `width of fret ${fret}`);
  }
  for (let fret = 2; fret <= 24; fret++) {
    assert.ok(E.fretWidthMm(L, fret) < E.fretWidthMm(L, fret - 1), `fret ${fret} is narrower`);
  }
});

test('[GEO-03] the index-to-pinky spans match the plan table', () => {
  // This is the table the span limits in Part 05 are written against,
  // so it is the one that decides whether a stretch is allowed.
  const table = [
    [1, 99.0, 128.4, 156.2],
    [3, 88.2, 114.4, null],
    [5, 78.6, 101.9, 123.9],
    [7, 70.0, 90.8, null],
    [9, 62.4, 80.9, 98.4],
    [12, 52.5, 68.0, 82.7],
  ];
  for (const [at, four, five, six] of table) {
    near(E.spanMm(guitar, geometry, at, at + 3), four, 0.1, `4-fret span at ${at}`);
    near(E.spanMm(guitar, geometry, at, at + 4), five, 0.1, `5-fret span at ${at}`);
    if (six !== null) near(E.spanMm(guitar, geometry, at, at + 5), six, 0.1, `6-fret span at ${at}`);
  }
});

test('the span limits mean what the plan says they mean', () => {
  // With the default 1-4 hard limit of 120 mm, a five-fret stretch is
  // possible from fret 3 upward but not at fret 1. That is the whole
  // point of measuring in millimetres instead of frets.
  const limit = E.DEFAULTS.leftHand.spanMm['1-4'].max;
  assert.equal(limit, 120);
  assert.ok(E.spanMm(guitar, geometry, 1, 5) > limit, 'a 5-fret stretch at fret 1 is out of reach');
  assert.ok(E.spanMm(guitar, geometry, 3, 7) < limit, 'the same stretch at fret 3 is fine');
});

test('[GEO-03] a fingertip sits behind the wire, and an open string is the nut', () => {
  const fret = 5;
  const wire = E.fretDistanceMm(L, fret);
  const x = E.fingertipXMm(guitar, geometry, fret);
  assert.ok(x < wire, 'behind the wire');
  near(wire - x, 0.3 * E.fretWidthMm(L, fret), 1e-9, 'exactly k of the fret width');
  assert.equal(E.fingertipXMm(guitar, geometry, 0), 0);
});

test('[GEO-03/DM-05] a capo moves where the open strings are', () => {
  const capoed = { ...guitar, capo: 3 };
  assert.equal(E.fingertipXMm(capoed, geometry, 2), E.fretDistanceMm(L, 3), 'behind the capo is the capo');
  assert.ok(E.fingertipXMm(capoed, geometry, 7) > E.fretDistanceMm(L, 3), 'above it is normal');
});

test('[GEO-04] strings fan out from the nut to the bridge', () => {
  const atNut = E.stringSpacingMm(guitar, 0);
  const atBridge = E.stringSpacingMm(guitar, L);
  near(atNut, 35 / 5, 1e-9, 'nut spacing');
  near(atBridge, 52.5 / 5, 1e-9, 'bridge spacing');
  assert.ok(atBridge > atNut, 'wider at the bridge');
  assert.equal(E.stringYMm(guitar, 1, 0), 0, 'string 1 is the origin across the neck');
  near(E.stringYMm(guitar, 6, 0), 35, 1e-9, 'string 6 is the full spread away');
});

test('[GEO-05] distance is reported along and across the neck as well as straight', () => {
  const a = E.fingertipPoint(guitar, geometry, 1, 5);
  const b = E.fingertipPoint(guitar, geometry, 3, 7);
  const d = E.fingertipDistanceMm(a, b);
  near(d.alongMm, Math.abs(b.xMm - a.xMm), 1e-9, 'along');
  near(d.acrossMm, Math.abs(b.yMm - a.yMm), 1e-9, 'across');
  near(d.distanceMm, Math.hypot(d.alongMm, d.acrossMm), 1e-9, 'straight line');
  // They are reported separately because they do not cost the same:
  // reaching along the neck is a stretch, reaching across it is not.
  assert.ok(d.alongMm > d.acrossMm);
});
