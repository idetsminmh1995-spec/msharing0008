import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('TempoMap construction (Phase 40, §12.1/§12.2)', () => {
  test('an empty tempo event list produces a single 120 BPM segment and an EMPTY_TEMPO_MAP warning', () => {
    const { tempoMap, diagnostics } = NE.buildTempoMap([]);
    assert.equal(tempoMap.segments.length, 1);
    assert.equal(tempoMap.segments[0].microsecondsPerQuarter, 500000);
    assert.equal(tempoMap.segments[0].startTick, 0);
    assert.equal(tempoMap.segments[0].startSeconds, 0);
    assert.ok([...diagnostics].some((d) => d.code === 'EMPTY_TEMPO_MAP'));
  });

  test('a tempo map starting after tick 0 gets an implicit 120 BPM segment prepended, with no warning (this is normal, not malformed)', () => {
    const { tempoMap, diagnostics } = NE.buildTempoMap([{ tick: 1920, microsecondsPerQuarter: 400000 }]);
    assert.equal(tempoMap.segments.length, 2);
    assert.equal(tempoMap.segments[0].startTick, 0);
    assert.equal(tempoMap.segments[0].microsecondsPerQuarter, 500000);
    assert.equal(tempoMap.segments[1].startTick, 1920);
    assert.deepEqual([...diagnostics], []);
  });

  test('segments are sorted by startTick even if the input events are out of order', () => {
    const { tempoMap } = NE.buildTempoMap([
      { tick: 960, microsecondsPerQuarter: 400000 },
      { tick: 0, microsecondsPerQuarter: 500000 },
      { tick: 1920, microsecondsPerQuarter: 300000 },
    ]);
    const ticks = [...tempoMap.segments].map((s) => s.startTick);
    assert.deepEqual(ticks, [0, 960, 1920]);
  });
});

describe('tickToSeconds / secondsToTick (Phase 40, §12.2)', () => {
  test('constant-tempo round-trip at many ticks (120 BPM: 500000 µs/quarter, 480 ticks/quarter)', () => {
    const { tempoMap } = NE.buildTempoMap([{ tick: 0, microsecondsPerQuarter: 500000 }]);
    for (const tick of [0, 240, 480, 960, 1920, 48000, 480000]) {
      const seconds = NE.tickToSeconds(tempoMap, tick);
      const backToTick = NE.secondsToTick(tempoMap, seconds);
      assert.ok(Math.abs(backToTick - tick) < 1e-6, `tick ${tick} -> ${seconds}s -> ${backToTick}`);
    }
  });

  test('a known constant-tempo value matches a hand-computed result exactly: 120 BPM, 1 quarter note = 0.5s', () => {
    const { tempoMap } = NE.buildTempoMap([{ tick: 0, microsecondsPerQuarter: 500000 }]);
    assert.equal(NE.tickToSeconds(tempoMap, 480), 0.5);
    assert.equal(NE.tickToSeconds(tempoMap, 960), 1.0);
  });

  test('a 3-tempo-change map is verified against hand-computed second values', () => {
    // 120 BPM (500000) for 1 quarter (480 ticks) = 0.5s
    // then 60 BPM (1000000) for 2 quarters (960 ticks) = 2.0s -> cumulative 2.5s
    // then 240 BPM (250000) for 1 quarter (480 ticks) = 0.25s -> cumulative 2.75s
    const { tempoMap } = NE.buildTempoMap([
      { tick: 0, microsecondsPerQuarter: 500000 },
      { tick: 480, microsecondsPerQuarter: 1000000 },
      { tick: 1440, microsecondsPerQuarter: 250000 },
    ]);
    assert.equal(tempoMap.segments[1].startSeconds, 0.5);
    assert.equal(tempoMap.segments[2].startSeconds, 2.5);
    assert.equal(NE.tickToSeconds(tempoMap, 1920), 2.75);
    // And the inverse:
    assert.ok(Math.abs(NE.secondsToTick(tempoMap, 2.75) - 1920) < 1e-6);
  });

  test('LONG-SONG DRIFT TEST: a 10-minute piece at 120 BPM, tick->seconds->tick at 10,000 points, max round-trip error < 1ms', () => {
    const { tempoMap } = NE.buildTempoMap([{ tick: 0, microsecondsPerQuarter: 500000 }]);
    // 10 minutes = 600 seconds; at 120 BPM (0.5s/quarter, 480 ticks/quarter),
    // that's 600/0.5*480 = 576000 ticks total.
    const totalTicks = 576000;
    let maxErrorSeconds = 0;
    for (let i = 0; i <= 10000; i++) {
      const tick = (totalTicks * i) / 10000;
      const seconds = NE.tickToSeconds(tempoMap, tick);
      const backToTick = NE.secondsToTick(tempoMap, seconds);
      const backToSeconds = NE.tickToSeconds(tempoMap, backToTick);
      maxErrorSeconds = Math.max(maxErrorSeconds, Math.abs(backToSeconds - seconds));
    }
    assert.ok(maxErrorSeconds < 0.001, `max round-trip error was ${maxErrorSeconds * 1000}ms, expected < 1ms`);
  });

  test('boundary clamping: a negative tick still resolves via the first segment, not an out-of-range crash', () => {
    const { tempoMap } = NE.buildTempoMap([{ tick: 0, microsecondsPerQuarter: 500000 }]);
    assert.doesNotThrow(() => NE.tickToSeconds(tempoMap, -100));
  });

  test("boundary clamping: a tick far beyond the last segment still resolves using that segment's own rate", () => {
    const { tempoMap } = NE.buildTempoMap([
      { tick: 0, microsecondsPerQuarter: 500000 },
      { tick: 480, microsecondsPerQuarter: 250000 },
    ]);
    // Beyond the last (only 2) segments -- should use segment[1]'s rate (250000 = 240bpm, 0.25s/quarter).
    const seconds = NE.tickToSeconds(tempoMap, 480 + 480 * 100);
    assert.ok(Math.abs(seconds - (0.5 + 100 * 0.25)) < 1e-9);
  });
});

