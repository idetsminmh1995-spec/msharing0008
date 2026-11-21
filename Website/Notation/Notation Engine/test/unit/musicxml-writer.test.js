import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const NE = loadEngine();
const DOMParser = testDomParser();

/**
 * `writeMusicXml` is the save path: the editor keeps a user's work as a
 * `ParseResult` and this turns it back into a file. Two things have to
 * survive that trip -- the notes, and a drum note's identity, which lives in
 * `<instrument id>` plus the part's `<midi-instrument>` table rather than in
 * the note's unpitched display position.
 */

const percussionInstrument = (id, name, gmNote) =>
  `<score-instrument id="${id}"><instrument-name>${name}</instrument-name></score-instrument>` +
  `<midi-instrument id="${id}"><midi-channel>10</midi-channel>` +
  `<midi-program>1</midi-program><midi-unpitched>${gmNote + 1}</midi-unpitched></midi-instrument>`;

const DRUM_XML =
  '<?xml version="1.0"?>' +
  '<score-partwise version="4.0">' +
  '<work><work-title>Kit</work-title></work>' +
  '<part-list><score-part id="P1"><part-name>Drums</part-name>' +
  percussionInstrument('I36', 'Bass Drum', 36) +
  percussionInstrument('I38', 'Snare', 38) +
  percussionInstrument('I42', 'Closed Hi-Hat', 42) +
  '</score-part></part-list>' +
  '<part id="P1"><measure number="1">' +
  '<attributes><divisions>2</divisions><key><fifths>0</fifths></key>' +
  '<time><beats>4</beats><beat-type>4</beat-type></time>' +
  '<clef><sign>percussion</sign><line>2</line></clef></attributes>' +
  '<note><unpitched><display-step>F</display-step><display-octave>4</display-octave></unpitched>' +
  '<duration>2</duration><voice>1</voice><type>quarter</type><instrument id="I36"/></note>' +
  '<note><chord/><unpitched><display-step>C</display-step><display-octave>5</display-octave></unpitched>' +
  '<duration>2</duration><voice>1</voice><type>quarter</type><instrument id="I38"/></note>' +
  '<note><unpitched><display-step>G</display-step><display-octave>5</display-octave></unpitched>' +
  '<duration>2</duration><voice>1</voice><type>quarter</type><instrument id="I42"/></note>' +
  '<note><rest/><duration>4</duration><voice>1</voice><type>half</type></note>' +
  '</measure></part></score-partwise>';

