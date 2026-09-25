// Plan Part 10 (defaults), DM-07 (tempo), README rule 4 (determinism)
// and Part 11 §1 (the validator skeleton, V-01 and V-08).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../dist/finger-engine.js', import.meta.url), 'utf8'), sandbox);
const E = sandbox.FingerEngine;

// ---------------------------------------------------------------- tempo

test('[DM-07] a tick is seconds through the tempo map', () => {
  const map = E.tempoMap(480);
  // 120 BPM: a quarter note is half a second.
  assert.equal(E.tickToSeconds(map, 0), 0);
  assert.equal(E.tickToSeconds(map, 480), 0.5);
  assert.equal(E.tickToSeconds(map, 1920), 2);
  assert.equal(E.bpmAt(map, 0), 120);
});

test('[DM-07] a tempo change moves everything after it and nothing before it', () => {
  const map = E.tempoMap(480, [
    { startTick: 0, microsecondsPerQuarter: 500_000 }, // 120 BPM
    { startTick: 1920, microsecondsPerQuarter: 1_000_000 }, // 60 BPM
  ]);
  assert.equal(E.tickToSeconds(map, 1920), 2, 'the first bar is unchanged');
  assert.equal(E.tickToSeconds(map, 2400), 3, 'a quarter at 60 BPM is a whole second');
  assert.equal(E.bpmAt(map, 1919), 120);
  assert.equal(E.bpmAt(map, 1920), 60);
});

test('the map is sorted, and a nonsense tick does not produce a NaN time', () => {
  const map = E.tempoMap(480, [
    { startTick: 960, microsecondsPerQuarter: 250_000 },
    { startTick: 0, microsecondsPerQuarter: 500_000 },
  ]);
  assert.equal(map.segments[0].startTick, 0, 'segments come back in tick order');
  assert.equal(E.tickToSeconds(map, 960), 1);
  assert.equal(E.tickToSeconds(map, 1920), 1.5, 'the second bar is two quarters at 240 BPM');
  assert.equal(E.tickToSeconds(map, NaN), 0);
  assert.equal(E.tickToSeconds(map, -100), 0);
});

// ------------------------------------------------------------------ rng

test('[README rule 4] the same seed gives the same numbers, forever', () => {
  const a = E.makeRng(12345);
  const b = E.makeRng(12345);
  const first = [];
  for (let i = 0; i < 8; i++) {
    const value = a();
    assert.equal(value, b(), `draw ${i}`);
    assert.ok(value >= 0 && value < 1, 'draws are in [0, 1)');
    first.push(value);
  }
  const other = E.makeRng(12346);
  const differs = first.some((value, i) => {
    void i;
    return value !== other();
  });
  assert.ok(differs, 'a different seed gives a different stream');
});

test('[MP-20] jitter stays inside the amount it was given', () => {
  const rng = E.makeRng(7);
  for (let i = 0; i < 200; i++) {
    const value = E.jitter(rng, 0.008);
    assert.ok(Math.abs(value) <= 0.008, `jitter ${value} is inside ±8 ms`);
  }
});

// -------------------------------------------------------------- defaults

test('[Part 10] a preset merges over the defaults without touching them', () => {
  const merged = E.mergeConfig(E.DEFAULTS, {
    instrument: { capo: 2 },
    humanize: { enabled: false },
  });
  assert.equal(merged.instrument.capo, 2);
  assert.equal(merged.humanize.enabled, false);
  assert.equal(merged.instrument.numFrets, E.DEFAULTS.instrument.numFrets, 'siblings survive');
  assert.equal(merged.humanize.timeJitterSec, E.DEFAULTS.humanize.timeJitterSec);
  assert.equal(E.DEFAULTS.instrument.capo, 0, 'the defaults are not mutated');
});

test('a tuning is replaced, never merged element-wise', () => {
  const sevenString = E.TUNING_PRESETS.sevenString;
  const merged = E.mergeConfig(E.DEFAULTS, { instrument: { tuning: sevenString } });
  assert.equal(merged.instrument.tuning.length, 7, 'a 7-string tuning stays 7 strings');
  assert.equal(merged.instrument.tuning.join(','), '35,40,45,50,55,59,64');
});

test('[Part 09] configHash is stable, key order does not matter, a change shows', () => {
  const a = E.configHash({ instrument: { capo: 0, numFrets: 22 }, debug: false });
  const b = E.configHash({ debug: false, instrument: { numFrets: 22, capo: 0 } });
  assert.equal(a, b, 'the same config in a different order hashes the same');
  const c = E.configHash({ instrument: { capo: 1, numFrets: 22 }, debug: false });
  assert.notEqual(a, c, 'a capo changes the hash');
  assert.match(a, /^[0-9a-f]{8}$/);
});

