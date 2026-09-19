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

function renderFixture(name) {
  const xml = fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
  return NE.renderFromMusicXml(xml, { domParser });
}

/** Every real (sounding) note in a fixture, counted independently of the engine -- notes inside a <chord> count individually, a <rest> does not. */
function countRealNotes(xmlFileName) {
  const xml = fs.readFileSync(path.join(FIXTURES_DIR, xmlFileName), 'utf8');
  const matches = xml.match(/<note\b[^>]*>(?:(?!<\/note>)[\s\S])*?<pitch>/g) ?? [];
  return matches.length;
}

describe('playback (Phase 48, PLAN.md §17.1)', () => {
  test('renderFromMusicXml returns a playback field on every render, including an empty score', () => {
    const { playback } = renderFixture('simple-single-voice.musicxml');
    assert.ok(playback);
    assert.ok(Array.isArray(playback.events));

    const { playback: emptyPlayback } = NE.renderFromMusicXml(
      '<score-partwise><part-list></part-list></score-partwise>',
      { domParser },
    );
    assert.deepEqual([...emptyPlayback.events], []);
  });

  test('getEventStream: total noteIds across every event equals the real note count, and it is sorted by tick', () => {
    const { playback } = renderFixture('simple-single-voice.musicxml');
    const events = NE.getEventStream(playback);
    assert.ok(events.length > 0);

    const totalNoteIds = events.reduce((sum, e) => sum + e.noteIds.length, 0);
    assert.equal(totalNoteIds, countRealNotes('simple-single-voice.musicxml'));

    for (let i = 1; i < events.length; i++) {
      assert.ok(events[i].tick >= events[i - 1].tick, 'events must be sorted by tick');
    }
  });

  test('a chord is ONE event carrying several noteIds; a rest produces no event at all', () => {
    const { playback } = renderFixture('chord.musicxml');
    const events = NE.getEventStream(playback);
    // C+E+G chord, then (skipping the rest) the A half note.
    assert.equal(events.length, 2);
    assert.equal(events[0].tick, 0);
    assert.equal(events[0].noteIds.length, 3);
    assert.equal(new Set(events[0].noteIds).size, 3, 'a chord\'s own noteIds must be distinct from each other');
    assert.equal(events[1].noteIds.length, 1);
    assert.ok(events[1].tick > events[0].tick, 'the rest must still have advanced the tick cursor');

    const totalNoteIds = events.reduce((sum, e) => sum + e.noteIds.length, 0);
    assert.equal(totalNoteIds, countRealNotes('chord.musicxml'));
  });

  test('noteIds are stable across two independent renders of the same file (deterministic, not random)', () => {
    const a = NE.getEventStream(renderFixture('chord.musicxml').playback);
    const b = NE.getEventStream(renderFixture('chord.musicxml').playback);
    assert.deepEqual(
      a.map((e) => e.noteIds),
      b.map((e) => e.noteIds),
    );
  });

  test('an event\'s seconds matches §12\'s tempo map: "dotted quarter = 96" is 144 quarter-notes/minute, so a half note later lands at exactly 0.8″33s', () => {
    const { playback } = renderFixture('tempo-mark.musicxml');
    const events = NE.getEventStream(playback);
    assert.equal(events.length, 2); // the half-note C, then the half-note D
    assert.equal(events[0].seconds, 0);
    // 960 ticks (one half note) at 144 quarter-notes/min = 416.666...ms/quarter -> 2 quarters = 0.8333...s
    assert.ok(
      Math.abs(events[1].seconds - 5 / 6) < 1e-6,
      `expected ~0.8333s, got ${events[1].seconds}`,
    );
  });

  test('resolvePosition: tick, seconds and measure+beat all describe the same instant', () => {
    const { playback } = renderFixture('simple-single-voice.musicxml');
    const events = NE.getEventStream(playback);
    const lastEvent = events[events.length - 1];
    const resolved = NE.resolvePosition(playback, lastEvent.tick);
    assert.equal(resolved.tick, lastEvent.tick);
    assert.equal(resolved.seconds, lastEvent.seconds);
    assert.equal(resolved.position.measureNumber, lastEvent.measureNumber);
  });

  test('positionToX/xToPosition round-trip: seeking back to an event\'s own x (in its own system) returns exactly that event\'s tick', () => {
    const { playback } = renderFixture('simple-single-voice.musicxml');
    const events = NE.getEventStream(playback);
    assert.ok(events.length >= 2);
    for (const event of events) {
      const pos = NE.positionToX(playback, event.tick);
      const roundTripped = NE.xToPosition(playback, pos.x, pos.systemIndex);
      assert.equal(
        roundTripped,
        event.tick,
        `round-trip failed for tick ${event.tick}: positionToX -> x=${pos.x} -> xToPosition -> ${roundTripped}`,
      );
    }
  });

  test('positionToX moves strictly rightward as tick increases within one system (scroll mode, one system for the whole piece)', () => {
    const { playback } = renderFixture('beamed-eighths.musicxml');
    const events = NE.getEventStream(playback);
    assert.ok(events.length >= 2);
    let lastX = -Infinity;
    for (const event of events) {
      const pos = NE.positionToX(playback, event.tick);
      assert.ok(pos.x > lastX, `x must strictly increase: tick ${event.tick} gave x=${pos.x}, previous was ${lastX}`);
      lastX = pos.x;
    }
  });

  test('a tick between two events resolves to the note CURRENTLY sounding (floor), not the nearest one', () => {
    const { playback } = renderFixture('simple-single-voice.musicxml');
    const events = NE.getEventStream(playback);
    const first = events[0];
    const second = events[1];
    const midTick = Math.floor((first.tick + second.tick) / 2);
    assert.ok(midTick > first.tick && midTick < second.tick);
    const atFirst = NE.positionToX(playback, first.tick);
    const atMid = NE.positionToX(playback, midTick);
    assert.equal(atMid.x, atFirst.x, 'mid-note tick should still show the note that started sounding, not glide toward the next one');
  });

  test('xToPosition on an x before the first measure of a system clamps to that system\'s first measure, never throws or returns a negative surprise', () => {
    const { playback } = renderFixture('simple-single-voice.musicxml');
    const tick = NE.xToPosition(playback, -1000, 0);
    assert.equal(tick, 0);
  });
});
