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
