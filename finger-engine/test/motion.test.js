// The picking hand (Plan Part 07) and the movement of the left one
// (Part 08). Between them they are what makes the dots look played
// rather than switched on.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sandbox = { console, TextDecoder };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../dist/finger-engine.js', import.meta.url), 'utf8'), sandbox);
const E = sandbox.FingerEngine;

const motion = E.DEFAULTS.motion;

// ------------------------------------------------------- the pick grid

test('[RH-P01] the beat is divided by the smallest value played in it', () => {
  // 480 ticks a quarter: one note on the beat is a quarter grid, two
  // are eighths, four are sixteenths, three are a triplet.
  assert.equal(E.subdivisionOfBeat([0], 0, 480), 1);
  assert.equal(E.subdivisionOfBeat([0, 240], 0, 480), 2);
  assert.equal(E.subdivisionOfBeat([0, 120, 240, 360], 0, 480), 4);
  assert.equal(E.subdivisionOfBeat([0, 160, 320], 0, 480), 3);
});

test('[RH-P01] a beat lasts what the time signature says', () => {
  assert.equal(E.beatTicksAt([], 0), 480, '4/4 by default');
  assert.equal(E.beatTicksAt([{ tick: 0, numerator: 6, denominator: 8 }], 0), 240);
});

test('[RH-P03] a note the left hand sounds is not picked', () => {
  const plain = { noteId: 'a', techniques: [], sourceRef: { format: 'musicxml', part: 'P1', index: 0 } };
  const tied = { ...plain, techniques: ['tieContinuation'] };
  const hammered = { ...plain, techniqueLinks: [{ type: 'hammerOn', fromNoteId: 'a' }] };
  const hammering = { ...plain, techniqueLinks: [{ type: 'hammerOn', toNoteId: 'b' }] };
  assert.equal(E.isLegatoTarget(plain), false);
  assert.equal(E.isLegatoTarget(tied), true);
  assert.equal(E.isLegatoTarget(hammered), true);
  assert.equal(E.isLegatoTarget(hammering), false, 'the note it comes FROM is still picked');
});

test('[RH-P04] a written down-bow beats the grid', () => {
  const note = (tick, extra) => ({
    noteId: `n${tick}`,
    pitch: 52,
    tick,
    durationTicks: 240,
    time: tick / 960,
    duration: 0.25,
    techniques: [],
    sourceRef: { format: 'musicxml', part: 'P1', index: 0 },
    ...extra,
  });
  const stages = [note(0), note(240, { lockedPickDir: 'down' })].map((n) => ({
    time: n.time,
    tick: n.tick,
    notes: [n],
    placements: [{ noteId: n.noteId, string: 3, fret: 2, finger: 1 }],
  }));
  const events = E.pickEvents(stages, []);
  assert.equal(events[0].direction, 'down');
  assert.equal(events[1].direction, 'down', 'the off-beat would have been up');
  assert.equal(events[1].reason, 'LOCKED');
});

test('[RH-01] Phase 1 plays with a pick, and says so when asked for fingers', () => {
  assert.equal(E.resolveMode('auto').mode, 'pick');
  assert.equal(E.resolveMode('pick').warning, undefined);
  assert.equal(E.resolveMode('fingerstyle').mode, 'pick');
  assert.match(E.resolveMode('fingerstyle').warning, /Phase 3/);
});

// -------------------------------------------------------- the movement

test('[MP-02] a longer move takes longer, but not proportionally', () => {
  const near = E.travelSeconds(10, motion);
  const far = E.travelSeconds(200, motion);
  assert.ok(far > near);
  assert.ok(far < near * 4, 'Fitts, not a straight line');
  assert.equal(E.travelSeconds(0, motion), motion.fitts.aSec);
});

test('[MP-01] the finger is early, inside the bounds the config sets', () => {
  assert.equal(E.leadSeconds(0, motion), motion.minLeadSec, 'no time at all still leaves the minimum');
  assert.equal(E.leadSeconds(10, motion), motion.maxLeadSec, 'all the time in the world still lands late enough');
  assert.equal(E.leadSeconds(0.2, motion), 0.2 * motion.leadFraction);
});

function timelineOf(fixture, options) {
  const parsed = E.parseMusicXml(
    readFileSync(new URL(`./fixtures/${fixture}`, import.meta.url), 'utf8'),
  );
  return E.analyzeGuitar(parsed.parts[0], options ?? {});
}

test('[MP-01/OUT-01/OUT-04] the keyframes of a real phrase', () => {
  const timeline = timelineOf('f01-c-major-scale.musicxml', { config: { humanize: { enabled: false } } });
  for (const key of ['1', '2', '3', '4', 'T']) {
    const track = timeline.leftHand.fingers[key];
    let previous = -Infinity;
    for (const frame of track) {
      assert.ok(frame.t > previous, `[OUT-01] ${key} goes forward: ${frame.t} after ${previous}`);
      previous = frame.t;
    }
    for (const frame of track) {
      if (!frame.pressed) continue;
      // [OUT-04] a pressed fret is the fret index minus the fingertip
      // offset: fret 3 at k = 0.3 is 2.7, never 3.
      const wholeFret = Math.round(frame.fret + E.DEFAULTS.geometry.fingertipBehindFret);
      assert.ok(
        Math.abs(frame.fret - (wholeFret - E.DEFAULTS.geometry.fingertipBehindFret)) < 1e-9,
        `${key} at ${frame.fret} should sit behind fret ${wholeFret}`,
      );
    }
  }

  // [MP-01] every note is pressed before it sounds.
  for (const note of timeline.notes) {
    if (note.finger === null) continue;
    const press = timeline.leftHand.fingers[note.finger].find((frame) => frame.noteId === note.noteId);
    assert.ok(press !== undefined, `${note.noteId} is pressed`);
    assert.ok(press.t <= note.time, `${note.noteId} is pressed at ${press.t}, before ${note.time}`);
    assert.ok(note.time - press.t <= motion.maxLeadSec + 1e-9, 'and not absurdly early');
  }
});

test('[MP-05] a finger stays down after its note, then lifts', () => {
  const timeline = timelineOf('f01-c-major-scale.musicxml', { config: { humanize: { enabled: false } } });
  const track = timeline.leftHand.fingers['3'];
  const press = track.find((frame) => frame.pressed);
  const lift = track.find((frame) => frame.t > press.t && !frame.pressed);
  const note = timeline.notes.find((candidate) => candidate.noteId === press.noteId);
  assert.ok(lift.t > note.time + note.duration, 'the finger outlives the note (P-008)');
  assert.ok(lift.t <= note.time + note.duration + motion.idleLiftSec + 1e-9, 'but not forever');
  assert.equal(lift.visible, false, 'and the dot goes away with it');
});

test('[MP-23] humanisation off is perfectly regular', () => {
  const still = timelineOf('f01-c-major-scale.musicxml', { config: { humanize: { enabled: false } } });
  const moved = timelineOf('f01-c-major-scale.musicxml', {});
  const pressesOf = (timeline) =>
    timeline.leftHand.fingers['3'].filter((frame) => frame.pressed).map((frame) => frame.t);
  const [a] = pressesOf(still);
  const [b] = pressesOf(moved);
  assert.notEqual(a, b, 'the jitter really moved something');
  assert.ok(Math.abs(a - b) <= E.DEFAULTS.humanize.timeJitterSec + 1e-9, '[MP-21] and only by a hair');
});