describe('writeMusicXml (the engine owns the save path)', () => {
  test('a drum note keeps the instrument that names it, and its part keeps the routing that sounds it', () => {
    const parsed = NE.parseMusicXml(DRUM_XML, { domParser: DOMParser });
    const written = NE.writeMusicXml(parsed);

    // A drum's identity is the instrument it names -- without this element
    // a reopened score has no idea which line is a kick and which a snare.
    assert.match(written, /<instrument id="I36"\/>/);
    assert.match(written, /<instrument id="I38"\/>/);
    assert.match(written, /<instrument id="I42"\/>/);
    // And the part's MIDI routing, without which nothing sounds.
    assert.match(written, /<midi-unpitched>37<\/midi-unpitched>/);
    assert.match(written, /<midi-unpitched>39<\/midi-unpitched>/);
    assert.match(written, /<midi-unpitched>43<\/midi-unpitched>/);
    assert.match(written, /<midi-channel>10<\/midi-channel>/);

    // The engine reads its own writing back to the same instruments and the
    // same GM notes, which is what makes the drums audible again.
    const reread = NE.parseMusicXml(written, { domParser: DOMParser });
    const events = reread.score.parts[0].measures[0].voices[0].events;
    const ids = events.map((event) =>
      event.kind === 'chord'
        ? event.notes.map((note) => note.instrumentId)
        : (event.instrumentId ?? null),
    );
    assert.deepEqual(JSON.parse(JSON.stringify(ids)), [['I36', 'I38'], 'I42', null]);

    const kit = reread.midiInstrumentsByPart.get('P1');
    assert.equal(kit.get('I36'), 36);
    assert.equal(kit.get('I38'), 38);
    assert.equal(kit.get('I42'), 42);

    // The proof the bug is fixed: playback still addresses the right drums.
    const rendered = NE.renderParsedMusicXml(reread, {});
    const midiNotes = rendered.playback.events
      .map((event) => event.midiNotes)
      .filter((notes) => notes !== undefined);
    assert.deepEqual(JSON.parse(JSON.stringify(midiNotes)), [[36, 38], [42]]);
  });

  test('the drum names in the part list are the standard kit names, not the part name repeated', () => {
    const written = NE.writeMusicXml(NE.parseMusicXml(DRUM_XML, { domParser: DOMParser }));
    assert.match(written, /<instrument-name>Acoustic Snare<\/instrument-name>/);
    assert.match(written, /<instrument-name>Closed Hi-Hat<\/instrument-name>/);
  });

  test('what the writer emits, the reader reads back to the same notes and marks', () => {
    const source =
      '<?xml version="1.0"?>' +
      '<score-partwise version="4.0"><part-list>' +
      '<score-part id="P1"><part-name>Piano</part-name></score-part></part-list>' +
      '<part id="P1"><measure number="1">' +
      '<attributes><divisions>4</divisions><key><fifths>-2</fifths><mode>minor</mode></key>' +
      '<time><beats>3</beats><beat-type>4</beat-type></time>' +
      '<clef><sign>G</sign><line>2</line></clef></attributes>' +
      '<note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch>' +
      '<duration>4</duration><voice>1</voice><type>quarter</type><accidental>sharp</accidental>' +
      '<stem>up</stem><notations><slur type="start" number="1"/>' +
      '<articulations><staccato/></articulations></notations></note>' +
      '<note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration>' +
      '<tie type="start"/><voice>1</voice><type>quarter</type>' +
      '<notations><tied type="start"/><slur type="stop" number="1"/></notations></note>' +
      '<note><rest/><duration>4</duration><voice>1</voice><type>quarter</type></note>' +
      '</measure></part></score-partwise>';

    const written = NE.writeMusicXml(NE.parseMusicXml(source, { domParser: DOMParser }));
    const reread = NE.parseMusicXml(written, { domParser: DOMParser });
    const events = reread.score.parts[0].measures[0].voices[0].events;

    assert.equal(events[0].pitch.step, 'F');
    assert.equal(events[0].pitch.alter, 1);
    assert.equal(events[0].pitch.octave, 4);
    assert.equal(events[0].explicitStemDirection, 'up');
    assert.deepEqual(JSON.parse(JSON.stringify(events[0].slurStarts)), [1]);
    assert.deepEqual(JSON.parse(JSON.stringify(events[0].articulations)), ['staccato']);
    assert.equal(events[1].tieStart, true);
    assert.deepEqual(JSON.parse(JSON.stringify(events[1].slurStops)), [1]);
    assert.equal(events[2].kind, 'rest');

    const attribute = reread.attributes.find((a) => a.partId === 'P1' && a.measureNumber === 1);
    assert.equal(attribute.fifths, -2);
    assert.equal(attribute.mode, 'minor');
    assert.equal(attribute.timeNumerator, 3);
    assert.equal(attribute.timeDenominator, 4);
    assert.equal(attribute.clefSign, 'G');

    const rendered = NE.renderParsedMusicXml(reread, {});
    assert.deepEqual(
      JSON.parse(
        JSON.stringify(
          rendered.diagnostics.filter((d) => d.severity !== 'info').map((d) => d.code),
        ),
      ),
      [],
    );
  });

  test('a gap in a voice is written as a forward, so the note after it keeps its beat', () => {
    const source =
      '<?xml version="1.0"?>' +
      '<score-partwise version="4.0"><part-list>' +
      '<score-part id="P1"><part-name>Drums</part-name></score-part></part-list>' +
      '<part id="P1"><measure number="1">' +
      '<attributes><divisions>2</divisions><key><fifths>0</fifths></key>' +
      '<time><beats>4</beats><beat-type>4</beat-type></time></attributes>' +
      '<note><unpitched><display-step>F</display-step><display-octave>4</display-octave></unpitched>' +
      '<duration>2</duration><voice>1</voice><type>quarter</type></note>' +
      '<forward><duration>4</duration></forward>' +
      '<note><unpitched><display-step>F</display-step><display-octave>4</display-octave></unpitched>' +
      '<duration>2</duration><voice>1</voice><type>quarter</type></note>' +
      '</measure></part></score-partwise>';

    const parsed = NE.parseMusicXml(source, { domParser: DOMParser });
    const written = NE.writeMusicXml(parsed);
    assert.match(written, /<forward><duration>8<\/duration><\/forward>/);

    const reread = NE.parseMusicXml(written, { domParser: DOMParser });
    const starts = reread.score.parts[0].measures[0].voices[0].events.map((e) => e.startTick);
    assert.deepEqual(JSON.parse(JSON.stringify(starts)), [0, 3 * NE.TICKS_PER_QUARTER]);
  });
});

/**
 * The side-tables the reader keeps attach to a POSITION in a bar, not to a
 * note, so they had nowhere to go in the writer and were silently dropped.
 * Every one of them is load-bearing on a re-read: without its repeats a
 * score plays straight through, without its tempo marks it plays at the
 * wrong speed, and without its chord symbols a lead sheet is gone.
 */
