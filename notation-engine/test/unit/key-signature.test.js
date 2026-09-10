import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('key signature engine (Phase 11)', () => {
  test('SHARP_ORDER and FLAT_ORDER are exact reverses of each other', () => {
    assert.deepEqual([...NE.SHARP_ORDER], ['F', 'C', 'G', 'D', 'A', 'E', 'B']);
    assert.deepEqual([...NE.FLAT_ORDER], ['B', 'E', 'A', 'D', 'G', 'C', 'F']);
    assert.deepEqual([...NE.SHARP_ORDER].reverse(), [...NE.FLAT_ORDER]);
  });

  test('D major (fifths=2) in treble clef is F# and C# at their verified positions', () => {
    const accs = NE.keySignatureAccidentals(2, 'treble');
    assert.equal(accs.length, 2);
    assert.equal(accs[0].step, 'F');
    assert.equal(accs[0].type, 'sharp');
    assert.equal(accs[0].y, -4); // top line
    assert.equal(accs[1].step, 'C');
    assert.equal(accs[1].y, -2.5); // 3rd space
  });

  test('Eb major (fifths=-3) in treble clef is Bb Eb Ab at their verified positions', () => {
    const accs = NE.keySignatureAccidentals(-3, 'treble');
    assert.equal(accs.length, 3);
    assert.deepEqual(
      [...accs].map((a) => a.step),
      ['B', 'E', 'A'],
    );
    assert.ok(accs.every((a) => a.type === 'flat'));
    assert.equal(accs[0].y, -2); // Bb, 3rd line
    assert.equal(accs[1].y, -3.5); // Eb, 4th space
    assert.equal(accs[2].y, -1.5); // Ab, 2nd space
  });

  test('fifths=0 returns no accidentals', () => {
    assert.deepEqual([...NE.keySignatureAccidentals(0, 'treble')], []);
  });

  test('bass clef key signature is treble\'s shape shifted by exactly +1', () => {
    const treble = NE.keySignatureAccidentals(7, 'treble'); // all 7 sharps
    const bass = NE.keySignatureAccidentals(7, 'bass');
    for (let i = 0; i < 7; i++) {
      assert.equal(bass[i].y, treble[i].y + 1, `sharp ${i}`);
    }
    const trebleFlats = NE.keySignatureAccidentals(-7, 'treble');
    const bassFlats = NE.keySignatureAccidentals(-7, 'bass');
    for (let i = 0; i < 7; i++) {
      assert.equal(bassFlats[i].y, trebleFlats[i].y + 1, `flat ${i}`);
    }
  });

  test('alto clef key signature is treble\'s shape shifted by exactly +0.5', () => {
    const treble = NE.keySignatureAccidentals(7, 'treble');
    const alto = NE.keySignatureAccidentals(7, 'alto');
    for (let i = 0; i < 7; i++) {
      assert.equal(alto[i].y, treble[i].y + 0.5, `sharp ${i}`);
    }
  });

  test('unsupported clefs (e.g. tenor, percussion) throw a clear error rather than guessing', () => {
    assert.throws(() => NE.keySignatureAccidentals(2, 'tenor'), /No verified key-signature/);
    assert.throws(() => NE.keySignatureAccidentals(2, 'percussion'), /No verified key-signature/);
  });

  test('cancellation: moving to C major cancels every old accidental', () => {
    const naturals = NE.cancellationNaturals(3, 0, 'treble'); // A major (3 sharps) -> C major
    assert.equal(naturals.length, 3);
    assert.deepEqual(
      [...naturals].map((n) => n.step),
      ['F', 'C', 'G'],
    );
    // Naturals sit at the OLD accidentals' own positions.
    const oldAccs = NE.keySignatureAccidentals(3, 'treble');
    naturals.forEach((n, i) => assert.equal(n.y, oldAccs[i].y));
  });

  test('cancellation: switching from sharps to flats cancels every old sharp', () => {
    const naturals = NE.cancellationNaturals(2, -2, 'treble'); // D major -> Bb major
    assert.equal(naturals.length, 2);
    assert.deepEqual(
      [...naturals].map((n) => n.step),
      ['F', 'C'],
    );
  });

  test('cancellation: fewer sharps of the same type only cancels the excess', () => {
    const naturals = NE.cancellationNaturals(2, 1, 'treble'); // D major (F#,C#) -> G major (F#)
    assert.equal(naturals.length, 1);
    assert.equal(naturals[0].step, 'C');
  });

  test('cancellation: more sharps of the same type needs no naturals at all', () => {
    const naturals = NE.cancellationNaturals(1, 2, 'treble'); // G major -> D major
    assert.equal(naturals.length, 0);
  });

  test('cancellation: no old key signature means nothing to cancel', () => {
    assert.equal(NE.cancellationNaturals(0, 3, 'treble').length, 0);
  });
});
