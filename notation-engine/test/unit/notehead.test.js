import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('notehead selection (Phase 15)', () => {
  test('duration-default selection: whole/half stay open, everything shorter is filled', () => {
    const pitch = NE.pitchedPitch('C', 0, 4);
    assert.equal(NE.selectNoteheadGlyphName({ pitch, durationType: 'whole' }), 'noteheadWhole');
    assert.equal(NE.selectNoteheadGlyphName({ pitch, durationType: 'half' }), 'noteheadHalf');
    assert.equal(NE.selectNoteheadGlyphName({ pitch, durationType: 'quarter' }), 'noteheadBlack');
    assert.equal(NE.selectNoteheadGlyphName({ pitch, durationType: 'eighth' }), 'noteheadBlack');
  });

  test('an explicit XML <notehead>x</notehead> overrides the duration default', () => {
    const pitch = NE.pitchedPitch('C', 0, 4);
    const g = NE.selectNoteheadGlyphName({ pitch, durationType: 'quarter', explicitNotehead: 'x' });
    assert.equal(g, 'noteheadXBlack');
    // and it respects duration fill too, not just the shape:
    const gWhole = NE.selectNoteheadGlyphName({ pitch, durationType: 'whole', explicitNotehead: 'x' });
    assert.equal(gWhole, 'noteheadXWhole');
  });

  test("explicit XML <notehead>normal</notehead> is NOT an override -- falls through to duration default", () => {
    const pitch = NE.pitchedPitch('C', 0, 4);
    const g = NE.selectNoteheadGlyphName({ pitch, durationType: 'quarter', explicitNotehead: 'normal' });
    assert.equal(g, 'noteheadBlack');
  });

  test('a config override beats the plain duration default, but an explicit XML notehead still wins over both', () => {
    const pitch = NE.unpitchedPitch('F', 4); // e.g. a kick drum
    const overridesByKey = { F4: 'x' };
    // No explicit XML notehead -- config override applies.
    const g1 = NE.selectNoteheadGlyphName({ pitch, durationType: 'quarter', overridesByKey });
    assert.equal(g1, 'noteheadXBlack');
    // Explicit XML notehead present -- it wins over the config override.
    const g2 = NE.selectNoteheadGlyphName({
      pitch,
      durationType: 'quarter',
      explicitNotehead: 'diamond',
      overridesByKey,
    });
    assert.equal(g2, 'noteheadDiamondBlack');
  });

  test('an unknown mapping key falls back cleanly to the duration default', () => {
    const pitch = NE.unpitchedPitch('F', 4);
    const overridesByKey = { G5: 'x' }; // doesn't match F4
    const g = NE.selectNoteheadGlyphName({ pitch, durationType: 'quarter', overridesByKey });
    assert.equal(g, 'noteheadBlack');
  });

  test('noteheadMappingKey: unpitched with a known GM MIDI note uses that number', () => {
    const snare = NE.unpitchedPitch('C', 5);
    assert.equal(NE.noteheadMappingKey(snare, 38), '38');
  });

  test('noteheadMappingKey: unpitched without a MIDI note uses displayStep+displayOctave', () => {
    const pitch = NE.unpitchedPitch('F', 4);
    assert.equal(NE.noteheadMappingKey(pitch), 'F4');
  });

  test('noteheadMappingKey: pitched notes use step+octave', () => {
    const pitch = NE.pitchedPitch('C', 1, 4); // C#4
    assert.equal(NE.noteheadMappingKey(pitch), 'C4'); // alter doesn't affect the key
  });

  test('an unrecognized MusicXML notehead value throws rather than silently ignoring it', () => {
    assert.throws(() => NE.musicXmlNoteheadToShape('cluster'), /not supported yet/);
  });

  test('an unrecognized shape name passed directly throws', () => {
    assert.throws(() => NE.shapeGlyphName('not-a-real-shape', 'quarter'), /Unknown notehead shape/);
  });

  test('circle-x uses the correctly-named whole/half/black glyphs (not the obvious "...Black" pattern)', () => {
    assert.equal(NE.shapeGlyphName('circle-x', 'quarter'), 'noteheadCircleX');
    assert.equal(NE.shapeGlyphName('circle-x', 'whole'), 'noteheadCircleXWhole');
    assert.equal(NE.shapeGlyphName('circle-x', 'half'), 'noteheadCircleXHalf');
  });
});
