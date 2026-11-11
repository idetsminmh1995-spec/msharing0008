import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { loadEngine } from './helper.js';

const E = loadEngine();
const BOARD = E.buildKeyboard(88);

let counter = 0;
const n = (midi, timeMs, over = {}) => ({
  id: `f${counter++}`,
  midi,
  timeMs,
  durationMs: 350,
  ...over,
});
const solve = (notes, hand = 'right', over = {}) =>
  E.solveFingering(notes, hand, { keyboard: BOARD, ...over });
const fingersOf = (notes, result) => notes.map((note) => result.byNoteId.get(note.id)?.finger);

describe('Module 3: a finger for every note, chosen for the whole phrase', () => {
  test('every note gets exactly one finger, and the shape the spec asks for', () => {
    const notes = [n(60, 0), n(62, 300), n(64, 600)];
    const result = solve(notes);
    assert.equal(result.assignments.length, 3);
    for (const a of result.assignments) {
      assert.equal(typeof a.noteId, 'string');
      assert.equal(a.hand, 'right');
      assert.ok(a.finger >= 1 && a.finger <= 5, `finger ${a.finger}`);
    }
    assert.equal(result.incomplete, false);
  });

  test('a five-note run inside one position uses one finger each, in order', () => {
    // C D E F G in the right hand is the first thing anybody learns:
    // thumb on C and one finger per note, with the hand never moving.
    const notes = [60, 62, 64, 65, 67].map((midi, i) => n(midi, i * 300));
    const result = solve(notes);
    assert.deepEqual([...fingersOf(notes, result)], [1, 2, 3, 4, 5]);
  });

  test('and the left hand counts the other way, because its thumb is on the right', () => {
    // The same five keys descending under a left hand: thumb on the
    // TOP note. That one flip is most of what makes the two hands
    // different, and getting it wrong is immediately visible.
    const notes = [67, 65, 64, 62, 60].map((midi, i) => n(midi, i * 300));
    const result = solve(notes, 'left');
    assert.deepEqual([...fingersOf(notes, result)], [1, 2, 3, 4, 5]);
  });

  test('a scale past five notes passes the thumb under rather than giving up', () => {
    // A full C major octave upward. No five-finger position covers
    // eight notes, so the hand has to change position, and the only way
    // a player does that in a scale is the thumb going under.
    const notes = [60, 62, 64, 65, 67, 69, 71, 72].map((midi, i) => n(midi, i * 250));
    const result = solve(notes);
    const fingers = [...fingersOf(notes, result)];
    assert.equal(fingers.length, 8);
    // Somewhere in the run a finger is followed by the thumb while the
    // music keeps going up. That IS a thumb-under.
    const hasThumbUnder = fingers.some((finger, i) => i > 0 && finger === 1 && fingers[i - 1] > 1);
    assert.ok(hasThumbUnder, `no thumb-under in ${fingers.join(',')}`);
    // And nothing is asked to play two notes at once.
    assert.ok(fingers.every((f) => f >= 1 && f <= 5));
  });

  test("a chord's fingers run the same way as its notes -- fingers cannot cross inside one hand", () => {
    const notes = [n(60, 0), n(64, 0), n(67, 0)];
    const result = solve(notes);
    const fingers = [...fingersOf(notes, result)];
    for (let i = 1; i < fingers.length; i++) {
      assert.ok(fingers[i] > fingers[i - 1], `right hand fingers must rise: ${fingers.join(',')}`);
    }
    // And in the left hand they fall, for the same reason read backwards.
    const left = [...fingersOf(notes, solve(notes, 'left'))];
    for (let i = 1; i < left.length; i++) {
      assert.ok(left[i] < left[i - 1], `left hand fingers must fall: ${left.join(',')}`);
    }
  });

  test('a chord is one shape: no finger is used twice', () => {
    const notes = [n(60, 0), n(64, 0), n(67, 0), n(72, 0)];
    const fingers = [...fingersOf(notes, solve(notes))];
    assert.equal(new Set(fingers).size, fingers.length);
  });

  test("the file's own fingering is obeyed, not overruled", () => {
    // Somebody wrote this, usually the editor of the edition. The
    // engine's job is to animate it.
    const notes = [n(60, 0, { statedFinger: 3 }), n(62, 300), n(64, 600)];
    const result = solve(notes);
    assert.equal(result.byNoteId.get(notes[0].id).finger, 3);
  });

  test('a caller override beats the file, which beats the search', () => {
    const notes = [n(60, 0, { statedFinger: 3 })];
    const overrides = new Map([[notes[0].id, 5]]);
    assert.equal(solve(notes, 'right', { overrides }).byNoteId.get(notes[0].id).finger, 5);
  });

  test('the notes around a stated finger are planned to fit it, not fought against it', () => {
    // Thumb pinned on the fifth note of a rising run: the four before
    // it have to arrive somewhere the thumb can be, which means the
    // hand is in a different place than it would otherwise choose.
    const free = [60, 62, 64, 65, 67].map((midi, i) => n(midi, i * 250));
    const pinned = [60, 62, 64, 65, 67].map((midi, i) =>
      n(midi, i * 250, i === 4 ? { statedFinger: 1 } : {}),
    );
    assert.equal(solve(pinned).byNoteId.get(pinned[4].id).finger, 1);
    assert.notDeepEqual([...fingersOf(pinned, solve(pinned))], [...fingersOf(free, solve(free))]);
  });

  test('a repeated note slow enough to re-strike keeps its finger; fast, it alternates', () => {
    const slow = [n(60, 0), n(60, 400), n(60, 800)];
    const slowFingers = [...fingersOf(slow, solve(slow))];
    assert.equal(new Set(slowFingers).size, 1, `slow repeats keep one finger: ${slowFingers}`);

    const fast = [n(60, 0, { durationMs: 60 }), n(60, 70, { durationMs: 60 }), n(60, 140, { durationMs: 60 })];
    const fastFingers = [...fingersOf(fast, solve(fast))];
    assert.ok(fastFingers.length === 3);
    assert.ok(
      fastFingers[0] !== fastFingers[1] || fastFingers[1] !== fastFingers[2],
      `fast repeats cannot all be one finger: ${fastFingers}`,
    );
  });

  test('the thumb is kept off black keys when a white key will do', () => {
    // F# G A B: the engine should not put the thumb on the F#.
    const notes = [66, 67, 69, 71].map((midi, i) => n(midi, i * 300));
    const result = solve(notes);
    assert.notEqual(result.byNoteId.get(notes[0].id).finger, 1, 'thumb avoids the black key');
  });

  test('a hand size changes the fingering, rather than being a setting that does nothing', () => {
    // A sixth held as a chord: comfortable for a large hand between two
    // adjacent fingers, a stretch for a small one, which has to use a
    // wider pair.
    const notes = [n(60, 0), n(69, 0)];
    const small = [...fingersOf(notes, solve(notes, 'right', { profile: 'small' }))];
    const large = [...fingersOf(notes, solve(notes, 'right', { profile: 'large' }))];
    const spread = (f) => f[1] - f[0];
    assert.ok(spread(small) >= spread(large), `${small} vs ${large}`);
  });

  test('a stretch no hand holds is reported, and the phrase still comes out fingered', () => {
    // A twelfth as a chord: nothing reaches it. The solver must not
    // leave the bar around it unfingered.
    const notes = [n(60, 0), n(79, 0), n(62, 500), n(64, 800)];
    const result = solve(notes);
    assert.ok(result.strainedOnsets.length > 0 || result.incomplete, 'the problem is reported');
    assert.ok(result.byNoteId.has(notes[2].id), 'and the notes after it are still fingered');
    assert.ok(result.byNoteId.has(notes[3].id));
  });

  test('the same input twice gives the same fingering', () => {
    const build = () => [60, 62, 64, 65, 67, 69, 71, 72].map((midi, i) => n(midi, i * 250));
    const a = build();
    const b = build();
    assert.deepEqual([...fingersOf(a, solve(a))], [...fingersOf(b, solve(b))]);
  });
});

