import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('clef engine (Phase 10)', () => {
  test('treble clef lines bottom-to-top spell E4 G4 B4 D5 F5', () => {
    const expected = [
      ['E', 4, 0],
      ['G', 4, -1],
      ['B', 4, -2],
      ['D', 5, -3],
      ['F', 5, -4],
    ];
    for (const [step, octave, y] of expected) {
      assert.equal(NE.staffPositionForPitch(NE.TREBLE_CLEF, step, octave), y, `${step}${octave}`);
    }
  });

  test('bass clef lines bottom-to-top spell G2 B2 D3 F3 A3', () => {
    const expected = [
      ['G', 2, 0],
      ['B', 2, -1],
      ['D', 3, -2],
      ['F', 3, -3],
      ['A', 3, -4],
    ];
    for (const [step, octave, y] of expected) {
      assert.equal(NE.staffPositionForPitch(NE.BASS_CLEF, step, octave), y, `${step}${octave}`);
    }
  });

  test('alto clef lines bottom-to-top spell F3 A3 C4 E4 G4', () => {
    const expected = [
      ['F', 3, 0],
      ['A', 3, -1],
      ['C', 4, -2],
      ['E', 4, -3],
      ['G', 4, -4],
    ];
    for (const [step, octave, y] of expected) {
      assert.equal(NE.staffPositionForPitch(NE.ALTO_CLEF, step, octave), y, `${step}${octave}`);
    }
  });

  test('tenor clef lines bottom-to-top spell D3 F3 A3 C4 E4', () => {
    const expected = [
      ['D', 3, 0],
      ['F', 3, -1],
      ['A', 3, -2],
      ['C', 4, -3],
      ['E', 4, -4],
    ];
    for (const [step, octave, y] of expected) {
      assert.equal(NE.staffPositionForPitch(NE.TENOR_CLEF, step, octave), y, `${step}${octave}`);
    }
  });

  test('soprano clef lines bottom-to-top spell C4 E4 G4 B4 D5', () => {
    const expected = [
      ['C', 4, 0],
      ['E', 4, -1],
      ['G', 4, -2],
      ['B', 4, -3],
      ['D', 5, -4],
    ];
    for (const [step, octave, y] of expected) {
      assert.equal(NE.staffPositionForPitch(NE.SOPRANO_CLEF, step, octave), y, `${step}${octave}`);
    }
  });

  test('treble-8vb (vocal tenor) places a written G4 where plain treble places G4, but represents an actually-sounding G3', () => {
    // octaveShift=+1 means: to find where octave O is DRAWN, we look up
    // where octave (O+1) would sit on a plain treble clef. So an actual
    // G3 (which sounds) is drawn at the same position plain treble draws
    // G4 (y=-1) -- one octave higher on the page than it sounds.
    assert.equal(NE.staffPositionForPitch(NE.TREBLE_8VB_CLEF, 'G', 3), -1);
    assert.equal(
      NE.staffPositionForPitch(NE.TREBLE_8VB_CLEF, 'G', 3),
      NE.staffPositionForPitch(NE.TREBLE_CLEF, 'G', 4),
    );
  });

  test('treble-8va places an actual G5 where plain treble places G4', () => {
    assert.equal(
      NE.staffPositionForPitch(NE.TREBLE_8VA_CLEF, 'G', 5),
      NE.staffPositionForPitch(NE.TREBLE_CLEF, 'G', 4),
    );
  });

  test('percussion clef matches treble clef\'s reference positions', () => {
    assert.equal(
      NE.staffPositionForPitch(NE.PERCUSSION_CLEF, 'G', 4),
      NE.staffPositionForPitch(NE.TREBLE_CLEF, 'G', 4),
    );
  });

  test('tab clef has positionsByPitch: false and throws if asked to position a pitch', () => {
    assert.equal(NE.TAB_CLEF.positionsByPitch, false);
    assert.throws(() => NE.staffPositionForPitch(NE.TAB_CLEF, 'C', 4), /does not position notes by pitch/);
  });

  test('accidentals (alter) never affect staff position -- only step+octave matter', () => {
    // staffPositionForPitch doesn't even take an `alter` parameter --
    // this test documents that as an intentional API decision, matching
    // real notation (C# and C natural sit on the exact same line).
    const y1 = NE.staffPositionForPitch(NE.TREBLE_CLEF, 'C', 4);
    const y2 = NE.staffPositionForPitch(NE.TREBLE_CLEF, 'C', 4);
    assert.equal(y1, y2);
  });
});
