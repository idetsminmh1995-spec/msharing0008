import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('accidental state machine (Phase 19)', () => {
  test('C major (fifths=0): a natural C draws nothing, a C# draws a sharp', () => {
    let state = NE.createAccidentalState(0);
    const d1 = NE.evaluateAccidental(state, 'C', 4, 0);
    assert.equal(d1.shouldDraw, false);
    state = d1.newState;
    const d2 = NE.evaluateAccidental(state, 'C', 4, 1); // C#4, same measure
    assert.equal(d2.shouldDraw, true);
  });

  test('D major (fifths=2, F#/C#): a written F# draws nothing (already implied by the key)', () => {
    const state = NE.createAccidentalState(2);
    const d = NE.evaluateAccidental(state, 'F', 4, 1); // F#4 matches the key signature
    assert.equal(d.shouldDraw, false);
  });

  test('D major: a written F natural DOES need an accidental (contradicts the key)', () => {
    const state = NE.createAccidentalState(2);
    const d = NE.evaluateAccidental(state, 'F', 4, 0); // F natural, but key says F#
    assert.equal(d.shouldDraw, true);
  });

  test('an accidental carries for the rest of the measure at the same step+octave', () => {
    let state = NE.createAccidentalState(0);
    const first = NE.evaluateAccidental(state, 'C', 4, 1); // C#4 -- needs a sharp
    assert.equal(first.shouldDraw, true);
    state = first.newState;
    const second = NE.evaluateAccidental(state, 'C', 4, 1); // another C#4, same measure
    assert.equal(second.shouldDraw, false); // already established, no need to redraw
  });

  test('an accidental does NOT carry to a different octave of the same step', () => {
    let state = NE.createAccidentalState(0);
    const c4sharp = NE.evaluateAccidental(state, 'C', 4, 1);
    state = c4sharp.newState;
    const c5sharp = NE.evaluateAccidental(state, 'C', 5, 1); // different octave
    assert.equal(c5sharp.shouldDraw, true); // needs its own accidental
  });

  test('resetMeasure clears in-measure overrides but keeps the key signature', () => {
    let state = NE.createAccidentalState(2); // D major
    const cSharpFirst = NE.evaluateAccidental(state, 'C', 4, 1);
    state = cSharpFirst.newState;
    const cSharpAgain = NE.evaluateAccidental(state, 'C', 4, 1);
    assert.equal(cSharpAgain.shouldDraw, false); // still carrying within the measure

    state = NE.resetMeasure(cSharpAgain.newState);
    const afterReset = NE.evaluateAccidental(state, 'C', 4, 1);
    // C# is implied by D major's own key signature, so even after reset,
    // writing C# again needs no accidental -- confirms the key signature
    // itself survived the reset (this isn't testing measure-carry, it's
    // testing the key signature wasn't wiped too).
    assert.equal(afterReset.shouldDraw, false);

    // But a note that WAS carrying purely from the previous measure (not
    // from the key signature) should need to be redrawn after reset.
    let state2 = NE.createAccidentalState(0); // C major, no key-implied sharps
    const gSharp = NE.evaluateAccidental(state2, 'G', 4, 1);
    state2 = NE.resetMeasure(gSharp.newState);
    const gSharpNextMeasure = NE.evaluateAccidental(state2, 'G', 4, 1);
    assert.equal(gSharpNextMeasure.shouldDraw, true);
  });

  test('an explicit MusicXML accidental forces a draw even when not musically necessary', () => {
    const state = NE.createAccidentalState(0); // C major
    const d = NE.evaluateAccidental(state, 'C', 4, 0, true); // natural C, but hasExplicitAccidental
    assert.equal(d.shouldDraw, true);
  });
});

describe('accidental glyph selection (Phase 19)', () => {
  test('accidentalGlyphName maps every supported alter to its real glyph', () => {
    assert.equal(NE.accidentalGlyphName(-2), 'accidentalDoubleFlat');
    assert.equal(NE.accidentalGlyphName(-1), 'accidentalFlat');
    assert.equal(NE.accidentalGlyphName(0), 'accidentalNatural');
    assert.equal(NE.accidentalGlyphName(1), 'accidentalSharp');
    assert.equal(NE.accidentalGlyphName(2), 'accidentalDoubleSharp');
  });

  test('every accidental glyph name resolves via getGlyph', () => {
    for (const alter of [-2, -1, 0, 1, 2]) {
      assert.notEqual(NE.getGlyph(NE.accidentalGlyphName(alter)), undefined, String(alter));
    }
  });

  test('an out-of-range alter throws', () => {
    assert.throws(() => NE.accidentalGlyphName(3), /No accidental glyph/);
  });
});

describe('accidental stacking (Phase 19)', () => {
  test('two widely-spaced accidentals both land in column 0 (no collision)', () => {
    const placements = NE.assignAccidentalColumns([-4, 0]); // 4 staff-spaces apart
    assert.equal(placements[0].column, 0);
    assert.equal(placements[1].column, 0);
  });

  test('two close accidentals (within 2.5sp) get different columns', () => {
    const placements = NE.assignAccidentalColumns([-2, -1]); // 1sp apart
    assert.notEqual(placements[0].column, placements[1].column);
  });

  test('three close accidentals need three separate columns', () => {
    const placements = NE.assignAccidentalColumns([-2, -1, 0]);
    const columns = new Set([...placements].map((p) => p.column));
    assert.equal(columns.size, 3);
  });

  test('placement order matches input order, not sorted order', () => {
    const placements = NE.assignAccidentalColumns([0, -4]); // lowest pitch first this time
    assert.equal(placements.length, 2);
    assert.equal(placements[0].y, 0);
    assert.equal(placements[1].y, -4);
  });

  test('a lone accidental gets column 0', () => {
    const placements = NE.assignAccidentalColumns([-2]);
    assert.equal(placements[0].column, 0);
  });
});

describe('accidental horizontal placement (Phase 19)', () => {
  test('column 0 sits one accidental-width plus the 0.16sp gap left of the notehead', () => {
    const x = NE.accidentalX(10, 1.0, 0);
    assert.ok(Math.abs(x - (10 - 0.16 - 1.0)) < 1e-9);
  });

  test('column 1 sits a further accidental-width to the left of column 0', () => {
    const col0 = NE.accidentalX(10, 1.0, 0);
    const col1 = NE.accidentalX(10, 1.0, 1);
    assert.ok(Math.abs(col0 - col1 - 1.0) < 1e-9);
  });
});
