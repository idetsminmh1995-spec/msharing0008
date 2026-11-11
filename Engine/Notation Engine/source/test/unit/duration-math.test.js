import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();
const EPSILON = 1e-6;
const close = (a, b) => Math.abs(a - b) < EPSILON;

describe('duration/tick math (Phase 4)', () => {
  test('base ticks for common duration types', () => {
    assert.equal(NE.baseTicksForType('quarter'), 480);
    assert.equal(NE.baseTicksForType('eighth'), 240);
    assert.equal(NE.baseTicksForType('whole'), 1920);
    assert.equal(NE.baseTicksForType('16th'), 120);
  });

  test('dotted-note expansion', () => {
    assert.ok(close(NE.ticksWithDots(480, 0), 480));
    assert.ok(close(NE.ticksWithDots(480, 1), 720));
    assert.ok(close(NE.ticksWithDots(480, 2), 840));
    assert.ok(close(NE.ticksWithDots(480, 3), 900));
  });

  test('tuplet ratio application', () => {
    assert.ok(close(NE.applyTuplet(240, { actualNotes: 3, normalNotes: 2 }), 160));
    assert.ok(close(NE.applyTuplet(240, undefined), 240));
  });

  test('ticksForDisplayedDuration combines type+dots+tuplet', () => {
    assert.ok(close(NE.ticksForDisplayedDuration(NE.duration('quarter', 1, 0)), 720));
    assert.ok(
      close(
        NE.ticksForDisplayedDuration(NE.duration('eighth', 0, 0, { actualNotes: 3, normalNotes: 2 })),
        160,
      ),
    );
  });

  test('durationTypeAndDotsFromTicks finds the longest-type/fewest-dots exact match', () => {
    // Compared field-by-field, not with assert.deepEqual on the whole
    // object: the result crosses the vm sandbox's realm boundary (see
    // load-engine.js), so it has a different Object prototype than a
    // literal written in this file, which deepEqual/deepStrictEqual
    // treats as "not reference-equal" even with identical own properties.
    const r1 = NE.durationTypeAndDotsFromTicks(480);
    assert.equal(r1.type, 'quarter');
    assert.equal(r1.dots, 0);

    const r2 = NE.durationTypeAndDotsFromTicks(720);
    assert.equal(r2.type, 'quarter');
    assert.equal(r2.dots, 1);

    const r3 = NE.durationTypeAndDotsFromTicks(240);
    assert.equal(r3.type, 'eighth');
    assert.equal(r3.dots, 0);
  });

  test('durationTypeAndDotsFromTicks returns null rather than guessing', () => {
    assert.equal(NE.durationTypeAndDotsFromTicks(1234567), null);
  });

  test('xmlDivisionsToTicks normalizes different source divisions to the same internal ticks', () => {
    assert.ok(close(NE.xmlDivisionsToTicks(2, 4), 240)); // eighth note, divisions=4
    assert.ok(close(NE.xmlDivisionsToTicks(4, 4), 480)); // quarter note, divisions=4
    assert.ok(close(NE.xmlDivisionsToTicks(24, 24), 480)); // quarter note, divisions=24
  });

  test('ticksToXmlDivisions is the inverse of xmlDivisionsToTicks', () => {
    assert.ok(close(NE.ticksToXmlDivisions(240, 4), 2));
  });

  test('sumTicks totals a chain of tied notes', () => {
    const tied = [NE.duration('eighth', 0, 240), NE.duration('eighth', 0, 240)];
    assert.ok(close(NE.sumTicks(tied), 480));
  });
});
