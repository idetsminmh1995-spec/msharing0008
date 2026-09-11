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

function loadFixture(name) {
  const xml = fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
  return NE.parseMusicXml(xml, { domParser });
}

describe('MusicXML parser v1 (Phase 20)', () => {
  test('a simple single-voice piece parses into the right number of parts/measures/notes', () => {
    const result = loadFixture('simple-single-voice.musicxml');
    assert.equal(result.diagnostics.length, 0);
    assert.equal(result.score.parts.length, 1);
    const part = result.score.parts[0];
    assert.equal(part.id, 'P1');
    assert.equal(part.name, 'Piano');
    assert.equal(part.measures.length, 2);

    const m1 = part.measures[0];
    assert.equal(m1.number, 1);
    assert.equal(m1.voices.length, 1);
    assert.equal(m1.voices[0].events.length, 4);
    const steps = [...m1.voices[0].events].map((e) => e.pitch.step);
    assert.deepEqual(steps, ['C', 'D', 'E', 'F']);

    const m2 = part.measures[1];
    assert.equal(m2.voices[0].events.length, 2);
    assert.equal(m2.voices[0].events[0].kind, 'note');
    assert.equal(m2.voices[0].events[1].kind, 'rest');
  });

  test('the attributes side-table records divisions/key/time/clef, inherited into measure 2', () => {
    const result = loadFixture('simple-single-voice.musicxml');
    assert.equal(result.attributes.length, 2);
    const [a1, a2] = result.attributes;
    assert.equal(a1.divisions, 2);
    assert.equal(a1.fifths, 0);
    assert.equal(a1.timeNumerator, 4);
    assert.equal(a1.timeDenominator, 4);
    assert.equal(a1.clefSign, 'G');
    assert.equal(a1.clefLine, 2);
    // Measure 2 declares no <attributes> of its own -- must inherit measure 1's.
    assert.equal(a2.divisions, 2);
    assert.equal(a2.clefSign, 'G');
  });

  test('barline info is captured in the attributes side-table', () => {
    const result = loadFixture('simple-single-voice.musicxml');
    assert.equal(result.attributes[1].barlineStyle, 'light-heavy');
  });

  test('durations convert to the engine\'s normalized ticks correctly (divisions=2 -> quarter=480)', () => {
    const result = loadFixture('simple-single-voice.musicxml');
    const firstNote = result.score.parts[0].measures[0].voices[0].events[0];
    assert.equal(firstNote.duration.ticks, 480);
    assert.equal(firstNote.duration.type, 'quarter');
  });

  test('two voices via <backup> BOTH survive -- the exact bug the prototype hit once', () => {
    const result = loadFixture('two-voice-backup.musicxml');
    assert.equal(result.diagnostics.length, 0);
    const measure = result.score.parts[0].measures[0];
    assert.equal(measure.voices.length, 2);

    const voiceIds = [...measure.voices].map((v) => v.id).sort();
    assert.deepEqual(voiceIds, [1, 2]);

    const voice1 = [...measure.voices].find((v) => v.id === 1);
    const voice2 = [...measure.voices].find((v) => v.id === 2);
    assert.equal(voice1.events.length, 4);
    assert.equal(voice2.events.length, 1);
    assert.equal(voice2.events[0].pitch.step, 'G');
    assert.equal(voice2.events[0].pitch.octave, 3);
  });

  test('a chord (<chord/> continuation notes) merges into one Chord event, not 3 separate notes', () => {
    const result = loadFixture('chord.musicxml');
    assert.equal(result.diagnostics.length, 0);
    const events = result.score.parts[0].measures[0].voices[0].events;
    assert.equal(events.length, 3); // chord, rest, half note -- not 5
    assert.equal(events[0].kind, 'chord');
    assert.equal(events[0].notes.length, 3);
    const steps = [...events[0].notes].map((n) => n.pitch.step);
    assert.deepEqual(steps, ['C', 'E', 'G']);
    assert.equal(events[1].kind, 'rest');
    assert.equal(events[2].kind, 'note');
    assert.equal(events[2].pitch.step, 'A');
  });

  test('missing <divisions> recovers by assuming 1 and emits MISSING_DIVISIONS', () => {
    const result = loadFixture('missing-divisions.musicxml');
    const codes = [...result.diagnostics].map((d) => d.code);
    assert.ok(codes.includes('MISSING_DIVISIONS'));
    const note = result.score.parts[0].measures[0].voices[0].events[0];
    // duration=1 with assumed divisions=1 -> exactly one quarter note's ticks (480).
    assert.equal(note.duration.ticks, 480);
  });

  test('an unrecognized <type> derives the duration from ticks and emits UNKNOWN_DURATION_TYPE', () => {
    const result = loadFixture('unknown-duration-type.musicxml');
    const codes = [...result.diagnostics].map((d) => d.code);
    assert.ok(codes.includes('UNKNOWN_DURATION_TYPE'));
    const note = result.score.parts[0].measures[0].voices[0].events[0];
    assert.equal(note.duration.type, 'quarter'); // derived correctly despite the bogus <type> text
  });

  test('a non-score-partwise root produces an empty score with an UNSUPPORTED_ROOT diagnostic, never throws', () => {
    const result = NE.parseMusicXml('<not-a-score/>', { domParser });
    assert.equal(result.score.parts.length, 0);
    assert.ok([...result.diagnostics].some((d) => d.code === 'UNSUPPORTED_ROOT'));
  });

  test('throws a clear error if no DOMParser is available and none was injected', () => {
    assert.throws(() => NE.parseMusicXml('<a/>'), /No DOMParser available/);
  });
});
