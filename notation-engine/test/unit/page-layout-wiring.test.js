import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const NE = loadEngine();
const domParser = testDomParser();

const glyphCount = (svg, glyphName) => svg.split(NE.getGlyph(glyphName).char).length - 1;
const viewBox = (svg) => /viewBox="([^"]+)"/.exec(svg)[1].split(' ').map(Number);

/** Every vertical line at Bravura's thin-barline thickness -- i.e. the barlines. */
function barlineXs(svg) {
  const out = [];
  const re = /<line x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)"([^/]*)\/>/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    if (!m[5].includes('stroke-width="0.16"')) continue;
    if (Number(m[2]) === Number(m[4])) continue; // horizontal: a staff line, not a barline
    out.push(Number(m[1]));
  }
  return out;
}

const whole = (step, octave) =>
  `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch>` +
  '<duration>8</duration><voice>1</voice><type>whole</type></note>';

const ATTRS =
  '<attributes><divisions>2</divisions><key><fifths>2</fifths></key>' +
  '<time><beats>4</beats><beat-type>4</beat-type></time>' +
  '<clef><sign>G</sign><line>2</line></clef></attributes>';

/** One part, `count` whole-note measures, with optional per-measure extra XML. */
function onePart(count, extraByMeasure = {}) {
  let measures = '';
  for (let i = 1; i <= count; i++) {
    measures +=
      `<measure number="${i}">${extraByMeasure[i] ?? ''}${i === 1 ? ATTRS : ''}` +
      whole('C', 5) +
      '</measure>';
  }
  return (
    '<score-partwise><part-list><score-part id="P1"/></part-list>' +
    `<part id="P1">${measures}</part></score-partwise>`
  );
}

const render = (xml, config) => NE.renderFromMusicXml(xml, { domParser, ...(config ? { config } : {}) });

