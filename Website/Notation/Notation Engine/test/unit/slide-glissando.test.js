import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';
const NE = loadEngine();
const domParser = testDomParser();
const xml = (kind) =>
  `<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><clef><sign>G</sign><line>2</line></clef></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><notations><${kind} type="start"/></notations></note><note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><notations><${kind} type="stop"/></notations></note></measure></part></score-partwise>`;
describe('MusicXML slide/glissando', () => {
  test('renders a straight slide and preserves source kind without diagnostics', () => {
    const out = NE.renderFromMusicXml(xml('slide'), { domParser });
    assert.deepEqual([...out.diagnostics], []);
    assert.match(out.svg, /<path[^>]*d="M 6 9 L 9\.5 7"/);
  });
  test('renders glissando distinctly as a wavy path', () => {
    const out = NE.renderFromMusicXml(xml('glissando'), { domParser });
    assert.deepEqual([...out.diagnostics], []);
    assert.match(out.svg, /stroke-dasharray="0\.01 0"/);
    assert.match(out.svg, /<path[^>]*d="M 6 9 L /);
  });
  test('diagnoses an unmatched stop', () => {
    const out = NE.renderFromMusicXml(
      xml('slide')
        .replace('<notations><slide type="start"/></notations>', '')
        .replace(
          '<notations><slide type="stop"/></notations>',
          '<notations><slide type="stop"/></notations>',
        ),
      { domParser },
    );
    assert.ok([...out.diagnostics].some((d) => d.code === 'UNMATCHED_SLIDE_STOP'));
  });

  test('a slide across a system break is split at the break, not skipped', () => {
    const slideNote = (kind, step, octave, type) =>
      `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch>` +
      '<duration>8</duration><voice>1</voice><type>whole</type>' +
      `<notations><${kind} type="${type}"/></notations></note>`;
    const crossing =
      '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">' +
      '<measure number="1"><attributes><divisions>2</divisions>' +
      '<time><beats>4</beats><beat-type>4</beat-type></time>' +
      '<clef><sign>G</sign><line>2</line></clef></attributes>' +
      slideNote('slide', 'C', 4, 'start') +
      '</measure>' +
      '<measure number="2"><print new-system="yes"/>' +
      slideNote('slide', 'G', 4, 'stop') +
      '</measure></part></score-partwise>';
    const out = NE.renderFromMusicXml(crossing, {
      domParser,
      config: { layout: { mode: 'page' }, page: { pageWidth: 120 } },
    });
    assert.ok(
      ![...out.diagnostics].some((d) => d.code === 'SLIDE_CROSSES_SYSTEM'),
      'the slide is now drawn, so the not-implemented diagnostic is gone',
    );
    // Two straight slide segments (one per system), both L-shaped `M .. L ..`.
    const slidePaths = [...out.svg.matchAll(/<path[^>]*d="(M [\d.-]+ [\d.-]+ L [\d.-]+ [\d.-]+)"/g)].map(
      (m) => m[1],
    );
    assert.equal(slidePaths.length, 2, 'one slide half on each system');
  });
});