describe('the writer keeps the markings that attach to a position', () => {
  const measure = (number, inner) => `<measure number="${number}">${inner}</measure>`;
  const ATTRIBUTES =
    '<attributes><divisions>4</divisions><key><fifths>0</fifths></key>' +
    '<time><beats>4</beats><beat-type>4</beat-type></time>' +
    '<clef><sign>G</sign><line>2</line></clef></attributes>';
  const whole = (step) =>
    `<note><pitch><step>${step}</step><octave>5</octave></pitch>` +
    '<duration>16</duration><voice>1</voice><type>whole</type></note>';
  const score = (...measures) =>
    '<?xml version="1.0"?><score-partwise version="4.0"><part-list>' +
    '<score-part id="P1"><part-name>Lead</part-name></score-part></part-list>' +
    `<part id="P1">${measures.join('')}</part></score-partwise>`;

  /** Parsed, written, and read back -- the round trip the save path takes. */
  const roundTrip = (xml) => {
    const before = NE.parseMusicXml(xml, { domParser: DOMParser });
    const written = NE.writeMusicXml(before);
    return { before, written, after: NE.parseMusicXml(written, { domParser: DOMParser }) };
  };

  test('a repeat barline survives, so the saved score still plays it twice', () => {
    const { written, after } = roundTrip(
      score(
        measure(1, ATTRIBUTES + whole('C')),
        measure(
          2,
          whole('D') +
            '<barline location="right"><bar-style>light-heavy</bar-style>' +
            '<repeat direction="backward" times="3"/></barline>',
        ),
      ),
    );
    assert.match(written, /<barline><bar-style>light-heavy<\/bar-style>/);
    assert.match(written, /<repeat direction="backward" times="3"\/>/);

    const attribute = after.attributes.find((a) => a.measureNumber === 2);
    assert.equal(attribute.barlineStyle, 'light-heavy');
    assert.equal(attribute.repeatDirection, 'backward');
    assert.equal(attribute.repeatTimes, 3);
    assert.equal(NE.renderParsedMusicXml(after, { domParser: DOMParser }).playback.performance.hasRepeats, true);
  });

  test('a forward repeat on a left-edge barline survives', () => {
    const { after } = roundTrip(
      score(
        measure(
          1,
          ATTRIBUTES +
            '<barline location="left"><bar-style>heavy-light</bar-style>' +
            '<repeat direction="forward"/></barline>' +
            whole('C'),
        ),
        measure(2, whole('D')),
      ),
    );
    const attribute = after.attributes.find((a) => a.measureNumber === 1);
    assert.equal(attribute.leftBarlineStyle, 'heavy-light');
    assert.equal(attribute.leftRepeatDirection, 'forward');
  });

  test('a volta (ending) survives with its numbers and type', () => {
    const { after } = roundTrip(
      score(
        measure(
          1,
          ATTRIBUTES +
            whole('C') +
            '<barline location="right"><ending number="1,2" type="stop"/>' +
            '<repeat direction="backward"/></barline>',
        ),
      ),
    );
    const attribute = after.attributes.find((a) => a.measureNumber === 1);
    assert.deepEqual(JSON.parse(JSON.stringify(attribute.endingNumbers)), [1, 2]);
    assert.equal(attribute.endingType, 'stop');
    assert.equal(attribute.repeatDirection, 'backward');
  });

  test('a metronome mark survives, with the tempo a synthesiser reads', () => {
    const { written, after } = roundTrip(
      score(
        measure(
          1,
          ATTRIBUTES +
            '<direction><direction-type><metronome><beat-unit>quarter</beat-unit>' +
            '<per-minute>96</per-minute></metronome></direction-type>' +
            '<sound tempo="96"/></direction>' +
            whole('C'),
        ),
      ),
    );
    assert.match(written, /<metronome><beat-unit>quarter<\/beat-unit><per-minute>96<\/per-minute>/);
    assert.match(written, /<sound tempo="96"\/>/);
    assert.equal(after.tempoMarks.length, 1);
    assert.equal(after.tempoMarks[0].perMinute, 96);
    assert.equal(after.tempoMarks[0].beatUnit, 'quarter');
  });

  test('a dotted beat unit keeps its dots and its quarter-note tempo', () => {
    const { written, after } = roundTrip(
      score(
        measure(
          1,
          ATTRIBUTES +
            '<direction><direction-type><metronome><beat-unit>quarter</beat-unit>' +
            '<beat-unit-dot/><per-minute>60</per-minute></metronome></direction-type></direction>' +
            whole('C'),
        ),
      ),
    );
    // A dotted quarter at 60 is 90 quarter notes a minute.
    assert.match(written, /<sound tempo="90"\/>/);
    assert.equal(after.tempoMarks[0].beatUnitDots, 1);
  });

  test('dynamics, a wedge, words and a rehearsal mark all survive', () => {
    const { after } = roundTrip(
      score(
        measure(
          1,
          ATTRIBUTES +
            '<direction placement="above"><direction-type><rehearsal>Verse</rehearsal>' +
            '</direction-type><staff>1</staff></direction>' +
            '<direction placement="below"><direction-type><dynamics><mf/></dynamics>' +
            '</direction-type><staff>1</staff></direction>' +
            '<direction placement="below"><direction-type><wedge type="crescendo" number="1"/>' +
            '</direction-type><staff>1</staff></direction>' +
            '<direction placement="below"><direction-type><words>dolce</words>' +
            '</direction-type><staff>1</staff></direction>' +
            whole('C'),
        ),
      ),
    );
    const all = after.directions;
    assert.deepEqual(JSON.parse(JSON.stringify(all.flatMap((d) => d.dynamics))), ['mf']);
    assert.deepEqual(JSON.parse(JSON.stringify(all.flatMap((d) => d.wedges))), [
      { type: 'crescendo', number: 1 },
    ]);
    assert.deepEqual(JSON.parse(JSON.stringify(all.flatMap((d) => d.words))), ['dolce']);
    assert.deepEqual(JSON.parse(JSON.stringify(all.flatMap((d) => d.rehearsals))), ['Verse']);
    assert.equal(all.find((d) => d.rehearsals.length > 0)?.placement, 'above');
    assert.equal(all.find((d) => d.dynamics.length > 0)?.placement, 'below');
  });

  test('a pedal line survives, both the start and the stop', () => {
    const { after } = roundTrip(
      score(
        measure(
          1,
          ATTRIBUTES +
            '<direction placement="below"><direction-type><pedal type="start" number="1"/>' +
            '</direction-type><staff>1</staff></direction>' +
            whole('C'),
        ),
        measure(
          2,
          '<direction placement="below"><direction-type><pedal type="stop" number="1"/>' +
            '</direction-type><staff>1</staff></direction>' +
            whole('D'),
        ),
      ),
    );
    const pedals = after.directions.flatMap((d) => d.pedals);
    assert.deepEqual(JSON.parse(JSON.stringify(pedals)), [
      { type: 'start', number: 1 },
      { type: 'stop', number: 1 },
    ]);
  });

  test('an octave shift survives, and stays a shift rather than becoming a transposition', () => {
    const { after } = roundTrip(
      score(
        measure(
          1,
          ATTRIBUTES +
            '<direction placement="above"><direction-type>' +
            '<octave-shift type="up" size="8" number="1"/></direction-type><staff>1</staff></direction>' +
            whole('C'),
        ),
        measure(
          2,
          '<direction placement="above"><direction-type>' +
            '<octave-shift type="stop" size="8" number="1"/></direction-type><staff>1</staff></direction>' +
            whole('D'),
        ),
      ),
    );
    assert.deepEqual(JSON.parse(JSON.stringify(after.octaveShifts)), [
      { partId: 'P1', measureNumber: 1, tick: 0, staff: 1, type: 'up', size: 8, number: 1 },
      { partId: 'P1', measureNumber: 2, tick: 0, staff: 1, type: 'stop', size: 8, number: 1 },
    ]);
  });

  test('a chord symbol survives, including its display text and its bass', () => {
    const { written, after } = roundTrip(
      score(
        measure(
          1,
          ATTRIBUTES +
            '<harmony><root><root-step>C</root-step></root>' +
            '<kind text="m7">minor-seventh</kind>' +
            '<bass><bass-step>E</bass-step></bass></harmony>' +
            whole('C'),
        ),
      ),
    );
    assert.match(written, /<kind text="m7">minor-seventh<\/kind>/);
    assert.equal(after.harmonies.length, 1);
    assert.equal(after.harmonies[0].rootStep, 'C');
    assert.equal(after.harmonies[0].kind, 'minor-seventh');
    assert.equal(after.harmonies[0].kindText, 'm7');
    assert.equal(after.harmonies[0].bassStep, 'E');
  });

  test("a <print>'s system break and layout hints survive, in staff spaces", () => {
    const { written, after } = roundTrip(
      score(
        measure(
          1,
          '<print new-system="yes"><system-layout>' +
            '<system-distance>120</system-distance></system-layout></print>' +
            ATTRIBUTES +
            whole('C'),
        ),
      ),
    );
    // MusicXML writes tenths, the engine keeps staff spaces.
    assert.match(written, /<system-distance>120<\/system-distance>/);
    assert.equal(after.prints.length, 1);
    assert.equal(after.prints[0].newSystem, true);
    assert.equal(after.prints[0].layout.systemDistance, 12);
  });
});