describe('the search itself', () => {
  test('a refused shape is a refusal, not a cheap one', () => {
    // An infinite cost has to keep a state OUT of the beam. Letting one
    // in would mean the solver never asks for its rules to be relaxed:
    // it would carry the impossible shape forward and call the stage
    // solved, which is how an unplayable chord used to come out
    // silently fingered.
    const notes = [n(60, 0), n(79, 0)];
    const result = solve(notes);
    assert.equal(result.incomplete, true);
    assert.equal(result.unfingered.length, 2);
    assert.equal(result.strainedOnsets.length, 1);
  });

  test('a hole in the middle does not renumber the notes after it', () => {
    // The bug this guards: a skipped stage used to shorten the path, so
    // every later stage read the state meant for the one before it and
    // handed the wrong finger to the wrong note.
    const impossible = [n(60, 0), n(81, 0)];
    const after = [62, 64, 65].map((midi, i) => n(midi, 400 + i * 300));
    const result = solve([...impossible, ...after]);
    for (const note of after) {
      assert.ok(result.byNoteId.has(note.id), `${note.midi} should still be fingered`);
    }
    // And the notes after the hole are a sensible rising run, not three
    // copies of one finger.
    const fingers = after.map((note) => result.byNoteId.get(note.id).finger);
    assert.equal(new Set(fingers).size, 3, `${fingers.join(',')}`);
  });

  test('the solver stays linear in the length of the piece', () => {
    // A beam, not an exhaustive search: doubling the notes must roughly
    // double the work, not square it. This would take minutes rather
    // than milliseconds if the lattice were growing.
    const run = (count) => {
      const scale = [60, 62, 64, 65, 67, 69, 71, 72];
      const notes = [];
      for (let i = 0; i < count; i++) notes.push(n(scale[i % 8] + 12 * Math.floor(i / 64), i * 120));
      const started = Date.now();
      const result = solve(notes);
      return { ms: Date.now() - started, fingered: result.assignments.length };
    };
    const short = run(200);
    const long = run(800);
    assert.equal(short.fingered, 200);
    assert.equal(long.fingered, 800);
    // Four times the notes, well under sixteen times the work.
    assert.ok(long.ms < Math.max(60, short.ms * 8), `${short.ms}ms -> ${long.ms}ms`);
  });
});
