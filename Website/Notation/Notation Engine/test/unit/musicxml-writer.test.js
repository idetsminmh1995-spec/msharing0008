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
