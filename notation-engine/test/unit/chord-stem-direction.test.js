import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';
import { eventGeometry } from '../helpers/svg-geometry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, '..', 'fixtures', 'musicxml', 'single-voice-drum-chords.musicxml');

const NE = loadEngine();
const domParser = testDomParser();
const { svg, diagnostics } = NE.renderFromMusicXml(fs.readFileSync(FIXTURE, 'utf8'), { domParser });

/** The drawn stem direction of every event of one voice in one measure. */
function directions(measure, voice) {
  const out = [];
  for (let e = 0; ; e++) {
    const g = eventGeometry(svg, `P1#m${measure}#v${voice}#e${e}`);
    if (g === undefined) break;
    assert.equal(g.stems.length, 1, `m${measure} v${voice} e${e}: exactly one drawn stem`);
    out.push(g.stem.direction);
  }
  return out;
}

describe('a drum chord\'s drawn stem direction stays up for a unified percussion pattern', () => {
  test('the fixture renders without diagnostics and every event is drawn', () => {
    assert.deepEqual([...diagnostics], []);
    assert.equal(directions(1, 1).length, 4);
    assert.equal(directions(4, 2).length, 4);
  });

  test('ONE voice, hi-hat+snare chords carrying <stem>up</stem> are drawn stem UP (MuseScore\'s own choice)', () => {
    // The automatic rule alone would point these DOWN (the hi-hat above the
    // staff is the note furthest from the middle line) -- the bug this guards.
    assert.deepEqual(directions(1, 1), ['up', 'up', 'up', 'up']);
  });

  test('ONE voice, kick+snare chords carrying <stem>down</stem> are normalized to stem UP', () => {
    assert.deepEqual(directions(2, 1), ['up', 'up', 'up', 'up']);
  });

  test('a drum chord with NO <stem> element still uses the all-up drum direction', () => {
    assert.deepEqual(directions(3, 1), ['up', 'up', 'up', 'up']);
  });

  test('TWO drum voices both keep stems up', () => {
    assert.deepEqual(directions(4, 1), ['up', 'up', 'up', 'up']);
    assert.deepEqual(directions(4, 2), ['up', 'up', 'up', 'up']);
  });
});
