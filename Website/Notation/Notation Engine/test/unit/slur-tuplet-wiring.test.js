import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures', 'musicxml');
const NE = loadEngine();
const domParser = testDomParser();

const count = (svg, re) => (svg.match(re) ?? []).length;
const glyphCount = (svg, glyphName) => svg.split(NE.getGlyph(glyphName).char).length - 1;

function renderFixture(name) {
  return NE.renderFromMusicXml(fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8'), {
    domParser,
  });
}

function render(measures, divisions = 6) {
  const xml =
    '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">' +
    `<measure number="1"><attributes><divisions>${divisions}</divisions>` +
    '<time><beats>4</beats><beat-type>4</beat-type></time>' +
    '<clef><sign>G</sign><line>2</line></clef></attributes>' +
    measures +
    '</measure></part></score-partwise>';
  return NE.renderFromMusicXml(xml, { domParser });
}

const ATTRS_4_4 =
  '<attributes><divisions>6</divisions><time><beats>4</beats><beat-type>4</beat-type></time>' +
  '<clef><sign>G</sign><line>2</line></clef></attributes>';

/**
 * One part of quarter notes; measure 1 carries `first`, measure 2 carries
 * `second`. `breakBefore2` puts measure 2 on a new system, which is what
 * makes a cross-barline slur also cross a SYSTEM.
 */
function renderTwoMeasures(first, second, { breakBefore2 = false, config } = {}) {
  const xml =
    '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">' +
    `<measure number="1">${ATTRS_4_4}${first}</measure>` +
    `<measure number="2">${breakBefore2 ? '<print new-system="yes"/>' : ''}${second}</measure>` +
    '</part></score-partwise>';
  return NE.renderFromMusicXml(xml, { domParser, ...(config ? { config } : {}) });
}

const quarter = (step, octave, notations = '') =>
  `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>6</duration>` +
  `<voice>1</voice><type>quarter</type>` +
  (notations === '' ? '' : `<notations>${notations}</notations>`) +
  '</note>';

/** The {x, y} where each slur path begins, in document order. */
function slurStarts(svg) {
  return [...svg.matchAll(/<path d="M ([\d.-]+) ([\d.-]+)/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
  }));
}

const tupletNote = (step, octave, notations, beam = '') =>
  `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>2</duration>` +
  '<voice>1</voice><type>eighth</type>' +
  '<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>' +
  beam +
  (notations === '' ? '' : `<notations>${notations}</notations>`) +
  '</note>';

/** Every `<text>` element's {x,y} for a given glyph. */
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

