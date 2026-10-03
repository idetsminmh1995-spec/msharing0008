import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const NE = loadEngine();
const MS = NE.MuseScore;
const domParser = testDomParser();

describe('MuseScore data layer: provenance', () => {
  test('every table says which MuseScore file and symbol it came from', () => {
    const sources = [
      MS.CLEF_TABLE_SOURCE,
      MS.STAFF_POSITION_SOURCE,
      MS.MUSICXML_CLEF_SOURCE,
      MS.ABS_STEP_SOURCE,
      MS.REL_STEP_SOURCE,
      MS.LEDGER_LINE_SOURCE,
      MS.NOTEHEAD_GROUP_SOURCE,
      MS.NOTEHEAD_ENUM_SOURCE,
      MS.MUSICXML_NOTEHEAD_SOURCE,
      MS.DRUMSET_SOURCE,
      MS.DRUM_NAME_SOURCE,
      MS.STRING_DATA_SOURCE,
      MS.STRING_INDEX_SOURCE,
      MS.TUNING_PRESET_SOURCE,
      MS.TAB_STAFF_SOURCE,
      MS.STYLE_SOURCE,
      MS.BEAM_SPACING_SOURCE,
      MS.SPACING_SOURCE,
    ];
    for (const source of sources) {
      assert.ok(source.path.startsWith('src/') || source.path.startsWith('share/'), source.path);
      assert.ok(source.symbol.length > 3, `${source.path} has no symbol`);
      assert.ok(source.what.length > 10, `${source.path} does not say what it gave`);
      assert.ok(MS.blobUrl(source).includes(MS.MUSESCORE_REVISION.commit));
    }
  });

  test('the revision is pinned to a commit, not to a branch', () => {
    assert.match(MS.MUSESCORE_REVISION.commit, /^[0-9a-f]{40}$/);
    assert.equal(MS.MUSESCORE_REVISION.license, 'GPL-3.0-only');
  });
});

