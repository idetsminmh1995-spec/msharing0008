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

function renderFixture(name, config) {
  const xml = fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
  return NE.renderFromMusicXml(xml, { domParser, ...(config ? { config } : {}) });
}

describe('cursor (Phase 49, PLAN.md §17.2)', () => {
  test("'cursorMoves': the marker goes to the note and the notation never moves", () => {
    const { playback } = renderFixture('simple-single-voice.musicxml');
    const events = NE.getEventStream(playback);
    for (const event of events) {
      const placement = NE.computeCursorPlacement(playback, event.tick, { mode: 'cursorMoves' });
      const expected = NE.positionToX(playback, event.tick);
      assert.equal(placement.markerX, expected.x);
      assert.equal(placement.noteX, expected.x);
      assert.equal(placement.notationTranslateX, 0, 'the notation must never move in cursorMoves');
    }
  });

  test("'notationMoves': the marker is pinned at the configured fraction and the notation slides under it", () => {
    const { playback } = renderFixture('simple-single-voice.musicxml');
    const events = NE.getEventStream(playback);
    const viewportWidth = 40;
    const fixedFraction = 0.25;
    const fixedX = viewportWidth * fixedFraction;

    for (const event of events) {
      const placement = NE.computeCursorPlacement(playback, event.tick, {
        mode: 'notationMoves',
        viewportWidth,
        fixedFraction,
      });
      assert.equal(placement.markerX, fixedX, 'the marker never moves in notationMoves');
      // The translation must put the note exactly under the fixed marker.
      assert.equal(placement.noteX + placement.notationTranslateX, fixedX);
    }
  });

  test('both modes are the same positionToX seen from two reference frames: the note lands under the marker either way', () => {
    const { playback } = renderFixture('beamed-eighths.musicxml');
    const tick = NE.getEventStream(playback)[2].tick;

    const moved = NE.computeCursorPlacement(playback, tick, { mode: 'cursorMoves' });
    const scrolled = NE.computeCursorPlacement(playback, tick, {
      mode: 'notationMoves',
      viewportWidth: 30,
      fixedFraction: 0.5,
    });

    assert.equal(moved.noteX, scrolled.noteX, 'both modes read the same underlying note x');
    // cursorMoves: marker sits on the note where it already is.
    assert.equal(moved.markerX + 0, moved.noteX);
    // notationMoves: the note is brought to the marker instead.
    assert.equal(scrolled.noteX + scrolled.notationTranslateX, scrolled.markerX);
  });

  test("'notationMoves' with no viewportWidth pins the marker at the left edge rather than throwing", () => {
    const { playback } = renderFixture('simple-single-voice.musicxml');
    const placement = NE.computeCursorPlacement(playback, 0, { mode: 'notationMoves' });
    assert.equal(placement.markerX, 0);
    assert.equal(placement.notationTranslateX, -placement.noteX);
  });

  test('the default fixed fraction is used when none is given', () => {
    const { playback } = renderFixture('simple-single-voice.musicxml');
    const viewportWidth = 60;
    const placement = NE.computeCursorPlacement(playback, 0, {
      mode: 'notationMoves',
      viewportWidth,
    });
    assert.equal(placement.markerX, viewportWidth * NE.DEFAULT_CURSOR_FIXED_FRACTION);
  });

  test('page mode: the placement carries the system AND page the tick lands on, plus that system\'s own y', () => {
    // A 4-measure fixture forced into narrow pages breaks into several systems.
    const { playback } = renderFixture('simple-single-voice.musicxml', {
      layout: { mode: 'page' },
      page: { pageWidth: 40, pageHeight: 60, marginLeft: 2, marginTop: 2, marginRight: 2, marginBottom: 2 },
    });
    const events = NE.getEventStream(playback);
    const last = events[events.length - 1];
    const placement = NE.computeCursorPlacement(playback, last.tick, { mode: 'cursorMoves' });
    assert.equal(typeof placement.systemIndex, 'number');
    assert.equal(typeof placement.pageIndex, 'number');
    assert.equal(typeof placement.systemY, 'number');
    // Whatever system it landed on, the marker's own y origin must match that system's.
    const expected = NE.positionToX(playback, last.tick);
    assert.equal(placement.systemY, expected.systemY);
    assert.equal(placement.systemIndex, expected.systemIndex);
    assert.equal(placement.pageIndex, expected.pageIndex);
  });

  test('renderCursor draws one marker line at the placement, offset by that system\'s own y', () => {
    const { playback } = renderFixture('simple-single-voice.musicxml');
    const placement = NE.computeCursorPlacement(playback, 0, { mode: 'cursorMoves' });
    const svg = NE.renderCursor(placement, {
      height: 4,
      top: 8,
      thickness: 0.3,
      color: '#FF0000',
      opacity: 0.8,
    });
    assert.match(svg, /class="notation-cursor"/);
    assert.match(svg, new RegExp(`x1="${placement.markerX}"`));
    assert.match(svg, /y1="8"/); // top (8) + systemY (0 in scroll mode)
    assert.match(svg, /y2="12"/); // top + height
    assert.match(svg, /stroke="#FF0000"/);
    assert.match(svg, /opacity="0.8"/);
  });

  test('a repeat jump needs no special case: the same tick always gives the same placement, whatever order a host plays ticks in', () => {
    const { playback } = renderFixture('simple-single-voice.musicxml');
    const events = NE.getEventStream(playback);
    const forward = events.map((e) => NE.computeCursorPlacement(playback, e.tick, { mode: 'cursorMoves' }).markerX);
    // A host that jumped BACK (a repeat) simply asks for an earlier tick again.
    const jumpedBack = [...events].reverse().map((e) => NE.computeCursorPlacement(playback, e.tick, { mode: 'cursorMoves' }).markerX);
    assert.deepEqual(jumpedBack, [...forward].reverse());
  });

  test('config: cursor.fixedFraction/thickness/color/opacity resolve with defaults and are overridable per field', () => {
    const defaults = NE.resolveConfig();
    assert.equal(defaults.cursor.mode, 'notationMoves');
    assert.equal(defaults.cursor.fixedFraction, 1 / 3);

    const overridden = NE.resolveConfig({ cursor: { mode: 'cursorMoves' } });
    assert.equal(overridden.cursor.mode, 'cursorMoves');
    assert.equal(overridden.cursor.fixedFraction, 1 / 3, 'siblings must survive a single-field override');
    assert.equal(overridden.cursor.thickness, defaults.cursor.thickness);
  });
});
