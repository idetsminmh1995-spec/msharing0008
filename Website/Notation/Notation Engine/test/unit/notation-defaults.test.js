import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();
const D = NE.NotationDefaults;

test('notation-defaults: the data layer is reachable from the bundle', () => {
  assert.ok(D, 'NotationDefaults must be exported from the engine bundle');
});

test('sources: every table names a public source, and every source is complete', () => {
  const sources = [
    D.CLEF_TABLE_SOURCE,
    D.CLEF_PITCH_SOURCE,
    D.ABS_STEP_SOURCE,
    D.REL_STEP_SOURCE,
    D.LEDGER_LINE_SOURCE,
    D.NOTEHEAD_GROUP_SOURCE,
    D.MUSICXML_NOTEHEAD_SOURCE,
    D.DRUM_KIT_SOURCE,
    D.DRUM_NOTATION_SOURCE,
    D.STRING_DATA_SOURCE,
    D.FRET_SOURCE,
    D.STYLE_SOURCE,
    D.BEAM_SPACING_SOURCE,
    D.SPACING_SOURCE,
    D.SEGMENT_STRETCH_SOURCE,
  ];
  for (const source of sources) {
    assert.ok(D.PUBLIC_SOURCES[source.source], `unknown source id ${source.source}`);
    assert.ok(source.symbol.length > 0);
    assert.ok(source.what.length > 0);
  }
  for (const [id, entry] of Object.entries(D.PUBLIC_SOURCES)) {
    assert.equal(entry.id, id);
    assert.ok(entry.title.length > 0);
    assert.ok(entry.what.length > 0);
    // A house-style decision has no external URL; everything else must.
    if (id !== 'houseStyle') assert.match(entry.url, /^https:\/\//);
  }
});

test('clefs: the three common clefs have the reference pitches a clef names', () => {
  // A treble clef puts G4 on its second line from the bottom, a bass clef
  // F3 on its fourth, an alto clef middle C on its middle line. Those are
  // the definitions, so they are the tests.
  assert.equal(D.clefById('treble').pitchOffset, 45);
  assert.equal(D.clefById('bass').pitchOffset, 33);
  assert.equal(D.clefById('alto').pitchOffset, 39);
  assert.equal(D.clefById('tenor').pitchOffset, 37);
  assert.equal(D.clefById('treble').glyphLine, 2);
  assert.equal(D.clefById('bass').glyphLine, 4);
  assert.equal(D.clefById('alto').glyphLine, 3);
});

test('clefs: an octave-variant clef shifts the reference by one or two octaves', () => {
  const plain = D.clefById('treble').pitchOffset;
  assert.equal(D.clefById('treble8vb').pitchOffset, plain - 7);
  assert.equal(D.clefById('treble8va').pitchOffset, plain + 7);
  assert.equal(D.clefById('treble15mb').pitchOffset, plain - 14);
  assert.equal(D.clefById('treble15ma').pitchOffset, plain + 14);
});

test('clefs: MusicXML sign/line/octave resolves to the right clef', () => {
  assert.equal(D.clefForMusicXml('G', 2, 0).id, 'treble');
  assert.equal(D.clefForMusicXml('G', 2, -1).id, 'treble8vb');
  assert.equal(D.clefForMusicXml('F', 4, 0).id, 'bass');
  assert.equal(D.clefForMusicXml('C', 3, 0).id, 'alto');
  assert.equal(D.clefForMusicXml('percussion').id, 'percussion');
  assert.equal(D.clefForMusicXml('TAB').id, 'tab6');
  // Omitted <line> takes the spec default per sign.
  assert.equal(D.clefForMusicXml('G').id, 'treble');
  assert.equal(D.clefForMusicXml('F').id, 'bass');
  assert.equal(D.clefForMusicXml('C').id, 'alto');
  // A combination this engine does not define is not invented.
  assert.equal(D.clefForMusicXml('G', 4, 0), undefined);
});

test('clefs: key-signature lines place seven sharps then seven flats', () => {
  const treble = D.clefById('treble').keySignatureLines;
  assert.equal(treble.length, 14);
  // F# is the first sharp; on a treble staff F5 is the top line.
  assert.equal(treble[0], 0);
  // Bb is the first flat, on the middle line of a treble staff.
  assert.equal(treble[7], 4);
  // A bass clef is a third lower, so its key signature sits lower too.
  const bass = D.clefById('bass').keySignatureLines;
  assert.equal(bass.length, 14);
  assert.equal(bass[0], 2);
});

test('staff-position: middle C is absolute step 35 and counts from C-1 = 0', () => {
  assert.equal(D.absStep('C', -1), 0);
  assert.equal(D.absStep('C', 4), 35);
  assert.equal(D.absStep('B', 4), 41);
  assert.equal(D.absStep('C', 5), 42);
  assert.equal(D.absStep('c', 4), 35);
});

test('staff-position: a pitch lands where its clef puts it', () => {
  // Under a treble clef, middle C is one ledger line below the staff.
  assert.equal(D.lineForPitch(D.clefById('treble'), 'C', 4), 10);
  // Under a bass clef, middle C is one ledger line above the staff.
  assert.equal(D.lineForPitch(D.clefById('bass'), 'C', 4), -2);
  // Under an alto clef, middle C is the middle line.
  assert.equal(D.lineForPitch(D.clefById('alto'), 'C', 4), 4);
});

test('staff-position: the top-down line and bottom-up position convert exactly', () => {
  for (const lines of [1, 2, 3, 4, 5, 6, 7]) {
    for (let line = -4; line <= (lines - 1) * 2 + 4; line += 1) {
      assert.equal(D.lineFromStaffPosition(D.staffPositionFromLine(line, lines), lines), line);
    }
  }
  assert.equal(D.staffPositionFromLine(0, 5), -4);
  assert.equal(D.staffPositionFromLine(8, 5), 0);
});

test('staff-position: ledger lines appear only one half space past the staff', () => {
  assert.equal(D.needsLedgerLines(0), false); // top line
  assert.equal(D.needsLedgerLines(-1), false); // the space above it
  assert.equal(D.needsLedgerLines(-2), true); // first ledger above
  assert.equal(D.needsLedgerLines(8), false); // bottom line
  assert.equal(D.needsLedgerLines(9), false); // the space below it
  assert.equal(D.needsLedgerLines(10), true); // first ledger below
});

test('noteheads: MusicXML cross is the plus and x is the x', () => {
  assert.equal(D.groupForMusicXmlNotehead('cross'), 'plus');
  assert.equal(D.groupForMusicXmlNotehead('x'), 'cross');
  assert.equal(D.noteheadGlyph('plus', 'quarter'), 'noteheadPlusBlack');
  assert.equal(D.noteheadGlyph('cross', 'quarter'), 'noteheadXBlack');
});

test('noteheads: every group names a glyph for every head type', () => {
  for (const group of D.NOTEHEAD_GROUPS) {
    for (const type of ['whole', 'half', 'quarter', 'breve']) {
      const glyph = D.noteheadGlyph(group.group, type);
      assert.equal(typeof glyph, 'string', `${group.group}/${type}`);
      assert.ok(glyph.length > 0);
    }
  }
});

test('noteheads: an up stem changes the head only for the arrow group', () => {
  const groupsWithUpStem = [...D.NOTEHEAD_GROUPS.filter((g) => g.upStem !== undefined).map((g) => g.group)];
  assert.deepEqual(groupsWithUpStem.sort(), ['arrow', 'slash', 'slash-diamond'].sort());
  assert.notEqual(
    D.noteheadGlyph('arrow', 'quarter', 'up'),
    D.noteheadGlyph('arrow', 'quarter', 'down'),
  );
  assert.equal(D.noteheadGlyph('normal', 'quarter', 'up'), D.noteheadGlyph('normal', 'quarter', 'down'));
});

test('drum kit: the standard kit covers the GM percussion key range', () => {
  assert.equal(D.STANDARD_DRUM_KIT.length, 61);
  const byPitch = new Map(D.STANDARD_DRUM_KIT.map((d) => [d.pitch, d]));
  // The three anchors every drum chart agrees on.
  assert.equal(byPitch.get(36).name, 'Bass Drum 1');
  assert.equal(byPitch.get(38).name, 'Acoustic Snare');
  assert.equal(byPitch.get(42).name, 'Closed Hi-Hat');
  // The snare sits in the third space from the bottom of a five-line
  // percussion staff (positions -0.5, -1.5, -2.5 from the bottom up).
  assert.equal(D.staffPositionFromLine(byPitch.get(38).line, 5), -2.5);
  // The closed hi-hat is an x.
  assert.equal(byPitch.get(42).notehead, 'cross');
});

test('drum kit: overrides fold in without editing the standard table', () => {
  const mapping = D.drumMapping({
    name: 'test kit',
    drums: [
      { pitch: 38, line: 1, evidence: 'test' },
      { pitch: 100, line: 2, notehead: 'x', name: 'Extra', evidence: 'test' },
    ],
  });
  assert.equal(mapping[38].staffPosition, D.staffPositionFromLine(1, 5));
  assert.equal(mapping[100].name, 'Extra');
  // The standard table is untouched.
  assert.equal(D.drumKitEntry(38).line, 3);
  assert.equal(D.drumKitEntry(100), undefined);
});

test('strings: an electric bass transposes but an electric guitar does not', () => {
  const guitar = D.stringData('electric-guitar');
  const bass = D.stringData('electric-bass');
  assert.equal(guitar.transposeChromatic, 0);
  assert.equal(bass.transposeChromatic, -12);
  // A sounding E1 on a bass is written E2 (40), the open low string.
  assert.equal(D.writtenPitchFor(bass, 28), 40);
  assert.equal(D.fretFor(bass, D.writtenPitchFor(bass, 28), 1), 0);
});

test('strings: standard tuning is the guitar tuning everyone names first', () => {
  const six = D.tuningsForStrings(6);
  assert.equal(six[0].name, 'Standard');
  assert.deepEqual([...six[0].pitches], [40, 45, 50, 55, 59, 64]);
});

test('strings: a tab staff spaces its lines one and a half staff spaces apart', () => {
  const tab6 = D.STAFF_TYPES.find((s) => s.id === 'tab-6');
  assert.equal(tab6.lines, 6);
  assert.equal(tab6.lineDistance, 1.5);
});

test('spacing law: a quarter note is the reference and a doubling multiplies by 1.5', () => {
  assert.equal(D.eventSpace(480, 480), 3.5);
  assert.equal(D.eventSpace(960, 480), 5.25);
  assert.equal(D.eventSpace(240, 480), 3.5 * Math.pow(1.5, -1));
});

test('spacing law: a segment a shorter note runs through is priced linearly', () => {
  // A half note's segment with an eighth running through it: the eighth's
  // space times four, not the half note's own space.
  const eighth = D.eventSpace(240, 480);
  assert.equal(D.segmentSpace({ ticks: 960, shortestSounding: 240 }, 480), eighth * 4);
  // An adjacent segment gets the power law outright.
  assert.equal(D.segmentSpace({ ticks: 960, shortestSounding: 960 }, 480), D.eventSpace(960, 480));
});

test('engraving style: the font-recommended thicknesses match the bundled font', () => {
  const defaults = NE.getEngravingDefaults();
  assert.equal(D.ENGRAVING_STYLE.staff.lineWidth, defaults.staffLineThickness);
  assert.equal(D.ENGRAVING_STYLE.note.stemWidth, defaults.stemThickness);
  assert.equal(D.ENGRAVING_STYLE.beam.width, defaults.beamThickness);
});