// ------------------------------------------------------------- validator

/** The smallest timeline that is well-formed, for the checks to pick apart. */
function timeline(overrides = {}) {
  const base = {
    schema: E.TIMELINE_SCHEMA,
    schemaVersion: E.TIMELINE_SCHEMA_VERSION,
    engine: {
      name: 'guitar-finger-engine',
      version: '1.0.0',
      presetId: 'default',
      seed: 1,
      configHash: E.configHash(E.DEFAULTS),
    },
    instrument: {
      kind: 'guitar',
      numStrings: 6,
      stringOrder: 'lowToHigh',
      tuning: [...E.STANDARD_TUNING],
      capo: 0,
      numFrets: 22,
    },
    duration: 1,
    notes: [],
    leftHand: { hand: [], fingers: E.emptyFingerTracks(), barres: [] },
    rightHand: { mode: 'pick', events: [] },
    warnings: [],
  };
  return { ...base, ...overrides };
}

function note(overrides = {}) {
  return {
    noteId: 'p1-m1-v1-n0',
    time: 0,
    duration: 0.5,
    pitch: 48,
    string: 2,
    fret: 3,
    finger: '3',
    techniques: ['normal'],
    locked: { string: false, fret: false, finger: false },
    reasons: ['OPEN_POSITION'],
    confidence: 0.9,
    ...overrides,
  };
}

test('an honest timeline passes every core check', () => {
  const result = E.validateCore(timeline({ notes: [note()] }));
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.equal(result.issues.length, 0);
});

test('[V-01] a note that does not sound its own pitch is caught', () => {
  // C3 is string 2 fret 3. Claim string 3 for it -- 50 + 3 = D#3 --
  // and the video would light the wrong string with nothing else wrong.
  const result = E.validateCore(timeline({ notes: [note({ string: 3 })] }));
  assert.equal(result.ok, false);
  assert.equal(result.issues[0].rule, 'V-01');
  assert.match(result.issues[0].message, /sounds 53/);
  assert.equal(result.issues[0].noteId, 'p1-m1-v1-n0');
});

test('[V-01] a string the instrument does not have is caught', () => {
  const result = E.validateCore(timeline({ notes: [note({ string: 7 })] }));
  assert.equal(result.ok, false);
  assert.match(result.issues[0].message, /does not have/);
});

test('[V-08] keyframes that go backwards are caught', () => {
  const fingers = E.emptyFingerTracks();
  fingers['1'] = [
    { t: 0, string: 2, fret: 2.7, pressed: true, visible: true },
    { t: 0.4, string: 2, fret: 2.7, pressed: false, visible: true },
    { t: 0.2, string: 3, fret: 2.7, pressed: true, visible: true },
  ];
  const result = E.validateCore(
    timeline({ leftHand: { hand: [], fingers, barres: [] }, notes: [] }),
  );
  assert.equal(result.ok, false);
  assert.equal(result.issues[0].rule, 'V-08');
  assert.match(result.issues[0].message, /out of order/);
});

test('[V-08] a NaN in a keyframe is caught rather than drawn', () => {
  const fingers = E.emptyFingerTracks();
  fingers['2'] = [{ t: 0.1, string: 3, fret: NaN, pressed: true, visible: true }];
  const hand = [{ t: 0, fret: 1 }, { t: 0.5, fret: Infinity }];
  const result = E.validateCore(timeline({ leftHand: { hand, fingers, barres: [] } }));
  assert.equal(result.ok, false);
  assert.equal(result.issues.length, 2, 'the finger and the hand are both reported');
  assert.ok(result.issues.every((issue) => issue.rule === 'V-08'));
});

test('[V-08] a note with a NaN time is caught', () => {
  const result = E.validateCore(timeline({ notes: [note({ time: NaN })] }));
  assert.equal(result.ok, false);
  assert.match(result.issues[0].message, /not a number/);
});

test('a timeline from a schema the reader does not know is refused', () => {
  const result = E.validateCore(timeline({ schemaVersion: '2.0.0' }));
  assert.equal(result.ok, false);
  assert.equal(result.issues[0].rule, 'OUT-00');
  assert.match(result.issues[0].message, /finger-timeline@1\.0\.0/);
});

test('[Part 09 §3] a timeline always carries all five finger tracks', () => {
  const tracks = E.emptyFingerTracks();
  assert.equal(Object.keys(tracks).join(','), '1,2,3,4,T');
  assert.equal(E.FINGER_KEYS.join(','), '1,2,3,4,T');
  assert.equal(E.fingerKey(3), '3');
  assert.equal(E.fingerKey(null), null, 'an open string has no finger');
  assert.equal(E.techniqueNames([]).join(','), 'normal');
});