describe('MuseScore data layer: clefs and staff position', () => {
  test('the four clefs everyone knows have the pitch offsets MuseScore gives them', () => {
    assert.equal(MS.museScoreClef('G').pitchOffset, 45);
    assert.equal(MS.museScoreClef('F').pitchOffset, 33);
    assert.equal(MS.museScoreClef('C3').pitchOffset, 39); // alto
    assert.equal(MS.museScoreClef('C4').pitchOffset, 37); // tenor
  });

  test('middle C lands where it should under treble, bass, alto and tenor', () => {
    // MuseScore's own line numbers: 0 is the TOP staff line, +1 is half
    // a space down, so a five-line staff runs 0..8.
    assert.equal(MS.museScoreLine(MS.museScoreClef('G'), 'C', 4), 10); // 1st ledger below
    assert.equal(MS.museScoreLine(MS.museScoreClef('F'), 'C', 4), -2); // 1st ledger above
    assert.equal(MS.museScoreLine(MS.museScoreClef('C3'), 'C', 4), 4); // the middle line
    assert.equal(MS.museScoreLine(MS.museScoreClef('C4'), 'C', 4), 2); // 2nd line from the top
  });

  test('absStep counts from C-1 = 0, so middle C is 35', () => {
    assert.equal(MS.absStep('C', -1), 0);
    assert.equal(MS.absStep('C', 4), 35);
    assert.equal(MS.absStep('B', 4), 41);
    assert.equal(MS.absStep('C', 5), 42);
  });

  test('an accidental never moves a note off its line', () => {
    // There is no `alter` parameter, and this is the test that says so
    // on purpose: C sharp and C flat are the same line as C.
    assert.equal(MS.museScoreLine(MS.museScoreClef('G'), 'c', 4), 10);
  });

  test("this engine's own clef geometry agrees with MuseScore's, note for note", () => {
    // The real point of having both. Two independent derivations -- the
    // engine's reference-pitch-and-offset, MuseScore's pitch-offset
    // subtraction -- have to produce the same staff position for every
    // pitch under every clef both of them know, or one of them is wrong.
    const pairs = [
      ['G', NE.TREBLE_CLEF],
      ['F', NE.BASS_CLEF],
      ['C3', NE.ALTO_CLEF],
      ['C4', NE.TENOR_CLEF],
      ['C1', NE.SOPRANO_CLEF],
    ];
    const steps = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    for (const [type, engineClef] of pairs) {
      const msClef = MS.museScoreClef(type);
      for (let octave = 0; octave <= 8; octave++) {
        for (const step of steps) {
          assert.equal(
            MS.museScoreStaffPosition(msClef, step, octave),
            NE.staffPositionForPitch(engineClef, step, octave),
            `${type}: ${step}${octave}`,
          );
        }
      }
    }
  });

  test('the octave-transposing clefs shift by exactly an octave', () => {
    const plain = MS.museScoreClef('G').pitchOffset;
    assert.equal(MS.museScoreClef('G8_VB').pitchOffset, plain - 7);
    assert.equal(MS.museScoreClef('G8_VA').pitchOffset, plain + 7);
    assert.equal(MS.museScoreClef('G15_MB').pitchOffset, plain - 14);
    assert.equal(MS.museScoreClef('G15_MA').pitchOffset, plain + 14);
  });

  test('a MusicXML <clef> resolves the way MuseScore resolves it', () => {
    assert.equal(MS.museScoreClefForMusicXml('G', 2, 0).type, 'G');
    assert.equal(MS.museScoreClefForMusicXml('G', 2, -1).type, 'G8_VB');
    assert.equal(MS.museScoreClefForMusicXml('F', 4, 0).type, 'F');
    assert.equal(MS.museScoreClefForMusicXml('C', 3, 0).type, 'C3');
    assert.equal(MS.museScoreClefForMusicXml('percussion').type, 'PERC');
    assert.equal(MS.museScoreClefForMusicXml('TAB').type, 'TAB');
    // MusicXML 2.0 lets <line> be omitted, and MuseScore fills in the
    // default for the sign rather than refusing the file.
    assert.equal(MS.museScoreClefForMusicXml('G').type, 'G');
    assert.equal(MS.museScoreClefForMusicXml('F').type, 'F');
    assert.equal(MS.museScoreClefForMusicXml('C').type, 'C3');
    // And a combination MuseScore does not recognise stays unrecognised.
    assert.equal(MS.museScoreClefForMusicXml('G', 4, 0), undefined);
  });

  test('a key signature puts its accidentals on the lines MuseScore gives', () => {
    // Treble: F# on the top line (0), C# in the 3rd space (3), G# above
    // the staff (-1) -- the familiar sharp order's zig-zag.
    const treble = MS.museScoreClef('G').keySignatureLines;
    assert.deepEqual([...treble].slice(0, 7), [0, 3, -1, 2, 5, 1, 4]);
    assert.deepEqual([...treble].slice(7), [4, 1, 5, 2, 6, 3, 7]);
    // Bass is the same shape, two steps lower.
    assert.deepEqual(
      [...MS.museScoreClef('F').keySignatureLines].slice(0, 7),
      [2, 5, 1, 4, 7, 3, 6],
    );
  });

  test('ledger lines start one half space outside the staff, not at its edge', () => {
    assert.equal(MS.needsLedgerLines(0), false); // top line
    assert.equal(MS.needsLedgerLines(-1), false); // the space above it
    assert.equal(MS.needsLedgerLines(-2), true); // first ledger above
    assert.equal(MS.needsLedgerLines(8), false); // bottom line
    assert.equal(MS.needsLedgerLines(9), false); // the space below it
    assert.equal(MS.needsLedgerLines(10), true); // first ledger below
  });

  test('the two staff conventions convert both ways', () => {
    for (const lines of [1, 3, 5, 6]) {
      for (let line = -4; line <= 12; line++) {
        assert.equal(MS.lineFromStaffPosition(MS.staffPositionFromLine(line, lines), lines), line);
      }
    }
    // The anchors: top line of a five-line staff is y -4 here, bottom is 0.
    assert.equal(MS.staffPositionFromLine(0, 5), -4);
    assert.equal(MS.staffPositionFromLine(8, 5), 0);
  });
});

describe('MuseScore data layer: noteheads', () => {
  test("MusicXML's cross is the PLUS and its x is the X -- the classic trap", () => {
    assert.equal(MS.museScoreGroupForMusicXmlNotehead('cross'), 'HEAD_PLUS');
    assert.equal(MS.museScoreGroupForMusicXmlNotehead('x'), 'HEAD_CROSS');
    assert.equal(MS.museScoreNoteheadGlyph('HEAD_PLUS', 'quarter'), 'noteheadPlusBlack');
    assert.equal(MS.museScoreNoteheadGlyph('HEAD_CROSS', 'quarter'), 'noteheadXBlack');
  });

  test('every group gives a glyph for all four head types', () => {
    for (const group of MS.MUSESCORE_NOTEHEAD_GROUPS) {
      for (const type of ['whole', 'half', 'quarter', 'breve']) {
        const glyph = MS.museScoreNoteheadGlyph(group.group, type);
        assert.ok(glyph && glyph !== 'noSym', `${group.group}/${type}`);
      }
    }
  });

  test('only four groups care which way the stem points', () => {
    const stemDependent = [
      ...MS.MUSESCORE_NOTEHEAD_GROUPS.filter((g) => g.upStem !== undefined).map((g) => g.group),
    ];
    assert.deepEqual(stemDependent, [
      'HEAD_LARGE_ARROW',
      'HEAD_SLASH',
      'HEAD_LARGE_DIAMOND',
      'HEAD_FA',
    ]);
    assert.equal(
      MS.museScoreNoteheadGlyph('HEAD_LARGE_ARROW', 'quarter', 'up'),
      'noteheadLargeArrowDownBlack',
    );
  });

  test('every MusicXML value MuseScore maps names a group this table has', () => {
    for (const [value, group] of Object.entries(MS.MUSICXML_NOTEHEAD_TO_GROUP)) {
      assert.ok(
        MS.museScoreNoteheadGlyph(group, 'quarter'),
        `${value} maps to ${group}, which has no glyphs here`,
      );
    }
  });
});

