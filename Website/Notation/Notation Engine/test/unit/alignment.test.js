import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

function coreNote(measureNumber, voiceId, eventIndex, tick, noteNumber) {
  return { ref: { measureNumber, voiceId, eventIndex }, tick, noteNumber };
}

function midiNote(tick, noteNumber, durationTicks = 480, channel = 0, velocity = 90) {
  return { tick, durationTicks, channel, noteNumber, velocity };
}

describe('chromaticNoteNumber (Phase 42, §13.2)', () => {
  test('middle C (C4) is the standard MIDI value 60', () => {
    assert.equal(NE.chromaticNoteNumber('C', 0, 4), 60);
  });

  test('C#4 and Db4 (enharmonic) both resolve to the same chromatic value', () => {
    assert.equal(NE.chromaticNoteNumber('C', 1, 4), NE.chromaticNoteNumber('D', -1, 4));
  });

  test('one octave up is exactly +12', () => {
    assert.equal(NE.chromaticNoteNumber('C', 0, 5) - NE.chromaticNoteNumber('C', 0, 4), 12);
  });
});

describe('alignNotes: exact tick + pitch match (Phase 42, §13.2 tier 1)', () => {
  test('a core note and a MIDI note sharing the exact same tick and note number match, tier "exact"', () => {
    const core = [coreNote(1, 1, 0, 0, 60)];
    const midi = [midiNote(0, 60)];
    const { alignment, diagnostics } = NE.alignNotes(core, midi);
    const entry = alignment.get(NE.coreNoteRefKey(core[0].ref));
    assert.notEqual(entry, undefined);
    assert.equal(entry.tier, 'exact');
    assert.equal(entry.midiNote.tick, 0);
    assert.deepEqual([...diagnostics], []);
  });

  test('a MIDI note at the same tick but a DIFFERENT pitch does not exact-match', () => {
    const core = [coreNote(1, 1, 0, 0, 60)];
    const midi = [midiNote(0, 62)];
    const { alignment } = NE.alignNotes(core, midi);
    // Falls through to tolerance (also fails, different pitch), then
    // ordinal (counts equal: 1 core, 1 midi) -- so it DOES still align,
    // just via the ordinal tier, not exact. Confirmed separately below.
    const entry = alignment.get(NE.coreNoteRefKey(core[0].ref));
    assert.notEqual(entry.tier, 'exact');
  });
});

describe('alignNotes: tolerance match (Phase 42, §13.2 tier 2)', () => {
  test('a MIDI note a few ticks off (within ±1/32 note) but same pitch matches via tolerance', () => {
    const core = [coreNote(1, 1, 0, 480, 64)];
    const midi = [midiNote(485, 64)]; // 5 ticks off, well within the 60-tick (1/32 note) tolerance
    const { alignment, diagnostics } = NE.alignNotes(core, midi);
    const entry = alignment.get(NE.coreNoteRefKey(core[0].ref));
    assert.equal(entry.tier, 'tolerance');
    assert.deepEqual([...diagnostics], []);
  });

  test('a MIDI note just OUTSIDE the tolerance window does not tolerance-match (falls to ordinal, since counts are equal)', () => {
    const core = [coreNote(1, 1, 0, 480, 64)];
    const midi = [midiNote(480 + 61, 64)]; // 61 ticks off, 1 tick beyond the 60-tick tolerance
    const { alignment } = NE.alignNotes(core, midi);
    const entry = alignment.get(NE.coreNoteRefKey(core[0].ref));
    assert.equal(entry.tier, 'ordinal');
  });

  test('among several same-pitch candidates within tolerance, the CLOSEST one is chosen', () => {
    const core = [coreNote(1, 1, 0, 480, 64)];
    const midi = [midiNote(500, 64), midiNote(490, 64), midiNote(510, 64)];
    const { alignment } = NE.alignNotes(core, midi);
    const entry = alignment.get(NE.coreNoteRefKey(core[0].ref));
    assert.equal(entry.midiNote.tick, 490); // closest to 480
  });
});

