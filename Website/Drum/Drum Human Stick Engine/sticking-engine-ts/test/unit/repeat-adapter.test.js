import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const SE = loadEngine();
const tickToSeconds = (tick) => tick / 960;

describe('repeat-aware written-note adapter', () => {
  const notes = [
    { writtenTick: 0, note: 42, velocity: 80 },
    { writtenTick: 240, note: 38, velocity: 100 },
    { writtenTick: 480, note: 36, velocity: 90 },
  ];
  const entries = [
    {
      measureNumber: 1,
      performanceTick: 0,
      writtenTick: 0,
      ticks: 480,
      startSeconds: 0,
      writtenStartSeconds: 0,
    },
    {
      measureNumber: 2,
      performanceTick: 480,
      writtenTick: 480,
      ticks: 480,
      startSeconds: 0.5,
      writtenStartSeconds: 0.5,
    },
    {
      measureNumber: 1,
      performanceTick: 960,
      writtenTick: 0,
      ticks: 480,
      startSeconds: 1,
      writtenStartSeconds: 0,
    },
    {
      measureNumber: 2,
      performanceTick: 1440,
      writtenTick: 480,
      ticks: 480,
      startSeconds: 1.5,
      writtenStartSeconds: 0.5,
    },
  ];

  test('repeats each written measure in playback order and preserves source velocity', () => {
    const got = SE.expandWrittenNoteList(notes, entries, tickToSeconds);
    assert.deepEqual(JSON.parse(JSON.stringify(got)), [
      { time: 0, note: 42, velocity: 80 },
      { time: 0.25, note: 38, velocity: 100 },
      { time: 0.5, note: 36, velocity: 90 },
      { time: 1, note: 42, velocity: 80 },
      { time: 1.25, note: 38, velocity: 100 },
      { time: 1.5, note: 36, velocity: 90 },
    ]);
  });

  test('a straight-through plan emits each source note once', () => {
    const got = SE.expandWrittenNoteList(notes, entries.slice(0, 2), tickToSeconds);
    assert.deepEqual(
      JSON.parse(JSON.stringify(got)).map(({ time, note }) => [time, note]),
      [
        [0, 42],
        [0.25, 38],
        [0.5, 36],
      ],
    );
  });

  test('preserves a tempo change inside a repeated measure', () => {
    const secondsAtWrittenTick = (tick) =>
      tick <= 240 ? tick / 960 : 0.25 + (tick - 240) / 480;
    const repeatedMeasure = [
      {
        performanceTick: 0,
        writtenTick: 0,
        ticks: 480,
        startSeconds: 0,
        writtenStartSeconds: 0,
      },
      {
        performanceTick: 480,
        writtenTick: 0,
        ticks: 480,
        startSeconds: 0.75,
        writtenStartSeconds: 0,
      },
    ];
    const got = SE.expandWrittenNoteList(
      [{ writtenTick: 360, note: 38, velocity: 96 }],
      repeatedMeasure,
      secondsAtWrittenTick,
    );
    assert.deepEqual(JSON.parse(JSON.stringify(got)), [
      { time: 0.5, note: 38, velocity: 96 },
      { time: 1.25, note: 38, velocity: 96 },
    ]);
  });

  test('empty plans fall back, while an authoritative plan omits unplayed measures', () => {
    const emptyPlan = SE.expandWrittenNoteList(notes, [], tickToSeconds);
    const planWithSkippedMeasure = SE.expandWrittenNoteList(
      [notes[0], { writtenTick: 1440, note: 44, velocity: 72 }],
      entries.slice(0, 1),
      tickToSeconds,
    );
    assert.deepEqual(
      JSON.parse(JSON.stringify(emptyPlan)).map(({ time, note }) => [time, note]),
      [
        [0, 42],
        [0.25, 38],
        [0.5, 36],
      ],
    );
    assert.deepEqual(
      JSON.parse(JSON.stringify(planWithSkippedMeasure)).map(({ time, note }) => [time, note]),
      [[0, 42]],
    );
  });
});
