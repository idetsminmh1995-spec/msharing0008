// The Phase 1 fixtures, end to end (Plan Part 08 / Part 12).
//
// Each one is the plan's own table turned into assertions: where a
// human fingering is the only right answer it is asserted exactly,
// and where several are defensible the PROPERTY is asserted instead,
// exactly as Part 08 asks.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sandbox = { console, TextDecoder };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../dist/finger-engine.js', import.meta.url), 'utf8'), sandbox);
const E = sandbox.FingerEngine;

function fixture(name) {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url));
}

function analyze(name, options) {
  const parsed = E.parseMusicXml(fixture(name).toString('utf8'));
  assert.equal(parsed.parts.length, 1, `${name} should hold one part`);
  return E.analyzeGuitar(parsed.parts[0], options ?? {});
}

/** How a note reads in the plan's own shorthand. */
const shape = (note) => `s${note.string}f${note.fret}:${note.finger ?? 'open'}`;

/** Every fixture's output must pass every check the engine has (11 §3). */
function assertValid(timeline, label) {
  const core = E.validateCore(timeline);
  assert.equal(core.ok, true, `${label}: ${JSON.stringify(core.issues)}`);
  // Joined rather than deep-equalled: an array built inside the vm
  // sandbox has a different Array.prototype, and deepEqual reports
  // two empty arrays as different objects.
  const failed = timeline.warnings
    .filter((warning) => warning.code === 'VALIDATION_FAILED')
    .map((warning) => warning.message)
    .join(' | ');
  assert.equal(failed, '', `${label} validator`);
}

test('[F-01] the C major scale comes out in open position', () => {
  const timeline = analyze('f01-c-major-scale.musicxml');
  const expected = JSON.parse(
    readFileSync(new URL('./fixtures/f01-c-major-scale.expected.json', import.meta.url), 'utf8'),
  );
  assert.equal(
    timeline.notes.map(shape).join(' '),
    expected.notes.map((note) => `s${note.string}f${note.fret}:${note.finger ?? 'open'}`).join(' '),
  );
  assertValid(timeline, 'F-01');
});

test('[F-09] the same part written an octave high plays identically', () => {
  const high = analyze('f09-octave-transposed.musicxml');
  const plain = analyze('f01-c-major-scale.musicxml');
  assert.equal(high.notes.map((note) => note.pitch).join(','), plain.notes.map((note) => note.pitch).join(','));
  assert.equal(high.notes.map(shape).join(' '), plain.notes.map(shape).join(' '));
  assertValid(high, 'F-09');
});

test('[F-02] a tab-locked pentatonic box keeps its box and its fingers', () => {
  const timeline = analyze('f02-pentatonic-tab.musicxml');
  for (const note of timeline.notes) {
    assert.equal(note.locked.string, true, `${note.noteId} string`);
    assert.equal(note.locked.fret, true, `${note.noteId} fret`);
    // The plan's own table: 5 -> 1, 7 -> 3, 8 -> 4.
    const expected = { 5: '1', 7: '3', 8: '4' }[note.fret];
    assert.equal(note.finger, expected, `fret ${note.fret} should use finger ${expected}`);
    assert.ok(note.reasons.includes('TAB_LOCKED'), `${note.noteId} says why`);
  }
  // The hand never moves: one position for the whole phrase.
  assert.equal([...new Set(timeline.leftHand.hand.map((frame) => frame.fret))].join(','), '5');
  assertValid(timeline, 'F-02');
});

test('[F-03] the same notes without tab stay in one position', () => {
  const timeline = analyze('f03-pentatonic-no-tab.musicxml');
  const positions = timeline.leftHand.hand.map((frame) => frame.fret);
  const shifts = positions.filter((fret, index) => index > 0 && Math.abs(fret - positions[index - 1]) > 0.5);
  assert.ok(shifts.length <= 1, `at most one shift, got ${shifts.length}: ${positions.join(',')}`);
  for (const note of timeline.notes) {
    assert.equal(note.locked.fret, false, 'nothing was locked in this file');
    assert.ok(note.confidence >= 0 && note.confidence <= 1, 'every note reports a confidence');
  }
  assertValid(timeline, 'F-03');
});

test('[F-05] the pick alternates on the grid, and a rest does not restart it', () => {
  const timeline = analyze('f05-repeated-sixteenths.musicxml');
  const directions = timeline.rightHand.events.map((event) => event.direction[0].toUpperCase()).join('');
  // Four sixteenths a beat: down-up-down-up. The second beat opens
  // with a REST, so its first note is the second slot -- an up-stroke,
  // because the hand went on moving through the rest.
  assert.equal(directions, 'DUDU' + 'UDU' + 'DUDU' + 'DUDU');
  assert.equal(timeline.rightHand.mode, 'pick');
  assertValid(timeline, 'F-05');
});