/**
 * A grand staff states one clef per staff. Writing only the first collapses
 * a piano's bass staff onto its treble staff, so a saved and reopened piano
 * score came back with two treble staves.
 */
describe('the writer keeps a grand staff grand', () => {
  const GRAND = `<?xml version="1.0"?><score-partwise version="4.0"><part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
    <part id="P1"><measure number="1">
      <attributes><divisions>4</divisions><key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef></attributes>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>16</duration>
        <voice>1</voice><type>whole</type><staff>1</staff></note>
      <backup><duration>16</duration></backup>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>16</duration>
        <voice>5</voice><type>whole</type><staff>2</staff></note>
    </measure></part></score-partwise>`;

  test('both staves keep their own clef', () => {
    const before = NE.parseMusicXml(GRAND, { domParser: DOMParser });
    const written = NE.writeMusicXml(before);
    const after = NE.parseMusicXml(written, { domParser: DOMParser });
    assert.deepEqual(JSON.parse(JSON.stringify(after.attributes[0].clefsByStaff)), {
      1: { sign: 'G', line: 2 },
      2: { sign: 'F', line: 4 },
    });
    assert.equal(after.attributes[0].staves, 2);
    assert.equal(after.attributes[0].clefSign, 'G', 'staff 1 is still the part’s headline clef');
  });

  test('a single-staff part writes one unnumbered clef, not the same clef twice', () => {
    const source = `<?xml version="1.0"?><score-partwise version="4.0"><part-list>
      <score-part id="P1"><part-name>Lead</part-name></score-part></part-list>
      <part id="P1"><measure number="1">
        <attributes><divisions>4</divisions><key><fifths>0</fifths></key>
          <time><beats>4</beats><beat-type>4</beat-type></time>
          <clef><sign>G</sign><line>2</line></clef></attributes>
        <note><pitch><step>C</step><octave>5</octave></pitch><duration>16</duration>
          <voice>1</voice><type>whole</type></note>
      </measure></part></score-partwise>`;
    const written = NE.writeMusicXml(NE.parseMusicXml(source, { domParser: DOMParser }));
    assert.equal(written.match(/<clef>/g)?.length, 1);
    assert.equal(written.match(/<clef number=/g), null);
  });

  test('a transposing part keeps its <transpose>', () => {
    const source = `<?xml version="1.0"?><score-partwise version="4.0"><part-list>
      <score-part id="P1"><part-name>Clarinet</part-name></score-part></part-list>
      <part id="P1"><measure number="1">
        <attributes><divisions>4</divisions><key><fifths>0</fifths></key>
          <time><beats>4</beats><beat-type>4</beat-type></time>
          <clef><sign>G</sign><line>2</line></clef>
          <transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose></attributes>
        <note><pitch><step>C</step><octave>5</octave></pitch><duration>16</duration>
          <voice>1</voice><type>whole</type></note>
      </measure></part></score-partwise>`;
    const written = NE.writeMusicXml(NE.parseMusicXml(source, { domParser: DOMParser }));
    assert.match(written, /<transpose><diatonic>-1<\/diatonic><chromatic>-2<\/chromatic><\/transpose>/);
  });

  test('a part with no <transpose> gains none: zero is the parser’s default, not a fact', () => {
    const source = `<?xml version="1.0"?><score-partwise version="4.0"><part-list>
      <score-part id="P1"><part-name>Lead</part-name></score-part></part-list>
      <part id="P1"><measure number="1">
        <attributes><divisions>4</divisions><key><fifths>0</fifths></key>
          <time><beats>4</beats><beat-type>4</beat-type></time>
          <clef><sign>G</sign><line>2</line></clef></attributes>
        <note><pitch><step>C</step><octave>5</octave></pitch><duration>16</duration>
          <voice>1</voice><type>whole</type></note>
      </measure></part></score-partwise>`;
    const written = NE.writeMusicXml(NE.parseMusicXml(source, { domParser: DOMParser }));
    assert.equal(written.includes('<transpose>'), false);
  });

  test('a tab staff keeps its six lines', () => {
    const source = `<?xml version="1.0"?><score-partwise version="4.0"><part-list>
      <score-part id="P1"><part-name>Guitar</part-name></score-part></part-list>
      <part id="P1"><measure number="1">
        <attributes><divisions>4</divisions><key><fifths>0</fifths></key>
          <time><beats>4</beats><beat-type>4</beat-type></time>
          <staff-details number="1"><staff-lines>6</staff-lines></staff-details>
          <clef><sign>TAB</sign><line>5</line></clef></attributes>
        <note><pitch><step>E</step><octave>4</octave></pitch><duration>16</duration>
          <voice>1</voice><type>whole</type></note>
      </measure></part></score-partwise>`;
    const written = NE.writeMusicXml(NE.parseMusicXml(source, { domParser: DOMParser }));
    assert.match(written, /<staff-details number="1"><staff-lines>6<\/staff-lines><\/staff-details>/);
  });
});

