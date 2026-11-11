// Bass plan Part 03 §3 and Part 04. Phase B0 is "done when the unit
// tests reproduce every number in Part 03 §3 and the suggestion and
// octave tests pass", so this file IS those tables.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../dist/finger-engine.js', import.meta.url), 'utf8'), sandbox);
const E = sandbox.FingerEngine;

const bass = E.bassInstrument();
const near = (actual, expected, tolerance, what) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${what}: expected ${expected} ± ${tolerance}, got ${actual.toFixed(3)}`,
  );

test('[BG-02] the tunings are the ones bassists play', () => {
  assert.deepEqual([...E.BASS_TUNINGS['4-standard']], [28, 33, 38, 43]);
  assert.deepEqual([...E.BASS_TUNINGS['4-dropD']], [26, 33, 38, 43]);
  assert.deepEqual([...E.BASS_TUNINGS['4-halfDown']], [27, 32, 37, 42]);
  assert.deepEqual([...E.BASS_TUNINGS['4-Dstandard']], [26, 31, 36, 41]);
  assert.deepEqual([...E.BASS_TUNINGS['5-lowB']], [23, 28, 33, 38, 43]);
  assert.deepEqual([...E.BASS_TUNINGS['5-highC']], [28, 33, 38, 43, 48]);
  assert.deepEqual([...E.BASS_TUNINGS['6-standard']], [23, 28, 33, 38, 43, 48]);
  // An octave below the guitar's bottom four: guitar E2 = 40, bass E1 = 28.
  assert.equal(E.BASS_TUNINGS['4-standard'][0] + 12, 40);
});

test('[BG-01..05] the default bass is a 34-inch four-string', () => {
  assert.equal(bass.kind, 'bass');
  assert.equal(bass.numStrings, 4);
  assert.equal(bass.numFrets, 22);
  near(bass.scaleLengthMm, 863.6, 0.01, 'scale');
  assert.equal(bass.nutSpacingMm, 33);
  assert.equal(bass.bridgeSpacingMm, 57);
  // [BG-02] The string count follows the tuning, never stands beside it.
  assert.equal(E.bassInstrument({ tuning: '5-lowB' }).numStrings, 5);
  assert.equal(E.bassInstrument({ numStrings: 6 }).numStrings, 6);
  assert.equal(E.bassInstrument({ numStrings: 5 }).nutSpacingMm, 37);
  assert.equal(E.bassInstrument({ numStrings: 6 }).bridgeSpacingMm, 82.5);
  // [BG-03] The four scale lengths.
  near(E.bassInstrument({ scaleLengthMm: 'short' }).scaleLengthMm, 762, 0.01, '30 inch');
  near(E.bassInstrument({ scaleLengthMm: 'medium' }).scaleLengthMm, 812.8, 0.01, '32 inch');
  near(E.bassInstrument({ scaleLengthMm: 'extraLong' }).scaleLengthMm, 889, 0.01, '35 inch');
});

test('[Part 03 §3] the fret table of a 34-inch bass', () => {
  const rows = [
    [1, 48.5, 48.5],
    [2, 94.2, 45.7],
    [3, 137.4, 43.2],
    [5, 216.6, 38.5],
    [7, 287.2, 34.3],
    [9, 350.1, 30.5],
    [12, 431.8, 25.7],
    [15, 500.5, 21.6],
    [17, 540.1, 19.2],
    [20, 591.6, 16.2],
    [22, 621.3, 14.4],
    [24, 647.7, 12.8],
  ];
  for (const [fret, distance, width] of rows) {
    near(E.bassFretDistanceMm(bass, fret), distance, 0.1, `fret ${fret} distance`);
    near(E.bassFretWidthMm(bass, fret), width, 0.1, `fret ${fret} width`);
  }
  // Fret 12 is exactly half the scale, and 24 exactly three quarters.
  near(E.bassFretDistanceMm(bass, 12), bass.scaleLengthMm / 2, 1e-9, 'twelfth');
  near(E.bassFretDistanceMm(bass, 24), bass.scaleLengthMm * 0.75, 1e-9, 'twenty-fourth');
});

test('[Part 03 §3, BG-07] the span tables, at k = 0.25', () => {
  // Index at fret p: Simandl reaches p+2, one-finger-per-fret p+3.
  const rows = [
    [1, 90.3, 131.6, 46.4],
    [2, 85.2, 124.2, 43.8],
    [3, 80.4, 117.3, 41.4],
    [5, 71.6, 104.5, 36.9],
    [7, 63.8, 93.1, 32.8],
    [9, 56.9, 82.9, 29.2],
    [12, 47.8, 69.7, 24.6],
  ];
  for (const [fret, simandl, ofpf, oneFret] of rows) {
    near(E.shapeSpanMm(bass, fret, 2), simandl, 0.15, `Simandl at ${fret}`);
    near(E.shapeSpanMm(bass, fret, 3), ofpf, 0.15, `OFPF at ${fret}`);
    near(E.shapeSpanMm(bass, fret, 1), oneFret, 0.15, `one fret at ${fret}`);
  }
});

test('[Part 03 §3] where one-finger-per-fret starts to fit, by scale', () => {
  // The calibration anchor: with the SAME hand limits the guitar uses
  // (comfort 90mm, max 120mm between index and little finger), these
  // fall out of the geometry rather than being chosen.
  const rows = [
    ['short', 1, 6, 79.6],
    ['medium', 2, 7, 84.9],
    ['long', 3, 8, 90.3],
    ['extraLong', 4, 9, 92.9],
  ];
  for (const [scale, allowed, comfortable, simandlAt1] of rows) {
    const neck = E.bassInstrument({ scaleLengthMm: scale, numFrets: 24 });
    assert.equal(E.firstFretWithin(neck, 3, 120), allowed, `${scale}: OFPF allowed`);
    assert.equal(E.firstFretWithin(neck, 3, 90), comfortable, `${scale}: OFPF comfortable`);
    near(E.shapeSpanMm(neck, 1, 2), simandlAt1, 0.15, `${scale}: Simandl at fret 1`);
  }
  // And the two facts the plan draws from them, on the default bass.
  near(E.shapeSpanMm(bass, 1, 2), 90.3, 0.15, 'Simandl at fret 1 sits ON the comfort limit');
  assert.ok(E.shapeSpanMm(bass, 1, 1) > 45, 'ring and pinky cannot sit a fret apart at fret 1');
});

test('[BP-009] a hand profile scales every span, and changes nothing else', () => {
  assert.equal(E.handProfileScale('small'), 0.9);
  assert.equal(E.handProfileScale('medium'), 1);
  assert.equal(E.handProfileScale('large'), 1.1);
  assert.equal(E.handProfileScale(undefined), 1);
  const spans = { '1-4': { comfort: 90, max: 120 }, '3-4': { comfort: 30, max: 45 } };
  const large = E.scaleSpans(spans, 'large');
  near(large['1-4'].comfort, 99, 1e-9, 'large comfort');
  near(large['1-4'].max, 132, 1e-9, 'large max');
  near(large['3-4'].max, 49.5, 1e-9, 'large 3-4');
  assert.equal(spans['1-4'].comfort, 90, 'the defaults are not edited in place');
  // [Part 10 §2] The profile table, on the default 34" bass: where
  // one-finger-per-fret becomes possible at all, and where it becomes
  // comfortable. A large hand has it from the first fret and a small one
  // not until the fifth -- which is the whole point of FB-22, and it
  // falls out of the millimetres rather than being chosen.
  const rows = [
    ['small', 108, 5, 81, 10],
    ['medium', 120, 3, 90, 8],
    ['large', 132, 1, 99, 6],
  ];
  for (const [profile, max, allowed, comfort, comfortable] of rows) {
    const factor = E.handProfileScale(profile);
    near(120 * factor, max, 1e-9, `${profile}: 1-4 max`);
    near(90 * factor, comfort, 1e-9, `${profile}: 1-4 comfort`);
    assert.equal(E.firstFretWithin(bass, 3, max), allowed, `${profile}: OFPF allowed`);
    assert.equal(E.firstFretWithin(bass, 3, comfort), comfortable, `${profile}: OFPF comfortable`);
  }
});

test('[BG-06] a fretless fingertip sits ON the line', () => {
  const fretted = E.bassInstrument();
  const fretless = E.bassInstrument({ fretless: true });
  assert.equal(E.bassGeometry(fretted).fingertipBehindFret, 0.25);
  assert.equal(E.bassGeometry(fretless).fingertipBehindFret, 0);
  // Its span is therefore the plain distance between two fret lines.
  near(
    E.shapeSpanMm(fretless, 1, 3),
    E.bassFretDistanceMm(fretless, 4) - E.bassFretDistanceMm(fretless, 1),
    1e-9,
    'fretless OFPF span',
  );
});

test('[BIN-02] which parts are a bass', () => {
  const kind = (evidence) => E.detectPart(evidence).kind;
  // (1) what the file declares
  assert.equal(kind({ instrumentSound: 'pluck.bass.electric' }), 'bass');
  assert.equal(kind({ instrumentSound: 'pluck.bass.synth' }), 'bass');
  assert.equal(E.detectPart({ instrumentSound: 'pluck.bass.fretless' }).fretlessHint, true);
  // A declared bass beats a misleading name.
  assert.equal(kind({ instrumentSound: 'pluck.bass.electric', partName: 'Gtr 2' }), 'bass');
  // (2) the General MIDI program, either numbering
  assert.equal(kind({ midiProgram: 33 }), 'bass');
  assert.equal(kind({ midiProgramXml: 34 }), 'bass');
  assert.equal(E.detectPart({ midiProgram: 34 }).rightHandHint, 'pick');
  assert.equal(E.detectPart({ midiProgram: 36 }).rightHandHint, 'slap');
  assert.equal(E.detectPart({ midiProgram: 35 }).fretlessHint, true);
  // (3) the name
  assert.equal(kind({ partName: 'Bass Guitar' }), 'bass');
  assert.equal(kind({ trackName: 'E. Bass' }), 'bass');
  assert.equal(kind({ partAbbreviation: 'B. Gtr' }), 'bass');
  // (4) a tab staff tuned like a bass
  assert.equal(kind({ staffLines: 4, lowestStaffTuning: 28 }), 'bass');
  assert.equal(kind({ staffLines: 5, lowestStaffTuning: 23 }), 'bass');
  // A guitar's tab is an octave up, so there is nothing to confuse.
  assert.notEqual(kind({ staffLines: 6, lowestStaffTuning: 40 }), 'bass');
  assert.equal(kind({ midiProgram: 25 }), 'guitar');
  assert.equal(kind({}), 'other');
});

test('[BIN-02a] an upright is not an electric bass', () => {
  assert.equal(E.detectPart({ partName: 'Double Bass' }).kind, 'upright');
  assert.equal(E.detectPart({ partName: 'Contrabass' }).kind, 'upright');
  assert.equal(E.detectPart({ partName: 'Upright Bass', midiProgram: 32 }).kind, 'upright');
  assert.equal(
    E.detectPart({ instrumentSound: 'pluck.bass.acoustic', arco: true }).kind,
    'upright',
  );
  // An acoustic BASS GUITAR is analysed normally.
  assert.equal(E.detectPart({ instrumentSound: 'pluck.bass.acoustic' }).kind, 'bass');
});

test('[BIN-04a] tab decides the octave, when there is tab', () => {
  const tuning = [28, 33, 38, 43];
  // Written an octave high: every tabbed note is pitch - 12.
  const high = [
    { pitch: 40, string: 1, fret: 0 },
    { pitch: 45, string: 2, fret: 0 },
    { pitch: 45, string: 1, fret: 5 },
    { pitch: 50, string: 3, fret: 0 },
  ];
  const fixed = E.octaveFromTab(high, tuning);
  assert.equal(fixed.shift, -12);
  assert.ok(fixed.info.includes('OCTAVE_CORRECTED'));
  // Already sounding: nothing moves.
  const sounding = high.map((n) => ({ ...n, pitch: n.pitch - 12 }));
  assert.equal(E.octaveFromTab(sounding, tuning).shift, 0);
  assert.equal(E.octaveFromTab(sounding, tuning).info.length, 0);
  // A mismatch that is not an octave is reported, never corrected.
  const wrong = [
    { pitch: 30, string: 1, fret: 0 },
    { pitch: 41, string: 2, fret: 0 },
    { pitch: 47, string: 3, fret: 0 },
    { pitch: 52, string: 4, fret: 0 },
  ];
  const mismatch = E.octaveFromTab(wrong, tuning);
  assert.equal(mismatch.shift, 0);
  assert.ok(mismatch.info.includes('PITCH_TAB_MISMATCH'));
  // One bad note in ten does not stop the correction (90% agreement).
  const mostly = [...high, ...high, ...high, { pitch: 99, string: 1, fret: 1 }];
  assert.equal(E.octaveFromTab(mostly, tuning).shift, -12);
});

test('[BIN-04b] without tab, the range decides', () => {
  const range = { lowestPitch: 28, highestPitch: 65 };
  // A line written an octave high sits above the bass register.
  const high = [52, 55, 57, 59, 60, 62, 64];
  assert.equal(E.octaveFromRange(high, range).shift, -12);
  // The same line at sounding pitch stays put.
  const sounding = high.map((p) => p - 12);
  assert.equal(E.octaveFromRange(sounding, range).shift, 0);
  // MIDI carries sounding pitch, so -12 must win by more.
  const borderline = [48, 50, 52, 53];
  const asXml = E.octaveFromRange(borderline, range);
  const asMidi = E.octaveFromRange(borderline, { ...range, fromMidi: true });
  assert.ok(asMidi.shift === 0 || asMidi.shift === asXml.shift);
  // When the two readings are close, nothing changes and it says so.
  const ambiguous = [40, 41, 42, 43];
  const close = E.octaveFromRange(ambiguous, range);
  assert.equal(close.shift, 0);
  assert.ok(close.info.includes('OCTAVE_UNCERTAIN'));
});

test('[BIN-03] the octave sources are used strictly in order', () => {
  const tuning = [28, 33, 38, 43];
  const range = { lowestPitch: 28, highestPitch: 65 };
  const base = { pitches: [52, 55, 57], tuning, range };
  // (0) the user's override beats everything
  assert.equal(E.decideOctave({ ...base, override: 12, soundingFromEngine: true }).shift, 12);
  // (1) the Notation Engine's own sounding pitch
  const engine = E.decideOctave({ ...base, soundingFromEngine: true, transpose: { octaveChange: -1 } });
  assert.equal(engine.shift, 0);
  assert.equal(engine.source, 'engine');
  // (2) a stated transposition
  const stated = E.decideOctave({ ...base, transpose: { octaveChange: -1 } });
  assert.equal(stated.shift, -12);
  assert.equal(stated.source, 'transpose');
  // (3) tab
  const tabbed = E.decideOctave({
    ...base,
    tabbed: [
      { pitch: 40, string: 1, fret: 0 },
      { pitch: 45, string: 2, fret: 0 },
      { pitch: 50, string: 3, fret: 0 },
    ],
  });
  assert.equal(tabbed.shift, -12);
  assert.equal(tabbed.source, 'tab');
  // (4) the range test, when there is nothing else
  assert.equal(E.decideOctave(base).source, 'range');
});

test('[FB-08] a drop-D line suggests drop D, and an E flat changes it', () => {
  // D1 E1 F1 G1 A1
  const line = [26, 28, 29, 31, 33];
  const dropped = E.suggestBassInstrument(line);
  assert.equal(dropped.tuningId, '4-dropD');
  assert.ok(dropped.reasons.includes('LOW_D_ONLY'));
  assert.equal(dropped.tuning[0], 26, 'D1 is string 1 open');
  // Add an E flat and drop D can no longer reach it: a fifth string can.
  const withEb = E.suggestBassInstrument([...line, 27]);
  assert.equal(withEb.tuningId, '5-lowB');
  assert.ok(withEb.reasons.includes('BELOW_E1'));
  // Forced onto a four-string in standard tuning, the D is out of range
  // and is reported -- never transposed to fit.
  const four = E.bassInstrument({ tuning: '4-standard' });
  assert.deepEqual([...E.outOfRange(line, four)], [26]);
  // Forced onto a five-string it is fret 3 of the B string.
  const five = E.bassInstrument({ tuning: '5-lowB' });
  assert.deepEqual([...E.outOfRange(line, five)], []);
  assert.equal(26 - five.tuning[0], 3);
});

test('[FB-09] a line down to B0 suggests the five-string', () => {
  const line = [23, 26, 28, 31, 33, 38];
  const suggestion = E.suggestBassInstrument(line);
  assert.equal(suggestion.tuningId, '5-lowB');
  assert.equal(suggestion.numStrings, 5);
  assert.ok(suggestion.reasons.includes('BELOW_E1'));
  assert.equal(suggestion.tuning[0], 23, 'B0 is string 1 open');
});

test('[BIN-05/06] the rest of the suggestion table', () => {
  // A plain line inside a four-string's range.
  const plain = E.suggestBassInstrument([28, 33, 38, 43, 50]);
  assert.equal(plain.tuningId, '4-standard');
  assert.ok(plain.reasons.includes('RANGE_FITS_4'));
  // Above the G string's last fret: a high C string.
  const high = E.suggestBassInstrument([33, 60, 68], { numFrets: 22 });
  assert.equal(high.tuningId, '5-highC');
  assert.ok(high.reasons.includes('ABOVE_G_STRING'));
  // Both ends at once: six strings.
  const wide = E.suggestBassInstrument([24, 68], { numFrets: 22 });
  assert.equal(wide.tuningId, '6-standard');
  assert.ok(wide.reasons.includes('WIDE_RANGE'));
  // Below a five-string's B: still suggested, but the notes are flagged.
  const tooLow = E.suggestBassInstrument([20, 33, 40]);
  assert.ok(tooLow.reasons.includes('BELOW_B0'));
  // [BIN-05] What the file states beats every guess above.
  const fromFile = E.suggestBassInstrument([28, 33], {
    stated: { tuning: [23, 28, 33, 38, 43], staffLines: 5 },
  });
  assert.equal(fromFile.numStrings, 5);
  assert.equal(fromFile.confidence, 1);
  assert.ok(fromFile.reasons.includes('FILE_TUNING'));
});

test('[FB-10] the same line in four encodings reads the same', () => {
  const tuning = [28, 33, 38, 43];
  const range = { lowestPitch: 28, highestPitch: 65 };
  // FB-01's line: the C major scale C2 -> C3, which is where a bass line
  // lives. Written an octave high it climbs out of the register at the
  // top, and that is what lets the range test on its own decide -- a
  // line that reads equally well either way is a coin flip, and BIN-04b
  // is required to say OCTAVE_UNCERTAIN rather than pick one.
  const sounding = [36, 38, 40, 41, 43, 45, 47, 48];
  const written = sounding.map((p) => p + 12);
  // (a) MusicXML with <transpose><octave-change>-1
  const a = E.decideOctave({ pitches: written, tuning, range, transpose: { octaveChange: -1 } });
  // (b) MusicXML with tab and no transpose: C2 is A string fret 3,
  // D2 the open D string, E2 fret 2 of it.
  const b = E.decideOctave({
    pitches: written,
    tuning,
    range,
    tabbed: [
      { pitch: 48, string: 2, fret: 3 },
      { pitch: 50, string: 3, fret: 0 },
      { pitch: 52, string: 3, fret: 2 },
    ],
  });
  // (c) MusicXML with neither
  const c = E.decideOctave({ pitches: written, tuning, range });
  // (d) MIDI, which already carries sounding pitch
  const d = E.decideOctave({ pitches: sounding, tuning, range: { ...range, fromMidi: true } });
  assert.equal(a.shift, -12);
  assert.equal(b.shift, -12);
  assert.equal(c.shift, -12);
  assert.equal(d.shift, 0);
  for (const [name, decision, pitches] of [
    ['transpose', a, written],
    ['tab', b, written],
    ['range', c, written],
    ['midi', d, sounding],
  ]) {
    assert.deepEqual(
      pitches.map((p) => p + decision.shift),
      sounding,
      `${name} reads the same sounding pitches`,
    );
  }
  assert.ok(b.info.includes('OCTAVE_CORRECTED'), 'the tab case says it corrected');
  assert.ok(c.info.includes('OCTAVE_CORRECTED'), 'and so does the range case');
  // [BIN-04b] The same four notes an octave apart in the middle of the
  // register score the same both ways, so nothing is changed and the
  // uncertainty is reported for the UI to ask about.
  const flat = [40, 43, 45, 48, 50];
  const coinFlip = E.decideOctave({ pitches: flat, tuning, range });
  assert.equal(coinFlip.shift, 0);
  assert.ok(coinFlip.info.includes('OCTAVE_UNCERTAIN'));
});

// [OQ-B10] A file's own description of its parts, in the two places
// MusicXML keeps it: the <part-list> and the part's first <attributes>.
const bassFile = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Bass Guitar</part-name>
      <part-abbreviation>B. Gtr</part-abbreviation>
      <score-instrument id="P1-I1">
        <instrument-name>Electric Bass</instrument-name>
        <instrument-sound>pluck.bass.electric</instrument-sound>
      </score-instrument>
      <midi-instrument id="P1-I1">
        <midi-channel>2</midi-channel>
        <midi-program>34</midi-program>
      </midi-instrument>
    </score-part>
    <score-part id="P2">
      <part-name>Double Bass</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>2</divisions>
        <staff-details>
          <staff-lines>4</staff-lines>
          <staff-tuning line="1"><tuning-step>E</tuning-step><tuning-octave>1</tuning-octave></staff-tuning>
          <staff-tuning line="2"><tuning-step>A</tuning-step><tuning-octave>1</tuning-octave></staff-tuning>
          <staff-tuning line="3"><tuning-step>D</tuning-step><tuning-octave>2</tuning-octave></staff-tuning>
          <staff-tuning line="4"><tuning-step>G</tuning-step><tuning-octave>2</tuning-octave></staff-tuning>
        </staff-details>
      </attributes>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <direction><direction-type><words>arco</words></direction-type></direction>
    </measure>
  </part>
</score-partwise>`;

