import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

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

describe('config runtime validation (Part H)', () => {
  test('a valid config produces no diagnostics', () => {
    const { diagnostics } = NE.resolveConfigWithDiagnostics({ layout: { pxPerStaffSpace: 30 } });
    assert.deepEqual([...diagnostics], []);
  });

  test('an out-of-range number is reported with its path', () => {
    const { diagnostics } = NE.resolveConfigWithDiagnostics({ layout: { pxPerStaffSpace: 0 } });
    const found = [...diagnostics].filter((d) => d.code === 'INVALID_CONFIG_VALUE');
    assert.equal(found.length, 1);
    assert.equal(found[0].path, 'layout.pxPerStaffSpace');
  });

  test('an unknown enum value is reported, and the config still resolves to a usable one', () => {
    const { config, diagnostics } = NE.resolveConfigWithDiagnostics({
      layout: { mode: 'sideways' },
    });
    assert.ok([...diagnostics].some((d) => d.code === 'UNKNOWN_CONFIG_VALUE' && d.path === 'layout.mode'));
    // The bad value is kept (the caller can see it) but the rest is intact.
    assert.equal(config.colors.ink, NE.DEFAULT_CONFIG.colors.ink);
  });

  test('a mistyped field name is reported rather than silently ignored', () => {
    const { diagnostics } = NE.resolveConfigWithDiagnostics({
      layout: { pxPerStaffspace: 30 },
    });
    const found = [...diagnostics].filter((d) => d.code === 'UNKNOWN_CONFIG_FIELD');
    assert.equal(found.length, 1);
    assert.equal(found[0].path, 'layout.pxPerStaffspace');
  });

  test('everyNBars set without display=everyNBars is reported', () => {
    const { diagnostics } = NE.resolveConfigWithDiagnostics({
      barNumbers: { everyNBars: 4 },
    });
    assert.ok(
      [...diagnostics].some(
        (d) => d.code === 'INVALID_CONFIG_VALUE' && d.path === 'barNumbers.everyNBars',
      ),
    );
  });

  test('a bad config surfaces through the render diagnostics channel, not a throw', () => {
    const { diagnostics } = NE.renderFromMusicXml(
      '<score-partwise version="3.1"><part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list><part id="P1"></part></score-partwise>',
      { domParser: testDomParser(), config: { layout: { pxPerStaffSpace: -1 } } },
    );
    assert.ok([...diagnostics].some((d) => d.code === 'INVALID_CONFIG_VALUE'));
  });
});
