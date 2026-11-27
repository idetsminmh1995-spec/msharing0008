import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { loadWriter, scoreWith, noteAt } from './helpers/writer.js';

const { engine, writer } = loadWriter();
const Q = engine.TICKS_PER_QUARTER;

const cell = (eventIndex) => ({ partId: 'P1', measureNumber: 1, voiceId: 1, eventIndex });

/**
 * Compares shapes across the vm boundary. The engine and the writer run in
 * their own realm, so their objects have different prototypes and
 * `deepStrictEqual` would fail on an otherwise identical value.
 */
const shape = (value) => JSON.parse(JSON.stringify(value));
const eventsOf = (doc, measureNumber = 1) =>
  doc.score.parts[0].measures.find((m) => m.number === measureNumber).voices[0].events;

describe('the writer engine loads without a DOM', () => {
  test('it publishes its commands off the global object', () => {
    for (const name of ['tiePlan', 'slurPlan', 'applyPlan', 'respellPlan', 'intervalPlan', 'durationPlan']) {
      assert.equal(typeof writer[name], 'function', `missing ${name}()`);
    }
    for (const name of ['transposeNote', 'transposeSemitone', 'stackedChord', 'eventNotes']) {
      assert.equal(typeof writer[name], 'function', `missing ${name}()`);
    }
    assert.equal(typeof writer.toMusicXml, 'function');
    assert.equal(typeof writer.insertEvent, 'function');
  });
});

describe('a tie joins a note to the next note of the same pitch', () => {
  const twoNotes = (second = { step: 'C', octave: 4 }) =>
    scoreWith(engine, [noteAt(engine, 'C', 4, 0), noteAt(engine, second.step, second.octave, Q)]);

  test('it marks the note and the one after it', () => {
    const doc = twoNotes();
    const plan = writer.tiePlan(doc, [cell(0)]);
    assert.equal(plan.removing, false);
    assert.equal(plan.edits.length, 1);

    const tied = writer.applyPlan(doc, plan.edits);
    const [first, second] = eventsOf(tied);
    assert.equal(first.tieStart, true);
    assert.equal(second.tieStop, true);
  });

  test('it refuses a different pitch, because a tie has nowhere to land', () => {
    const doc = twoNotes({ step: 'D', octave: 4 });
    const plan = writer.tiePlan(doc, [cell(0)]);
    assert.deepEqual(shape(plan.edits), []);
    assert.equal(plan.removing, false);
  });

  test('a second run removes the tie it made', () => {
    const doc = twoNotes();
    const tied = writer.applyPlan(doc, writer.tiePlan(doc, [cell(0)]).edits);
    const plan = writer.tiePlan(tied, [cell(0)]);
    assert.equal(plan.removing, true);

    const untied = writer.applyPlan(tied, plan.edits);
    const [first, second] = eventsOf(untied);
    assert.equal(first.tieStart, undefined);
    assert.equal(second.tieStop, undefined);
  });

  test('a rest has nothing to tie', () => {
    assert.equal(writer.tiePlan(scoreWith(engine), [cell(0)]), null);
  });
});

describe('a slur joins any two notes', () => {
  test('it numbers the slur and pairs start with stop', () => {
    const doc = scoreWith(engine, [noteAt(engine, 'C', 4, 0), noteAt(engine, 'G', 4, Q)]);
    const plan = writer.slurPlan(doc, [cell(0)]);
    assert.equal(plan.edits.length, 1);

    const slurred = writer.applyPlan(doc, plan.edits);
    const [first, second] = eventsOf(slurred);
    assert.deepEqual(shape(first.slurStarts), [1]);
    assert.deepEqual(shape(second.slurStops), [1]);
  });

  test('a note already slurred is un-slurred by the next run', () => {
    const doc = scoreWith(engine, [noteAt(engine, 'C', 4, 0), noteAt(engine, 'G', 4, Q)]);
    const once = writer.applyPlan(doc, writer.slurPlan(doc, [cell(0)]).edits);
    const twice = writer.applyPlan(once, writer.slurPlan(once, [cell(0)]).edits);
    assert.equal(eventsOf(twice)[0].slurStarts, undefined);
  });

  test('it removes the slur it started', () => {
    const doc = scoreWith(engine, [noteAt(engine, 'C', 4, 0), noteAt(engine, 'G', 4, Q)]);
    const slurred = writer.applyPlan(doc, writer.slurPlan(doc, [cell(0)]).edits);
    const plan = writer.slurPlan(slurred, [cell(0)]);
    assert.equal(plan.removing, true);

    const plain = writer.applyPlan(slurred, plan.edits);
    const [first, second] = eventsOf(plain);
    assert.equal(first.slurStarts, undefined);
    assert.equal(second.slurStops, undefined);
  });
});