describe('slur wiring (Integration I, §9.16)', () => {
  test('the fixture renders with no diagnostics and draws exactly one slur', () => {
    const { svg, diagnostics } = renderFixture('slur-tuplet.musicxml');
    assert.deepEqual([...diagnostics], []);
    // The fixture has no ties, so every filled <path> is a slur.
    assert.equal(count(svg, /<path/g), 1);
  });

  test("a slur over all UP-stem notes is placed BELOW them (§9.16's Dorico-confirmed rule)", () => {
    const { svg } = renderFixture('slur-tuplet.musicxml');
    const d = /<path d="M ([\d.-]+) ([\d.-]+)/.exec(svg);
    assert.ok(d !== null);
    const slurY = Number(d[2]);
    const lowestNotehead = Math.max(...glyphPlacements(svg, 'noteheadBlack').map((n) => n.y));
    // Larger y is further DOWN the page.
    assert.ok(
      slurY > lowestNotehead,
      `expected the slur below the noteheads: slur y=${slurY}, lowest notehead y=${lowestNotehead}`,
    );
  });

  test('a slur over all DOWN-stem notes is placed ABOVE them -- the opposite branch', () => {
    const body =
      '<note><pitch><step>C</step><octave>5</octave></pitch><duration>6</duration><voice>1</voice>' +
      '<type>quarter</type><notations><slur type="start"/></notations></note>' +
      '<note><pitch><step>D</step><octave>5</octave></pitch><duration>6</duration><voice>1</voice>' +
      '<type>quarter</type><notations><slur type="stop"/></notations></note>';
    const { svg } = render(body);
    const slurY = Number(/<path d="M ([\d.-]+) ([\d.-]+)/.exec(svg)[2]);
    const highestNotehead = Math.min(...glyphPlacements(svg, 'noteheadBlack').map((n) => n.y));
    assert.ok(slurY < highestNotehead, `expected the slur above: ${slurY} vs ${highestNotehead}`);
  });

  test('two slur numbers nest independently rather than being confused for one another', () => {
    const q = (step, notations) =>
      `<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>6</duration>` +
      `<voice>1</voice><type>quarter</type>${notations === '' ? '' : `<notations>${notations}</notations>`}</note>`;
    const { svg, diagnostics } = render(
      q('E', '<slur type="start" number="1"/>') +
        q('F', '<slur type="start" number="2"/>') +
        q('G', '<slur type="stop" number="2"/>') +
        q('A', '<slur type="stop" number="1"/>'),
    );
    assert.deepEqual([...diagnostics], []);
    assert.equal(count(svg, /<path/g), 2);
  });

  test('a one-note "slur" is rejected rather than silently drawing something (§9.16)', () => {
    const { svg } = render(
      '<note><pitch><step>E</step><octave>4</octave></pitch><duration>6</duration><voice>1</voice>' +
        '<type>quarter</type><notations><slur type="start"/><slur type="stop"/></notations></note>',
    );
    assert.equal(count(svg, /<path/g), 0);
  });

  test('a slur stop with no matching start reports UNMATCHED_SLUR instead of drawing or throwing', () => {
    const { svg, diagnostics } = render(
      '<note><pitch><step>E</step><octave>4</octave></pitch><duration>6</duration><voice>1</voice>' +
        '<type>quarter</type><notations><slur type="stop"/></notations></note>',
    );
    assert.equal(count(svg, /<path/g), 0);
    assert.ok([...diagnostics].some((d) => d.code === 'UNMATCHED_SLUR'));
  });

  test('a slur that never stops anywhere in its part reports UNMATCHED_SLUR', () => {
    const { diagnostics } = render(
      '<note><pitch><step>E</step><octave>4</octave></pitch><duration>6</duration><voice>1</voice>' +
        '<type>quarter</type><notations><slur type="start"/></notations></note>',
    );
    assert.ok([...diagnostics].some((d) => d.code === 'UNMATCHED_SLUR'));
  });

  test('a slur from one measure into the next draws ONE curve spanning both (same system)', () => {
    const { svg, diagnostics } = renderTwoMeasures(
      quarter('E', 5, '<slur type="start" number="1"/>') + quarter('F', 5, ''),
      quarter('G', 5, '<slur type="stop" number="1"/>') + quarter('A', 5, ''),
    );
    assert.deepEqual([...diagnostics], []);
    assert.equal(count(svg, /<path/g), 1, 'one slur, not two halves');
    const [start] = slurStarts(svg);
    // The curve must begin on measure 1's side of the barline, not on the
    // second note of measure 2 where a stop-only slur would have started.
    assert.ok(start.x < 20, `the slur should start at measure 1's first note, got x=${start.x}`);
  });

  test('a slur across a barline AND a system break is split at the break, never drawn backwards', () => {
    const { svg, diagnostics } = renderTwoMeasures(
      quarter('E', 5, '<slur type="start" number="1"/>') + quarter('F', 5, ''),
      quarter('G', 5, '<slur type="stop" number="1"/>') + quarter('A', 5, ''),
      { breakBefore2: true, config: { layout: { mode: 'page' }, page: { pageWidth: 40 } } },
    );
    assert.deepEqual([...diagnostics], []);
    const starts = slurStarts(svg);
    assert.equal(
      starts.length,
      2,
      'one outgoing half on the start system, one incoming on the stop',
    );
    const ys = starts.map((s) => s.y);
    assert.ok(Math.max(...ys) - Math.min(...ys) > 10, 'the two halves sit on two systems');
  });

  test('a slur stop with no start ANYWHERE in its part still reports UNMATCHED_SLUR', () => {
    const { svg, diagnostics } = renderTwoMeasures(
      quarter('E', 5) + quarter('F', 5),
      quarter('G', 5, '<slur type="stop" number="1"/>') + quarter('A', 5),
    );
    assert.equal(count(svg, /<path/g), 0);
    assert.ok([...diagnostics].some((d) => d.code === 'UNMATCHED_SLUR'));
  });
});

describe('tuplet wiring (Integration I, §9.17)', () => {
  test('both tuplets draw their number, but only the unbeamed one draws a bracket', () => {
    const { svg } = renderFixture('slur-tuplet.musicxml');
    assert.equal(glyphCount(svg, 'tuplet3'), 2);
    // Bravura gives a tuplet bracket and a thin barline the same 0.16
    // thickness, so this counts both: 2 barlines (one per measure) plus
    // the 3 lines of the ONE bracket the rest-containing tuplet needs.
    // A bracket on the fully-beamed tuplet too would make it 8.
    assert.equal(count(svg, /stroke-width="0.16"/g), 5);
  });

  test("a tuplet's number/bracket sits on the STEM side -- the opposite of a slur's rule (§9.17)", () => {
    // Down-stem notes (above the middle line): tupletSide('down') is
    // 'below', while a slur over the same notes would go ABOVE. Getting
    // this backwards is the exact mistake §9.17 warns about.
    const { svg } = render(
      tupletNote('C', 5, '<tuplet type="start"/>') +
        tupletNote('D', 5, '') +
        tupletNote('E', 5, '<tuplet type="stop"/>'),
    );
    const [number] = glyphPlacements(svg, 'tuplet3');
    const lowestNotehead = Math.max(...glyphPlacements(svg, 'noteheadBlack').map((n) => n.y));
    assert.ok(
      number.y > lowestNotehead,
      `a down-stem tuplet's number belongs below: number y=${number.y}, lowest notehead y=${lowestNotehead}`,
    );
  });

  test('an up-stem tuplet puts its number above -- the mirror of the previous case', () => {
    const { svg } = render(
      tupletNote('E', 4, '<tuplet type="start"/>') +
        tupletNote('F', 4, '') +
        tupletNote('G', 4, '<tuplet type="stop"/>'),
    );
    const [number] = glyphPlacements(svg, 'tuplet3');
    const highestNotehead = Math.min(...glyphPlacements(svg, 'noteheadBlack').map((n) => n.y));
    assert.ok(number.y < highestNotehead);
  });

  test('a tuplet with no <time-modification> to number it reports TUPLET_WITHOUT_RATIO', () => {
    const plain = (step, notations) =>
      `<note><pitch><step>${step}</step><octave>5</octave></pitch><duration>2</duration>` +
      `<voice>1</voice><type>eighth</type><notations>${notations}</notations></note>`;
    const { svg, diagnostics } = render(
      plain('C', '<tuplet type="start"/>') + plain('E', '<tuplet type="stop"/>'),
    );
    assert.equal(glyphCount(svg, 'tuplet3'), 0);
    assert.ok([...diagnostics].some((d) => d.code === 'TUPLET_WITHOUT_RATIO'));
  });

  test("a 10-or-more-note tuplet reports TUPLET_NUMBER_UNSUPPORTED rather than throwing (§9.17's stated limit)", () => {
    const wide = (step, notations) =>
      `<note><pitch><step>${step}</step><octave>5</octave></pitch><duration>1</duration>` +
      '<voice>1</voice><type>16th</type>' +
      '<time-modification><actual-notes>11</actual-notes><normal-notes>8</normal-notes></time-modification>' +
      `<notations>${notations}</notations></note>`;
    let result;
    assert.doesNotThrow(() => {
      result = render(wide('C', '<tuplet type="start"/>') + wide('E', '<tuplet type="stop"/>'));
    });
    assert.ok([...result.diagnostics].some((d) => d.code === 'TUPLET_NUMBER_UNSUPPORTED'));
  });

  test('a tuplet stop with no matching start reports UNMATCHED_TUPLET', () => {
    const { diagnostics } = render(
      tupletNote('C', 5, '<tuplet type="stop"/>') + tupletNote('D', 5, ''),
    );
    assert.ok([...diagnostics].some((d) => d.code === 'UNMATCHED_TUPLET'));
  });

  test('a tuplet that never stops in its measure reports UNMATCHED_TUPLET', () => {
    const { diagnostics } = render(
      tupletNote('C', 5, '<tuplet type="start"/>') + tupletNote('D', 5, ''),
    );
    assert.ok([...diagnostics].some((d) => d.code === 'UNMATCHED_TUPLET'));
  });
});