describe('alignNotes: ordinal fallback (Phase 42, §13.2 tier 3)', () => {
  test('a constant pickup-measure-style tick offset with equal counts aligns by index, not tick or pitch', () => {
    // Every core note is offset by a constant 240 ticks from its "real"
    // MIDI counterpart -- too far for tolerance, but the counts match
    // and the pitches differ too, so only ordinal position can align them.
    const core = [coreNote(1, 1, 0, 0, 60), coreNote(1, 1, 1, 480, 62), coreNote(1, 1, 2, 960, 64)];
    const midi = [midiNote(240, 61), midiNote(720, 63), midiNote(1200, 65)];
    const { alignment, diagnostics } = NE.alignNotes(core, midi);
    assert.equal(alignment.get(NE.coreNoteRefKey(core[0].ref)).midiNote.tick, 240);
    assert.equal(alignment.get(NE.coreNoteRefKey(core[1].ref)).midiNote.tick, 720);
    assert.equal(alignment.get(NE.coreNoteRefKey(core[2].ref)).midiNote.tick, 1200);
    for (const [, entry] of alignment) assert.equal(entry.tier, 'ordinal');
    assert.deepEqual([...diagnostics], []);
  });
});

describe('alignNotes: unmatched (Phase 42, §13.2 tier 4)', () => {
  test('mismatched counts with no tick/pitch match produce diagnostics for BOTH sides, dropping neither', () => {
    const core = [coreNote(1, 1, 0, 0, 60), coreNote(1, 1, 1, 480, 62)];
    const midi = [midiNote(5000, 90)]; // one extra, unrelated MIDI note; counts don't match (2 vs 1)
    const { alignment, diagnostics } = NE.alignNotes(core, midi);
    assert.equal(alignment.size, 0);
    const codes = [...diagnostics].map((d) => d.code);
    assert.ok(codes.includes('UNMATCHED_CORE_NOTE'));
    assert.ok(codes.includes('UNMATCHED_MIDI_NOTE'));
    // Both unmatched core notes get their own diagnostic -- nothing silently dropped.
    assert.equal(
      codes.filter((c) => c === 'UNMATCHED_CORE_NOTE').length,
      2,
    );
  });

  test('a core note with no resolvable note number (neither pitched nor a known GM number) can still align via ordinal, or reports unmatched otherwise', () => {
    const core = [coreNote(1, 1, 0, 0, undefined)];
    const midi = [midiNote(9999, 12)];
    const { alignment, diagnostics } = NE.alignNotes(core, midi);
    // Counts are equal (1 and 1), so ordinal fallback applies even though noteNumber is unknown.
    assert.equal(alignment.get(NE.coreNoteRefKey(core[0].ref)).tier, 'ordinal');
    assert.deepEqual([...diagnostics], []);
  });
});

describe('flattenPartNotes: absolute tick computation (Phase 42)', () => {
  test("notes in a second measure get absolute ticks offset by the first measure's real length", () => {
    const part = {
      id: 'P1',
      measures: [
        {
          number: 1,
          voices: [
            {
              id: 1,
              events: [
                {
                  kind: 'note',
                  pitch: { kind: 'pitched', step: 'C', alter: 0, octave: 4 },
                  duration: { type: 'whole', dots: 0, ticks: 1920 },
                  voice: 1,
                },
              ],
            },
          ],
        },
        {
          number: 2,
          voices: [
            {
              id: 1,
              events: [
                {
                  kind: 'note',
                  pitch: { kind: 'pitched', step: 'D', alter: 0, octave: 4 },
                  duration: { type: 'whole', dots: 0, ticks: 1920 },
                  voice: 1,
                },
              ],
            },
          ],
        },
      ],
    };
    const measureAttributes = [
      {
        partId: 'P1',
        measureNumber: 1,
        divisions: 1,
        fifths: 0,
        timeNumerator: 4,
        timeDenominator: 4,
        clefSign: 'G',
      },
      {
        partId: 'P1',
        measureNumber: 2,
        divisions: 1,
        fifths: 0,
        timeNumerator: 4,
        timeDenominator: 4,
        clefSign: 'G',
      },
    ];
    const flat = NE.flattenPartNotes(part, measureAttributes, undefined);
    assert.equal(flat[0].tick, 0);
    assert.equal(flat[1].tick, 1920); // measure 1's own real length (4/4 = 1920 ticks)
  });
});