/**
 * A note is more than its pitch and duration. Everything a writer drew --
 * a grace note, a triplet's ratio, a lyric, a fingering, a tremolo -- lives
 * only in the file, so a save that drops it destroys work the page still
 * shows. Each case below is one such mark: write it, read it back, and
 * require the note to come out the same.
 */
describe('note-level marks survive a write/read round trip', () => {
  const ATTRIBUTES =
    '<attributes><divisions>4</divisions><key><fifths>0</fifths></key>' +
    '<time><beats>4</beats><beat-type>4</beat-type></time>' +
    '<clef><sign>G</sign><line>2</line></clef></attributes>';

  /** Parse a one-note score, write it back, parse that, and return both notes. */
  function roundTrip(noteXml) {
    const source =
      '<?xml version="1.0"?><score-partwise version="4.0"><part-list>' +
      '<score-part id="P1"><part-name>M</part-name></score-part></part-list>' +
      `<part id="P1"><measure number="1">${ATTRIBUTES}${noteXml}</measure></part></score-partwise>`;
    const first = NE.parseMusicXml(source, { domParser: DOMParser });
    const written = NE.writeMusicXml(first);
    const second = NE.parseMusicXml(written, { domParser: DOMParser });
    return {
      before: first.score.parts[0].measures[0].voices[0].events[0],
      after: second.score.parts[0].measures[0].voices[0].events[0],
      written,
      diagnostics: second.diagnostics,
    };
  }

  const pitch = (step, octave, alter) =>
    `<pitch><step>${step}</step>${alter === undefined ? '' : `<alter>${alter}</alter>`}` +
    `<octave>${octave}</octave></pitch>`;

  const whole = (inner, extra = '') =>
    `<note>${inner}<duration>16</duration><voice>1</voice><type>whole</type>${extra}</note>`;

  test('a grace note keeps both its grace-ness and its slash', () => {
    const { before, after, written } = roundTrip(
      `<note><grace slash="yes"/><pitch><step>C</step><octave>5</octave></pitch>` +
        '<voice>1</voice><type>eighth</type></note>',
    );
    assert.equal(before.isGrace, true);
    assert.equal(after.isGrace, true, 'a grace note must not come back as an ordinary note');
    assert.equal(after.graceSlash, true);
    assert.match(written, /<grace slash="yes"\/>/);
  });

  test('a cue note stays a cue note', () => {
    const { after, written } = roundTrip(whole(pitch('C', 5), '') .replace('<note>', '<note><cue/>'));
    assert.equal(after.isCue, true);
    assert.match(written, /<cue\/>/);
  });

  test('a triplet keeps its ratio, so the bar still adds up', () => {
    const { before, after, written } = roundTrip(
      '<note>' +
        pitch('C', 5) +
        '<duration>2</duration><voice>1</voice><type>eighth</type>' +
        '<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>' +
        '<notations><tuplet type="start"/></notations></note>',
    );
    assert.deepEqual({ ...before.duration.tuplet }, { actualNotes: 3, normalNotes: 2 });
    assert.deepEqual(
      { ...after.duration.tuplet },
      { actualNotes: 3, normalNotes: 2 },
      'without the ratio the triplet reads back as three plain eighths',
    );
    assert.equal(after.tupletStart, true);
    assert.match(written, /<time-modification><actual-notes>3<\/actual-notes><normal-notes>2<\/normal-notes><\/time-modification>/);
  });

  test('a lyric keeps its syllable, its text and its extender', () => {
    const { after, written } = roundTrip(
      whole(
        pitch('C', 5),
        '<lyric number="1"><syllabic>begin</syllabic><text>la</text><extend/></lyric>',
      ),
    );
    assert.deepEqual(JSON.parse(JSON.stringify(after.lyrics)), [
      { number: 1, text: 'la', syllabic: 'begin', extend: true },
    ]);
    assert.match(written, /<lyric number="1"><syllabic>begin<\/syllabic><text>la<\/text><extend\/><\/lyric>/);
  });

  test('a lyric with XML-significant characters stays readable', () => {
    const { after } = roundTrip(
      whole(pitch('C', 5), '<lyric number="1"><text>a &amp; b &lt;c&gt;</text></lyric>'),
    );
    assert.equal(after.lyrics?.[0]?.text, 'a & b <c>');
  });

  test('an explicit notehead keeps its shape, fill and parentheses', () => {
    const { after, written } = roundTrip(
      whole(pitch('C', 5), '<notehead filled="no" parentheses="yes">diamond</notehead>'),
    );
    assert.equal(after.explicitNotehead, 'diamond');
    assert.equal(after.noteheadFilled, false);
    assert.equal(after.noteheadParentheses, true);
    assert.match(written, /<notehead filled="no" parentheses="yes">diamond<\/notehead>/);
  });

  test('beam hints keep their order and their numbers', () => {
    const { after, written } = roundTrip(
      '<note>' +
        pitch('C', 5) +
        '<duration>2</duration><voice>1</voice><type>eighth</type>' +
        '<beam number="1">begin</beam><beam number="2">forward hook</beam></note>',
    );
    assert.deepEqual(JSON.parse(JSON.stringify(after.beams)), [
      { number: 1, value: 'begin' },
      { number: 2, value: 'forward hook' },
    ]);
    assert.match(written, /<beam number="1">begin<\/beam><beam number="2">forward hook<\/beam>/);
  });

  test('a tremolo keeps its stroke count and type', () => {
    const { after, written } = roundTrip(
      whole(pitch('C', 5), '<notations><tremolo type="start">2</tremolo></notations>'),
    );
    assert.equal(after.tremoloStrokes, 2);
    assert.equal(after.tremoloType, 'start');
    assert.match(written, /<tremolo type="start">2<\/tremolo>/);
  });

  test('a harmonic stays a harmonic', () => {
    const { after, written } = roundTrip(whole(pitch('C', 5), '<notations><harmonic/></notations>'));
    assert.equal(after.isHarmonic, true);
    assert.match(written, /<harmonic\/>/);
  });

  test('an arpeggio keeps its direction', () => {
    const { after, written } = roundTrip(
      whole(pitch('C', 5), '<notations><arpeggiate direction="down"/></notations>'),
    );
    assert.equal(after.arpeggiate, 'down');
    assert.match(written, /<arpeggiate direction="down"\/>/);
  });

  test('a non-arpeggiate bracket stays a bracket', () => {
    const { after, written } = roundTrip(
      whole(pitch('C', 5), '<notations><non-arpeggiate/></notations>'),
    );
    assert.equal(after.nonArpeggiate, true);
    assert.match(written, /<non-arpeggiate\/>/);
  });

  test('tablature marks keep string, fret and fingering', () => {
    const { after, written } = roundTrip(
      whole(
        pitch('C', 5),
        '<notations><technical><string>2</string><fret>3</fret><fingering>1</fingering></technical></notations>',
      ),
    );
    assert.equal(after.stringNumber, 2);
    assert.equal(after.fret, 3);
    assert.equal(after.fingering, 1);
    assert.match(
      written,
      /<technical><string>2<\/string><fret>3<\/fret><fingering>1<\/fingering><\/technical>/,
    );
  });

  test('a slide and a glissando each come back as the element they were read from', () => {
    const { after, written } = roundTrip(
      whole(pitch('C', 5), '<notations><slide type="start"/><glissando type="stop"/></notations>'),
    );
    assert.equal(after.slideStart, true);
    assert.equal(after.slideStartKind, 'slide');
    assert.equal(after.slideStop, true);
    assert.equal(after.slideStopKind, 'glissando');
    assert.match(written, /<slide type="start"\/><glissando type="stop"\/>/);
  });

  test('an inverted fermata keeps its orientation', () => {
    const { after, written } = roundTrip(
      whole(pitch('C', 5), '<notations><fermata type="inverted"/></notations>'),
    );
    assert.equal(after.hasFermata, true);
    assert.equal(after.fermataPlacement, 'below');
    assert.match(written, /<fermata type="inverted">/);
  });

  test('a natural that cancels a key signature is written even though the pitch has no alter', () => {
    const { before, after, written } = roundTrip(
      whole(pitch('B', 4), '<accidental>natural</accidental>'),
    );
    assert.equal(before.hasExplicitAccidental, true);
    assert.equal(after.hasExplicitAccidental, true, 'the cancellation is the point of the mark');
    assert.match(written, /<accidental>natural<\/accidental>/);
  });

  test('an accidental keeps its parentheses', () => {
    const { after, written } = roundTrip(
      whole(pitch('F', 5, 1), '<accidental parentheses="yes">sharp</accidental>'),
    );
    assert.equal(after.accidentalParentheses, true);
    assert.match(written, /<accidental parentheses="yes">sharp<\/accidental>/);
  });

  test('an editorial accidental keeps its bracket', () => {
    const { after, written } = roundTrip(
      whole(pitch('F', 5, 1), '<accidental bracket="yes">sharp</accidental>'),
    );
    assert.equal(after.accidentalBracket, true);
    assert.match(written, /<accidental bracket="yes">sharp<\/accidental>/);
  });

  test('a note with no marks writes none of them, so an ordinary note stays ordinary', () => {
    const { written } = roundTrip(whole(pitch('C', 5)));
    for (const element of [
      '<grace',
      '<cue/>',
      '<time-modification>',
      '<lyric',
      '<notehead',
      '<beam',
      '<tremolo',
      '<harmonic/>',
      '<arpeggiate',
      '<technical>',
      '<slide',
      '<fermata',
      '<accidental',
    ]) {
      assert.equal(written.includes(element), false, `an unmarked note must not gain ${element}`);
    }
  });

  test('a rest keeps its fermata', () => {
    const { after, written } = roundTrip(
      '<note><rest/><duration>16</duration><voice>1</voice><type>whole</type>' +
        '<notations><fermata/></notations></note>',
    );
    assert.equal(after.hasFermata, true, 'a fermata over a rest holds the bar');
    assert.match(written, /<notations><fermata>/);
  });
});

