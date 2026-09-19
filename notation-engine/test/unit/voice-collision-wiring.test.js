import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const NE = loadEngine();
const domParser = testDomParser();

function glyphPlacements(svg, glyphName) {
  const ch = NE.getGlyph(glyphName).char;
  const out = [];
  const re = /<text([^>]*)>([^<]*)<\/text>/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    if (m[2] !== ch) continue;
    out.push({
      x: Number(/x="([^"]+)"/.exec(m[1])?.[1]),
      y: Number(/y="([^"]+)"/.exec(m[1])?.[1]),
    });
  }
  return out;
}

/**
 * Two voices, each one whole-measure note, written the way MusicXML
 * itself writes a second voice: voice 1's measure, then a <backup>, then
 * voice 2's.
 */
function twoVoices(step1, octave1, step2, octave2) {
  const note = (step, octave, voice) =>
    `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch>` +
    `<duration>8</duration><voice>${voice}</voice><type>whole</type></note>`;
  const xml =
    '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">' +
    '<measure number="1"><attributes><divisions>2</divisions>' +
    '<time><beats>4</beats><beat-type>4</beat-type></time>' +
    '<clef><sign>G</sign><line>2</line></clef></attributes>' +
    note(step1, octave1, 1) +
    '<backup><duration>8</duration></backup>' +
    note(step2, octave2, 2) +
    '</measure></part></score-partwise>';
  return NE.renderFromMusicXml(xml, { domParser });
}

describe('multi-voice notehead collision wiring (Integration K, §9.14)', () => {
  test('two voices one staff position apart are offset horizontally, not drawn on one x', () => {
    // In treble clef the middle line is B4, so G4 and A4 sit exactly one
    // staff position (0.5sp) apart -- §9.14's own collision threshold.
    const { svg } = twoVoices('G', 4, 'A', 4);
    const heads = glyphPlacements(svg, 'noteheadWhole');
    assert.equal(heads.length, 2);
    assert.notEqual(heads[0].x, heads[1].x);
  });

  test('the HIGHER-numbered voice is the one that moves, never the lower', () => {
    const { svg } = twoVoices('G', 4, 'A', 4);
    const heads = glyphPlacements(svg, 'noteheadWhole').sort((a, b) => a.y - b.y);
    // A4 is higher on the staff (smaller y) and belongs to voice 2; G4 is
    // voice 1. Whichever pitch is on top, it is the VOICE NUMBER that
    // decides, so voice 2's note (A4) is the one shifted right.
    const a4 = heads[0];
    const g4 = heads[1];
    assert.ok(a4.x > g4.x, 'voice 2 should be shifted right of voice 1');
  });

  test('voices far enough apart are NOT offset -- both keep the same x', () => {
    // C5 and C4 are nowhere near §9.14's 1.0sp threshold.
    const { svg } = twoVoices('C', 5, 'C', 4);
    const heads = glyphPlacements(svg, 'noteheadWhole');
    assert.equal(heads.length, 2);
    assert.equal(heads[0].x, heads[1].x);
  });

  test('a unison between two voices also triggers the offset (distance 0 is within the threshold)', () => {
    const { svg } = twoVoices('G', 4, 'G', 4);
    const heads = glyphPlacements(svg, 'noteheadWhole');
    assert.equal(heads.length, 2);
    assert.notEqual(heads[0].x, heads[1].x);
  });

  test('a single-voice measure is never offset, so ordinary scores are untouched', () => {
    const xml =
      '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">' +
      '<measure number="1"><attributes><divisions>2</divisions>' +
      '<time><beats>4</beats><beat-type>4</beat-type></time>' +
      '<clef><sign>G</sign><line>2</line></clef></attributes>' +
      '<note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>' +
      '<note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>' +
      '</measure></part></score-partwise>';
    const { svg } = NE.renderFromMusicXml(xml, { domParser });
    const heads = glyphPlacements(svg, 'noteheadHalf');
    // Two successive notes in ONE voice are at different ticks, so they
    // are at different x for the ordinary spacing reason -- what matters
    // is that no collision offset was added on top.
    assert.equal(heads.length, 2);
    assert.ok(heads[1].x > heads[0].x);
  });
});
