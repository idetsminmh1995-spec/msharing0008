import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const NE = loadEngine();
const domParser = testDomParser();

function scoreXml(noteMarkup) {
  return `<score-partwise version="3.1">
    <part-list><score-part id="P1"><part-name>Drums</part-name>
      <midi-instrument id="P1-HH"><midi-channel>10</midi-channel><midi-unpitched>43</midi-unpitched></midi-instrument>
    </score-part></part-list>
    <part id="P1"><measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>percussion</sign></clef></attributes>
      ${noteMarkup}
    </measure></part>
  </score-partwise>`;
}

function textNodeY(svg, glyphName) {
  const glyph = NE.getGlyph(glyphName);
  assert.ok(glyph, `missing Bravura glyph ${glyphName}`);
  const node = [...svg.matchAll(/<text x="([\d.-]+)" y="([\d.-]+)"[^>]*>([^<]+)<\/text>/g)].find(
    (match) => match[3] === glyph.char,
  );
  assert.ok(node, `expected ${glyphName} text node in SVG`);
  return Number(node[2]);
}

const ordinaryHiHat =
  '<note><unpitched/><duration>1</duration><instrument id="P1-HH"/><voice>1</voice><type>quarter</type></note>';
const unmappedPositionGrace =
  '<note><grace slash="yes"/><unpitched/><instrument id="P1-HH"/><voice>1</voice><type>eighth</type></note>';

describe('percussion grace-note rendering uses the Drum Map', () => {
  test('missing display coordinates use the GM staff position and retain the drum up-stem convention', () => {
    const { svg } = NE.renderFromMusicXml(scoreXml(ordinaryHiHat + unmappedPositionGrace), {
      domParser,
    });
    const ordinaryY = textNodeY(svg, 'noteheadXBlack');
    const graceY = textNodeY(svg, 'graceNoteAcciaccaturaStemUp');
    assert.equal(
      graceY,
      ordinaryY,
      'GM 42 grace note must use the same mapped position as the ordinary hi-hat',
    );
  });

  test('an explicit MusicXML display position still takes precedence over the GM map', () => {
    const explicit =
      '<note><grace slash="yes"/><unpitched><display-step>G</display-step><display-octave>4</display-octave></unpitched><instrument id="P1-HH"/><voice>1</voice><type>eighth</type></note>';
    const withoutInstrumentLink =
      '<note><grace slash="yes"/><unpitched><display-step>G</display-step><display-octave>4</display-octave></unpitched><voice>1</voice><type>eighth</type></note>';
    const mapped = NE.renderFromMusicXml(scoreXml(explicit), { domParser });
    const filePositionOnly = NE.renderFromMusicXml(scoreXml(withoutInstrumentLink), { domParser });
    const glyphName = 'graceNoteAcciaccaturaStemUp';
    assert.equal(
      textNodeY(mapped.svg, glyphName),
      textNodeY(filePositionOnly.svg, glyphName),
      'a complete file-stated position must not be replaced by the GM table',
    );
  });
});