/**
 * A drum note's staff position comes from the kit table unless the file
 * places it. The reader invents a neutral B4 when `<unpitched>` says
 * nothing, so a writer that echoes that placeholder back would pin every
 * such note to the middle line -- the note visibly moves the first time
 * the saved file is opened again.
 */
describe('an unpitched note keeps only the position the file stated', () => {
  const kit = (note) =>
    '<?xml version="1.0"?><score-partwise version="4.0"><part-list>' +
    '<score-part id="P1"><part-name>Drums</part-name>' +
    '<score-instrument id="I36"><instrument-name>Bass Drum</instrument-name></score-instrument>' +
    '<midi-instrument id="I36"><midi-channel>10</midi-channel><midi-program>1</midi-program>' +
    '<midi-unpitched>37</midi-unpitched></midi-instrument>' +
    '</score-part></part-list><part id="P1"><measure number="1">' +
    '<attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time>' +
    '<clef><sign>percussion</sign><line>2</line></clef></attributes>' +
    note +
    '</measure></part></score-partwise>';

  const roundTrip = (xml) => {
    const written = NE.writeMusicXml(NE.parseMusicXml(xml, { domParser: DOMParser }));
    const event = NE.parseMusicXml(written, { domParser: DOMParser }).score.parts[0].measures[0].voices[0]
      .events[0];
    return { written, event };
  };

  test('a note with no stated position is written without one', () => {
    const { written, event } = roundTrip(
      kit('<note><unpitched/><duration>16</duration><voice>1</voice><type>whole</type>' +
        '<instrument id="I36"/></note>'),
    );
    assert.match(written, /<unpitched\/>/);
    assert.equal(
      event.hasExplicitDisplayPosition,
      undefined,
      'the invented B4 must not come back as a real position, or the drum table stops placing the note',
    );
  });

  test('a stated position is written back exactly', () => {
    const { written, event } = roundTrip(
      kit('<note><unpitched><display-step>F</display-step><display-octave>4</display-octave></unpitched>' +
        '<duration>16</duration><voice>1</voice><type>whole</type><instrument id="I36"/></note>'),
    );
    assert.match(written, /<unpitched><display-step>F<\/display-step><display-octave>4<\/display-octave><\/unpitched>/);
    assert.equal(event.hasExplicitDisplayPosition, true);
  });

  test('a drum note does not move when the file is saved and reopened', () => {
    const source = kit(
      '<note><unpitched/><duration>16</duration><voice>1</voice><type>whole</type>' +
        '<instrument id="I36"/></note>',
    );
    const { written } = roundTrip(source);
    // The position the kit table puts the bass drum on, before and after.
    const positionOf = (xml) => {
      const event = NE.parseMusicXml(xml, { domParser: DOMParser }).score.parts[0].measures[0].voices[0]
        .events[0];
      return { explicit: event.hasExplicitDisplayPosition, pitch: event.pitch };
    };
    const before = positionOf(source);
    const after = positionOf(written);
    assert.deepEqual(JSON.parse(JSON.stringify(after)), JSON.parse(JSON.stringify(before)));
  });
});