describe('MuseScore data layer: drumset', () => {
  test('the kit every drum chart is made of sits where MuseScore puts it', () => {
    const snare = MS.museScoreDrum(38);
    assert.equal(snare.name, 'Acoustic Snare');
    assert.equal(snare.line, 3);
    assert.equal(snare.notehead, 'HEAD_NORMAL');
    assert.equal(snare.voice, 0);

    const closedHiHat = MS.museScoreDrum(42);
    assert.equal(closedHiHat.line, -1);
    assert.equal(closedHiHat.notehead, 'HEAD_CROSS');

    const openHiHat = MS.museScoreDrum(46);
    assert.equal(openHiHat.line, -1);
    assert.equal(openHiHat.notehead, 'HEAD_XCIRCLE');

    // Both bass drums and the pedal hi-hat are the feet: voice 1.
    assert.equal(MS.museScoreDrum(35).voice, 1);
    assert.equal(MS.museScoreDrum(36).voice, 1);
    assert.equal(MS.museScoreDrum(44).voice, 1);
    assert.equal(MS.museScoreDrum(36).line, 7);
    assert.equal(MS.museScoreDrum(36).stemDirection, 'down');
  });

  test('a drum with no notehead group of its own names a real glyph instead', () => {
    for (const drum of MS.MUSESCORE_DRUMSET) {
      if (drum.notehead !== 'HEAD_CUSTOM') continue;
      assert.match(drum.customNotehead, /^notehead/, `${drum.pitch} ${drum.name}`);
    }
    assert.equal(MS.museScoreDrum(52).customNotehead, 'noteheadHeavyXHat'); // china cymbal
  });

  test('the five a groove is actually made of sit in the same place in both tables', () => {
    // Kick, snare, closed and open hi-hat, crash. If these drifted, a
    // MuseScore export would render here as a visibly different groove,
    // which is the whole reason this comparison exists.
    for (const pitch of [36, 38, 42, 46, 49]) {
      const mine = NE.DEFAULT_DRUM_MAPPING_TABLE[pitch];
      const theirs = MS.museScoreDrum(pitch);
      assert.ok(mine, `this engine has no drum ${pitch}`);
      assert.equal(
        mine.staffPosition,
        MS.staffPositionFromLine(theirs.line),
        `${pitch} ${theirs.name}: staff position`,
      );
    }
  });

  test('where the two tables DISAGREE is written down, not discovered later', () => {
    // §13.3 is explicit that real drum practice varies and that this
    // engine's table is a defensible default rather than a universal
    // truth, so these differences are not bugs -- but an unrecorded
    // difference is, because it turns into "why does my MuseScore file
    // look wrong" months later. The list is asserted exactly: a new
    // difference, in either table, fails here.
    const differences = [];
    const museScoreMapping = MS.drumMappingFromMuseScore();
    for (const drum of MS.MUSESCORE_DRUMSET) {
      const mine = NE.DEFAULT_DRUM_MAPPING_TABLE[drum.pitch];
      if (!mine) continue;
      const theirs = museScoreMapping[drum.pitch];
      const fields = [];
      if (mine.staffPosition !== theirs.staffPosition) fields.push('position');
      if (mine.noteheadShape !== theirs.noteheadShape) fields.push('notehead');
      if ((mine.stemDirection ?? 'up') !== theirs.stemDirection) fields.push('stem');
      if (fields.length > 0) differences.push(`${drum.pitch} ${fields.join('+')}`);
    }
    assert.deepEqual(differences, [
      '35 position+stem',
      '37 notehead',
      '40 notehead',
      '41 position',
      '43 position',
      '44 position+stem',
      '45 position',
      '46 notehead',
      '47 position',
      '48 position',
      '50 position',
      '51 position',
      '52 position+notehead',
      '53 position',
      '54 position+notehead',
      '55 position',
      '56 notehead',
      '59 position',
    ]);
  });

  test('the whole drumset converts into a drum mapping this engine can take', () => {
    const mapping = MS.drumMappingFromMuseScore();
    assert.equal(Object.keys(mapping).length, MS.MUSESCORE_DRUMSET.length);
    assert.equal(mapping[38].staffPosition, -2.5);
    assert.equal(mapping[38].noteheadShape, 'normal');
    assert.equal(mapping[42].noteheadShape, 'x');
    assert.equal(mapping[46].noteheadShape, 'circle-x');
    assert.equal(mapping[53].noteheadShape, 'diamond'); // ride bell
    assert.equal(mapping[28].noteheadShape, 'noteheadSlashX'); // custom: the glyph itself
  });

  test('an override replaces only what it names, and has to say where it came from', () => {
    const overridden = MS.applyDrumOverrides(MS.MUSESCORE_DRUMSET, {
      name: 'the owner-s own kit',
      drums: [{ pitch: 38, line: 5, evidence: 'screenshot, bar 1' }],
    });
    const snare = overridden.find((d) => d.pitch === 38);
    assert.equal(snare.line, 5); // moved
    assert.equal(snare.notehead, 'HEAD_NORMAL'); // untouched
    assert.equal(snare.name, 'Acoustic Snare'); // untouched
    // and the standard table itself is not mutated
    assert.equal(MS.museScoreDrum(38).line, 3);
  });

  test('a half-filled override for a drum MuseScore does not define is dropped', () => {
    const added = MS.applyDrumOverrides(MS.MUSESCORE_DRUMSET, {
      drums: [{ pitch: 95, line: 2, evidence: 'incomplete on purpose' }],
    });
    assert.equal(
      added.find((d) => d.pitch === 95),
      undefined,
    );
    const complete = MS.applyDrumOverrides(MS.MUSESCORE_DRUMSET, {
      drums: [{ pitch: 95, line: 2, notehead: 'HEAD_CROSS', evidence: 'complete' }],
    });
    assert.equal(complete.find((d) => d.pitch === 95).line, 2);
  });
});