describe('page layout wiring (Integration L, §16.2)', () => {
  test('scroll mode is still the default and still produces ONE system', () => {
    const { svg, diagnostics } = render(onePart(8));
    assert.deepEqual([...diagnostics], []);
    assert.equal(glyphCount(svg, 'gClef'), 1, 'one system means exactly one clef');
    const [, , , height] = viewBox(svg);
    assert.equal(height, 16, "a one-part scroll system is the engine's own system height");
  });

  test('page mode breaks the same score into several systems, each restating the clef and key', () => {
    const { svg, diagnostics } = render(onePart(8), { layout: { mode: 'page' } });
    assert.deepEqual([...diagnostics], []);
    const clefs = glyphCount(svg, 'gClef');
    assert.ok(clefs > 1, `expected several systems, got ${clefs} clef(s)`);
    // Two sharps per key signature, restated at every system start.
    assert.equal(glyphCount(svg, 'accidentalSharp'), clefs * 2);
  });

  test('the time signature is NOT restated at each system -- only clefs and key signatures are', () => {
    const { svg } = render(onePart(8), { layout: { mode: 'page' } });
    // timeSig4 appears twice for ONE 4/4 signature (numerator + denominator).
    assert.equal(glyphCount(svg, 'timeSig4'), 2);
  });

  test("page mode's canvas is the page, and grows by whole pages", () => {
    const { svg } = render(onePart(8), { layout: { mode: 'page' } });
    const [, , width, height] = viewBox(svg);
    assert.equal(width, 30); // DEFAULT_CONFIG.page.pageWidth
    assert.equal(height % 42, 0, `page height should be a whole number of 42-unit pages, got ${height}`);
  });

  test('a narrower page fits fewer measures per system, so the score takes more systems', () => {
    const wide = render(onePart(8), { layout: { mode: 'page' }, page: { pageWidth: 60 } });
    const narrow = render(onePart(8), { layout: { mode: 'page' }, page: { pageWidth: 20 } });
    assert.ok(
      glyphCount(narrow.svg, 'gClef') > glyphCount(wide.svg, 'gClef'),
      'a narrower page must break into more systems',
    );
  });

  test('<print new-system="yes"> forces a break even where the music would have fitted', () => {
    const withoutBreak = render(onePart(2), { layout: { mode: 'page' }, page: { pageWidth: 120 } });
    const withBreak = render(
      onePart(2, { 2: '<print new-system="yes"/>' }),
      { layout: { mode: 'page' }, page: { pageWidth: 120 } },
    );
    assert.equal(glyphCount(withoutBreak.svg, 'gClef'), 1, 'both measures fit on one wide system');
    assert.equal(glyphCount(withBreak.svg, 'gClef'), 2, 'the explicit break must split them');
  });

  test('<print new-page="yes"> starts a new page, growing the canvas', () => {
    const base = render(onePart(2), { layout: { mode: 'page' }, page: { pageWidth: 120 } });
    const broken = render(
      onePart(2, { 2: '<print new-page="yes"/>' }),
      { layout: { mode: 'page' }, page: { pageWidth: 120 } },
    );
    assert.ok(viewBox(broken.svg)[3] > viewBox(base.svg)[3]);
  });

  test('a hairpin spanning a system break reports WEDGE_CROSSES_SYSTEM rather than drawing a diagonal', () => {
    const wedged =
      '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">' +
      `<measure number="1">${ATTRS}` +
      '<direction><direction-type><wedge type="crescendo"/></direction-type></direction>' +
      whole('C', 5) +
      '</measure>' +
      '<measure number="2"><print new-system="yes"/>' +
      '<direction><direction-type><wedge type="stop"/></direction-type></direction>' +
      whole('D', 5) +
      '</measure></part></score-partwise>';
    const { diagnostics } = render(wedged, { layout: { mode: 'page' }, page: { pageWidth: 120 } });
    assert.ok([...diagnostics].some((d) => d.code === 'WEDGE_CROSSES_SYSTEM'));
  });

  test('the same hairpin in SCROLL mode draws normally -- there is only one system to cross', () => {
    const wedged =
      '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">' +
      `<measure number="1">${ATTRS}` +
      '<direction><direction-type><wedge type="crescendo"/></direction-type></direction>' +
      whole('C', 5) +
      '</measure>' +
      '<measure number="2">' +
      '<direction><direction-type><wedge type="stop"/></direction-type></direction>' +
      whole('D', 5) +
      '</measure></part></score-partwise>';
    const { diagnostics } = render(wedged);
    assert.ok(![...diagnostics].some((d) => d.code === 'WEDGE_CROSSES_SYSTEM'));
  });

  test('scroll mode ignores <print> breaks entirely -- it has only one system by definition', () => {
    const { svg } = render(onePart(2, { 2: '<print new-system="yes"/>' }));
    assert.equal(glyphCount(svg, 'gClef'), 1);
  });
});

describe('score-wide horizontal alignment across parts (Integration L)', () => {
  /** Two parts whose measure 1 has very different content -- eight eighths vs one whole note. */
  function twoUnevenParts() {
    const eighth = (step) =>
      `<note><pitch><step>${step}</step><octave>5</octave></pitch>` +
      '<duration>1</duration><voice>1</voice><type>eighth</type></note>';
    const busy = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'].map(eighth).join('');
    return (
      '<score-partwise><part-list><score-part id="P1"/><score-part id="P2"/></part-list>' +
      `<part id="P1"><measure number="1">${ATTRS}${busy}</measure>` +
      `<measure number="2">${whole('C', 5)}</measure></part>` +
      `<part id="P2"><measure number="1">${ATTRS}${whole('C', 4)}</measure>` +
      `<measure number="2">${whole('D', 4)}</measure></part></score-partwise>`
    );
  }

  test('both parts put their barlines at the SAME x, however differently their measures are filled', () => {
    const { svg } = render(twoUnevenParts());
    const xs = barlineXs(svg);
    // Two parts x two measures = four barlines, at exactly TWO distinct x
    // positions. Before the score-wide layout, each part laid itself out
    // alone and these were four different x values.
    assert.equal(xs.length, 4);
    assert.equal(new Set(xs).size, 2);
  });

  test('the same holds in page mode', () => {
    const { svg } = render(twoUnevenParts(), { layout: { mode: 'page' }, page: { pageWidth: 120 } });
    const xs = barlineXs(svg);
    assert.equal(xs.length, 4);
    assert.equal(new Set(xs).size, 2);
  });
});
