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

  test("every default entry draws something real -- a shape family, or one exact glyph", () => {
    for (const note of STANDARD_KIT_NOTES) {
      const entry = NE.DEFAULT_DRUM_MAPPING_TABLE[note];
      assert.doesNotThrow(
        () => NE.shapeGlyphName(entry.noteheadShape, 'quarter'),
        entry.noteheadShape,
      );
      // A drum MuseScore names one glyph for (the china cymbal, 52)
      // keeps a plain family for anyone reading only that, and the real
      // glyph beside it.
      if (entry.noteheadGlyph !== undefined) {
        assert.ok(NE.getGlyph(entry.noteheadGlyph), `${entry.noteheadGlyph} is not in the font`);
      }
    }
  });

  test('feet (kick, hi-hat pedal) get stems down; everything else gets stems up, per the hands-up/feet-down convention', () => {
    assert.equal(NE.DEFAULT_DRUM_MAPPING_TABLE[36].stemDirection, 'down'); // Bass Drum
    assert.equal(NE.DEFAULT_DRUM_MAPPING_TABLE[35].stemDirection, 'down'); // Bass Drum (alt)
    assert.equal(NE.DEFAULT_DRUM_MAPPING_TABLE[44].stemDirection, 'down'); // Pedal Hi-Hat
    assert.equal(NE.DEFAULT_DRUM_MAPPING_TABLE[38].stemDirection, 'up'); // Snare
    assert.equal(NE.DEFAULT_DRUM_MAPPING_TABLE[49].stemDirection, 'up'); // Crash
  });

  test('cymbals and hi-hat use the x head; drums use the plain oval -- MuseScore for every one', () => {
    const T = NE.DEFAULT_DRUM_MAPPING_TABLE;
    assert.equal(T[42].noteheadShape, 'x'); // Closed Hi-Hat
    assert.equal(T[49].noteheadShape, 'x'); // Crash
    assert.equal(T[38].noteheadShape, 'normal'); // Snare
    assert.equal(T[41].noteheadShape, 'normal'); // Low Floor Tom
    assert.equal(T[53].noteheadShape, 'diamond'); // Ride Bell
    // Where MuseScore differs from the convention this engine used to
    // follow, MuseScore wins -- these are the heads a MuseScore file
    // actually draws, and a reader comparing the two pages sees them.
    assert.equal(T[56].noteheadShape, 'inverted-triangle'); // Cowbell, not a diamond
    assert.equal(T[37].noteheadShape, 'slashed'); // Side Stick, not an x
    assert.equal(T[39].noteheadShape, 'plus'); // Hand Clap
    assert.equal(T[52].noteheadGlyph, 'noteheadHeavyXHat'); // Chinese Cymbal
  });

  test('an open hi-hat is said by its head, the way MuseScore says it', () => {
    // It used to be an x plus an `articulation: 'open'` marker. MuseScore
    // draws a circled x and no marker, and drawing both would say it
    // twice.
    assert.equal(NE.DEFAULT_DRUM_MAPPING_TABLE[46].noteheadShape, 'circle-x');
    assert.equal(NE.DEFAULT_DRUM_MAPPING_TABLE[46].articulation, undefined);
  });
});

describe('lookupDrumMapEntry (Phase 41, §13.3)', () => {
  test('a mapped note returns its real table entry with no diagnostics', () => {
    const { entry, diagnostics } = NE.lookupDrumMapEntry(38, NE.DEFAULT_DRUM_MAPPING_TABLE);
    assert.equal(entry.name, 'Acoustic Snare');
    assert.deepEqual([...diagnostics], []);
  });

  test('an in-range but unmapped note falls back to the middle line with a warning, never dropped', () => {
    // The DEFAULT table can no longer reach this branch: it is
    // MuseScore's drumset now, and MuseScore defines every pitch from
    // 35 to 81. A caller's own sparse table still can, which is what
    // this is really about -- `config.drums.mapping` is allowed to
    // describe a kit of four drums without every other pitch becoming
    // an error.
    const sparse = { 38: NE.DEFAULT_DRUM_MAPPING_TABLE[38] };
    const { entry, diagnostics } = NE.lookupDrumMapEntry(39, sparse);
    assert.equal(entry.staffPosition, -2); // the middle line
    assert.equal(entry.noteheadShape, 'normal');
    assert.ok([...diagnostics].some((d) => d.code === 'DRUM_NOTE_UNMAPPED'));
  });

  test("MuseScore's drumset leaves no gap in the GM percussion range", () => {
    for (let note = 35; note <= 81; note++) {
      const { diagnostics } = NE.lookupDrumMapEntry(note, NE.DEFAULT_DRUM_MAPPING_TABLE);
      assert.deepEqual([...diagnostics], [], `GM note ${note} is unmapped`);
    }
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