describe('MuseScore data layer: strings and tab', () => {
  test('standard guitar and bass tunings are the ones everybody knows', () => {
    assert.deepEqual(
      [...MS.museScoreStringData('electric-guitar').openStrings],
      [40, 45, 50, 55, 59, 64],
    );
    assert.deepEqual([...MS.museScoreStringData('electric-bass').openStrings], [40, 45, 50, 55]);
    assert.equal(MS.museScoreStringData('electric-guitar').frets, 24);
    assert.equal(MS.museScoreStringData('guitar-nylon').frets, 19);
  });

  test('a bass string is stored at its WRITTEN pitch, an octave above what it sounds', () => {
    const bass = MS.museScoreStringData('electric-bass');
    assert.equal(bass.transposeChromatic, -12);
    // A sounding low E is MIDI 28; written, it is 40, which is fret 0.
    assert.equal(MS.writtenPitchFor(bass, 28), 40);
    assert.equal(MS.fretFor(bass, MS.writtenPitchFor(bass, 28), 1), 0);
    // And the 5th fret of that string sounds A1 (33).
    assert.equal(MS.fretFor(bass, MS.writtenPitchFor(bass, 33), 1), 5);
  });

  test('a guitar does NOT transpose -- its octave is the clef, not a transposition', () => {
    // The distinction that decides whether a fingering is an octave
    // out. The guitar carries its octave in an 8vb treble clef and has
    // no <transposeChromatic> at all, so its strings are listed at the
    // pitches they sound. The bass carries its octave in a real
    // transposition, and its are not.
    const guitar = MS.museScoreStringData('electric-guitar');
    assert.equal(guitar.transposeChromatic, 0);
    assert.equal(guitar.concertClef, 'G8vb');
    assert.equal(MS.writtenPitchFor(guitar, 64), 64);
    assert.equal(MS.fretFor(guitar, MS.writtenPitchFor(guitar, 64), 6), 0); // open high E sounds E4
    assert.equal(MS.fretFor(guitar, MS.writtenPitchFor(guitar, 40), 1), 0); // open low E sounds E2
    assert.notEqual(
      guitar.transposeChromatic,
      MS.museScoreStringData('electric-bass').transposeChromatic,
    );
  });

  test('a pitch that is not on a string returns nothing rather than a fret', () => {
    const guitar = MS.museScoreStringData('electric-guitar');
    assert.equal(MS.fretFor(guitar, 39, 1), undefined); // below the open low E
    assert.equal(MS.fretFor(guitar, 100, 1), undefined); // past the last fret
    assert.equal(MS.fretFor(guitar, 40, 9), undefined); // no such string
  });

  test('MuseScore numbers strings from the HIGHEST one, this project from the lowest', () => {
    // Six strings: this project's string 1 (the low E) is MuseScore's
    // string 5; its string 6 (the high E) is MuseScore's string 0.
    assert.equal(MS.stringIndexFromLowest(1, 6), 5);
    assert.equal(MS.stringIndexFromLowest(6, 6), 0);
    assert.equal(MS.stringIndexFromLowest(1, 4), 3);
  });

  test('a tab staff has six lines a space and a half apart, not five', () => {
    const tab = MS.MUSESCORE_STAFF_TYPES.find((s) => s.type === 'TAB_6COMMON');
    assert.equal(tab.lines, 6);
    assert.equal(tab.lineDistance, 1.5);
    const standard = MS.MUSESCORE_STAFF_TYPES.find((s) => s.type === 'STANDARD');
    assert.equal(standard.lines, 5);
    assert.equal(standard.lineDistance, 1);
    assert.equal(MS.MUSESCORE_STAFF_TYPES.find((s) => s.type === 'TAB_4COMMON').lines, 4);
  });

  test('the named guitar tunings include the ones a lesson actually uses', () => {
    const six = MS.museScoreTuningsForStrings(6);
    const byName = new Map(six.map((t) => [t.name, t.pitches]));
    assert.deepEqual([...byName.get('Standard')], [40, 45, 50, 55, 59, 64]);
    assert.deepEqual([...byName.get('Dropped D')], [38, 45, 50, 55, 59, 64]);
    assert.deepEqual([...byName.get('Tune down 1/2 step')], [39, 44, 49, 54, 58, 63]);
    for (const tuning of six) assert.equal(tuning.pitches.length, 6);
  });
});

