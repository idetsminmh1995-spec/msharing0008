import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('beam grouping (Phase 23)', () => {
  test('beamBeatTicks: simple meters use one denominator-note as the beat', () => {
    assert.equal(NE.beamBeatTicks(4, 4), 480); // quarter
    assert.equal(NE.beamBeatTicks(3, 4), 480);
    assert.equal(NE.beamBeatTicks(2, 2), 960); // half
    assert.equal(NE.beamBeatTicks(7, 8), 240); // eighth (irregular meter falls back to simple math)
  });

  test('beamBeatTicks: compound meters (6/8, 9/8, 12/8) use a dotted-quarter beat (3 eighths)', () => {
    assert.equal(NE.beamBeatTicks(6, 8), 720); // 3 x 240
    assert.equal(NE.beamBeatTicks(9, 8), 720);
    assert.equal(NE.beamBeatTicks(12, 8), 720);
  });

  test('3/8 is NOT treated as compound (numerator must be > 3)', () => {
    assert.equal(NE.beamBeatTicks(3, 8), 240); // plain eighth beat, not a dotted-quarter
  });

  test('8 plain eighth notes in 4/4 with no override group strictly by beat: four groups of 2', () => {
    const events = Array.from({ length: 8 }, () => ({ durationType: 'eighth', isRest: false }));
    const starts = events.map((_, i) => i * 240);
    const groups = NE.groupBeams(events, starts, 4, 4);
    assert.equal(groups.length, 4);
    for (const g of groups) assert.equal(g.eventIndices.length, 2);
  });

  test('the same 8 eighth notes WITH a 2-quarter-note override group into two groups of 4', () => {
    const events = Array.from({ length: 8 }, () => ({ durationType: 'eighth', isRest: false }));
    const starts = events.map((_, i) => i * 240);
    const groups = NE.groupBeams(events, starts, 4, 4, 960); // 960 ticks = 4 eighth notes' worth
    assert.equal(groups.length, 2);
    assert.deepEqual([...groups[0].eventIndices], [0, 1, 2, 3]);
    assert.deepEqual([...groups[1].eventIndices], [4, 5, 6, 7]);
  });

  test('6/8 with 6 eighth notes groups into two groups of 3 (compound meter)', () => {
    const events = Array.from({ length: 6 }, () => ({ durationType: 'eighth', isRest: false }));
    const starts = events.map((_, i) => i * 240);
    const groups = NE.groupBeams(events, starts, 6, 8);
    assert.equal(groups.length, 2);
    assert.deepEqual([...groups[0].eventIndices], [0, 1, 2]);
    assert.deepEqual([...groups[1].eventIndices], [3, 4, 5]);
  });

  test('a rest in the middle of a beat breaks the group in two, never merging across it', () => {
    // Beat 1 (0-480 ticks): eighth, eighth-REST, eighth, eighth.
    const events = [
      { durationType: 'eighth', isRest: false },
      { durationType: 'eighth', isRest: true },
      { durationType: 'eighth', isRest: false },
      { durationType: 'eighth', isRest: false },
    ];
    const starts = [0, 240, 480, 720]; // note: 480+ is actually beat 2, illustrating the rest still splits beat 1's own run
    // Use a same-beat layout instead: all 4 within one 960-tick unit via override.
    const groups = NE.groupBeams(events, [0, 240, 480, 720], 4, 4, 960);
    // The rest at index 1 must break the run -- index 0 is alone (no group), indices 2-3 form one group.
    assert.equal(groups.length, 1);
    assert.deepEqual([...groups[0].eventIndices], [2, 3]);
  });

  test('a single beamable note surrounded by rests produces no group at all', () => {
    const events = [
      { durationType: 'eighth', isRest: true },
      { durationType: 'eighth', isRest: false },
      { durationType: 'eighth', isRest: true },
    ];
    const groups = NE.groupBeams(events, [0, 240, 480], 4, 4);
    assert.equal(groups.length, 0);
  });

  test('quarter notes and longer are never grouped, even with an override', () => {
    const events = Array.from({ length: 4 }, () => ({ durationType: 'quarter', isRest: false }));
    const starts = events.map((_, i) => i * 480);
    const groups = NE.groupBeams(events, starts, 4, 4, 1920);
    assert.equal(groups.length, 0);
  });

  test('beamedEventIndices collects every index across all groups', () => {
    const events = Array.from({ length: 8 }, () => ({ durationType: 'eighth', isRest: false }));
    const starts = events.map((_, i) => i * 240);
    const groups = NE.groupBeams(events, starts, 4, 4, 480);
    const indices = NE.beamedEventIndices(groups);
    assert.deepEqual([...indices].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7]);
  });
});
