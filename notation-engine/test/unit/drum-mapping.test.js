import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

const STANDARD_KIT_NOTES = [35, 36, 37, 38, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 59];

describe('default GM drum mapping table (Phase 41, §13.3)', () => {
  test('every note §13.3 explicitly names has a table entry with a real staff position and notehead shape', () => {
    for (const note of STANDARD_KIT_NOTES) {
      const entry = NE.DEFAULT_DRUM_MAPPING_TABLE[note];
      assert.notEqual(entry, undefined, `no entry for GM note ${note}`);
      assert.equal(typeof entry.staffPosition, 'number');
      assert.equal(typeof entry.noteheadShape, 'string');
      assert.equal(entry.midiNote, note);
    }
  });

  test("every default entry's noteheadShape is a real shape family Phase 15 recognizes", () => {
    for (const note of STANDARD_KIT_NOTES) {
      const entry = NE.DEFAULT_DRUM_MAPPING_TABLE[note];
      assert.doesNotThrow(() => NE.shapeGlyphName(entry.noteheadShape, 'quarter'), entry.noteheadShape);
    }
  });

  test('feet (kick, hi-hat pedal) get stems down; everything else gets stems up, per the hands-up/feet-down convention', () => {
    assert.equal(NE.DEFAULT_DRUM_MAPPING_TABLE[36].stemDirection, 'down'); // Bass Drum
    assert.equal(NE.DEFAULT_DRUM_MAPPING_TABLE[35].stemDirection, 'down'); // Bass Drum (alt)
    assert.equal(NE.DEFAULT_DRUM_MAPPING_TABLE[44].stemDirection, 'down'); // Pedal Hi-Hat
    assert.equal(NE.DEFAULT_DRUM_MAPPING_TABLE[38].stemDirection, 'up'); // Snare
    assert.equal(NE.DEFAULT_DRUM_MAPPING_TABLE[49].stemDirection, 'up'); // Crash
  });

  test('cymbals/hi-hat use the x notehead shape; drums use the plain oval; bell-type sounds use diamond', () => {
    assert.equal(NE.DEFAULT_DRUM_MAPPING_TABLE[42].noteheadShape, 'x'); // Closed Hi-Hat
    assert.equal(NE.DEFAULT_DRUM_MAPPING_TABLE[49].noteheadShape, 'x'); // Crash
    assert.equal(NE.DEFAULT_DRUM_MAPPING_TABLE[38].noteheadShape, 'normal'); // Snare
    assert.equal(NE.DEFAULT_DRUM_MAPPING_TABLE[41].noteheadShape, 'normal'); // Floor Tom
    assert.equal(NE.DEFAULT_DRUM_MAPPING_TABLE[53].noteheadShape, 'diamond'); // Ride Bell
    assert.equal(NE.DEFAULT_DRUM_MAPPING_TABLE[56].noteheadShape, 'diamond'); // Cowbell
  });

  test('open hi-hat carries the open articulation marker', () => {
    assert.equal(NE.DEFAULT_DRUM_MAPPING_TABLE[46].articulation, 'open');
  });
});

describe('lookupDrumMapEntry (Phase 41, §13.3)', () => {
  test('a mapped note returns its real table entry with no diagnostics', () => {
    const { entry, diagnostics } = NE.lookupDrumMapEntry(38, NE.DEFAULT_DRUM_MAPPING_TABLE);
    assert.equal(entry.name, 'Acoustic Snare');
    assert.deepEqual([...diagnostics], []);
  });

  test('an in-range but unmapped note (e.g. 39, not a standard GM percussion sound) falls back to the middle line with a warning, never dropped', () => {
    const { entry, diagnostics } = NE.lookupDrumMapEntry(39, NE.DEFAULT_DRUM_MAPPING_TABLE);
    assert.equal(entry.staffPosition, -2); // the middle line
    assert.equal(entry.noteheadShape, 'normal');
    assert.ok([...diagnostics].some((d) => d.code === 'DRUM_NOTE_UNMAPPED'));
  });

  test('a note outside the 35-81 GM percussion range falls back the same way, with a distinct diagnostic code', () => {
    const { entry, diagnostics } = NE.lookupDrumMapEntry(20, NE.DEFAULT_DRUM_MAPPING_TABLE);
    assert.equal(entry.staffPosition, -2);
    assert.ok([...diagnostics].some((d) => d.code === 'DRUM_NOTE_OUT_OF_RANGE'));

    const { diagnostics: highDiagnostics } = NE.lookupDrumMapEntry(90, NE.DEFAULT_DRUM_MAPPING_TABLE);
    assert.ok([...highDiagnostics].some((d) => d.code === 'DRUM_NOTE_OUT_OF_RANGE'));
  });
});

describe('config.drums.mapping overrides (Phase 41, §13.3)', () => {
  test("a partial override replaces only the named field, keeping the default's other fields for that entry", () => {
    const merged = NE.mergeDrumMappingTable({ 41: { staffPosition: 1.5 } });
    const entry = merged[41];
    assert.equal(entry.staffPosition, 1.5); // overridden
    assert.equal(entry.noteheadShape, 'normal'); // kept from the default (Low Floor Tom)
    assert.equal(entry.name, 'Low Floor Tom'); // kept from the default
  });

  test('an override can add a wholly new GM note not present in the default table', () => {
    const merged = NE.mergeDrumMappingTable({
      75: { name: 'Claves', staffPosition: -3.5, noteheadShape: 'x' },
    });
    assert.equal(merged[75].name, 'Claves');
    assert.equal(merged[75].midiNote, 75);
  });

  test('with no overrides at all, mergeDrumMappingTable returns the plain default table', () => {
    const merged = NE.mergeDrumMappingTable(undefined);
    assert.equal(merged[38].name, 'Acoustic Snare');
  });

  test("overriding one note does not affect any other note's entry", () => {
    const merged = NE.mergeDrumMappingTable({ 38: { staffPosition: 99 } });
    assert.equal(merged[38].staffPosition, 99);
    assert.equal(merged[36].staffPosition, NE.DEFAULT_DRUM_MAPPING_TABLE[36].staffPosition);
  });
});