test('[OQ-B10/BIN-02] the fields that name the instrument are read from the file', () => {
  const evidence = E.readPartEvidence(bassFile);
  const bassPart = evidence.get('P1');
  // The <part-list> half: what the file declares, and what it is called.
  assert.equal(bassPart.instrumentSound, 'pluck.bass.electric');
  assert.equal(bassPart.midiProgramXml, 34, 'ONE-based, as MusicXML writes it');
  assert.equal(bassPart.partName, 'Bass Guitar');
  assert.equal(bassPart.partAbbreviation, 'B. Gtr');
  // The <attributes> half: the tab staff and its lowest string.
  assert.equal(bassPart.staffLines, 4);
  assert.equal(bassPart.lowestStaffTuning, 28, 'E1');
  // Which is everything BIN-02 asks for, so the detection is decided by
  // the strongest test rather than by the part's name.
  const detected = E.detectPart(bassPart);
  assert.equal(detected.kind, 'bass');
  assert.deepEqual([...detected.reasons], ['INSTRUMENT_SOUND']);
  // [BIN-02a] MusicXML has no <arco> element, so the word is looked for.
  const upright = evidence.get('P2');
  assert.equal(upright.arco, true);
  assert.equal(E.detectPart(upright).kind, 'upright');
  // A file with no <part-list> at all yields nothing, never a guess.
  assert.equal(E.readPartEvidence('<score-partwise/>').size, 0);
  assert.equal(E.readPartEvidence('not xml at all').size, 0);
});

test('[BOUT-01/02] the timeline contract is 1.1.0, and additive', () => {
  assert.equal(E.TIMELINE_SCHEMA_VERSION, '1.1.0');
  // Nothing from 1.0.0 was removed: the guitar still writes a valid one.
  assert.equal(typeof E.emptyFingerTracks, 'function');
  assert.deepEqual(Object.keys(E.emptyFingerTracks()).sort(), ['1', '2', '3', '4', 'T']);
});
