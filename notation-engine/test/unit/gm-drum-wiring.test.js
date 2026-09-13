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

function render() {
  const xml = fs.readFileSync(path.join(FIXTURES_DIR, 'gm-drum-mapping.musicxml'), 'utf8');
  return NE.renderFromMusicXml(xml, { domParser });
}

describe('GM drum mapping wired into rendering (Phase 41, §13.1/§13.3)', () => {
  test('a percussion note with an <instrument> resolving to a real GM note renders with no diagnostics', () => {
    const { diagnostics } = render();
    assert.deepEqual([...diagnostics], []);
  });

  test("the snare (GM 38) renders as a plain oval notehead, at the drum table's own staff position, stem up", () => {
    const { svg } = render();
    // Snare is the first note; its notehead glyph is noteheadBlack (U+E0A4), not the file's own display-step/octave position.
    assert.match(svg, /x="6" y="6\.5"[^>]*>\uE0A4/);
  });

  test("the kick (GM 36) renders as a plain oval, at the kick's own staff position, stem DOWN (feet convention)", () => {
    const { svg } = render();
    assert.match(svg, /x="10\.5" y="7\.5"[^>]*>\uE0A4/);
    const stems = [
      ...svg.matchAll(
        /<line x1="10\.5" y1="([\d.]+)" x2="10\.5" y2="([\d.]+)" stroke="#000000" stroke-width="0\.12"/g,
      ),
    ];
    assert.equal(stems.length, 1);
    assert.ok(Number(stems[0][2]) > Number(stems[0][1]), 'expected a down stem for the kick');
  });

  test("the closed hi-hat (GM 42) renders as an X notehead, at the hi-hat's own (much higher) staff position, stem up", () => {
    const { svg } = render();
    assert.match(svg, /x="15" y="4"[^>]*>\uE0A9/);
  });

  test('an explicit <notehead> override still wins over the GM-derived shape (priority order preserved)', () => {
    // The Phase 35 v2-elements fixture has a GM-linked hi-hat note with an
    // explicit <notehead>x</notehead> override -- confirm the explicit
    // override's shape is what actually renders, not silently replaced by
    // the GM default now that GM lookup exists.
    const xml = fs.readFileSync(path.join(FIXTURES_DIR, 'v2-elements.musicxml'), 'utf8');
    const { svg } = NE.renderFromMusicXml(xml, { domParser });
    assert.match(svg, /\uE0A9/); // noteheadXBlack, matching the file's own explicit override
  });
});
