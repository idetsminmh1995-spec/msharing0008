import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NE = loadEngine();
const domParser = testDomParser();

const grandStaff = fs.readFileSync(
  path.join(__dirname, '..', 'fixtures', 'musicxml', 'musescore-grand-staff.musicxml'),
  'utf8',
);

/** The largest y any drawn primitive (text, line, path) reaches -- the ink's own bottom edge. */
function maxInkY(svg) {
  const ys = [];
  for (const m of svg.matchAll(/<text x="[-\d.]+" y="(-?[\d.]+)"/g)) ys.push(Number(m[1]));
  for (const m of svg.matchAll(/<line [^>]*y1="(-?[\d.]+)"[^>]*y2="(-?[\d.]+)"/g)) {
    ys.push(Number(m[1]), Number(m[2]));
  }
  for (const m of svg.matchAll(/<path[^>]*d="[^"]*?"/g)) {
    for (const c of m[0].matchAll(/-?[\d.]+[ ,](-?[\d.]+)/g)) ys.push(Number(c[1]));
  }
  return Math.max(...ys);
}

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

const render = (xml, config) =>
  NE.renderFromMusicXml(xml, { domParser, ...(config ? { config } : {}) });

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
    assert.equal(
      height % 42,
      0,
      `page height should be a whole number of 42-unit pages, got ${height}`,
    );
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
    const withBreak = render(onePart(2, { 2: '<print new-system="yes"/>' }), {
      layout: { mode: 'page' },
      page: { pageWidth: 120 },
    });
    assert.equal(glyphCount(withoutBreak.svg, 'gClef'), 1, 'both measures fit on one wide system');
    assert.equal(glyphCount(withBreak.svg, 'gClef'), 2, 'the explicit break must split them');
  });

  test('<print new-page="yes"> starts a new page, growing the canvas', () => {
    const base = render(onePart(2), { layout: { mode: 'page' }, page: { pageWidth: 120 } });
    const broken = render(onePart(2, { 2: '<print new-page="yes"/>' }), {
      layout: { mode: 'page' },
      page: { pageWidth: 120 },
    });
    assert.ok(viewBox(broken.svg)[3] > viewBox(base.svg)[3]);
  });

  test('a hairpin spanning a system break is split at the break, not skipped', () => {
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
    const { svg, diagnostics } = render(wedged, {
      layout: { mode: 'page' },
      page: { pageWidth: 120 },
    });
    assert.ok(
      ![...diagnostics].some((d) => d.code === 'WEDGE_CROSSES_SYSTEM'),
      'the hairpin is now drawn, so the not-implemented diagnostic is gone',
    );
    // A crescendo opens (two lines meeting at a point on the left) on the
    // start system and the incoming half closes toward its right edge on
    // the stop system -- two systems, so two pairs of converging hairpin
    // lines, one pair in each system's own vertical band.
    const hairpinLines = [
      ...svg.matchAll(/<line x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)"[^/]*\/>/g),
    ]
      .map((m) => m.slice(1).map(Number))
      .filter(([x1, y1, x2, y2]) => Math.abs(x2 - x1) > 3 && y1 !== y2);
    assert.equal(hairpinLines.length, 4, 'two systems, each with a hairpin’s two converging lines');
    const ys = hairpinLines.map(([, y]) => y);
    assert.ok(
      Math.max(...ys) - Math.min(...ys) > 10,
      'the two halves sit on two different systems, not one',
    );
  });

  test('a tie spanning a system break is split at the break, not skipped', () => {
    const tieNote = (type) =>
      '<note><pitch><step>C</step><octave>5</octave></pitch>' +
      '<duration>8</duration><voice>1</voice><type>whole</type>' +
      `<tie type="${type}"/></note>`;
    const tied =
      '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">' +
      `<measure number="1">${ATTRS}${tieNote('start')}</measure>` +
      `<measure number="2"><print new-system="yes"/>${tieNote('stop')}</measure>` +
      '</part></score-partwise>';
    const { svg, diagnostics } = render(tied, {
      layout: { mode: 'page' },
      page: { pageWidth: 120 },
    });
    assert.ok(
      ![...diagnostics].some((d) => d.code === 'TIE_CROSSES_SYSTEM'),
      'the tie is now drawn, so the not-implemented diagnostic is gone',
    );
    // One filled tie path per system. Both of a half's endpoints sit at
    // its own system's note height (only the curve's control points bulge
    // away), and the two halves sit on different systems -- so no single
    // diagonal runs between them.
    const tiePaths = [...svg.matchAll(/<path d="(M [^"]* Q [^"]* Q [^"]* Z)"/g)].map((m) => m[1]);
    assert.equal(tiePaths.length, 2, 'one tie half on each system');
    const endYs = tiePaths.map((d) => {
      const [, , y1, , y2] = d
        .match(/M ([\d.-]+) ([\d.-]+) Q [\d.-]+ [\d.-]+ ([\d.-]+) ([\d.-]+)/)
        .map(Number);
      assert.equal(y1, y2, 'a tie half’s two endpoints share their system’s note height');
      return y1;
    });
    assert.ok(
      Math.abs(endYs[0] - endYs[1]) > 10,
      'the two tie halves sit on two different systems',
    );
  });

  test('a tie spanning TWO breaks gets a whole-system half on the middle system too', () => {
    const tieNote = (types) =>
      '<note><pitch><step>C</step><octave>5</octave></pitch>' +
      '<duration>8</duration><voice>1</voice><type>whole</type>' +
      types.map((t) => `<tie type="${t}"/>`).join('') +
      '</note>';
    const chained =
      '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">' +
      `<measure number="1">${ATTRS}${tieNote(['start'])}</measure>` +
      `<measure number="2"><print new-system="yes"/>${tieNote(['stop', 'start'])}</measure>` +
      `<measure number="3"><print new-system="yes"/>${tieNote(['stop'])}</measure>` +
      '</part></score-partwise>';
    const { svg, diagnostics } = render(chained, {
      layout: { mode: 'page' },
      page: { pageWidth: 120 },
    });
    assert.ok(![...diagnostics].some((d) => d.code === 'TIE_CROSSES_SYSTEM'));
    // Two ties, each split into halves: four filled paths, on three systems.
    const tiePaths = [...svg.matchAll(/<path d="(M [^"]* Q [^"]* Q [^"]* Z)"/g)].map((m) => m[1]);
    assert.equal(tiePaths.length, 4, 'two ties, each drawn as two halves');
    const systemY = (d) => Number(/M [\d.-]+ ([\d.-]+)/.exec(d)[1]);
    const bands = new Set(tiePaths.map(systemY));
    assert.equal(bands.size, 3, 'the three halves land on three different systems');
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

  /** Horizontal lines drawn at the pedal line's own thickness -- the sustain-span segments. */
  function horizontalPedalLines(svg) {
    return [...svg.matchAll(/<line x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)"([^/]*)\/>/g)]
      .filter((m) => m[5].includes('stroke-width="0.16"'))
      .map((m) => m.slice(1, 5).map(Number))
      .filter(([x1, y1, x2, y2]) => y1 === y2 && Math.abs(x2 - x1) > 2);
  }

  const pedalSpan = (count) => {
    const start =
      '<direction><direction-type><pedal type="start" number="1"/></direction-type></direction>';
    const stop =
      '<direction><direction-type><pedal type="stop" number="1"/></direction-type></direction>';
    let measures = '';
    for (let i = 1; i <= count; i++) {
      const extra = i === 1 ? start : i === count ? stop : '';
      const brk = i > 1 ? '<print new-system="yes"/>' : '';
      measures += `<measure number="${i}">${brk}${extra}${i === 1 ? ATTRS : ''}${whole('C', 5)}</measure>`;
    }
    return (
      '<score-partwise><part-list><score-part id="P1"/></part-list>' +
      `<part id="P1">${measures}</part></score-partwise>`
    );
  };

  test('a pedal span across a system break is split at the break, never drawn backwards', () => {
    const { svg, diagnostics } = render(pedalSpan(2), {
      layout: { mode: 'page' },
      page: { pageWidth: 120 },
    });
    assert.ok(![...diagnostics].some((d) => d.code === 'UNMATCHED_PEDAL'));
    const lines = horizontalPedalLines(svg);
    assert.equal(lines.length, 2, 'one outgoing half on the start system, one incoming on the stop');
    for (const [x1, , x2] of lines) {
      assert.ok(x2 > x1, `a pedal half must run forward, got ${x1} -> ${x2}`);
    }
    const ys = lines.map(([, y]) => y);
    assert.ok(Math.max(...ys) - Math.min(...ys) > 10, 'the two halves sit on two systems');
  });

  test('a pedal span across TWO breaks gets a whole-system segment on the middle system', () => {
    const start =
      '<direction><direction-type><pedal type="start" number="1"/></direction-type></direction>';
    const stop =
      '<direction><direction-type><pedal type="stop" number="1"/></direction-type></direction>';
    const xml =
      '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">' +
      `<measure number="1">${ATTRS}${start}${whole('C', 5)}</measure>` +
      `<measure number="2"><print new-system="yes"/>${whole('C', 5)}</measure>` +
      `<measure number="3"><print new-system="yes"/>${stop}${whole('C', 5)}</measure>` +
      '</part></score-partwise>';
    const { svg, diagnostics } = render(xml, {
      layout: { mode: 'page' },
      page: { pageWidth: 120 },
    });
    assert.ok(![...diagnostics].some((d) => d.code === 'UNMATCHED_PEDAL'));
    const lines = horizontalPedalLines(svg);
    assert.equal(lines.length, 3, 'outgoing, one whole-system middle, and incoming');
    const bands = new Set(lines.map(([, y]) => y));
    assert.equal(bands.size, 3, 'each segment sits on its own system');
  });

  test('an octave-shift bracket across a system break is drawn on BOTH systems, not dropped', () => {
    const start =
      '<direction><direction-type><octave-shift type="down" size="8" number="1"/></direction-type></direction>';
    const stop =
      '<direction><direction-type><octave-shift type="stop" size="8" number="1"/></direction-type></direction>';
    const xml =
      '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">' +
      `<measure number="1">${ATTRS}${start}${whole('C', 5)}</measure>` +
      `<measure number="2"><print new-system="yes"/>${stop}${whole('C', 5)}</measure>` +
      '</part></score-partwise>';
    const { svg, diagnostics } = render(xml, {
      layout: { mode: 'page' },
      page: { pageWidth: 120 },
    });
    assert.ok(![...diagnostics].some((d) => d.code === 'UNMATCHED_OCTAVE_SHIFT'));
    // The bracket is a horizontal line at the mark's thickness; two systems
    // means two of them, in two different vertical bands.
    const brackets = [
      ...svg.matchAll(/<line x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)"([^/]*)\/>/g),
    ]
      .filter((m) => m[5].includes('stroke-width="0.16"'))
      .map((m) => m.slice(1, 5).map(Number))
      .filter(([x1, y1, x2, y2]) => y1 === y2 && Math.abs(x2 - x1) > 2 && y1 < 24);
    assert.equal(brackets.length, 2, 'one bracket on each system');
    const ys = brackets.map(([, y]) => y);
    assert.ok(Math.max(...ys) - Math.min(...ys) > 10, 'the two brackets sit on two systems');
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
    const { svg } = render(twoUnevenParts(), {
      layout: { mode: 'page' },
      page: { pageWidth: 120 },
    });
    const xs = barlineXs(svg);
    assert.equal(xs.length, 4);
    assert.equal(new Set(xs).size, 2);
  });
});

describe('page mode never clips or overlaps (Phase 47, §16.3 reflow)', () => {
  test('a page fits the grand staff it holds -- no ink past the page’s bottom edge', () => {
    // The grand staff's own system (28.8 staff spaces) is TALLER than the
    // usable height of this short page (20 - 2 - 2 = 16), so before the
    // height-aware fix the system spilled past the page and off the
    // canvas. The page must now grow to hold it.
    const page = {
      pageWidth: 30,
      pageHeight: 20,
      marginTop: 2,
      marginBottom: 2,
      marginLeft: 2,
      marginRight: 2,
    };
    const { svg } = render(grandStaff, { layout: { mode: 'page' }, page });
    const [, , , canvasHeight] = viewBox(svg);
    assert.ok(
      maxInkY(svg) <= canvasHeight,
      `ink at y=${maxInkY(svg)} runs past the ${canvasHeight}-unit canvas`,
    );
  });

  test('systems on a short page are pitched by their REAL height, never overlapping', () => {
    const page = {
      pageWidth: 30,
      pageHeight: 20,
      marginTop: 2,
      marginBottom: 2,
      marginLeft: 2,
      marginRight: 2,
    };
    // The grand staff's own system height (scroll mode draws exactly one).
    const systemHeight = viewBox(render(grandStaff).svg)[3];
    assert.ok(
      systemHeight > page.pageHeight,
      'the fixture must be taller than the page to be a real test',
    );

    const { svg } = render(grandStaff, { layout: { mode: 'page' }, page });
    // Each system's treble clef, in reading order.
    const clef = NE.getGlyph('gClef').char;
    const clefYs = [
      ...svg.matchAll(new RegExp(`<text x="[\\d.]+" y="(-?[\\d.]+)"[^>]*>${clef}</text>`, 'g')),
    ].map((m) => Number(m[1]));
    assert.ok(clefYs.length >= 2, 'expected more than one system');
    const pitches = clefYs.slice(1).map((y, i) => y - clefYs[i]);
    for (const pitch of pitches) {
      assert.ok(
        pitch >= systemHeight,
        `systems overlap: pitch ${pitch} is less than the system height ${systemHeight}`,
      );
    }
  });

  test('a normal page’s output is unchanged by the height-aware page stacking', () => {
    // pageHeight 42 comfortably fits the grand staff's 28.8-unit system,
    // so every page is exactly 42 tall and the canvas is a whole number
    // of pages -- the byte-for-byte case the fix must not disturb.
    const { svg } = render(grandStaff, { layout: { mode: 'page' } });
    const [, , width, height] = viewBox(svg);
    assert.equal(width, 30);
    assert.equal(height % 42, 0);
  });
});