describe('tickToPosition / positionToTick (Phase 40, §12.3)', () => {
  test('a constant 4/4 measure map places ticks into the correct measure and beat', () => {
    const measureMap = NE.buildMeasureMap([{ tick: 0, numerator: 4, denominator: 4 }]);
    const pos1 = NE.tickToPosition(measureMap, 0);
    assert.equal(pos1.measureNumber, 1);
    assert.equal(pos1.beat, 1);

    const pos2 = NE.tickToPosition(measureMap, 480 * 4); // exactly one measure later
    assert.equal(pos2.measureNumber, 2);
    assert.equal(pos2.beat, 1);

    const pos3 = NE.tickToPosition(measureMap, 480 * 1.5); // beat 2.5 of measure 1 ("the and of 2")
    assert.equal(pos3.measureNumber, 1);
    assert.equal(pos3.beat, 2.5);
  });

  test('positionToTick is the exact inverse of tickToPosition', () => {
    const measureMap = NE.buildMeasureMap([{ tick: 0, numerator: 4, denominator: 4 }]);
    for (const tick of [0, 480, 960, 1920, 4800]) {
      const pos = NE.tickToPosition(measureMap, tick);
      const backToTick = NE.positionToTick(measureMap, pos);
      assert.ok(
        Math.abs(backToTick - tick) < 1e-6,
        `tick ${tick} -> measure ${pos.measureNumber} beat ${pos.beat} -> ${backToTick}`,
      );
    }
  });

  test('a time signature change mid-piece correctly shifts the measure numbering afterward', () => {
    // 2 measures of 4/4 (each 1920 ticks), then switches to 3/4.
    const measureMap = NE.buildMeasureMap([
      { tick: 0, numerator: 4, denominator: 4 },
      { tick: 3840, numerator: 3, denominator: 4 },
    ]);
    const posAtChange = NE.tickToPosition(measureMap, 3840);
    assert.equal(posAtChange.measureNumber, 3); // measures 1 and 2 were 4/4, measure 3 starts the 3/4 section
    assert.equal(posAtChange.beat, 1);
  });

  test('6/8 compound time computes beat length from the denominator correctly', () => {
    const measureMap = NE.buildMeasureMap([{ tick: 0, numerator: 6, denominator: 8 }]);
    // One measure of 6/8 = 6 eighth notes = 6 * 240 = 1440 ticks.
    const posAtMeasureEnd = NE.tickToPosition(measureMap, 1440);
    assert.equal(posAtMeasureEnd.measureNumber, 2);
  });
});
