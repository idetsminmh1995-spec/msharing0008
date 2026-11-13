import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('config schema (Phase 7)', () => {
  test('resolveConfig() with no overrides matches DEFAULT_CONFIG exactly', () => {
    assert.deepEqual(NE.resolveConfig(), NE.DEFAULT_CONFIG);
  });

  test('overriding one field in one section leaves everything else at its default', () => {
    const c = NE.resolveConfig({ colors: { ink: '#ffffff' } });
    assert.equal(c.colors.ink, '#ffffff');
    assert.equal(c.colors.background, NE.DEFAULT_CONFIG.colors.background);
    assert.deepEqual(c.layout, NE.DEFAULT_CONFIG.layout);
    assert.deepEqual(c.cursor, NE.DEFAULT_CONFIG.cursor);
  });

  test('overriding multiple sections at once merges all of them correctly', () => {
    const c = NE.resolveConfig({
      colors: { ink: '#ffffff', background: '#000000' },
      cursor: { mode: 'notationMoves' },
      layout: { pxPerStaffSpace: 25 },
    });
    assert.equal(c.colors.ink, '#ffffff');
    assert.equal(c.colors.background, '#000000');
    assert.equal(c.layout.mode, 'scroll'); // untouched field within an overridden section
    assert.equal(c.layout.pxPerStaffSpace, 25);
    assert.equal(c.cursor.mode, 'notationMoves');
  });

  test('two related optional fields in one section can be set together', () => {
    const c = NE.resolveConfig({ barNumbers: { display: 'everyNBars', everyNBars: 4 } });
    assert.equal(c.barNumbers.display, 'everyNBars');
    assert.equal(c.barNumbers.everyNBars, 4);
  });

  test('DEFAULT_CONFIG is never mutated by resolveConfig calls', () => {
    const before = JSON.stringify(NE.DEFAULT_CONFIG);
    NE.resolveConfig({ colors: { ink: '#123456' } });
    NE.resolveConfig({ layout: { pxPerStaffSpace: 999 } });
    assert.equal(JSON.stringify(NE.DEFAULT_CONFIG), before);
  });
});