test('[F-12] a stretch no hand makes is kept as written, and reported', () => {
  const timeline = analyze('f12-impossible-stretch.musicxml');
  assert.equal(timeline.notes.map((note) => `${note.string}/${note.fret}`).join(' '), '1/1 2/8');
  const codes = timeline.warnings.map((warning) => warning.code);
  assert.ok(codes.includes('TAB_INFEASIBLE'), `expected TAB_INFEASIBLE, got ${codes.join(',')}`);
  // "still valid otherwise": the written stretch is not re-reported as
  // an engine error, and nothing else is wrong either.
  assertValid(timeline, 'F-12');
});

test('[F-13] the MIDI version of F-01 is fingered the same way', () => {
  const midi = E.parseMidi(fixture('f13-c-major-scale.mid'));
  assert.equal(midi.parts.length, 1);
  assert.equal(midi.parts[0].gmProgram, 28, 'an electric guitar track');
  assert.equal(midi.parts[0].hasTab, false, 'MIDI never carries tab (IN-M03)');
  const fromMidi = E.analyzeGuitar(midi.parts[0]);
  const fromXml = analyze('f01-c-major-scale.musicxml');
  assert.equal(fromMidi.notes.map(shape).join(' '), fromXml.notes.map(shape).join(' '));
  assertValid(fromMidi, 'F-13');
});

test('[F-14] a note below the instrument is skipped, and the rest plays on', () => {
  const timeline = analyze('f14-out-of-range.musicxml');
  assert.equal(timeline.notes.length, 3, 'the E1 is gone, the other three are not');
  assert.equal(timeline.notes.map((note) => note.pitch).join(','), '48,52,55');
  const codes = timeline.warnings.map((warning) => warning.code);
  assert.ok(codes.includes('OUT_OF_RANGE'));
  assertValid(timeline, 'F-14');
});

test('[F-17] the same seed gives the same video, a different seed only moves the jitter', () => {
  const a = analyze('f01-c-major-scale.musicxml', { seed: 7 });
  const b = analyze('f01-c-major-scale.musicxml', { seed: 7 });
  assert.equal(JSON.stringify(a), JSON.stringify(b), 'byte-identical for one seed');

  const c = analyze('f01-c-major-scale.musicxml', { seed: 8 });
  assert.notEqual(JSON.stringify(a), JSON.stringify(c), 'a different seed is a different take');
  // ...but only the humanisation moved: the fingering is untouched.
  assert.equal(a.notes.map(shape).join(' '), c.notes.map(shape).join(' '));
  assert.equal(
    a.rightHand.events.map((event) => event.direction).join(','),
    c.rightHand.events.map((event) => event.direction).join(','),
  );

  // And with humanisation off, the two seeds agree exactly (MP-23).
  const still = (seed) => analyze('f01-c-major-scale.musicxml', { seed, config: { humanize: { enabled: false } } });
  assert.equal(JSON.stringify(still(7)), JSON.stringify(still(8)).replace('"seed":8', '"seed":7'));
});

test('every fixture leaves a timeline the renderer can read', () => {
  for (const name of [
    'f01-c-major-scale.musicxml',
    'f02-pentatonic-tab.musicxml',
    'f03-pentatonic-no-tab.musicxml',
    'f05-repeated-sixteenths.musicxml',
    'f09-octave-transposed.musicxml',
    'f12-impossible-stretch.musicxml',
    'f14-out-of-range.musicxml',
  ]) {
    const timeline = analyze(name);
    assert.equal(timeline.schema, 'finger-timeline');
    assert.equal(timeline.schemaVersion, '1.0.0');
    assert.equal(timeline.instrument.stringOrder, 'lowToHigh');
    assert.ok(timeline.duration > 0, `${name} has a duration`);
    assert.equal(Object.keys(timeline.leftHand.fingers).join(','), '1,2,3,4,T');
    // [OUT-04] a pressed fret is the fret index minus the fingertip offset.
    for (const key of ['1', '2', '3', '4']) {
      for (const frame of timeline.leftHand.fingers[key]) {
        assert.ok(Number.isFinite(frame.t) && Number.isFinite(frame.fret), `${name} ${key} finite`);
      }
    }
    // [V-10] every note is either picked or sounded by the left hand.
    const picked = new Set(timeline.rightHand.events.flatMap((event) => event.noteIds));
    for (const note of timeline.notes) {
      assert.ok(picked.has(note.noteId), `${name}: ${note.noteId} has a right-hand event`);
    }
  }
});
