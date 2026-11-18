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

const CLARINET = 'transposing-bb-clarinet.musicxml';

function readFixture(name) {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
}

function render(xml) {
  return NE.renderFromMusicXml(xml, { domParser });
}

describe('MusicXML <transpose> -> sounding pitch (PLAN.md Part D)', () => {
  test('the parser carries <transpose> on the measure state with the spec-correct semitone total', () => {
    const { attributes } = NE.parseMusicXml(readFixture(CLARINET), { domParser });
    // §10.5: chromatic -2 (a whole tone below) plus octave-change 0.
    assert.equal(attributes[0].transpose.chromatic, -2);
    assert.equal(attributes[0].transpose.diatonic, -1);
    assert.equal(attributes[0].transpose.semitones, -2);
  });

  test('a <transpose> with <octave-change> adds twelve semitones per octave to the total', () => {
    const xml = readFixture(CLARINET).replace(
      '<transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose>',
      '<transpose><diatonic>-8</diatonic><chromatic>-2</chromatic><octave-change>-1</octave-change></transpose>',
    );
    const { attributes } = NE.parseMusicXml(xml, { domParser });
    assert.equal(attributes[0].transpose.semitones, -14);
  });

  test('playback midiNotes sound a whole tone below the written pitches, at the written ticks', () => {
    const { playback, diagnostics } = render(readFixture(CLARINET));
    assert.deepEqual([...diagnostics], []);
    const events = NE.getEventStream(playback);
    // Written C4 D4 E4 F4 (m1) then G4 (m2) -> sounding Bb3 C4 D4 Eb4 F4.
    assert.deepEqual(
      [...events].map((e) => ({ tick: e.tick, midi: [...e.midiNotes] })),
      [
        { tick: 0, midi: [NE.chromaticNoteNumber('B', -1, 3)] },
        { tick: 480, midi: [NE.chromaticNoteNumber('C', 0, 4)] },
        { tick: 960, midi: [NE.chromaticNoteNumber('D', 0, 4)] },
        { tick: 1440, midi: [NE.chromaticNoteNumber('E', -1, 4)] },
        { tick: 1920, midi: [NE.chromaticNoteNumber('F', 0, 4)] },
      ],
    );
    // And the written pitch is exactly two semitones higher, every note.
    assert.deepEqual(
      [...events].map((e) => e.midiNotes[0] + 2),
      [
        NE.chromaticNoteNumber('C', 0, 4),
        NE.chromaticNoteNumber('D', 0, 4),
        NE.chromaticNoteNumber('E', 0, 4),
        NE.chromaticNoteNumber('F', 0, 4),
        NE.chromaticNoteNumber('G', 0, 4),
      ],
    );
  });

  test('the drawn notation stays at WRITTEN pitch -- the SVG is byte-identical with <transpose> removed', () => {
    const source = readFixture(CLARINET);
    const withoutTranspose = source.replace(/<transpose>[\s\S]*?<\/transpose>/, '');
    assert.notEqual(withoutTranspose, source, 'the fixture really does carry a <transpose>');
    assert.equal(render(source).svg, render(withoutTranspose).svg);
  });

  test('alignment flattening uses the SOUNDING note number, so a MIDI file of concert pitches still matches', () => {
    const parsed = NE.parseMusicXml(readFixture(CLARINET), { domParser });
    const part = parsed.score.parts[0];
    const flat = NE.flattenPartNotes(part, parsed.attributes, undefined);
    assert.deepEqual(
      [...flat].map((n) => n.noteNumber),
      [
        NE.chromaticNoteNumber('B', -1, 3),
        NE.chromaticNoteNumber('C', 0, 4),
        NE.chromaticNoteNumber('D', 0, 4),
        NE.chromaticNoteNumber('E', -1, 4),
        NE.chromaticNoteNumber('F', 0, 4),
      ],
    );
  });

  test('a score with no <transpose> is unaffected -- midiNotes equal the written chromatic numbers', () => {
    const { playback } = render(readFixture('simple-single-voice.musicxml'));
    const events = NE.getEventStream(playback);
    assert.deepEqual(
      [...events].map((e) => e.midiNotes[0]),
      [
        NE.chromaticNoteNumber('C', 0, 4),
        NE.chromaticNoteNumber('D', 0, 4),
        NE.chromaticNoteNumber('E', 0, 4),
        NE.chromaticNoteNumber('F', 0, 4),
        NE.chromaticNoteNumber('G', 0, 4),
      ],
    );
  });
});
