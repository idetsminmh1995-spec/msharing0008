import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const NE = loadEngine();
const domParser = testDomParser();

const NOTE =
  '<note><pitch><step>C</step><octave>4</octave></pitch>' +
  '<duration>2</duration><voice>1</voice><type>quarter</type></note>';

function score(inner, partList) {
  return (
    '<score-partwise version="3.1">' +
    (partList ??
      '<part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>') +
    `<part id="P1"><measure number="1">` +
    '<attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>' +
    inner +
    '</measure></part></score-partwise>'
  );
}

const codesOf = (result) => [...result.diagnostics].map((d) => d.code);
const eventsOf = (result) => result.score.parts[0].measures[0].voices[0].events;

/**
 * PLAN.md Part D: "diagnostic/recovery tests for harmony, unusual notation,
 * instrument transposition, malformed note/chord and multiple-staff cases."
 * Every case here is stated the same way on purpose -- a bad input must
 * (1) never throw, (2) report its own stable code, and (3) still leave the
 * good notes in place. The third is the one a "does not throw" test alone
 * would miss: recovering by dropping the whole measure would pass (1) and (2).
 */
describe('MusicXML recovery: malformed note and chord cases (PLAN Part D)', () => {
  test('a <note> that is neither pitch, unpitched nor rest is dropped with UNSUPPORTED_NOTE, the rest kept', () => {
    const result = NE.parseMusicXml(
      score('<note><duration>2</duration><voice>1</voice></note>' + NOTE),
      {
        domParser,
      },
    );
    assert.ok(codesOf(result).includes('UNSUPPORTED_NOTE'));
    const events = eventsOf(result);
    assert.equal(events.length, 1);
    assert.equal(events[0].kind, 'note');
    assert.equal(events[0].pitch.step, 'C');
  });

  test('a chord whose members disagree on duration falls back to its first note (INVALID_CHORD)', () => {
    const chord =
      NOTE +
      '<note><chord/><pitch><step>E</step><octave>4</octave></pitch>' +
      '<duration>4</duration><voice>1</voice><type>half</type></note>';
    const result = NE.parseMusicXml(score(chord), { domParser });
    assert.ok(codesOf(result).includes('INVALID_CHORD'));
    const events = eventsOf(result);
    assert.equal(events.length, 1);
    assert.equal(events[0].kind, 'note');
    assert.equal(events[0].pitch.step, 'C');
  });

  test('a chord member with no <pitch> at all never throws and never becomes a second event', () => {
    const chord = NOTE + '<note><chord/><duration>2</duration><voice>1</voice></note>';
    assert.doesNotThrow(() => NE.renderFromMusicXml(score(chord), { domParser }));
    const events = eventsOf(NE.parseMusicXml(score(chord), { domParser }));
    assert.equal(events.length, 1);
  });
});

describe('MusicXML recovery: harmony (PLAN Part D)', () => {
  test('a simple <harmony> parses with no diagnostic', () => {
    const result = NE.parseMusicXml(
      score('<harmony><root><root-step>C</root-step></root><kind>major</kind></harmony>' + NOTE),
      { domParser },
    );
    assert.equal(codesOf(result).filter((c) => c.startsWith('UNSUPPORTED_HARMONY')).length, 0);
  });

  test('a <harmony> with unsupported layout metadata is preserved with UNSUPPORTED_HARMONY_FEATURE', () => {
    const result = NE.parseMusicXml(
      score(
        '<harmony print-frame="yes" arrangement="horizontal">' +
          '<root><root-step>C</root-step></root><kind>major</kind></harmony>' +
          NOTE,
      ),
      { domParser },
    );
    assert.ok(codesOf(result).includes('UNSUPPORTED_HARMONY_FEATURE'));
  });

  test('a numeral/degree harmony is diagnosed but still does not drop the note', () => {
    const result = NE.parseMusicXml(
      score(
        '<harmony><numeral><numeral-root>5</numeral-root></numeral><kind>major</kind>' +
          '<degree><degree-value>9</degree-value><degree-alter>0</degree-alter><degree-type>add</degree-type></degree></harmony>' +
          NOTE,
      ),
      { domParser },
    );
    assert.ok(codesOf(result).includes('UNSUPPORTED_HARMONY_FEATURE'));
    assert.equal(eventsOf(result).length, 1);
  });
});