describe('MuseScore data layer: spacing and style', () => {
  test('a quarter note is 3.5 staff spaces, and each doubling is worth half again', () => {
    const q = 480;
    assert.equal(MS.museScoreEventSpace(q, q), 3.5);
    assert.ok(Math.abs(MS.museScoreEventSpace(q * 2, q) - 5.25) < 1e-9); // half
    assert.ok(Math.abs(MS.museScoreEventSpace(q * 4, q) - 7.875) < 1e-9); // whole
    assert.ok(Math.abs(MS.museScoreEventSpace(q / 2, q) - 3.5 / 1.5) < 1e-9); // eighth
    assert.ok(Math.abs(MS.museScoreEventSpace(q / 4, q) - 3.5 / 2.25) < 1e-9); // sixteenth
  });

  test('the stretch is a POWER of the slope, which is what makes it differ from §14', () => {
    const q = 480;
    assert.equal(MS.museScoreDurationStretch(q, q), 1);
    assert.ok(Math.abs(MS.museScoreDurationStretch(q * 2, q) - 1.5) < 1e-9);
    assert.ok(Math.abs(MS.museScoreDurationStretch(q * 4, q) - 2.25) < 1e-9);
    // §14's own law adds a fixed increment per doubling instead, so the
    // two agree at the reference duration and nowhere else.
    const plan = (ticks) => 2.0 * 1.2 + 1.2 * Math.log2(ticks / q);
    assert.ok(Math.abs(plan(q) - 2.4) < 1e-9);
    assert.ok(MS.museScoreEventSpace(q * 4, q) > plan(q * 4));
  });

  test('a measure of four quarter notes comes out evenly spaced, barline included', () => {
    const q = 480;
    const xs = MS.museScorePositions([q, q, q, q], q);
    assert.deepEqual([...xs], [0, 3.5, 7, 10.5, 14]);
  });

  test('a half note followed by a half rest divides its bar in half', () => {
    const q = 480;
    const xs = MS.museScorePositions([q * 2, q * 2], q);
    assert.equal(xs[1] - xs[0], xs[2] - xs[1]);
  });

  test('the engraving defaults are the ones MuseScore ships', () => {
    assert.equal(MS.MUSESCORE_STYLE.staff.lineWidth, 0.11);
    assert.equal(MS.MUSESCORE_STYLE.note.stemWidth, 0.1);
    assert.equal(MS.MUSESCORE_STYLE.note.ledgerLineLength, 0.33);
    assert.equal(MS.MUSESCORE_STYLE.note.minNoteDistance, 0.35);
    assert.equal(MS.MUSESCORE_STYLE.beam.width, 0.5);
    assert.equal(MS.MUSESCORE_STYLE.beam.distance, 0.75);
    assert.equal(MS.MUSESCORE_STYLE.barline.width, 0.18);
    assert.equal(MS.MUSESCORE_STYLE.barline.endWidth, 0.55);
    assert.equal(MS.MUSESCORE_STYLE.measure.spacing, 1.5);
    assert.equal(MS.MUSESCORE_STYLE.spatiumMm, 1.75);
  });

  test('a rest sits on the middle line, and a whole rest a space above it', () => {
    const rest = MS.MUSESCORE_STYLE.rest;
    assert.equal(rest.naturalLineForFiveLineStaff, 2);
    assert.equal(rest.wholeRestLineOffset, -1);
    assert.equal(rest.multiVoiceOffset, 1);
  });
});

