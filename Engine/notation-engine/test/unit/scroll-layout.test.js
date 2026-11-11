import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NE = loadEngine();
const domParser = testDomParser();

function measure(measureNumber, width) {
  return { measureNumber, width };
}

describe('computeScrollLayout (Phase 45, §16.1)', () => {
  test('measures are placed left to right, each starting where the previous one ends', () => {
    const layout = NE.computeScrollLayout([measure(1, 10), measure(2, 15), measure(3, 8)]);
    const m = [...layout.measures];
    assert.equal(m[0].x, 0);
    assert.equal(m[1].x, 10);
    assert.equal(m[2].x, 25);
  });

  test('every measure keeps its OWN given width, in score order, never reordered', () => {
    const layout = NE.computeScrollLayout([measure(1, 10), measure(2, 15), measure(3, 8)]);
    const widths = [...layout.measures].map((m) => m.width);
    assert.deepEqual(widths, [10, 15, 8]);
    const numbers = [...layout.measures].map((m) => m.measureNumber);
    assert.deepEqual(numbers, [1, 2, 3]);
  });

  test("totalWidth is exactly the sum of every measure's own width", () => {
    const layout = NE.computeScrollLayout([measure(1, 10), measure(2, 15), measure(3, 8)]);
    assert.equal(layout.totalWidth, 33);
  });

  test('NO JUSTIFICATION: widths of unequal-content measures are never stretched to match each other', () => {
    // A short, sparse measure and a long, busy one -- scroll mode must
    // leave BOTH exactly as given, unlike page mode's future §14.3
    // justification, which stretches every measure in a full system to
    // the same right margin.
    const layout = NE.computeScrollLayout([measure(1, 6), measure(2, 40)]);
    const m = [...layout.measures];
    assert.equal(m[0].width, 6);
    assert.equal(m[1].width, 40);
    assert.notEqual(m[0].width, m[1].width);
  });

  test('ARBITRARILY WIDE: a large number of measures produces one single unbroken row, never split', () => {
    const many = Array.from({ length: 200 }, (_, i) => measure(i + 1, 10));
    const layout = NE.computeScrollLayout(many);
    assert.equal(layout.measures.length, 200);
    assert.equal(layout.totalWidth, 2000);
    // Every measure's x strictly increases -- one continuous row, no
    // wrap-around, no reset back toward 0 partway through.
    const xs = [...layout.measures].map((m) => m.x);
    for (let i = 1; i < xs.length; i++) {
      assert.ok(xs[i] > xs[i - 1]);
    }
  });

  test('an empty score produces an empty layout with zero total width, not an error', () => {
    const layout = NE.computeScrollLayout([]);
    assert.equal(layout.measures.length, 0);
    assert.equal(layout.totalWidth, 0);
  });

  test('a single measure sits at x=0 with the whole width being just its own', () => {
    const layout = NE.computeScrollLayout([measure(1, 12)]);
    const m = [...layout.measures][0];
    assert.equal(m.x, 0);
    assert.equal(layout.totalWidth, 12);
  });
});

describe('computeScrollLayout wired into rendering (Phase 45)', () => {
  test("the actual renderer's viewBox width reflects one unbroken, unjustified system for a real multi-measure file", () => {
    const xml = fs.readFileSync(
      path.join(__dirname, '..', 'fixtures', 'musicxml', 'simple-single-voice.musicxml'),
      'utf8',
    );
    const { svg } = NE.renderFromMusicXml(xml, { domParser });
    // simple-single-voice.musicxml has 2 measures with genuinely
    // different content (4 quarters + a half note vs. a half note + a
    // half rest) -- if scroll mode's own extraction is wired correctly,
    // the two barlines (measure boundaries) must NOT be evenly spaced,
    // confirming neither measure was stretched/justified to match the
    // other.
    const barlineXs = [
      ...svg.matchAll(/<line x1="([\d.]+)" y1="[\d.]+" x2="\1" y2="[\d.]+" stroke="#000000" stroke-width="0\.16"/g),
    ].map((m) => Number(m[1]));
    assert.equal(barlineXs.length, 2);
    const measure1Width = barlineXs[0];
    const measure2Width = barlineXs[1] - barlineXs[0];
    assert.notEqual(measure1Width, measure2Width);
  });
});