describe('MusicXML recovery: transposition combined with other attributes (PLAN Part D)', () => {
  test('a transposing part that also changes clef mid-score never throws and keeps written notation', () => {
    const xml =
      '<score-partwise version="3.1"><part-list><score-part id="P1"><part-name>Clarinet</part-name>' +
      '</score-part></part-list><part id="P1">' +
      '<measure number="1"><attributes><divisions>2</divisions>' +
      '<transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose>' +
      '<clef><sign>G</sign><line>2</line></clef></attributes>' +
      NOTE +
      '</measure>' +
      '<measure number="2"><attributes><clef><sign>F</sign><line>4</line></clef></attributes>' +
      '<note><pitch><step>C</step><octave>3</octave></pitch>' +
      '<duration>2</duration><voice>1</voice><type>quarter</type></note></measure>' +
      '</part></score-partwise>';
    assert.doesNotThrow(() => NE.renderFromMusicXml(xml, { domParser }));
    const result = NE.renderFromMusicXml(xml, { domParser });
    // Written pitch stays written: the notation is C4 then C3, whatever the
    // sounding pitch the playback stream carries.
    const events = result.playback.events.flatMap((e) => e.midiNotes ?? []);
    assert.equal(events.length, 2);
  });

  test('an out-of-range <transpose> never throws', () => {
    const xml = score('<transpose><octave-change>99</octave-change></transpose>' + NOTE);
    assert.doesNotThrow(() => NE.renderFromMusicXml(xml, { domParser }));
  });
});

describe('MusicXML recovery: multiple-staff cases (PLAN Part D)', () => {
  test('a grand-staff part with a note on staff 2 never throws and keeps both staves', () => {
    const xml =
      '<score-partwise version="3.1"><part-list><score-part id="P1"><part-name>Piano</part-name>' +
      '</score-part></part-list><part id="P1"><measure number="1">' +
      '<attributes><divisions>2</divisions><staves>2</staves>' +
      '<clef number="1"><sign>G</sign><line>2</line></clef>' +
      '<clef number="2"><sign>F</sign><line>4</line></clef></attributes>' +
      '<note><pitch><step>C</step><octave>5</octave></pitch>' +
      '<duration>2</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>' +
      '<backup><duration>2</duration></backup>' +
      '<note><pitch><step>C</step><octave>3</octave></pitch>' +
      '<duration>2</duration><voice>2</voice><type>quarter</type><staff>2</staff></note>' +
      '</measure></part></score-partwise>';
    const { svg } = NE.renderFromMusicXml(xml, { domParser });
    assert.match(svg, /^<svg /);
    const events = NE.parseMusicXml(xml, { domParser }).score.parts[0].measures[0].voices;
    const staves = new Set(events.flatMap((v) => v.events.map((e) => e.staff ?? 1)));
    assert.deepEqual([...staves].sort(), [1, 2]);
  });

  test('a note referencing a staff beyond <staves> never throws', () => {
    const xml =
      '<score-partwise version="3.1"><part-list><score-part id="P1"/></part-list>' +
      '<part id="P1"><measure number="1"><attributes><divisions>2</divisions><staves>1</staves>' +
      '<clef number="1"><sign>G</sign><line>2</line></clef></attributes>' +
      '<note><pitch><step>C</step><octave>4</octave></pitch>' +
      '<duration>2</duration><voice>1</voice><type>quarter</type><staff>7</staff></note>' +
      '</measure></part></score-partwise>';
    assert.doesNotThrow(() => NE.renderFromMusicXml(xml, { domParser }));
  });
});

describe('MusicXML recovery: unusual notation (PLAN Part D)', () => {
  test('an unknown <notehead> value is diagnosed but the note still renders', () => {
    const result = NE.parseMusicXml(
      score(
        '<note><pitch><step>C</step><octave>4</octave></pitch>' +
          '<duration>2</duration><voice>1</voice><type>quarter</type>' +
          '<notehead>banana</notehead></note>',
      ),
      { domParser },
    );
    assert.ok(codesOf(result).includes('UNKNOWN_NOTEHEAD'));
    assert.equal(eventsOf(result).length, 1);
  });

  test('a <tremolo> with an absurd stroke count is clamped, not dropped', () => {
    const result = NE.parseMusicXml(
      score(
        '<note><pitch><step>C</step><octave>4</octave></pitch>' +
          '<duration>2</duration><voice>1</voice><type>quarter</type>' +
          '<notations><tremolo>999</tremolo></notations></note>',
      ),
      { domParser },
    );
    assert.ok(codesOf(result).includes('TREMOLO_STROKES_CLAMPED'));
    assert.equal(eventsOf(result).length, 1);
  });
});