/**
 * `<divisions>` is the unit every `<duration>` in the file is counted in, so
 * a save that picks a value the score's own note lengths do not divide by
 * silently rewrites the music: a triplet eighth of 160 ticks becomes 120,
 * the bar comes up short, and the next open shows a bar that no longer adds
 * up to its meter.
 */
describe('<divisions> keeps every duration whole', () => {
  const triplets =
    '<?xml version="1.0"?><score-partwise version="4.0"><part-list>' +
    '<score-part id="P1"><part-name>Flute</part-name></score-part></part-list>' +
    '<part id="P1"><measure number="1">' +
    '<attributes><divisions>6</divisions><time><beats>4</beats><beat-type>4</beat-type></time>' +
    '<clef><sign>G</sign><line>2</line></clef></attributes>' +
    '<note><pitch><step>C</step><octave>5</octave></pitch><duration>6</duration><voice>1</voice>' +
    '<type>quarter</type></note>' +
    '<note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice>' +
    '<type>eighth</type><time-modification><actual-notes>3</actual-notes>' +
    '<normal-notes>2</normal-notes></time-modification></note>' +
    '<note><pitch><step>D</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice>' +
    '<type>eighth</type><time-modification><actual-notes>3</actual-notes>' +
    '<normal-notes>2</normal-notes></time-modification></note>' +
    '<note><pitch><step>E</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice>' +
    '<type>eighth</type><time-modification><actual-notes>3</actual-notes>' +
    '<normal-notes>2</normal-notes></time-modification></note>' +
    '</measure></part></score-partwise>';

  const ticksOf = (result) =>
    result.score.parts[0].measures[0].voices[0].events.map((event) => event.duration.ticks);

  test('a triplet score keeps its note lengths through a save', () => {
    const first = NE.parseMusicXml(triplets, { domParser: DOMParser });
    const written = NE.writeMusicXml(first);
    const second = NE.parseMusicXml(written, { domParser: DOMParser });
    assert.deepEqual(ticksOf(second), ticksOf(first));
  });

  test('the written file holds a whole number of divisions for each note', () => {
    const written = NE.writeMusicXml(NE.parseMusicXml(triplets, { domParser: DOMParser }));
    const divisions = Number(/<divisions>(\d+)<\/divisions>/.exec(written)[1]);
    for (const duration of [...written.matchAll(/<duration>(\d+)<\/duration>/g)]) {
      assert.ok(Number.isInteger(Number(duration[1])), `${duration[1]} divisions is not whole`);
    }
    // 160 ticks is a third of a quarter, so the file's unit has to divide 480
    // by 3 -- a power of two cannot.
    assert.equal((160 * divisions) % 480, 0);
  });

  test('a score with no tuplets still writes the plain unit', () => {
    const plain =
      '<?xml version="1.0"?><score-partwise version="4.0"><part-list>' +
      '<score-part id="P1"><part-name>M</part-name></score-part></part-list>' +
      '<part id="P1"><measure number="1">' +
      '<attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time>' +
      '<clef><sign>G</sign><line>2</line></clef></attributes>' +
      '<note><pitch><step>C</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice>' +
      '<type>whole</type></note></measure></part></score-partwise>';
    const written = NE.writeMusicXml(NE.parseMusicXml(plain, { domParser: DOMParser }));
    assert.match(written, /<divisions>4<\/divisions>/);
  });
});

