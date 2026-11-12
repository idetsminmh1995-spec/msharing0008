import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';
const NE = loadEngine();
const domParser = testDomParser();
const xml = `<score-partwise><defaults><appearance><note-size type="cue">60</note-size></appearance></defaults><part-list><score-part id="P1"/></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><direction><direction-type><octave-shift type="up" size="8" number="2"/></direction-type></direction><note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><cue/></note><direction><direction-type><octave-shift type="stop" number="2"/></direction-type></direction><note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note></measure></part></score-partwise>`;
describe('MusicXML cue notes and octave shifts', () => {
  test('parses cue metadata, file cue note-size, and octave-shift endpoints', () => {
    const parsed = NE.parseMusicXml(xml, { domParser });
    const note = parsed.score.parts[0].measures[0].voices[0].events[0];
    assert.equal(note.kind, 'note');
    assert.equal(note.isCue, true);
    assert.equal(parsed.defaults.noteSizes.cue, 0.6);
    assert.equal(
      JSON.stringify(parsed.octaveShifts.map((s) => [s.type, s.size, s.number])),
      JSON.stringify([
        ['up', 8, 2],
        ['stop', 8, 2],
      ]),
    );
  });
  test('renders cue scaling and an octave-shift bracket without diagnostics', () => {
    const result = NE.renderFromMusicXml(xml, { domParser });
    assert.match(result.svg, /scale\(0\.6\)/);
    assert.match(result.svg, />8<\/text>/);
    assert.equal(
      result.diagnostics.some((d) => d.code === 'UNMATCHED_OCTAVE_SHIFT'),
      false,
    );
  });
  test('reports unmatched octave-shift endpoints', () => {
    const result = NE.renderFromMusicXml(
      xml.replace('type="stop" number="2"', 'type="stop" number="9"'),
      { domParser },
    );
    assert.ok(result.diagnostics.some((d) => d.code === 'UNMATCHED_OCTAVE_SHIFT'));
  });
  test('reports malformed octave-shift attributes', () => {
    const malformed = xml.replace(
      'type="up" size="8" number="2"',
      'type="sideways" size="12" number="0"',
    );
    const result = NE.parseMusicXml(malformed, { domParser });
    assert.ok(result.diagnostics.some((d) => d.code === 'INVALID_OCTAVE_SHIFT'));
  });
  test('reports unsupported pedal types instead of silently dropping them', () => {
    const malformed = xml.replace(
      '<direction-type><octave-shift type="up" size="8" number="2"/></direction-type>',
      '<direction-type><pedal type="sideways"/></direction-type><direction-type><octave-shift type="up" size="8" number="2"/></direction-type>',
    );
    const result = NE.parseMusicXml(malformed, { domParser });
    assert.ok(result.diagnostics.some((d) => d.code === 'UNSUPPORTED_PEDAL'));
  });
});
