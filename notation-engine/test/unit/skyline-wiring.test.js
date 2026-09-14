import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures', 'musicxml');
const NE = loadEngine();
const domParser = testDomParser();
const load = (n) => fs.readFileSync(path.join(FIXTURES_DIR, n), 'utf8');

function staffBottomYs(svg) {
  const ys = [
    ...svg.matchAll(/<line x1="0" y1="([\d.]+)" x2="[\d.]+" y2="\1" stroke="#000000" stroke-width="0\.13"/g),
  ]
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
  // Each staff draws 5 consecutive-integer lines; the FIRST staff's own
  // bottom line is the largest of the first 5 (lowest y-values = the
  // topmost staff, since smaller y is higher up), and the SECOND
  // staff's bottom line is the largest of the last 5.
  return { trebleBottom: ys[4], bassBottom: ys[9] };
}

describe('Phase 44 wired into rendering: content-aware grand-staff distance', () => {
  test('ordinary grand-staff content (nothing crossing toward the other staff) keeps the default 8-unit staff gap', () => {
    const { svg } = NE.renderFromMusicXml(load('piano-grand-staff.musicxml'), { domParser });
    const { trebleBottom, bassBottom } = staffBottomYs(svg);
    assert.equal(bassBottom - trebleBottom, 8);
  });

  test('STAFF DISTANCE GROWS when the treble part reaches very low and the bass part reaches very high (real content, not synthetic skylines)', () => {
    const { svg, diagnostics } = NE.renderFromMusicXml(load('piano-crossing-hands.musicxml'), { domParser });
    assert.deepEqual([...diagnostics], []);
    const { trebleBottom, bassBottom } = staffBottomYs(svg);
    // Treble's C2 sits 8 units below its own staff; bass's C6 sits 8
    // units above its own staff -- computeStaffDistance's own formula
    // (upperExtent + lowerExtent) makes the real required distance 16,
    // exceeding the 8-unit default, checked to the exact expected value.
    assert.equal(bassBottom - trebleBottom, 16);
  });

  test('a single-staff file is completely unaffected by this wiring (no staff pair exists to query)', () => {
    const { svg, diagnostics } = NE.renderFromMusicXml(load('simple-single-voice.musicxml'), { domParser });
    assert.deepEqual([...diagnostics], []);
    const lines = [
      ...svg.matchAll(/<line x1="0" y1="([\d.]+)" x2="[\d.]+" y2="\1" stroke="#000000" stroke-width="0\.13"/g),
    ];
    assert.equal(lines.length, 5); // one ordinary 5-line staff
  });
});
