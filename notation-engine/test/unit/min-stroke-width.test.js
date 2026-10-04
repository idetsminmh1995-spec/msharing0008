import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, '..', 'fixtures', 'musicxml');
const NE = loadEngine();
const domParser = testDomParser();
const load = (name) => fs.readFileSync(path.join(FIXTURES, name), 'utf8');
const render = (name, config) =>
  NE.renderFromMusicXml(load(name), { domParser, ...(config ? { config } : {}) }).svg;

/** Every stroke width the markup asks for, as numbers. */
const strokes = (svg) =>
  [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => Number(m[1])).filter((w) => w > 0);

const FILE = 'simple-single-voice.musicxml';

describe('config.layout.minStrokeWidth', () => {
  test('zero by default -- a score renders exactly as it always did', () => {
    assert.equal(render(FILE), render(FILE, { layout: {} }));
    assert.equal(render(FILE), render(FILE, { layout: { minStrokeWidth: 0 } }));
  });

  test('nothing is drawn thinner than the floor', () => {
    const floor = 0.15;
    const widths = strokes(render(FILE, { layout: { minStrokeWidth: floor } }));
    assert.ok(widths.length > 0, 'the fixture does draw lines');
    for (const width of widths) {
      assert.ok(width >= floor - 1e-9, `${width} is under the ${floor} floor`);
    }
  });

  test('it is a FLOOR, not a multiplier: what is already thicker is untouched', () => {
    // A beam is half a staff space. A floor meant for a staff line must
    // not make it any heavier, or the engraving's own proportions -- the
    // thing that makes a page look like music -- go with it.
    const plain = strokes(render(FILE));
    const floored = strokes(render(FILE, { layout: { minStrokeWidth: 0.15 } }));
    assert.equal(plain.length, floored.length, 'the same lines are drawn');
    const thickest = Math.max(...plain);
    assert.ok(thickest > 0.15, 'the fixture has something thicker than the floor');
    assert.equal(Math.max(...floored), thickest, 'and it is unchanged');
  });

  test('a floor under every natural width changes nothing at all', () => {
    // Which is what has to happen at a size that does not need it: at
    // 1920 across, a staff line is already two pixels and MuseScore's
    // engraving is left alone.
    const thinnest = Math.min(...strokes(render(FILE)));
    assert.equal(render(FILE), render(FILE, { layout: { minStrokeWidth: thinnest } }));
  });

  test('it lifts the two the eye loses first: the staff lines and the stems', () => {
    // Both are around a tenth of a staff space -- under a pixel at the
    // size a video frame draws this -- and they are the only two that
    // move at a realistic floor.
    const before = strokes(render(FILE)).sort((a, b) => a - b);
    const after = strokes(render(FILE, { layout: { minStrokeWidth: 0.15 } })).sort((a, b) => a - b);
    const lifted = before.filter((w, i) => after[i] > w).length;
    assert.ok(lifted > 0, 'something was lifted');
    assert.ok(
      before.filter((w) => w < 0.15).length === lifted,
      'and it is exactly the lines that were under the floor',
    );
  });

  test('a negative floor is treated as none, not as a shrink', () => {
    assert.equal(render(FILE), render(FILE, { layout: { minStrokeWidth: -5 } }));
  });
});