describe('MuseScore → MusicXML → this engine, end to end', () => {
  const load = (name) =>
    readFileSync(new URL(`../fixtures/musicxml/${name}`, import.meta.url), 'utf8');

  /**
   * Where the staff's BOTTOM line ended up, read off the drawing.
   *
   * Not assumed: a tempo mark above the staff pushes the whole system
   * down, so the only honest anchor is something actually drawn. The
   * percussion clef is it -- its glyph origin is its own centre, which
   * the engine places on the middle line, two staff spaces above the
   * bottom one.
   */
  const bottomLineOf = (svg) => {
    const clef = /<text x="[\d.]+" y="([\d.-]+)"[^>]*>\uE069</.exec(svg);
    assert.ok(clef, 'no percussion clef was drawn');
    return Number(clef[1]) + 2;
  };

  test('a real MuseScore 4 export renders with nothing worse than a note to self', () => {
    for (const name of ['musescore-drum-lesson.musicxml', 'musescore-grand-staff.musicxml']) {
      const { svg, diagnostics } = NE.renderFromMusicXml(load(name), { domParser });
      // `info` is allowed and expected: MuseScore writes <print> layout
      // hints that this engine lays out for itself, and saying so is
      // the right behaviour. An error or a warning is not.
      const bad = [...diagnostics].filter((d) => d.severity !== 'info');
      assert.deepEqual(bad, [], name);
      assert.ok(svg.startsWith('<svg'), name);
      assert.ok(!svg.includes('NaN'), `${name} emitted NaN`);
    }
  });

  test("every note in MuseScore's own grand-staff export lands where MuseScore would put it", () => {
    // The whole chain, checked end to end: the file MuseScore wrote,
    // this engine's parser, this engine's clef geometry, against the
    // MuseScore layer's own prediction for the same note. Nothing is
    // compared to a hardcoded list -- the fixture's own pitches drive
    // it, so a different export tests whatever that export contains.
    const { score } = NE.parseMusicXml(load('musescore-grand-staff.musicxml'), { domParser });
    const clefs = { treble: NE.TREBLE_CLEF, bass: NE.BASS_CLEF };
    const museScoreClefs = { treble: MS.museScoreClef('G'), bass: MS.museScoreClef('F') };
    let checked = 0;
    for (const part of score.parts) {
      for (const measure of part.measures) {
        for (const voice of measure.voices) {
          for (const event of voice.events) {
            const notes =
              event.kind === 'chord' ? event.notes : event.kind === 'note' ? [event] : [];
            for (const note of notes) {
              if (note.pitch.kind !== 'pitched') continue;
              const staff = note.staff === 2 ? 'bass' : 'treble';
              assert.equal(
                NE.staffPositionForPitch(clefs[staff], note.pitch.step, note.pitch.octave),
                MS.museScoreStaffPosition(
                  museScoreClefs[staff],
                  note.pitch.step,
                  note.pitch.octave,
                ),
                `${note.pitch.step}${note.pitch.octave} on the ${staff} staff`,
              );
              checked += 1;
            }
          }
        }
      }
    }
    assert.ok(checked > 25, `only ${checked} notes were checked -- did the fixture parse?`);
  });

  test("MuseScore's own drum export uses pitches MuseScore's drumset defines", () => {
    // A drum chart is only as good as the kit behind it: if the file
    // names a pitch the drumset has no row for, nothing downstream can
    // know which line it belongs on, and this is where that would show.
    const xml = load('musescore-drum-lesson.musicxml');
    const pitches = [...xml.matchAll(/<midi-unpitched>(\d+)<\/midi-unpitched>/g)].map((m) =>
      Number(m[1]),
    );
    assert.ok(pitches.length > 5, 'the fixture has no unpitched instruments at all');
    for (const pitch of new Set(pitches)) {
      // MusicXML's <midi-unpitched> is 1-based; MuseScore's drumset,
      // like the GM table it comes from, is 0-based.
      assert.ok(
        MS.museScoreDrum(pitch - 1),
        `MuseScore's own export uses pitch ${pitch - 1}, which its own drumset does not define`,
      );
    }
  });

  test("the drum chart's noteheads and lines come out as MuseScore's drumset says", () => {
    const xml = load('musescore-drum-lesson.musicxml');
    const mapping = MS.drumMappingFromMuseScore();
    const { svg, diagnostics } = NE.renderFromMusicXml(xml, {
      domParser,
      config: { drums: { mapping } },
    });
    assert.deepEqual(
      [...diagnostics].filter((d) => d.severity !== 'info'),
      [],
    );

    // Every notehead the chart actually drew, as a (glyph, y) pair. The
    // staff's bottom line is y = 8 in the emitted SVG (Phase 9's own
    // convention), so a MuseScore line converts to a y by the two steps
    // the layer documents and nothing else.
    const GLYPH_FOR_SHAPE = { normal: '\uE0A4', x: '\uE0A9', 'circle-x': '\uE0B3' };
    const drawn = new Set(
      [...svg.matchAll(/<text x="[\d.]+" y="([\d.-]+)"[^>]*>(.)</g)]
        .filter((m) => Object.values(GLYPH_FOR_SHAPE).includes(m[2]))
        .map((m) => `${m[2]}@${m[1]}`),
    );
    assert.ok(drawn.size > 0, 'the chart drew no noteheads at all');

    // Each one has to be a drum MuseScore's own drumset would put
    // exactly there, with exactly that head. Anything else means the
    // mapping did not reach the renderer.
    for (const pair of drawn) {
      const [glyph, y] = pair.split('@');
      const match = MS.MUSESCORE_DRUMSET.find(
        (d) =>
          8 + MS.staffPositionFromLine(d.line) === Number(y) &&
          GLYPH_FOR_SHAPE[mapping[d.pitch].noteheadShape] === glyph,
      );
      assert.ok(match, `nothing in MuseScore's drumset is drawn as ${pair}`);
    }

    // And the three a groove is built from are all there, each on its
    // own line: kick at the bottom, snare in the middle, hi-hat above
    // the staff.
    const yOf = (pitch) => 8 + MS.staffPositionFromLine(MS.museScoreDrum(pitch).line);
    assert.ok(drawn.has(`\uE0A4@${yOf(36)}`), 'no kick');
    assert.ok(drawn.has(`\uE0A4@${yOf(38)}`), 'no snare');
    assert.ok(drawn.has(`\uE0A9@${yOf(42)}`), 'no closed hi-hat');
  });

  test("every unpitched note in the owner's own MuseScore file lands exactly where MuseScore drew it", () => {
    // The file that found this: five bars of drum kit, 17 unpitched
    // notes across eight different instruments, exported from MuseScore
    // Studio 4.7.4. Every one of them states its own
    // <display-step>/<display-octave>, and before Integration T this
    // engine overrode all of them with its own GM table -- the toms
    // half a space out, the pedal hi-hat at the top of the staff
    // instead of below it.
    //
    // Nothing here is hardcoded: the expected position of each note is
    // computed from the FILE's own display position through MuseScore's
    // own percussion clef, which is what MuseScore's importer does
    // (xmlSetDrumsetPitch).
    const xml = load('musescore-drum-notes.musicxml');
    const { svg, playback } = NE.renderFromMusicXml(xml, { domParser });

    // Where the staff's bottom line ended up in this render -- read off
    // the drawing rather than assumed, since a tempo mark above the
    // staff pushes everything down.
    const bottomLine = bottomLineOf(svg);

    const perc = MS.museScoreClef('PERC');
    const expected = [
      ...xml.matchAll(
        /<display-step>(\w)<\/display-step>\s*<display-octave>(\d)<\/display-octave>/g,
      ),
    ].map(([, step, octave]) => ({
      step,
      octave: Number(octave),
      y: bottomLine + MS.museScoreStaffPosition(perc, step, Number(octave)),
    }));
    assert.equal(expected.length, 17, 'the fixture should hold 17 unpitched notes');

    const drawn = [...svg.matchAll(/<text x="([\d.]+)" y="([\d.-]+)"[^>]*>(.)</g)]
      .filter((m) => {
        const cp = m[3].codePointAt(0);
        return cp >= 0xe0a0 && cp <= 0xe0ff;
      })
      .map((m) => ({ x: Number(m[1]), y: Number(m[2]) }))
      .sort((a, b) => a.x - b.x || a.y - b.y);

    assert.equal(drawn.length, expected.length, 'a notehead per unpitched note');

    // Same multiset of y positions, so no note is on the wrong line --
    // compared as a sorted list because the file's reading order is by
    // voice and the drawing's is by x.
    assert.deepEqual(
      drawn.map((d) => d.y).sort((a, b) => a - b),
      expected.map((e) => e.y).sort((a, b) => a - b),
    );
    assert.ok(playback !== undefined);
  });

  test('the instruments that used to be furthest wrong are now right to the half space', () => {
    // Named one by one, because "the whole file matches" would still
    // pass if two of them swapped. These are the ones the owner's
    // screenshots showed in the wrong place.
    const xml = load('musescore-drum-notes.musicxml');
    const { svg } = NE.renderFromMusicXml(xml, { domParser });
    const perc = MS.museScoreClef('PERC');
    const bottomLine = bottomLineOf(svg);
    const yFor = (step, octave) => bottomLine + MS.museScoreStaffPosition(perc, step, octave);

    // Pedal hi-hat: the file puts it on D4, BELOW the staff. The GM
    // table used to put it above the top line.
    assert.match(svg, new RegExp(`y="${yFor('D', 4)}"[^>]*>\uE0A9`), 'pedal hi-hat');
    // Bass drum 2 on E4, the bottom line itself.
    assert.match(svg, new RegExp(`y="${yFor('E', 4)}"[^>]*>\uE0A4`), 'bass drum 2');
    // The four toms, each on its own line, a half space apart.
    for (const [step, octave] of [
      ['E', 5],
      ['D', 5],
      ['B', 4],
      ['A', 4],
    ]) {
      assert.match(
        svg,
        new RegExp(`y="${yFor(step, octave)}"[^>]*>\uE0A4`),
        `tom on ${step}${octave}`,
      );
    }
    // And the China cymbal keeps the glyph the file names outright.
    assert.match(svg, new RegExp(`y="${yFor('B', 5)}"[^>]*>\uE0F9`), 'china cymbal');
  });

  test("and so does every notehead -- checked against MuseScore's own reported layout", () => {
    // The same `default-y` evidence, for the noteheads. The test above
    // computes where MuseScore WOULD put them from the display
    // positions; this one reads where MuseScore SAYS it put them. Two
    // independent checks of the same seventeen notes, and the file
    // itself is the witness for both.
    const xml = load('musescore-drum-notes.musicxml');
    const { svg } = NE.renderFromMusicXml(xml, { domParser });
    const bottomLine = bottomLineOf(svg);

    const expected = [...xml.matchAll(/<note[^>]*default-y="(-?[\d.]+)"[^>]*>\s*<unpitched>/g)]
      .map((m) => -4 - Number(m[1]) / 10)
      .sort((a, b) => a - b);
    assert.equal(expected.length, 17);

    const drawn = [...svg.matchAll(/<text x="[\d.]+" y="([\d.-]+)"[^>]*>(.)</g)]
      .filter((m) => {
        const cp = m[2].codePointAt(0);
        return cp >= 0xe0a0 && cp <= 0xe0ff;
      })
      .map((m) => Number(m[1]) - bottomLine)
      .sort((a, b) => a - b);

    assert.deepEqual(drawn, expected);
  });

  test("every rest sits where MuseScore's own export says MuseScore drew it", () => {
    // MuseScore writes `default-y` on every note and rest it exports:
    // the element's distance ABOVE the measure's top staff line, in
    // tenths, ten to a staff space. That is not a hint -- it is
    // MuseScore reporting its own finished layout, which makes it the
    // strongest check available anywhere in this suite. Nine rests
    // across three bars, two voices, three durations.
    const xml = load('musescore-drum-notes.musicxml');
    const { svg } = NE.renderFromMusicXml(xml, { domParser });
    const bottomLine = bottomLineOf(svg);

    // MuseScore's tenths, in this engine's own staff positions: the top
    // line is -4 here and every ten tenths below it is one more space.
    const expected = [...xml.matchAll(/<note[^>]*default-y="(-?[\d.]+)"[^>]*>\s*<rest\s*\/>/g)]
      .map((m) => -4 - Number(m[1]) / 10)
      .sort((a, b) => a - b);
    assert.equal(expected.length, 9, 'the fixture should hold nine rests');

    const REST_GLYPHS = ['\uE4E3', '\uE4E4', '\uE4E5', '\uE4E6'];
    const drawn = [...svg.matchAll(/<text x="[\d.]+" y="([\d.-]+)"[^>]*>(.)</g)]
      .filter((m) => REST_GLYPHS.includes(m[2]))
      .map((m) => Number(m[1]) - bottomLine)
      .sort((a, b) => a - b);

    assert.deepEqual(drawn, expected);
  });

  test("MuseScore's spacing law and this engine's own both fill the bar, differently", () => {
    // Not a bug in either: §14 adds a fixed increment per doubling and
    // MuseScore multiplies by a factor, so a bar of mixed durations is
    // spaced differently by each. What they must BOTH do is put the
    // first attack first, keep the order, and leave the last one short
    // of the barline -- which is what this checks, on the same input.
    const q = 480;
    const gaps = [q, q / 2, q / 2, q * 2];
    const museScore = MS.museScorePositions(gaps, q);
    for (let i = 1; i < museScore.length; i++) {
      assert.ok(museScore[i] > museScore[i - 1], 'MuseScore positions must increase');
    }
    assert.equal(museScore[0], 0);
    // The eighth notes are closer together than the quarter that precedes them.
    assert.ok(museScore[2] - museScore[1] < museScore[1] - museScore[0]);
    // ...and the half note at the end earns the most room of all.
    assert.ok(museScore[4] - museScore[3] > museScore[1] - museScore[0]);
  });
});
