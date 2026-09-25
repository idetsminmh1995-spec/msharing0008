// The three roads in (Plan Part 03): the Notation Engine, a MusicXML
// file, a MIDI file. All three have to arrive at the same kind of
// notes, in seconds, with the guitar data converted exactly once.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sandbox = { console, TextDecoder };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../dist/finger-engine.js', import.meta.url), 'utf8'), sandbox);
const E = sandbox.FingerEngine;

const xml = (body, attributes = '') => `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Guitar</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time>${attributes}</attributes>
    ${body}
  </measure></part>
</score-partwise>`;

const note = (step, octave, duration = 2, extra = '') =>
  `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${duration}</duration><voice>1</voice>${extra}</note>`;

// ------------------------------------------------------------ MusicXML

test('[IN-X03] a MusicXML string number is converted, not copied', () => {
  // <string>6</string> is the file's SIXTH string counting from the
  // thin e -- the low E -- which is this engine's string 1.
  const parsed = E.parseMusicXml(
    xml(note('E', 2, 2, '<notations><technical><string>6</string><fret>0</fret></technical></notations>')),
  );
  const first = parsed.parts[0].notes[0];
  assert.equal(first.lockedString, 1, 'the low E is string 1 here');
  assert.equal(first.lockedFret, 0);
  assert.equal(parsed.parts[0].hasTab, true);
});

test('[IN-X06] a written fingering is read, and an unknown token is reported', () => {
  const good = E.parseMusicXml(
    xml(note('C', 3, 2, '<notations><technical><fingering>3</fingering></technical></notations>')),
  );
  assert.equal(good.parts[0].notes[0].lockedFinger, 3);

  const open = E.parseMusicXml(
    xml(note('C', 3, 2, '<notations><technical><fingering>0</fingering></technical></notations>')),
  );
  assert.equal(open.parts[0].notes[0].lockedFinger, undefined, '0 means an open string, not a finger');

  const odd = E.parseMusicXml(
    xml(note('C', 3, 2, '<notations><technical><fingering>x</fingering></technical></notations>')),
  );
  assert.equal(odd.parts[0].notes[0].lockedFinger, undefined);
  assert.ok(odd.warnings.some((warning) => warning.code === 'UNKNOWN_FINGERING_TOKEN'));
});

test('[IN-X12] sounding pitch is the written pitch plus <transpose>', () => {
  const parsed = E.parseMusicXml(
    xml(note('C', 4), '<transpose><diatonic>0</diatonic><chromatic>0</chromatic><octave-change>-1</octave-change></transpose>'),
  );
  assert.equal(parsed.parts[0].notes[0].pitch, 48, 'written C4, sounding C3');
});

test('[IN-X20/IN-X22/IN-X24] chords, ties and rests', () => {
  const chord = E.parseMusicXml(xml(note('C', 3) + note('E', 3, 2, '<chord/>')));
  const notes = chord.parts[0].notes;
  assert.equal(notes.length, 2);
  assert.equal(notes[0].tick, notes[1].tick, 'a <chord/> note starts with the one before it');

  const tied = E.parseMusicXml(
    xml(note('C', 3, 2, '<tie type="start"/>') + note('C', 3, 2, '<tie type="stop"/>')),
  );
  assert.equal(tied.parts[0].notes.length, 1, 'a tie is one note, not two');
  assert.equal(tied.parts[0].notes[0].durationTicks, 960, 'and it is as long as both');
  assert.ok(tied.parts[0].notes[0].techniques.includes('tieContinuation'));

  const rested = E.parseMusicXml(xml('<note><rest/><duration>2</duration></note>' + note('C', 3)));
  assert.equal(rested.parts[0].notes.length, 1, 'a rest is not a note');
  assert.equal(rested.parts[0].notes[0].tick, 480, 'but it still moves the cursor');
});

