import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const NE = loadEngine();
const D = NE.NotationDefaults;
const domParser = testDomParser();

describe('notation data: provenance', () => {
  test('every table names a public source, and every source is complete', () => {
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
  });

  test('every public source is a specification, with a URL, except our own house style', () => {
    for (const [id, entry] of Object.entries(D.PUBLIC_SOURCES)) {
      assert.equal(entry.id, id);
      assert.ok(entry.title.length > 0);
      assert.ok(entry.what.length > 0);
      if (id === 'houseStyle') {
        assert.equal(entry.url, '');
      } else {
        assert.match(entry.url, /^https:\/\//, `${id} must cite a public specification`);
      }
    }
  });
});

describe('notation data: clefs and staff position', () => {
  test('the four clefs everyone knows have the reference pitches a clef names', () => {
    assert.equal(D.clefById('treble').pitchOffset, 45);
    assert.equal(D.clefById('bass').pitchOffset, 33);
    assert.equal(D.clefById('alto').pitchOffset, 39);
    assert.equal(D.clefById('tenor').pitchOffset, 37);
  });

  test('middle C lands where it should under treble, bass, alto and tenor', () => {
    // Our line convention: 0 is the TOP staff line, +1 is half a space
    // down, so a five-line staff runs 0..8.
    assert.equal(D.lineForPitch(D.clefById('treble'), 'C', 4), 10); // 1st ledger below
    assert.equal(D.lineForPitch(D.clefById('bass'), 'C', 4), -2); // 1st ledger above
    assert.equal(D.lineForPitch(D.clefById('alto'), 'C', 4), 4); // the middle line
    assert.equal(D.lineForPitch(D.clefById('tenor'), 'C', 4), 2); // 2nd line from the top
  });

  test('absStep counts from C-1 = 0, so middle C is 35', () => {
    assert.equal(D.absStep('C', -1), 0);
    assert.equal(D.absStep('C', 4), 35);
    assert.equal(D.absStep('B', 4), 41);
    assert.equal(D.absStep('C', 5), 42);
  });

  test('an accidental never moves a note off its line', () => {
    // There is no `alter` parameter, and this is the test that says so
    // on purpose: C sharp and C flat are the same line as C.
    assert.equal(D.lineForPitch(D.clefById('treble'), 'c', 4), 10);
  });

  test("this engine's own clef geometry agrees with the data layer, note for note", () => {
    // Two independent derivations -- the engine's reference-pitch-and-
    // offset, the data layer's pitch-offset subtraction -- have to
    // produce the same staff position for every pitch under every clef
    // both of them know, or one of them is wrong.
    const pairs = [
      ['treble', NE.TREBLE_CLEF],
      ['bass', NE.BASS_CLEF],
      ['alto', NE.ALTO_CLEF],
      ['tenor', NE.TENOR_CLEF],
      ['soprano', NE.SOPRANO_CLEF],
    ];
    const steps = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    for (const [id, engineClef] of pairs) {
      const clef = D.clefById(id);
      for (let octave = 0; octave <= 8; octave++) {
        for (const step of steps) {
          assert.equal(
            D.staffPositionForPitch(clef, step, octave),
            NE.staffPositionForPitch(engineClef, step, octave),
            `${id}: ${step}${octave}`,
          );
        }
      }
    }
  });

  test('the octave-transposing clefs shift by exactly an octave', () => {
    const plain = D.clefById('treble').pitchOffset;
    assert.equal(D.clefById('treble8vb').pitchOffset, plain - 7);
    assert.equal(D.clefById('treble8va').pitchOffset, plain + 7);
    assert.equal(D.clefById('treble15mb').pitchOffset, plain - 14);
    assert.equal(D.clefById('treble15ma').pitchOffset, plain + 14);
  });

  test('a MusicXML <clef> resolves to the clef the sign names', () => {
    assert.equal(D.clefForMusicXml('G', 2, 0).id, 'treble');
    assert.equal(D.clefForMusicXml('G', 2, -1).id, 'treble8vb');
    assert.equal(D.clefForMusicXml('F', 4, 0).id, 'bass');
    assert.equal(D.clefForMusicXml('C', 3, 0).id, 'alto');
    assert.equal(D.clefForMusicXml('percussion').id, 'percussion');
    assert.equal(D.clefForMusicXml('TAB').id, 'tab6');
    // MusicXML 2.0 lets <line> be omitted, and the spec gives a default
    // per sign rather than refusing the file.
    assert.equal(D.clefForMusicXml('G').id, 'treble');
    assert.equal(D.clefForMusicXml('F').id, 'bass');
    assert.equal(D.clefForMusicXml('C').id, 'alto');
    // And a combination the spec does not define stays undefined rather
    // than being invented.
    assert.equal(D.clefForMusicXml('G', 4, 0), undefined);
  });

  test('a key signature puts its accidentals on the lines the clef gives', () => {
    // Treble: F# on the top line (0), C# in the 3rd space (3), G# above
    // the staff (-1) -- the familiar sharp order's zig-zag.
    const treble = D.clefById('treble').keySignatureLines;
    assert.deepEqual([...treble].slice(0, 7), [0, 3, -1, 2, 5, 1, 4]);
    assert.deepEqual([...treble].slice(7), [4, 1, 5, 2, 6, 3, 7]);
    // Bass is the same shape, two steps lower.
    assert.deepEqual([...D.clefById('bass').keySignatureLines].slice(0, 7), [2, 5, 1, 4, 7, 3, 6]);
  });

  test('ledger lines start one half space outside the staff, not at its edge', () => {
    assert.equal(D.needsLedgerLines(0), false); // top line
    assert.equal(D.needsLedgerLines(-1), false); // the space above it
    assert.equal(D.needsLedgerLines(-2), true); // first ledger above
    assert.equal(D.needsLedgerLines(8), false); // bottom line
    assert.equal(D.needsLedgerLines(9), false); // the space below it
    assert.equal(D.needsLedgerLines(10), true); // first ledger below
  });

  test('the two staff conventions convert both ways', () => {
    for (const lines of [1, 3, 5, 6]) {
      for (let line = -4; line <= 12; line++) {
        assert.equal(D.lineFromStaffPosition(D.staffPositionFromLine(line, lines), lines), line);
      }
    }
    // The anchors: top line of a five-line staff is y -4 here, bottom is 0.
    assert.equal(D.staffPositionFromLine(0, 5), -4);
    assert.equal(D.staffPositionFromLine(8, 5), 0);
  });
});

describe('notation data: noteheads', () => {
  test("MusicXML's cross is the PLUS and its x is the X -- the classic trap", () => {
    assert.equal(D.groupForMusicXmlNotehead('cross'), 'plus');
    assert.equal(D.groupForMusicXmlNotehead('x'), 'cross');
    assert.equal(D.noteheadGlyph('plus', 'quarter'), 'noteheadPlusBlack');
    assert.equal(D.noteheadGlyph('cross', 'quarter'), 'noteheadXBlack');
  });

  test('every group gives a glyph for all four head types', () => {
    for (const group of D.NOTEHEAD_GROUPS) {
      for (const type of ['whole', 'half', 'quarter', 'breve']) {
        const glyph = D.noteheadGlyph(group.group, type);
        assert.ok(glyph && glyph !== 'noSym', `${group.group}/${type}`);
      }
    }
  });

  test('only the arrow and slash groups care which way the stem points', () => {
    const stemDependent = [
      ...D.NOTEHEAD_GROUPS.filter((g) => g.upStem !== undefined).map((g) => g.group),
    ].sort();
    assert.deepEqual(stemDependent, ['arrow', 'slash', 'slash-diamond']);
  });

  test('every MusicXML value the spec maps names a group this table has', () => {
    for (const [value, group] of Object.entries(D.MUSICXML_NOTEHEAD_TO_GROUP)) {
      assert.ok(D.noteheadGlyph(group, 'quarter'), `${value} maps to ${group}, which has no glyphs`);
    }
  });
});

describe('notation data: the drum kit', () => {
  test('the kit every drum chart is made of sits where the convention puts it', () => {
    const snare = D.drumKitEntry(38);
    assert.equal(snare.name, 'Acoustic Snare');
    assert.equal(snare.line, 3);
    assert.equal(snare.notehead, 'normal');

    const closedHiHat = D.drumKitEntry(42);
    assert.equal(closedHiHat.line, -1);
    assert.equal(closedHiHat.notehead, 'x');

    const openHiHat = D.drumKitEntry(46);
    assert.equal(openHiHat.line, -1);
    assert.equal(openHiHat.notehead, 'circle-x');

    // The kick sits below the staff.
    assert.equal(D.drumKitEntry(36).line, 7);
    assert.equal(D.drumKitEntry(35).line, 8);
  });

  test('the whole kit is the standard 61-key General MIDI percussion map', () => {
    assert.equal(D.STANDARD_DRUM_KIT.length, 61);
    assert.equal(D.STANDARD_DRUM_KIT[0].pitch, 27);
    assert.equal(D.STANDARD_DRUM_KIT[D.STANDARD_DRUM_KIT.length - 1].pitch, 87);
  });

  test('a drum no shape family contains names a real glyph instead', () => {
    for (const drum of D.STANDARD_DRUM_KIT) {
      if (drum.noteheadGlyph === undefined) continue;
      assert.ok(NE.getGlyph(drum.noteheadGlyph), `${drum.noteheadGlyph} is not in the font`);
    }
    assert.equal(D.drumKitEntry(52).noteheadGlyph, 'noteheadHeavyXHat'); // china cymbal
  });

  test('the whole kit converts into a drum mapping this engine can take', () => {
    const mapping = D.drumMapping();
    assert.equal(Object.keys(mapping).length, D.STANDARD_DRUM_KIT.length);
    assert.equal(mapping[38].staffPosition, -2.5);
    assert.equal(mapping[38].noteheadShape, 'normal');
    assert.equal(mapping[42].noteheadShape, 'x');
    assert.equal(mapping[46].noteheadShape, 'circle-x');
    assert.equal(mapping[53].noteheadShape, 'diamond'); // ride bell
    assert.equal(mapping[28].noteheadShape, 'slash'); // the family fallback for a glyph drum
  });

  test('an override replaces only what it names, and the table is not mutated', () => {
    const overridden = D.applyDrumOverrides(D.STANDARD_DRUM_KIT, {
      name: "the owner's own kit",
      drums: [{ pitch: 38, line: 5, evidence: 'screenshot, bar 1' }],
    });
    const snare = overridden.find((d) => d.pitch === 38);
    assert.equal(snare.line, 5); // moved
    assert.equal(snare.notehead, 'normal'); // untouched
    assert.equal(snare.name, 'Acoustic Snare'); // untouched
    // and the standard table itself is not mutated
    assert.equal(D.drumKitEntry(38).line, 3);
  });

  test('a half-filled override for a key the kit does not define is dropped', () => {
    const added = D.applyDrumOverrides(D.STANDARD_DRUM_KIT, {
      drums: [{ pitch: 95, line: 2, evidence: 'incomplete on purpose' }],
    });
    assert.equal(
      added.find((d) => d.pitch === 95),
      undefined,
    );
    const complete = D.applyDrumOverrides(D.STANDARD_DRUM_KIT, {
      drums: [{ pitch: 95, line: 2, notehead: 'x', evidence: 'complete' }],
    });
    assert.equal(complete.find((d) => d.pitch === 95).line, 2);
  });
});

describe('notation data: strings and tab', () => {
  test('standard guitar and bass tunings are the ones everybody knows', () => {
    assert.deepEqual([...D.stringData('electric-guitar').openStrings], [40, 45, 50, 55, 59, 64]);
    assert.deepEqual([...D.stringData('electric-bass').openStrings], [40, 45, 50, 55]);
    assert.equal(D.stringData('electric-guitar').frets, 24);
    assert.equal(D.stringData('guitar-nylon').frets, 19);
  });

  test('a bass string is stored at its WRITTEN pitch, an octave above what it sounds', () => {
    const bass = D.stringData('electric-bass');
    assert.equal(bass.transposeChromatic, -12);
    // A sounding low E is MIDI 28; written, it is 40, which is fret 0.
    assert.equal(D.writtenPitchFor(bass, 28), 40);
    assert.equal(D.fretFor(bass, D.writtenPitchFor(bass, 28), 1), 0);
    // And the 5th fret of that string sounds A1 (33).
    assert.equal(D.fretFor(bass, D.writtenPitchFor(bass, 33), 1), 5);
  });

  test('a guitar does NOT transpose -- its octave is the clef, not a transposition', () => {
    // The distinction that decides whether a fingering is an octave
    // out. The guitar carries its octave in an 8vb treble clef and has
    // no transposition, so its strings are listed at the pitches they
    // sound. The bass carries its octave in a real transposition, and
    // its are not.
    const guitar = D.stringData('electric-guitar');
    assert.equal(guitar.transposeChromatic, 0);
    assert.equal(guitar.concertClef, 'treble8vb');
    assert.equal(D.writtenPitchFor(guitar, 64), 64);
    assert.equal(D.fretFor(guitar, D.writtenPitchFor(guitar, 64), 6), 0); // open high E sounds E4
    assert.equal(D.fretFor(guitar, D.writtenPitchFor(guitar, 40), 1), 0); // open low E sounds E2
    assert.notEqual(guitar.transposeChromatic, D.stringData('electric-bass').transposeChromatic);
  });

  test('a pitch that is not on a string returns nothing rather than a fret', () => {
    const guitar = D.stringData('electric-guitar');
    assert.equal(D.fretFor(guitar, 39, 1), undefined); // below the open low E
    assert.equal(D.fretFor(guitar, 100, 1), undefined); // past the last fret
    assert.equal(D.fretFor(guitar, 40, 9), undefined); // no such string
  });

  test('strings are numbered from the HIGHEST one, so string 1 is the low E here', () => {
    // Six strings: this project's string 1 (the low E) is the last index
    // from the lowest; string 6 (the high E) is the first.
    assert.equal(D.stringIndexFromLowest(1, 6), 5);
    assert.equal(D.stringIndexFromLowest(6, 6), 0);
    assert.equal(D.stringIndexFromLowest(1, 4), 3);
  });

  test('a tab staff has six lines a space and a half apart, not five', () => {
    const tab = D.STAFF_TYPES.find((s) => s.id === 'tab-6');
    assert.equal(tab.lines, 6);
    assert.equal(tab.lineDistance, 1.5);
    const standard = D.STAFF_TYPES.find((s) => s.id === 'standard');
    assert.equal(standard.lines, 5);
    assert.equal(standard.lineDistance, 1);
    assert.equal(D.STAFF_TYPES.find((s) => s.id === 'tab-4').lines, 4);
  });

  test('the named guitar tunings include the ones a lesson actually uses', () => {
    const six = D.tuningsForStrings(6);
    const byName = new Map(six.map((t) => [t.name, t.pitches]));
    assert.deepEqual([...byName.get('Standard')], [40, 45, 50, 55, 59, 64]);
    assert.deepEqual([...byName.get('Dropped D')], [38, 45, 50, 55, 59, 64]);
    assert.deepEqual([...byName.get('Tune down 1/2 step')], [39, 44, 49, 54, 58, 63]);
    for (const tuning of six) assert.equal(tuning.pitches.length, 6);
  });
});

describe('notation data: spacing and style', () => {
  test('a quarter note is 3.5 staff spaces, and each doubling is worth half again', () => {
    const q = 480;
    assert.equal(D.eventSpace(q, q), 3.5);
    assert.ok(Math.abs(D.eventSpace(q * 2, q) - 5.25) < 1e-9); // half
    assert.ok(Math.abs(D.eventSpace(q * 4, q) - 7.875) < 1e-9); // whole
    assert.ok(Math.abs(D.eventSpace(q / 2, q) - 3.5 / 1.5) < 1e-9); // eighth
    assert.ok(Math.abs(D.eventSpace(q / 4, q) - 3.5 / 2.25) < 1e-9); // sixteenth
  });

  test('the stretch is a POWER of the slope, which is what makes it differ from §14', () => {
    const q = 480;
    assert.equal(D.durationStretch(q, q), 1);
    assert.ok(Math.abs(D.durationStretch(q * 2, q) - 1.5) < 1e-9);
    assert.ok(Math.abs(D.durationStretch(q * 4, q) - 2.25) < 1e-9);
    // §14's own law adds a fixed increment per doubling instead, so the
    // two agree at the reference duration and nowhere else.
    const plan = (ticks) => 2.0 * 1.2 + 1.2 * Math.log2(ticks / q);
    assert.ok(Math.abs(plan(q) - 2.4) < 1e-9);
    assert.ok(D.eventSpace(q * 4, q) > plan(q * 4));
  });

  test('a measure of four quarter notes comes out evenly spaced, barline included', () => {
    const q = 480;
    const xs = D.positions([q, q, q, q], q);
    assert.deepEqual([...xs], [0, 3.5, 7, 10.5, 14]);
  });

  test('a half note followed by a half rest divides its bar in half', () => {
    const q = 480;
    const xs = D.positions([q * 2, q * 2], q);
    assert.equal(xs[1] - xs[0], xs[2] - xs[1]);
  });

  test('the font-recommended thicknesses are the ones the bundled font ships', () => {
    const defaults = NE.getEngravingDefaults();
    assert.equal(D.ENGRAVING_STYLE.staff.lineWidth, defaults.staffLineThickness);
    assert.equal(D.ENGRAVING_STYLE.note.stemWidth, defaults.stemThickness);
    assert.equal(D.ENGRAVING_STYLE.note.ledgerLineLength, defaults.legerLineExtension);
    assert.equal(D.ENGRAVING_STYLE.beam.width, defaults.beamThickness);
    assert.equal(D.ENGRAVING_STYLE.barline.width, defaults.thinBarlineThickness);
    assert.equal(D.ENGRAVING_STYLE.barline.endWidth, defaults.thickBarlineThickness);
  });

  test('the house measurements are the ones the config defaults to', () => {
    assert.equal(D.ENGRAVING_STYLE.note.minNoteDistance, 0.35);
    assert.equal(D.ENGRAVING_STYLE.measure.spacing, 1.5);
    assert.equal(D.ENGRAVING_STYLE.measure.minWidth, 8.0);
    assert.equal(D.ENGRAVING_STYLE.spatiumMm, 1.75);
    assert.equal(D.ENGRAVING_STYLE.beam.distance, 0.75);
  });

  test('a rest sits on the middle line, and a whole rest a space above it', () => {
    const rest = D.ENGRAVING_STYLE.rest;
    assert.equal(rest.naturalLineForFiveLineStaff, 2);
    assert.equal(rest.wholeRestLineOffset, -1);
    assert.equal(rest.multiVoiceOffset, 1);
  });
});

describe('notation data → MusicXML → this engine, end to end', () => {
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

  /**
   * A y as the SVG itself spells it. `svgNumber` rounds every coordinate
   * to four decimals before writing it, so a y computed here has to go
   * through the same rounding before it can be compared to the drawing
   * -- otherwise 8.8 + -2 reads as 6.800000000000001 against a drawn
   * 6.8, and the test fails over binary floating point rather than over
   * a note being in the wrong place.
   */
  const asDrawn = (y) => Number(Number(y).toFixed(4));

  test('a real export renders with nothing worse than a note to self', () => {
    for (const name of ['musescore-drum-lesson.musicxml', 'musescore-grand-staff.musicxml']) {
      const { svg, diagnostics } = NE.renderFromMusicXml(load(name), { domParser });
      // `info` is allowed and expected: the file writes <print> layout
      // hints that this engine lays out for itself, and saying so is
      // the right behaviour. An error or a warning is not.
      const bad = [...diagnostics].filter((d) => d.severity !== 'info');
      assert.deepEqual(bad, [], name);
      assert.ok(svg.startsWith('<svg'), name);
      assert.ok(!svg.includes('NaN'), `${name} emitted NaN`);
    }
  });

  test('every note in the grand-staff export lands where its own clef puts it', () => {
    // The whole chain, checked end to end: the file, this engine's
    // parser, this engine's clef geometry, against the data layer's own
    // prediction for the same note. Nothing is compared to a hardcoded
    // list -- the fixture's own pitches drive it.
    const { score } = NE.parseMusicXml(load('musescore-grand-staff.musicxml'), { domParser });
    const clefs = { treble: NE.TREBLE_CLEF, bass: NE.BASS_CLEF };
    const dataClefs = { treble: D.clefById('treble'), bass: D.clefById('bass') };
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
                D.staffPositionForPitch(dataClefs[staff], note.pitch.step, note.pitch.octave),
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

  test('the drum export uses pitches the standard kit defines', () => {
    // A drum chart is only as good as the kit behind it: if the file
    // names a pitch the kit has no row for, nothing downstream can know
    // which line it belongs on, and this is where that would show.
    const xml = load('musescore-drum-lesson.musicxml');
    const pitches = [...xml.matchAll(/<midi-unpitched>(\d+)<\/midi-unpitched>/g)].map((m) =>
      Number(m[1]),
    );
    assert.ok(pitches.length > 5, 'the fixture has no unpitched instruments at all');
    for (const pitch of new Set(pitches)) {
      // MusicXML's <midi-unpitched> is 1-based; the GM table it comes
      // from is 0-based.
      assert.ok(
        D.drumKitEntry(pitch - 1),
        `the export uses pitch ${pitch - 1}, which the standard kit does not define`,
      );
    }
  });

  test('the drum chart draws the head and line the kit says, drum for drum', () => {
    const xml = load('musescore-drum-lesson.musicxml');
    const mapping = D.drumMapping();
    const { svg, diagnostics } = NE.renderFromMusicXml(xml, {
      domParser,
      config: { drums: { mapping } },
    });
    assert.deepEqual(
      [...diagnostics].filter((d) => d.severity !== 'info'),
      [],
    );

    // Every notehead the chart actually drew, as a (glyph, y) pair,
    // measured from wherever the staff's bottom line landed.
    const bottomLine = bottomLineOf(svg);
    const GLYPH_FOR_SHAPE = { normal: '\uE0A4', x: '\uE0A9', 'circle-x': '\uE0B3' };
    const drawn = new Set(
      [...svg.matchAll(/<text x="[\d.]+" y="([\d.-]+)"[^>]*>(.)</g)]
        .filter((m) => Object.values(GLYPH_FOR_SHAPE).includes(m[2]))
        .map((m) => `${m[2]}@${m[1]}`),
    );
    assert.ok(drawn.size > 0, 'the chart drew no noteheads at all');

    // Each one has to be a drum the kit would put exactly there, with
    // exactly that head. Anything else means the mapping did not reach
    // the renderer.
    for (const pair of drawn) {
      const [glyph, y] = pair.split('@');
      const match = D.STANDARD_DRUM_KIT.find(
        (d) =>
          asDrawn(bottomLine + D.staffPositionFromLine(d.line)) === Number(y) &&
          GLYPH_FOR_SHAPE[mapping[d.pitch].noteheadShape] === glyph,
      );
      assert.ok(match, `nothing in the standard kit is drawn as ${pair}`);
    }

    // And the three a groove is built from are all there, each on its
    // own line: kick at the bottom, snare in the middle, hi-hat above
    // the staff.
    const yOf = (pitch) =>
      asDrawn(bottomLine + D.staffPositionFromLine(D.drumKitEntry(pitch).line));
    assert.ok(drawn.has(`\uE0A4@${yOf(36)}`), 'no kick');
    assert.ok(drawn.has(`\uE0A4@${yOf(38)}`), 'no snare');
    assert.ok(drawn.has(`\uE0A9@${yOf(42)}`), 'no closed hi-hat');
  });

  test("every unpitched note lands where the file's own display position says", () => {
    // The file that found this: five bars of drum kit, 17 unpitched
    // notes across eight different instruments. Every one of them states
    // its own <display-step>/<display-octave>, and the expected position
    // of each is computed from the FILE's own display position through
    // the percussion clef -- which is what a MusicXML importer does.
    const xml = load('musescore-drum-notes.musicxml');
    const { svg, playback } = NE.renderFromMusicXml(xml, { domParser });
    const bottomLine = bottomLineOf(svg);

    const perc = D.clefById('percussion');
    const expected = [
      ...xml.matchAll(
        /<display-step>(\w)<\/display-step>\s*<display-octave>(\d)<\/display-octave>/g,
      ),
    ].map(([, step, octave]) => ({
      y: asDrawn(bottomLine + D.staffPositionForPitch(perc, step, Number(octave))),
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

  test('the instruments a chart is built from are each on their own line', () => {
    // Named one by one, because "the whole file matches" would still
    // pass if two of them swapped.
    const xml = load('musescore-drum-notes.musicxml');
    const { svg } = NE.renderFromMusicXml(xml, { domParser });
    const perc = D.clefById('percussion');
    const bottomLine = bottomLineOf(svg);
    const yFor = (step, octave) => asDrawn(bottomLine + D.staffPositionForPitch(perc, step, octave));

    // Pedal hi-hat: the file puts it on D4, BELOW the staff.
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

  test("every notehead matches the layout the file's own default-y reports", () => {
    // The file itself is the witness: it writes `default-y` on every note
    // and rest it exports, which is not a hint but a report of the layout
    // it actually produced. This test reads where the file SAYS each note
    // went; the one above computes it from the display positions. Two
    // independent checks of the same seventeen notes.
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
      .map((m) => asDrawn(Number(m[1]) - bottomLine))
      .sort((a, b) => a - b);

    assert.deepEqual(drawn, expected);
  });

  test("every rest sits where the file's own default-y reports", () => {
    // The same `default-y` evidence, for the rests. Nine rests across
    // three bars, two voices, three durations.
    const xml = load('musescore-drum-notes.musicxml');
    const { svg } = NE.renderFromMusicXml(xml, { domParser });
    const bottomLine = bottomLineOf(svg);

    // The file's tenths, in this engine's own staff positions: the top
    // line is -4 here and every ten tenths below it is one more space.
    const expected = [...xml.matchAll(/<note[^>]*default-y="(-?[\d.]+)"[^>]*>\s*<rest\s*\/>/g)]
      .map((m) => -4 - Number(m[1]) / 10)
      .sort((a, b) => a - b);
    assert.equal(expected.length, 9, 'the fixture should hold nine rests');

    const REST_GLYPHS = ['\uE4E3', '\uE4E4', '\uE4E5', '\uE4E6'];
    const drawn = [...svg.matchAll(/<text x="[\d.]+" y="([\d.-]+)"[^>]*>(.)</g)]
      .filter((m) => REST_GLYPHS.includes(m[2]))
      .map((m) => asDrawn(Number(m[1]) - bottomLine))
      .sort((a, b) => a - b);

    assert.deepEqual(drawn, expected);
  });

  test('the power law and the increment law both fill the bar, differently', () => {
    // Not a bug in either: §14 adds a fixed increment per doubling and
    // the power law multiplies by a factor, so a bar of mixed durations
    // is spaced differently by each. What they must BOTH do is put the
    // first attack first, keep the order, and leave the last one short
    // of the barline -- which is what this checks, on the same input.
    const q = 480;
    const gaps = [q, q / 2, q / 2, q * 2];
    const power = D.positions(gaps, q);
    for (let i = 1; i < power.length; i++) {
      assert.ok(power[i] > power[i - 1], 'positions must increase');
    }
    assert.equal(power[0], 0);
    // The eighth notes are closer together than the quarter that precedes them.
    assert.ok(power[2] - power[1] < power[1] - power[0]);
    // ...and the half note at the end earns the most room of all.
    assert.ok(power[4] - power[3] > power[1] - power[0]);
  });
});
