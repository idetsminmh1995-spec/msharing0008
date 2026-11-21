import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const NE = loadEngine();
const domParser = testDomParser();

/** Sandbox objects come from another realm, so their prototype differs; normalize before a strict deepEqual. */
const plain = (value) => JSON.parse(JSON.stringify(value));

function score(partListInner, partInner) {
  return `<score-partwise><part-list><score-part id="P1"><part-name>P1</part-name>${partListInner}</score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>${partInner}</measure></part></score-partwise>`;
}

function render(xml) {
  return NE.renderFromMusicXml(xml, { domParser });
}

describe('MIDI instrument program/bank/channel routing (§10.5)', () => {
  test('a full <midi-instrument> parses to wire values, each decremented from MusicXML 1-based numbering', () => {
    const xml = score(
      '<midi-instrument id="P1-I1"><midi-channel>1</midi-channel><midi-program>1</midi-program><midi-bank>1</midi-bank></midi-instrument>',
      '<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><instrument id="P1-I1"/></note>',
    );
    const parsed = NE.parseMusicXml(xml, { domParser });
    const info = parsed.midiInstrumentInfoByPart.get('P1').get('P1-I1');
    assert.deepEqual(plain(info), { program: 0, bank: 0, channel: 0 });
  });

  test('a real drum channel 10 becomes wire channel 9, and the GM note stays available alongside it', () => {
    const xml = score(
      '<midi-instrument id="P1-I38"><midi-channel>10</midi-channel><midi-unpitched>39</midi-unpitched></midi-instrument>',
      '<note><unpitched/><duration>1</duration><voice>1</voice><type>quarter</type><instrument id="P1-I38"/></note>',
    );
    const parsed = NE.parseMusicXml(xml, { domParser });
    const info = parsed.midiInstrumentInfoByPart.get('P1').get('P1-I38');
    assert.deepEqual(plain(info), { gmNote: 38, channel: 9 });
    // The GM-note projection stays exactly as before -- drum notehead shape
    // selection and hi-hat conversion read this map, not the fuller record.
    assert.equal(parsed.midiInstrumentsByPart.get('P1').get('P1-I38'), 38);
  });

  test('an out-of-range <midi-program> is warned and dropped, without discarding the valid channel beside it', () => {
    const xml = score(
      '<midi-instrument id="P1-I1"><midi-channel>3</midi-channel><midi-program>200</midi-program></midi-instrument>',
      '<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><instrument id="P1-I1"/></note>',
    );
    const parsed = NE.parseMusicXml(xml, { domParser });
    assert.deepEqual(plain(parsed.midiInstrumentInfoByPart.get('P1').get('P1-I1')), { channel: 2 });
    const warnings = [...parsed.diagnostics].filter((d) => d.code === 'INVALID_MIDI_PROGRAM');
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].severity, 'warning');
    assert.equal(warnings[0].location?.partId, 'P1');
  });

  test('out-of-range <midi-bank> and <midi-channel> are each warned and dropped', () => {
    const xml = score(
      '<midi-instrument id="P1-I1"><midi-bank>99999</midi-bank><midi-channel>17</midi-channel></midi-instrument>',
      '<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>',
    );
    const parsed = NE.parseMusicXml(xml, { domParser });
    assert.equal(parsed.midiInstrumentInfoByPart.get('P1').get('P1-I1'), undefined);
    assert.ok([...parsed.diagnostics].some((d) => d.code === 'INVALID_MIDI_BANK'));
    assert.ok([...parsed.diagnostics].some((d) => d.code === 'INVALID_MIDI_CHANNEL'));
  });

  test('a non-numeric <midi-program> is warned rather than coerced to a number', () => {
    const xml = score(
      '<midi-instrument id="P1-I1"><midi-program>grand piano</midi-program></midi-instrument>',
      '<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>',
    );
    const parsed = NE.parseMusicXml(xml, { domParser });
    const warnings = [...parsed.diagnostics].filter((d) => d.code === 'INVALID_MIDI_PROGRAM');
    assert.equal(warnings.length, 1);
    assert.equal(parsed.midiInstrumentInfoByPart.get('P1').get('P1-I1'), undefined);
  });

  test('the track carries the file routing and the percussion flag; a pitched part keeps its own program', () => {
    const drum = render(
      score(
        '<midi-instrument id="P1-I38"><midi-channel>10</midi-channel><midi-unpitched>39</midi-unpitched></midi-instrument>',
        '<note><unpitched/><duration>1</duration><voice>1</voice><type>quarter</type><instrument id="P1-I38"/></note>',
      ),
    );
    assert.deepEqual(plain(drum.playback.tracks), [
      { id: 'P1', name: 'P1', channel: 9, percussion: true },
    ]);

    const piano = render(
      score(
        '<midi-instrument id="P1-I1"><midi-channel>1</midi-channel><midi-program>1</midi-program><midi-bank>2</midi-bank></midi-instrument>',
        '<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><instrument id="P1-I1"/></note>',
      ),
    );
    assert.deepEqual(plain(piano.playback.tracks), [
      { id: 'P1', name: 'P1', program: 0, bank: 1, channel: 0 },
    ]);
    assert.equal(piano.playback.tracks[0].percussion, undefined);
  });

  test('a kit that is declared but not yet written into still routes as percussion', () => {
    // A new drum part is all rests. Its percussion-ness cannot come from a
    // written note, or the first drum a writer places would be auditioned
    // through a melodic channel -- as a piano -- and only become a drum
    // after the note landed.
    const xml = score(
      '<score-instrument id="P1-I36"><instrument-name>Bass Drum</instrument-name></score-instrument>' +
        '<midi-instrument id="P1-I36"><midi-channel>10</midi-channel><midi-program>1</midi-program><midi-unpitched>37</midi-unpitched></midi-instrument>',
      '<note><rest measure="yes"/><duration>4</duration><voice>1</voice></note>',
    );
    const { playback } = render(xml);
    assert.deepEqual(plain(playback.tracks), [
      { id: 'P1', name: 'P1', program: 0, channel: 9, percussion: true },
    ]);
    const routing = NE.assignTrackRouting(playback.tracks);
    assert.equal(routing.get('P1').channel, 9, 'the empty kit must land on the GM percussion channel');
  });

  test('a part whose instruments declare no <midi-unpitched> is not percussion', () => {
    const xml = score(
      '<midi-instrument id="P1-I1"><midi-channel>1</midi-channel><midi-program>1</midi-program></midi-instrument>',
      '<note><rest measure="yes"/><duration>4</duration><voice>1</voice></note>',
    );
    const { playback } = render(xml);
    assert.equal(playback.tracks[0].percussion, undefined);
    assert.equal(NE.assignTrackRouting(playback.tracks).get('P1').channel, 0);
  });

  test('a kit keeps percussion routing once a drum is written, and a melodic part beside it keeps its own', () => {
    const xml = `<score-partwise><part-list>
      <score-part id="P1"><part-name>Piano</part-name><midi-instrument id="P1-I1"><midi-channel>1</midi-channel><midi-program>1</midi-program></midi-instrument></score-part>
      <score-part id="P2"><part-name>Kit</part-name><midi-instrument id="P2-I36"><midi-channel>10</midi-channel><midi-unpitched>37</midi-unpitched></midi-instrument></score-part>
      </part-list>
      <part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
        <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note></measure></part>
      <part id="P2"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
        <note><unpitched/><duration>4</duration><voice>1</voice><type>whole</type><instrument id="P2-I36"/></note></measure></part>
      </score-partwise>`;
    const { playback } = render(xml);
    const routing = NE.assignTrackRouting(playback.tracks);
    assert.equal(routing.get('P1').channel, 0, 'the piano keeps a melodic channel');
    assert.equal(routing.get('P2').channel, 9, 'the kit takes the percussion channel');
  });

  test('an unpitched percussion note now SOUNDS: its GM key number reaches the event stream', () => {
    const xml = score(
      '<midi-instrument id="P1-I36"><midi-channel>10</midi-channel><midi-unpitched>37</midi-unpitched></midi-instrument><midi-instrument id="P1-I42"><midi-channel>10</midi-channel><midi-unpitched>43</midi-unpitched></midi-instrument>',
      '<note><unpitched/><duration>1</duration><voice>1</voice><type>quarter</type><instrument id="P1-I36"/></note><note><unpitched/><duration>1</duration><voice>1</voice><type>quarter</type><instrument id="P1-I42"/></note>',
    );
    const { playback } = render(xml);
    assert.deepEqual(plain(playback.events.map((event) => [...event.midiNotes])), [[36], [42]]);
  });

  test('an unpitched note with no <midi-unpitched> stays silent rather than guessing a drum', () => {
    const xml = score(
      '',
      '<note><unpitched/><duration>1</duration><voice>1</voice><type>quarter</type></note>',
    );
    const { playback } = render(xml);
    assert.equal(playback.events[0].midiNotes, undefined);
  });

  test('a pitched note is unaffected by a percussion map beside it -- it uses its own written pitch', () => {
    const xml = score(
      '<midi-instrument id="P1-I36"><midi-unpitched>37</midi-unpitched></midi-instrument>',
      '<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><instrument id="P1-I36"/></note>',
    );
    const { playback } = render(xml);
    assert.deepEqual([...playback.events[0].midiNotes], [60]);
  });

  test('a score with no <midi-instrument> at all produces bare tracks, unchanged from before', () => {
    const xml = score(
      '',
      '<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>',
    );
    const { playback } = render(xml);
    assert.deepEqual(plain(playback.tracks), [{ id: 'P1', name: 'P1' }]);
  });
});