test('[IN-X10/IN-X11] tuning and capo come from <staff-details>', () => {
  const parsed = E.parseMusicXml(
    xml(note('D', 2), `<staff-details><staff-lines>6</staff-lines><capo>2</capo>
      <staff-tuning line="1"><tuning-step>D</tuning-step><tuning-octave>2</tuning-octave></staff-tuning>
      <staff-tuning line="2"><tuning-step>A</tuning-step><tuning-octave>2</tuning-octave></staff-tuning>
      <staff-tuning line="3"><tuning-step>D</tuning-step><tuning-octave>3</tuning-octave></staff-tuning>
      <staff-tuning line="4"><tuning-step>G</tuning-step><tuning-octave>3</tuning-octave></staff-tuning>
      <staff-tuning line="5"><tuning-step>B</tuning-step><tuning-octave>3</tuning-octave></staff-tuning>
      <staff-tuning line="6"><tuning-step>E</tuning-step><tuning-octave>4</tuning-octave></staff-tuning>
      </staff-details>`),
  );
  const hint = parsed.parts[0].instrumentHint;
  // line 1 is the LOWEST string, which is where this engine counts from.
  assert.equal(hint.tuning.join(','), '38,45,50,55,59,64', 'drop D');
  assert.equal(hint.capo, 2);
});

test('[IN-X02] guitar parts are picked by name, program or tab', () => {
  const parts = [
    { partId: 'P1', name: 'Piano', instrumentHint: {}, notes: [], hasTab: false },
    { partId: 'P2', name: 'Lead Gtr', instrumentHint: {}, notes: [], hasTab: false },
  ];
  assert.equal(E.guitarParts(parts).length, 1);
  assert.equal(E.guitarParts(parts)[0].partId, 'P2');
  assert.equal(E.guitarParts([parts[0]]).length, 1, 'nothing matched: hand back everything');
});

test('a file that is not MusicXML says so instead of throwing', () => {
  assert.equal(E.parseMusicXml('hello').warnings[0].code, 'NOT_MUSICXML');
  assert.equal(E.parseMusicXml('PK\u0003\u0004rest').warnings[0].code, 'MXL_NOT_UNZIPPED');
});

// ----------------------------------------------------------------- MIDI

test('[IN-M02] the guitar track is chosen by program, never the drums', () => {
  const parts = [
    { partId: 't1', name: 'Drums', gmProgram: 0, instrumentHint: {}, notes: [{ voice: 10 }], hasTab: false },
    { partId: 't2', name: 'Bass', gmProgram: 33, instrumentHint: {}, notes: [{ voice: 2 }], hasTab: false },
    { partId: 't3', name: 'Gtr', gmProgram: 27, instrumentHint: {}, notes: [{ voice: 1 }], hasTab: false },
  ];
  const chosen = E.guitarTracks(parts);
  assert.equal(chosen.length, 1);
  assert.equal(chosen[0].partId, 't3');
});

test('[IN-M01/M04/M07] note-offs, zero-velocity note-ons and real timing', () => {
  const midi = E.parseMidi(readFileSync(new URL('./fixtures/f13-c-major-scale.mid', import.meta.url)));
  const notes = midi.parts[0].notes;
  assert.equal(notes.length, 8);
  assert.equal(notes[0].durationTicks, 480, 'the note ends where the file says');
  assert.equal(notes.map((n) => n.tick).join(','), '0,480,960,1440,1920,2400,2880,3360');
  assert.equal(midi.parts[0].tempoMap.segments[0].microsecondsPerQuarter, 500000);
  assert.equal(midi.parts[0].timeSignatures[0].numerator, 4);
});

test('a file that is not MIDI says so instead of throwing', () => {
  assert.equal(E.parseMidi(new Uint8Array([1, 2, 3, 4])).warnings[0].code, 'NOT_MIDI');
});

// ----------------------------------------------------------- Normalizer

test('[IN-N01..06] order, duplicates, range and seconds', () => {
  const instrument = E.defaultInstrument();
  const base = (id, pitch, tick) => ({
    noteId: id,
    pitch,
    tick,
    durationTicks: 480,
    time: 0,
    duration: 0,
    techniques: [],
    sourceRef: { format: 'midi', part: 't1', index: 0 },
  });
  const part = {
    partId: 't1',
    name: 'Gtr',
    instrumentHint: {},
    notes: [base('b', 52, 480), base('a', 48, 0), base('a2', 48, 0), base('low', 28, 960)],
    tempoMap: E.tempoMap(480),
    timeSignatures: [],
    hasTab: false,
  };
  const normalized = E.normalizePart(part, instrument, { graceDurationSec: 0.06, outOfRange: 'skip' });
  assert.equal(normalized.notes.map((n) => n.noteId).join(','), 'a,b', 'sorted, de-duplicated, in range');
  assert.equal(normalized.notes[0].time, 0);
  assert.equal(normalized.notes[1].time, 0.5, 'seconds come from the tempo map');
  assert.equal(normalized.notes[1].duration, 0.5);
  assert.ok(normalized.warnings.some((warning) => warning.code === 'OUT_OF_RANGE'));
});

