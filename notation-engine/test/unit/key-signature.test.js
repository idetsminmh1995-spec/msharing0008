import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const NE = loadEngine();

const domParser = testDomParser();

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

  test('soprano (the one remaining unsupported clef) throws a clear error rather than guessing', () => {
    assert.throws(() => NE.keySignatureAccidentals(2, 'soprano'), /No verified key-signature/);
    assert.throws(() => NE.keySignatureAccidentals(2, 'percussion'), /No verified key-signature/);
  });

  describe('tenor clef (Phase 54, closing STATUS §C1)', () => {
    // Tenor's staff runs D3 (bottom line, y=0) to E4 (top line, y=-4).
    const Y = { D3: 0, E3: -0.5, F3: -1, G3: -1.5, A3: -2, B3: -2.5, C4: -3, D4: -3.5, E4: -4 };

    test('every sharp lands on its own conventional pitch', () => {
      const expected = [Y.F3, Y.C4, Y.G3, Y.D4, Y.A3, Y.E4, Y.B3];
      assert.deepEqual(
        [...NE.keySignatureAccidentals(7, 'tenor')].map((a) => a.y),
        expected,
      );
    });

    test('every flat lands on its own conventional pitch', () => {
      const expected = [Y.B3, Y.E4, Y.A3, Y.D4, Y.G3, Y.C4, Y.F3];
      assert.deepEqual(
        [...NE.keySignatureAccidentals(-7, 'tenor')].map((a) => a.y),
        expected,
      );
    });

    test('nothing leaves the staff -- tenor s own distinguishing property', () => {
      // Every other clef puts at least one sharp above the top line
      // (treble's G#, for one). Tenor's whole point is that it does not.
      for (const fifths of [7, -7]) {
        for (const a of NE.keySignatureAccidentals(fifths, 'tenor')) {
          assert.ok(a.y <= Y.D3 && a.y >= Y.E4, `${a.step} at y=${a.y} is off the staff`);
        }
      }
    });

    test('the sharps ASCEND first, unlike treble/bass/alto which descend', () => {
      const tenor = [...NE.keySignatureAccidentals(7, 'tenor')].map((a) => a.y);
      for (const clef of ['treble', 'bass', 'alto']) {
        const other = [...NE.keySignatureAccidentals(7, clef)].map((a) => a.y);
        assert.ok(other[1] > other[0], `${clef}'s second sharp is lower on the page`);
      }
      assert.ok(tenor[1] < tenor[0], "tenor's second sharp is HIGHER on the page");
    });

    test('and they alternate perfectly -- no octave break', () => {
      // treble/bass/alto have a double-descent (the "break") between the
      // 4th and 5th sharps; tenor does not.
      const tenor = [...NE.keySignatureAccidentals(7, 'tenor')].map((a) => a.y);
      const directions = tenor.slice(1).map((y, i) => Math.sign(y - tenor[i]));
      assert.deepEqual(directions, [-1, 1, -1, 1, -1, 1]);

      const treble = [...NE.keySignatureAccidentals(7, 'treble')].map((a) => a.y);
      const trebleDirections = treble.slice(1).map((y, i) => Math.sign(y - treble[i]));
      assert.deepEqual(trebleDirections, [1, -1, 1, 1, -1, 1], 'treble has the break');
    });

    test('a real tenor-clef score now renders its key signature, with no diagnostic', () => {
      const xml =
        `<?xml version="1.0"?><score-partwise version="4.0">` +
        `<part-list><score-part id="P1"><part-name>Cello</part-name></score-part></part-list>` +
        `<part id="P1"><measure number="1"><attributes><divisions>1</divisions>` +
        `<key><fifths>3</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time>` +
        `<clef><sign>C</sign><line>4</line></clef></attributes>` +
        `<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration>` +
        `<type>whole</type></note></measure></part></score-partwise>`;
      const { svg, diagnostics } = NE.renderFromMusicXml(xml, { domParser });
      assert.deepEqual([...diagnostics], [], 'no UNSUPPORTED_KEY_SIGNATURE_CLEF warning');
      // Three sharps drawn, at the staff-relative positions above
      // (the renderer's staff bottom line sits at y=8).
      const sharps = [...svg.matchAll(/<text x="[\d.]+" y="([\d.]+)" font-family="Bravura"[^>]*>\uE262</g)];
      assert.deepEqual(
        sharps.map((m) => Number(m[1]) - 8),
        [Y.F3, Y.C4, Y.G3],
      );
    });
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