/**
 * A sharp in the key signature is already spelled by `<alter>`; the reader
 * works out from the key whether a sign has to be drawn. Writing an
 * `<accidental>` for every altered pitch would turn each one into an
 * explicit mark, and a score saved once would come back with a sharp on
 * every note that the key signature already covers.
 */
describe('an accidental is written only where the file marked one', () => {
  const score = (fifths, ...notes) =>
    '<?xml version="1.0"?><score-partwise version="4.0"><part-list>' +
    '<score-part id="P1"><part-name>Piano</part-name></score-part></part-list>' +
    '<part id="P1"><measure number="1">' +
    `<attributes><divisions>4</divisions><key><fifths>${fifths}</fifths></key>` +
    '<time><beats>4</beats><beat-type>4</beat-type></time>' +
    '<clef><sign>G</sign><line>2</line></clef></attributes>' +
    notes.join('') +
    '</measure></part></score-partwise>';

  const pitched = (step, alter, mark = '') =>
    `<note><pitch><step>${step}</step>${alter ? `<alter>${alter}</alter>` : ''}<octave>4</octave></pitch>` +
    `<duration>16</duration><voice>1</voice><type>whole</type>${mark}</note>`;

  test('a note the key signature already sharpens gets no accidental', () => {
    // E major has F#, C#, G#, D#: every one of these is in the key.
    const written = NE.writeMusicXml(
      NE.parseMusicXml(score(4, pitched('F', 1), pitched('C', 1), pitched('G', 1), pitched('D', 1)), {
        domParser: DOMParser,
      }),
    );
    assert.equal(written.includes('<accidental'), false);
  });

  test('a mark the file did write survives, including a canceling natural', () => {
    const written = NE.writeMusicXml(
      NE.parseMusicXml(
        score(4, pitched('F', 1, '<accidental>sharp</accidental>'), pitched('B', 0, '<accidental>natural</accidental>')),
        { domParser: DOMParser },
      ),
    );
    assert.match(written, /<accidental>sharp<\/accidental>/);
    assert.match(written, /<accidental>natural<\/accidental>/);
  });

  test('saving a key-signature score twice changes nothing', () => {
    const first = NE.parseMusicXml(score(4, pitched('F', 1), pitched('C', 1)), { domParser: DOMParser });
    const once = NE.writeMusicXml(first);
    const twice = NE.writeMusicXml(NE.parseMusicXml(once, { domParser: DOMParser }));
    assert.equal(twice, once);
  });
});