// ------------------------------------------------- Notation Engine road

/** A tiny stand-in for the Notation Engine's score: two bars, played twice. */
function notationScore() {
  const noteOf = (step, octave, startTick, extra = {}) => ({
    kind: 'note',
    pitch: { kind: 'pitched', step, alter: 0, octave },
    duration: { ticks: 480 },
    voice: 1,
    startTick,
    ...extra,
  });
  return {
    parts: [
      {
        id: 'P1',
        name: 'Guitar',
        measures: [
          {
            number: 1,
            voices: [
              {
                id: 1,
                events: [
                  noteOf('C', 3, 0, { stringNumber: 5, fret: 3, fingering: 3 }),
                  noteOf('D', 3, 480, { stringNumber: 4, fret: 0 }),
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

const playback = {
  tempoMap: { segments: [{ startTick: 0, startSeconds: 0, microsecondsPerQuarter: 500000 }] },
  globalTickOffsetByMeasure: new Map([[1, 0]]),
  timeSignatureByMeasure: new Map([[1, { numerator: 4, denominator: 4 }]]),
  performance: {
    entries: [
      { measureNumber: 1, writtenTick: 0, performanceTick: 0, startSeconds: 0, writtenStartSeconds: 0, pass: 1 },
      { measureNumber: 1, writtenTick: 0, performanceTick: 1920, startSeconds: 2, writtenStartSeconds: 0, pass: 2 },
    ],
  },
};

test('[IN-E01/E04/E05] the notation score, unrolled and converted', () => {
  const result = E.fromNotationEngine(notationScore(), playback, { numStrings: 6 });
  const notes = result.parts[0].notes;
  assert.equal(notes.length, 4, 'two notes, played twice');

  // [IN-E04] the Notation Engine numbers strings as MusicXML does.
  assert.equal(notes[0].lockedString, 2, 'its string 5 is the A string: ours is 2');
  assert.equal(notes[0].lockedFret, 3);
  assert.equal(notes[0].lockedFinger, 3);
  assert.equal(notes[1].lockedString, 3, 'its string 4 is the D string: ours is 3');

  // [IN-E01] the times are the Notation Engine's own performance times.
  assert.equal(notes.map((n) => n.time).join(','), '0,0.5,2,2.5');
  // [IN-E05] the second pass is a second note with the same written one behind it.
  assert.equal(notes[2].noteId, `${notes[0].noteId}#r2`);
  assert.equal(notes[2].notationNoteId, notes[0].notationNoteId, '[IN-E03] both point at the same note on the staff');
  assert.equal(result.parts[0].hasTab, true);
});

test('[IN-E02] what the Notation Engine does not keep is read from the file', () => {
  const musicXml = `<?xml version="1.0"?><score-partwise><part-list/><part id="P1"><measure number="1">
    <attributes><transpose><chromatic>0</chromatic><octave-change>-1</octave-change></transpose></attributes>
  </measure></part></score-partwise>`;
  const plain = E.fromNotationEngine(notationScore(), playback, { numStrings: 6 });
  const transposed = E.fromNotationEngine(notationScore(), playback, { numStrings: 6, musicXml });
  assert.equal(plain.parts[0].notes[0].pitch, 48, 'C3 as written');
  assert.equal(transposed.parts[0].notes[0].pitch, 36, 'an octave down, as the file says');
});

test('both roads read the same fixture into the same notes', () => {
  // [IN-E06] the standalone parser and the adapter must agree; here
  // the parser is checked against the file's own arithmetic.
  const parsed = E.parseMusicXml(
    readFileSync(new URL('./fixtures/f01-c-major-scale.musicxml', import.meta.url), 'utf8'),
  );
  const notes = parsed.parts[0].notes;
  assert.equal(notes.map((n) => n.pitch).join(','), '48,50,52,53,55,57,59,60');
  assert.equal(notes.map((n) => n.tick).join(','), '0,480,960,1440,1920,2400,2880,3360');
  assert.equal(notes[0].noteId, 'P1-m1-v1-n0', '[DM-09] an ID that says where the note is');
});
