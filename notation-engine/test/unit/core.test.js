import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('core data model (Phase 3)', () => {
  test('a pitched piano note and an unpitched drum note use the same note() factory', () => {
    const pianoNote = NE.note({
      pitch: NE.pitchedPitch('C', 0, 4),
      duration: NE.duration('quarter', 0, 480),
      voice: 1,
    });
    assert.equal(pianoNote.kind, 'note');
    assert.equal(NE.isPitched(pianoNote.pitch), true);
    assert.equal(NE.isUnpitched(pianoNote.pitch), false);

    const drumNote = NE.note({
      pitch: NE.unpitchedPitch('F', 4),
      duration: NE.duration('eighth', 0, 240),
      voice: 2,
    });
    assert.equal(drumNote.kind, 'note');
    assert.equal(NE.isUnpitched(drumNote.pitch), true);
    assert.equal(NE.isPitched(drumNote.pitch), false);
  });

  test('chord() derives its shared fields from the first note', () => {
    const c = NE.chord([
      NE.note({ pitch: NE.pitchedPitch('C', 0, 4), duration: NE.duration('quarter', 0, 480), voice: 1 }),
      NE.note({ pitch: NE.pitchedPitch('E', 0, 4), duration: NE.duration('quarter', 0, 480), voice: 1 }),
    ]);
    assert.equal(c.voice, 1);
    assert.equal(c.duration.ticks, 480);
    assert.equal(c.notes.length, 2);
  });

  test('chord() rejects fewer than 2 notes', () => {
    assert.throws(() => {
      NE.chord([NE.note({ pitch: NE.pitchedPitch('C', 0, 4), duration: NE.duration('quarter', 0, 480), voice: 1 })]);
    }, /at least 2 notes/);
  });

  test('chord() rejects mismatched voices', () => {
    assert.throws(() => {
      NE.chord([
        NE.note({ pitch: NE.pitchedPitch('C', 0, 4), duration: NE.duration('quarter', 0, 480), voice: 1 }),
        NE.note({ pitch: NE.pitchedPitch('E', 0, 4), duration: NE.duration('quarter', 0, 480), voice: 2 }),
      ]);
    }, /same voice/);
  });

  test('a Part has no instrument-specific flag -- same shape for a drum kit as anything else', () => {
    const drumNote = NE.note({
      pitch: NE.unpitchedPitch('F', 4),
      duration: NE.duration('eighth', 0, 240),
      voice: 2,
    });
    const m = NE.measure(1, [
      NE.voice(2, [drumNote, NE.rest({ duration: NE.duration('eighth', 0, 240), voice: 2 })]),
    ]);
    const p = NE.part('P1', [m], 'Drum Set');
    assert.deepEqual(Object.keys(p).sort(), ['id', 'measures', 'name']);

    const s = NE.score({ parts: [p], title: 'Smoke Test' });
    assert.equal(s.parts.length, 1);
    assert.equal(s.parts[0].measures[0].voices[0].events[0].kind, 'note');
    assert.equal(s.parts[0].measures[0].voices[0].events[1].kind, 'rest');
  });
});
