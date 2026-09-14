import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();
const TICKS_PER_QUARTER = 480;

const CONFIG = {
  spacingIncrement: 1.2,
  shortestDurationSpace: 2.0,
  minNoteDistance: 0.5,
  justify: true,
};

function ev(ticks, renderedWidth = 0) {
  return { ticks, renderedWidth };
}

describe('computeReferenceDuration (Phase 43, §14.1)', () => {
  test('a measure of all-equal durations picks that duration', () => {
    const events = [ev(240), ev(240), ev(240), ev(240)];
    assert.equal(NE.computeReferenceDuration(events, TICKS_PER_QUARTER), 240);
  });

  test('a single stray 32nd note among many 8th notes does NOT become the reference -- frequency wins over rarity', () => {
    const eighth = 240;
    const thirtySecond = 60;
    const events = [ev(eighth), ev(eighth), ev(eighth), ev(eighth), ev(eighth), ev(eighth), ev(thirtySecond)];
    assert.equal(NE.computeReferenceDuration(events, TICKS_PER_QUARTER), eighth);
  });

  test('a genuine frequency tie is broken toward the SHORTER duration', () => {
    const eighth = 240;
    const quarter = 480;
    const events = [ev(eighth), ev(eighth), ev(eighth), ev(quarter), ev(quarter), ev(quarter)];
    assert.equal(NE.computeReferenceDuration(events, TICKS_PER_QUARTER), eighth);
  });

  test('an empty measure falls back to one quarter note, never zero', () => {
    assert.equal(NE.computeReferenceDuration([], TICKS_PER_QUARTER), TICKS_PER_QUARTER);
  });
});

describe('computeEventSpace (Phase 43, §14.1 ratio assertions)', () => {
  test("a quarter gets exactly spacingIncrement more space than an 8th at the same (8th) reference -- §14's own worked example", () => {
    const eighthTicks = 240;
    const quarterTicks = 480;
    const eighthSpace = NE.computeEventSpace(eighthTicks, eighthTicks, CONFIG);
    const quarterSpace = NE.computeEventSpace(quarterTicks, eighthTicks, CONFIG);
    assert.ok(Math.abs(eighthSpace - 2.4) < 1e-9, `expected 2.4, got ${eighthSpace}`);
    assert.ok(Math.abs(quarterSpace - 3.6) < 1e-9, `expected 3.6, got ${quarterSpace}`);
    assert.ok(Math.abs(quarterSpace - eighthSpace - CONFIG.spacingIncrement) < 1e-9);
  });

  test('a half note (4x the 8th reference) gets exactly two increments more -- 4.8sp', () => {
    const eighthTicks = 240;
    const halfTicks = 960;
    const halfSpace = NE.computeEventSpace(halfTicks, eighthTicks, CONFIG);
    assert.ok(Math.abs(halfSpace - 4.8) < 1e-9, `expected 4.8, got ${halfSpace}`);
  });

  test('a duration exactly at the reference gets exactly shortestDurationSpace x spacingIncrement', () => {
    const space = NE.computeEventSpace(240, 240, CONFIG);
    assert.ok(Math.abs(space - 2.4) < 1e-9);
  });

  test('a duration SHORTER than the reference scales linearly by its ratio', () => {
    const referenceTicks = 480; // quarter
    const sixteenthTicks = 120; // 1/4 of the reference
    const space = NE.computeEventSpace(sixteenthTicks, referenceTicks, CONFIG);
    const baseSpace = CONFIG.shortestDurationSpace * CONFIG.spacingIncrement;
    assert.ok(Math.abs(space - baseSpace * 0.25) < 1e-9);
  });
});

describe('computeProportionalPositions (Phase 43, §14.1)', () => {
  test('positions accumulate left to right, starting at 0', () => {
    const events = [ev(240), ev(240), ev(240)];
    const positions = [...NE.computeProportionalPositions(events, 240, CONFIG)];
    assert.equal(positions[0], 0);
    assert.ok(Math.abs(positions[1] - 2.4) < 1e-9);
    assert.ok(Math.abs(positions[2] - 4.8) < 1e-9);
  });
});

