import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const NE = loadEngine();
const domParser = testDomParser();

const viewBoxHeight = (svg) => Number(/viewBox="[^"]+"/.exec(svg)[0].split(' ')[3].replace('"', ''));
const glyphCount = (svg, glyphName) => svg.split(NE.getGlyph(glyphName).char).length - 1;
const render = (xml, config) =>
  NE.renderFromMusicXml(xml, { domParser, ...(config ? { config } : {}) });

/**
 * Regressions for the real defects found while reviewing Phases 1-47.
 * Each test names the symptom a user would have seen, not just the code
 * path, so a future reader can tell whether it still matters.
 */
describe('regressions found reviewing Phases 1-47', () => {
  test('an additive meter ("3+2+2") is SEVEN eighths, not three -- <beats> is no longer truncated at the "+"', () => {
    const xml =
      '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">' +
      '<measure number="1"><attributes><divisions>2</divisions>' +
      '<time><beats>3+2+2</beats><beat-type>8</beat-type></time>' +
      '<clef><sign>G</sign><line>2</line></clef></attributes>' +
      '<note><pitch><step>C</step><octave>5</octave></pitch><duration>7</duration>' +
      '<voice>1</voice><type>quarter</type></note>' +
      '</measure></part></score-partwise>';
    const parsed = NE.parseMusicXml(xml, { domParser });
    assert.equal(parsed.attributes[0].timeNumerator, 7);
    // Number.parseInt("3+2+2") returns 3, which is what the old code got.
    assert.notEqual(parsed.attributes[0].timeNumerator, 3);
    // And a 7/8 measure holding 7 eighths must NOT be reported as an overrun.
    assert.ok(![...parsed.diagnostics].some((d) => d.code === 'MEASURE_OVERRUN'));

    // It is also DRAWN the way the file wrote it: 3 + 2 + 2 over 8.
    const { svg } = render(xml);
    assert.equal(glyphCount(svg, 'timeSig3'), 1);
    assert.equal(glyphCount(svg, 'timeSig2'), 2);
    assert.equal(glyphCount(svg, 'timeSigPlus'), 2);
    assert.equal(glyphCount(svg, 'timeSig8'), 1);
  });

  test('an UNPITCHED chord member counts toward the staff-distance estimate, exactly as a separate note does', () => {
    // Two percussion staves. Staff 2 carries an extremely high display
    // position, which §15's skyline should turn into a wider gap between
    // the staves. Written as a CHORD, those members used to be skipped
    // entirely -- so a drum chart's kick+hi-hat chord contributed nothing
    // and the staves stayed at the minimum distance.
    const un = (step, octave, staff, chord = '') =>
      `<note>${chord}<unpitched><display-step>${step}</display-step>` +
      `<display-octave>${octave}</display-octave></unpitched>` +
      `<duration>4</duration><voice>1</voice><type>half</type><staff>${staff}</staff></note>`;
    const attrs =
      '<attributes><divisions>2</divisions><staves>2</staves>' +
      '<time><beats>4</beats><beat-type>4</beat-type></time>' +
      '<clef number="1"><sign>percussion</sign></clef>' +
      '<clef number="2"><sign>percussion</sign></clef></attributes>';
    const build = (staff2Body) =>
      '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">' +
      `<measure number="1">${attrs}` +
      un('C', 4, 1) +
      un('E', 4, 1) +
      '<backup><duration>8</duration></backup>' +
      staff2Body +
      '</measure></part></score-partwise>';

    const baseline = render(build(un('C', 4, 2) + un('E', 4, 2)));
    const separate = render(build(un('C', 4, 2) + un('C', 8, 2)));
    const asChord = render(build(un('C', 4, 2) + un('C', 8, 2, '<chord/>')));

    // The high note really does widen the gap (otherwise this test would
    // pass vacuously).
    assert.ok(viewBoxHeight(separate.svg) > viewBoxHeight(baseline.svg));
    // And writing it as a chord gives the SAME answer.
    assert.equal(viewBoxHeight(asChord.svg), viewBoxHeight(separate.svg));
  });

  test('a part whose measures are filled very differently still shares the score\'s horizontal timeline', () => {
    // Regression for parts laying themselves out independently: part 1's
    // busy measure 1 made ITS measure 1 wide while part 2's whole-note
    // measure 1 stayed narrow, so the two parts' barlines diverged and
    // nothing lined up vertically.
    const eighth = (step) =>
      `<note><pitch><step>${step}</step><octave>5</octave></pitch>` +
      '<duration>1</duration><voice>1</voice><type>eighth</type></note>';
    const whole = (step, octave) =>
      `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch>` +
      '<duration>8</duration><voice>1</voice><type>whole</type></note>';
    const attrs =
      '<attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time>' +
      '<clef><sign>G</sign><line>2</line></clef></attributes>';
    const xml =
      '<score-partwise><part-list><score-part id="P1"/><score-part id="P2"/></part-list>' +
      `<part id="P1"><measure number="1">${attrs}` +
      ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'].map(eighth).join('') +
      `</measure><measure number="2">${whole('C', 5)}</measure></part>` +
      `<part id="P2"><measure number="1">${attrs}${whole('C', 4)}</measure>` +
      `<measure number="2">${whole('D', 4)}</measure></part></score-partwise>`;

    const { svg } = render(xml);
    const xs = [];
    const re = /<line x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)"([^/]*)\/>/g;
    let m;
    while ((m = re.exec(svg)) !== null) {
      if (!m[5].includes('stroke-width="0.16"')) continue;
      if (Number(m[2]) === Number(m[4])) continue;
      xs.push(Number(m[1]));
    }
    assert.equal(xs.length, 4, 'two parts x two measures');
    assert.equal(new Set(xs).size, 2, 'both parts must use the SAME two barline positions');
  });
});
