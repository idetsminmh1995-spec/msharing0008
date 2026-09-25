// Plan Part 08 fixtures. Phase 0 hand-writes F-01 and F-09; the
// adapter that reads them is Phase 1. What can be proved today is
// that the files say what the plan says they say -- and, for F-09,
// that its sounding pitches really are F-01's, which is the whole
// point of that fixture.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../dist/finger-engine.js', import.meta.url), 'utf8'), sandbox);
const E = sandbox.FingerEngine;

const STEP_SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function fixture(name) {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
}

/**
 * Just enough MusicXML to check a fixture: written pitches, and the
 * part's octave transposition. Phase 1 replaces this with the real
 * adapter -- a test that used the adapter to check the adapter's own
 * fixtures would prove nothing.
 */
function readFixture(xml) {
  const body = xml.replace(/<!--[\s\S]*?-->/g, '');
  const written = [...body.matchAll(/<pitch>([\s\S]*?)<\/pitch>/g)].map(([, inner]) => {
    const step = /<step>([A-G])<\/step>/.exec(inner)?.[1] ?? 'C';
    const alter = Number(/<alter>(-?\d+)<\/alter>/.exec(inner)?.[1] ?? 0);
    const octave = Number(/<octave>(-?\d+)<\/octave>/.exec(inner)?.[1] ?? 4);
    return (octave + 1) * 12 + STEP_SEMITONES[step] + alter;
  });
  const octaveChange = Number(/<octave-change>(-?\d+)<\/octave-change>/.exec(
    /<transpose>[\s\S]*?<\/transpose>/.exec(body)?.[0] ?? '',
  )?.[1] ?? 0);
  const chromatic = Number(/<transpose>[\s\S]*?<chromatic>(-?\d+)<\/chromatic>[\s\S]*?<\/transpose>/.exec(body)?.[1] ?? 0);
  const shift = chromatic + octaveChange * 12;
  return { written, sounding: written.map((pitch) => pitch + shift), shift };
}

const expected = JSON.parse(fixture('f01-c-major-scale.expected.json'));
const SCALE = [48, 50, 52, 53, 55, 57, 59, 60]; // C3 .. C4

test('[F-01] is a C major scale C3 to C4, with no tab and no hints', () => {
  const xml = fixture('f01-c-major-scale.musicxml');
  const { written, sounding, shift } = readFixture(xml);
  assert.equal(shift, 0, 'F-01 is written where it sounds');
  assert.equal(written.join(','), SCALE.join(','));
  assert.equal(sounding.join(','), SCALE.join(','));

  const body = xml.replace(/<!--[\s\S]*?-->/g, '');
  for (const hint of ['<string>', '<fret>', '<fingering>', '<staff-details>', 'TAB']) {
    assert.ok(!body.includes(hint), `F-01 must not hand the solver a ${hint}`);
  }
});

test('[F-09] is written an octave high and sounds exactly F-01', () => {
  const f09 = readFixture(fixture('f09-octave-transposed.musicxml'));
  assert.equal(f09.shift, -12, '<octave-change>-1 is a twelve-semitone drop');
  assert.equal(
    f09.written.join(','),
    SCALE.map((pitch) => pitch + 12).join(','),
    'the page says C4..C5',
  );
  assert.equal(f09.sounding.join(','), SCALE.join(','), 'the strings sound C3..C4');
});

test('[F-01] the expected fingering is what the plan wrote down', () => {
  assert.equal(expected.notes.length, 8);
  assert.equal(
    expected.notes.map((note) => note.pitch).join(','),
    SCALE.join(','),
    'one expectation per note of the scale, in order',
  );
});

test('[V-01] every expected placement really sounds its note', () => {
  const guitar = E.defaultInstrument();
  for (const note of expected.notes) {
    assert.equal(
      E.pitchAt(guitar, note.string, note.fret),
      note.pitch,
      `${note.name}: string ${note.string} fret ${note.fret}`,
    );
    const playable = E.placementsForPitch(guitar, note.pitch);
    assert.ok(
      playable.some((place) => place.string === note.string && place.fret === note.fret),
      `${note.name} is one of the places that pitch can be played`,
    );
  }
});

test('[F-01] the expected fingering really is open position', () => {
  for (const note of expected.notes) {
    assert.ok(note.fret <= 3, `${note.name} stays in the first four frets`);
    if (note.fret === 0) {
      assert.equal(note.finger, null, `${note.name} is an open string`);
    } else {
      // First position: finger n takes fret n, which is what makes
      // this scale the one every beginner learns.
      assert.equal(note.finger, String(note.fret), `${note.name} uses finger ${note.fret}`);
    }
  }
});