describe('applyMinimumDistance (Phase 43, §14.2)', () => {
  test('a wide chord (large renderedWidth) pushes the FOLLOWING note forward past proportional spacing', () => {
    // A very wide first event (e.g. a chord with several accidentals)
    // whose own width exceeds the proportional gap to the next note.
    const events = [ev(240, 5.0), ev(240, 0)];
    const proportional = [...NE.computeProportionalPositions(events, 240, CONFIG)];
    const enforced = [...NE.applyMinimumDistance(proportional, events, CONFIG)];
    // Proportional gap here is only 2.4sp, but the first event is 5.0sp
    // wide -- the minimum-distance pass must win.
    assert.ok(enforced[1] > proportional[1]);
    assert.ok(Math.abs(enforced[1] - (5.0 + CONFIG.minNoteDistance)) < 1e-9);
  });

  test('a narrow event does not trigger any push at all -- proportional spacing already clears the minimum', () => {
    const events = [ev(240, 0.1), ev(240, 0)];
    const proportional = [...NE.computeProportionalPositions(events, 240, CONFIG)];
    const enforced = [...NE.applyMinimumDistance(proportional, events, CONFIG)];
    assert.deepEqual(enforced, proportional);
  });

  test('a push CASCADES -- fixing one gap does not leave the next one too small', () => {
    const events = [ev(240, 8.0), ev(240, 8.0), ev(240, 0)];
    const proportional = [...NE.computeProportionalPositions(events, 240, CONFIG)];
    const enforced = [...NE.applyMinimumDistance(proportional, events, CONFIG)];
    // Every adjacent gap must now respect the minimum, not just the first.
    for (let i = 1; i < enforced.length; i++) {
      const gap = enforced[i] - enforced[i - 1];
      const requiredGap = events[i - 1].renderedWidth + CONFIG.minNoteDistance;
      assert.ok(gap >= requiredGap - 1e-9, `gap ${i} was ${gap}, needed >= ${requiredGap}`);
    }
  });
});

describe('justifySystem (Phase 43, §14.3)', () => {
  test('stretched positions sum EXACTLY to the target width', () => {
    const positions = [0, 2.4, 4.8, 7.2];
    const stretched = [...NE.justifySystem(positions, 20, CONFIG)];
    assert.ok(Math.abs(stretched[stretched.length - 1] - 20) < 1e-9);
  });

  test('a wider gap absorbs proportionally more of the added stretch than a narrow one', () => {
    const positions = [0, 1, 2, 6]; // gaps: 1, 1, 4
    const stretched = [...NE.justifySystem(positions, 24, CONFIG)];
    const originalGaps = [1, 1, 4];
    const stretchedGaps = [stretched[1] - stretched[0], stretched[2] - stretched[1], stretched[3] - stretched[2]];
    // The 4-wide gap must have grown by 4x as much as either 1-wide gap.
    const growth0 = stretchedGaps[0] - originalGaps[0];
    const growth2 = stretchedGaps[2] - originalGaps[2];
    assert.ok(Math.abs(growth2 - growth0 * 4) < 1e-6);
  });

  test('justify: false disables stretching entirely, per §14.3', () => {
    const positions = [0, 2.4, 4.8];
    const config = { ...CONFIG, justify: false };
    const result = [...NE.justifySystem(positions, 100, config)];
    assert.deepEqual(result, positions);
  });

  test('a target width narrower than the natural width does not compress anything (no negative stretch)', () => {
    const positions = [0, 2.4, 4.8, 7.2];
    const result = [...NE.justifySystem(positions, 3, CONFIG)];
    assert.deepEqual(result, positions);
  });
});

describe('checkMeasureOverflow (Phase 43, §14 error condition)', () => {
  test('a measure that fits produces no diagnostic', () => {
    const events = [ev(240, 1), ev(240, 1)];
    const positions = [0, 2.4];
    assert.equal(NE.checkMeasureOverflow(positions, events, 20), undefined);
  });

  test('a measure wider than the available width even at minimum spacing produces a warning, not a throw', () => {
    const events = [ev(240, 10), ev(240, 10)];
    const positions = [0, 15];
    const diagnostic = NE.checkMeasureOverflow(positions, events, 10);
    assert.notEqual(diagnostic, undefined);
    assert.equal(diagnostic.severity, 'warning');
    assert.equal(diagnostic.code, 'MEASURE_OVERFLOWS_SYSTEM_WIDTH');
  });
});
