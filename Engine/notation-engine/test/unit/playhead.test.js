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

function render(name, config) {
  const xml = fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
  return NE.renderFromMusicXml(xml, { domParser, ...(config ? { config } : {}) });
}

/**
 * `positionToX` is a STEP function -- "where is the note sounding right
 * now" -- which is what note-highlighting and `xToPosition` need, and
 * which makes a playback marker freeze and jump. `playheadX` interpolates
 * between the surrounding positions instead.
 *
 * The user reported the visible half of this: on a score whose first
 * measure is a whole rest, the marker did not move at all for that whole
 * measure. "Even if there is no note, in 4/4 it should still travel four
 * beats."
 */
describe('playheadX: a marker that keeps moving (§17.1)', () => {
  test('it agrees with positionToX exactly AT a note', () => {
    const { playback } = render('simple-single-voice.musicxml');
    for (const event of NE.getEventStream(playback)) {
      assert.equal(
        NE.playheadX(playback, event.tick).x,
        NE.positionToX(playback, event.tick).x,
        `tick ${event.tick}`,
      );
    }
  });

  test('and moves BETWEEN two notes, where positionToX holds still', () => {
    const { playback } = render('simple-single-voice.musicxml');
    const events = [...NE.getEventStream(playback)];
    const a = events[0].tick;
    const b = events[1].tick;
    const middle = (a + b) / 2;

    assert.equal(
      NE.positionToX(playback, middle).x,
      NE.positionToX(playback, a).x,
      'positionToX is a step function, by design',
    );
    const x = NE.playheadX(playback, middle).x;
    assert.ok(x > NE.playheadX(playback, a).x, 'the playhead has left the first note');
    assert.ok(x < NE.playheadX(playback, b).x, 'and has not reached the second');
  });

  test('it crosses a measure that has NO notes at all', () => {
    // Measure 1 is a whole rest; the music proper starts in measure 2.
    const { playback } = render('drum-forward-gap.musicxml');
    const measureTicks = 1920;
    const xs = [0, 0.25, 0.5, 0.75].map((f) => NE.playheadX(playback, f * measureTicks).x);
    for (let i = 1; i < xs.length; i++) {
      assert.ok(xs[i] > xs[i - 1], `the marker stalled at ${i / 4} of the empty measure`);
    }
    // And by the end of it, it has reached the next measure's own start.
    const m2 = playback.placementByMeasureNumber.get(2);
    assert.ok(
      Math.abs(NE.playheadX(playback, measureTicks).x - (m2.x + playback.measureLayoutsByNumber.get(2).headerWidth)) < 1e-9,
    );
  });

  test('it never goes backwards, across a whole real score', () => {
    const { playback } = render('drum-forward-gap.musicxml');
    let previous = -Infinity;
    for (let tick = 0; tick <= 3840; tick += 40) {
      const x = NE.playheadX(playback, tick).x;
      assert.ok(x >= previous - 1e-9, `went backwards at tick ${tick}: ${x} < ${previous}`);
      previous = x;
    }
  });

  test('it moves smoothly -- no step bigger than a small fraction of a measure', () => {
    const { playback } = render('simple-single-voice.musicxml');
    let previous = NE.playheadX(playback, 0).x;
    let biggest = 0;
    for (let tick = 20; tick <= 3840; tick += 20) {
      const x = NE.playheadX(playback, tick).x;
      biggest = Math.max(biggest, x - previous);
      previous = x;
    }
    // A 20-tick step is 1/24 of a quarter note. A jump of more than one
    // staff space over that would be the old freeze-and-leap behaviour.
    assert.ok(biggest < 1, `biggest single step was ${biggest.toFixed(3)} staff spaces`);
  });

  test('it reports the same system, page and systemY as positionToX', () => {
    const { playback } = render('simple-single-voice.musicxml', {
      layout: { mode: 'page' },
      page: { pageWidth: 14 },
    });
    for (const tick of [0, 480, 960, 1440, 1920, 2400]) {
      const playhead = NE.playheadX(playback, tick);
      const snapped = NE.positionToX(playback, tick);
      assert.equal(playhead.systemIndex, snapped.systemIndex, `systemIndex at ${tick}`);
      assert.equal(playhead.pageIndex, snapped.pageIndex, `pageIndex at ${tick}`);
      assert.equal(playhead.systemY, snapped.systemY, `systemY at ${tick}`);
    }
  });

  test('computeCursorPlacement follows the playhead, while noteX still reports the note', () => {
    const { playback } = render('simple-single-voice.musicxml');
    const events = [...NE.getEventStream(playback)];
    const middle = (events[0].tick + events[1].tick) / 2;
    const placement = NE.computeCursorPlacement(playback, middle, { mode: 'cursorMoves' });

    assert.equal(placement.markerX, NE.playheadX(playback, middle).x, 'the marker moves');
    assert.equal(placement.noteX, NE.positionToX(playback, middle).x, 'the note does not');
    assert.ok(placement.markerX > placement.noteX, 'the marker has moved past the note');
  });

  test('a tick before the score starts, and one past its end, are both safe', () => {
    const { playback } = render('simple-single-voice.musicxml');
    assert.ok(Number.isFinite(NE.playheadX(playback, -100).x));
    assert.ok(Number.isFinite(NE.playheadX(playback, 999999).x));
  });
});
