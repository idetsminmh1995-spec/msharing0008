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

describe('a chord\'s drawn stem direction follows the file (§9.8: forced > <stem> > automatic)', () => {
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

  test('ONE voice, chords carrying <stem>down</stem> are drawn stem DOWN even where the automatic rule says up', () => {
    // Kick (F4) + snare (C5): the kick is furthest from the middle line and
    // sits below it, so automatic would be UP. The file says down and wins.
    assert.deepEqual(directions(2, 1), ['down', 'down', 'down', 'down']);
  });

  test('a chord with NO <stem> element still falls back to the automatic direction', () => {
    // Hi-hat (G5) is furthest from the middle line and above it -> down.
    assert.deepEqual(directions(3, 1), ['down', 'down', 'down', 'down']);
  });

  test('TWO voices keep the per-voice split: voice 1 up, voice 2 down', () => {
    assert.deepEqual(directions(4, 1), ['up', 'up', 'up', 'up']);
    assert.deepEqual(directions(4, 2), ['down', 'down', 'down', 'down']);
  });
});