describe('respell keeps the sounding pitch', () => {
  test('a sharp becomes its flat spelling', () => {
    const doc = scoreWith(engine, [noteAt(engine, 'C', 4, 0, 'quarter', 1)]);
    const plan = writer.respellPlan(doc, [cell(0)]);
    assert.equal(plan.length, 1);
    assert.deepEqual(shape(plan[0].patch.pitch), { kind: 'pitched', step: 'D', alter: -1, octave: 4 });
    assert.equal(
      engine.midiNoteNumber(plan[0].patch.pitch),
      engine.midiNoteNumber({ kind: 'pitched', step: 'C', alter: 1, octave: 4 }),
    );
  });

  test('a natural note respells to its other letter without changing its sound', () => {
    const doc = scoreWith(engine, [noteAt(engine, 'C', 4, 0)]);
    const plan = writer.respellPlan(doc, [cell(0)]);
    assert.equal(plan.length, 1);
    assert.notEqual(plan[0].patch.pitch.step, 'C');
    assert.equal(
      engine.midiNoteNumber(plan[0].patch.pitch),
      engine.midiNoteNumber({ kind: 'pitched', step: 'C', alter: 0, octave: 4 }),
    );
  });

  test('a rest has no spelling to change', () => {
    assert.deepEqual(shape(writer.respellPlan(scoreWith(engine), [cell(0)])), []);
  });
});

describe('an interval stacks above the chord', () => {
  const treble = engine.TREBLE_CLEF;

  test('Alt+3 above C4 writes E4 in C major', () => {
    const doc = scoreWith(engine, [noteAt(engine, 'C', 4, 0)]);
    const plan = writer.intervalPlan(doc, cell(0), 3, treble, 0);
    assert.equal(plan.reason, undefined);
    assert.deepEqual(shape(plan.pitch), { kind: 'pitched', step: 'E', alter: 0, octave: 4 });
    assert.equal(plan.event.kind, 'chord');
    assert.equal(plan.event.notes.length, 2);
  });

  test('a third in D major takes the key signature sharp', () => {
    const doc = scoreWith(engine, [noteAt(engine, 'C', 4, 0)]);
    const plan = writer.intervalPlan(doc, cell(0), 3, treble, 2);
    assert.deepEqual(shape(plan.pitch), { kind: 'pitched', step: 'E', alter: 0, octave: 4 });
    const sixth = writer.intervalPlan(doc, cell(0), 6, treble, 2);
    assert.deepEqual(shape(sixth.pitch), { kind: 'pitched', step: 'A', alter: 0, octave: 4 });
  });

  test('a unison above the note is already in the chord', () => {
    const doc = scoreWith(engine, [noteAt(engine, 'C', 4, 0)]);
    assert.equal(writer.intervalPlan(doc, cell(0), 1, treble, 0).reason, 'same-note');
  });

  test('a rest has no note to stack on', () => {
    assert.equal(writer.intervalPlan(scoreWith(engine), cell(0), 3, treble, 0).reason, 'no-note');
  });
});

describe('a duration command walks note values', () => {
  const limits = { minTicks: Q / 16, maxTicks: Q * 4 };

  test('doubling a quarter writes a half', () => {
    const doc = scoreWith(engine, [noteAt(engine, 'C', 4, 0)]);
    const plan = writer.durationPlan(doc, [cell(0)], 2, limits);
    assert.equal(plan.length, 1);
    assert.deepEqual(shape(plan[0].duration), { type: 'half', dots: 0, ticks: Q * 2 });
  });

  test('halving a 64th is skipped rather than clamped', () => {
    const doc = scoreWith(engine, [
      engine.note({
        pitch: { kind: 'pitched', step: 'C', alter: 0, octave: 4 },
        duration: engine.duration('64th', 0, Q / 16),
        voice: 1,
        startTick: 0,
      }),
    ]);
    assert.deepEqual(shape(writer.durationPlan(doc, [cell(0)], 0.5, limits)), []);
  });
});

describe('transposing keeps the written accidental', () => {
  test('a diatonic step turns C sharp into D sharp, not D', () => {
    const pitch = { kind: 'pitched', step: 'C', alter: 1, octave: 4 };
    assert.deepEqual(
      shape(writer.transposeNote(pitch, 1, engine.TREBLE_CLEF)),
      { kind: 'pitched', step: 'D', alter: 1, octave: 4 },
    );
  });

  test('a semitone up is spelled with a sharp and down with a flat', () => {
    const c = { kind: 'pitched', step: 'C', alter: 0, octave: 4 };
    assert.deepEqual(shape(writer.transposeSemitone(c, 1)), { kind: 'pitched', step: 'C', alter: 1, octave: 4 });
    assert.deepEqual(shape(writer.transposeSemitone(c, -1)), { kind: 'pitched', step: 'B', alter: 0, octave: 3 });
  });

  test('a drum position has no pitch to move', () => {
    const drum = { kind: 'unpitched', displayStep: 'C', displayOctave: 5 };
    assert.deepEqual(shape(writer.transposeSemitone(drum, 1)), shape(drum));
    assert.deepEqual(shape(writer.transposeNote(drum, 1, engine.TREBLE_CLEF)), shape(drum));
  });
});

describe('a chord refuses a doubled notehead', () => {
  const c = noteAt(engine, 'C', 4, 0);
  const e = noteAt(engine, 'E', 4, 0);

  test('stacking a new pitch makes a chord', () => {
    const stacked = writer.stackedChord(c, e, 0);
    assert.equal(stacked.kind, 'chord');
    assert.equal(stacked.notes.length, 2);
  });

  test('stacking the same pitch is a no-op', () => {
    assert.equal(writer.stackedChord(c, noteAt(engine, 'C', 4, 0), 0), null);
    assert.equal(writer.stackedChord(writer.stackedChord(c, e, 0), noteAt(engine, 'E', 4, 0), 0), null);
  });
});
