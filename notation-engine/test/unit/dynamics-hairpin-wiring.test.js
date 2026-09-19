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

/** Every `<line>` as {x1,y1,x2,y2} -- what a hairpin is actually made of. */
function lines(svg) {
  const out = [];
  const re = /<line([^>]*)\/>/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    const num = (name) => Number(new RegExp(`${name}="([^"]+)"`).exec(m[1])?.[1]);
    out.push({ x1: num('x1'), y1: num('y1'), x2: num('x2'), y2: num('y2') });
  }
  return out;
}

/**
 * A hairpin is exactly two lines sharing one endpoint (its narrow end)
 * and spreading symmetrically to the other. Finding that shape proves a
 * hairpin was drawn far more specifically than counting stroke widths,
 * which Bravura gives barlines and brackets too.
 */
function hairpins(svg) {
  const all = lines(svg);
  const found = [];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i];
      const b = all[j];
      if (a.x1 !== b.x1 || a.y1 !== b.y1) continue;
      if (a.x2 !== b.x2) continue;
      const spreadA = a.y2 - a.y1;
      const spreadB = b.y2 - b.y1;
      if (spreadA === 0 || spreadA !== -spreadB) continue;
      found.push({ narrowX: a.x1, wideX: a.x2, y: a.y1 });
    }
  }
  return found;
}

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

const renderFixture = (name) =>
  NE.renderFromMusicXml(fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8'), { domParser });

function render(measureBody) {
  const xml =
    '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">' +
    '<measure number="1"><attributes><divisions>2</divisions>' +
    '<time><beats>4</beats><beat-type>4</beat-type></time>' +
    '<clef><sign>G</sign><line>2</line></clef></attributes>' +
    measureBody +
    '</measure></part></score-partwise>';
  return NE.renderFromMusicXml(xml, { domParser });
}

const half = (step) =>
  `<note><pitch><step>${step}</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>`;

describe('dynamics + hairpin wiring (Integration J, §9.21)', () => {
  test('the fixture renders with no diagnostics, drawing both dynamics and one hairpin', () => {
    const { svg, diagnostics } = renderFixture('dynamics-hairpin.musicxml');
    assert.deepEqual([...diagnostics], []);
    assert.equal(glyphPlacements(svg, 'dynamicMF').length, 1);
    assert.equal(glyphPlacements(svg, 'dynamicFF').length, 1);
    assert.equal(hairpins(svg).length, 1);
  });

  test('a wedge that OPENS in one measure and CLOSES in the next spans both', () => {
    const { svg } = renderFixture('dynamics-hairpin.musicxml');
    const [hairpin] = hairpins(svg);
    const ff = glyphPlacements(svg, 'dynamicFF')[0];
    const mf = glyphPlacements(svg, 'dynamicMF')[0];
    // The span starts around the measure-1 dynamic and ends around the
    // measure-2 one, i.e. it genuinely crosses the barline.
    assert.ok(hairpin.narrowX >= mf.x);
    assert.ok(hairpin.wideX > mf.x);
    assert.ok(Math.abs(hairpin.wideX - ff.x) < 1e-9);
  });

  test('a dynamic sits BELOW the staff by default (§9.21)', () => {
    const { svg } = render(
      '<direction><direction-type><dynamics><f/></dynamics></direction-type></direction>' +
        half('C') +
        half('D'),
    );
    const [dynamic] = glyphPlacements(svg, 'dynamicForte');
    const lowestStaffLine = Math.max(...lines(svg).map((l) => l.y1));
    assert.ok(dynamic.y > lowestStaffLine, 'a default dynamic belongs below the staff');
  });

  test('an explicit placement="above" is honoured rather than silently overridden', () => {
    const { svg } = render(
      '<direction placement="above"><direction-type><dynamics><f/></dynamics></direction-type></direction>' +
        half('C') +
        half('D'),
    );
    const [dynamic] = glyphPlacements(svg, 'dynamicForte');
    const highestStaffLine = Math.min(...lines(svg).map((l) => l.y1));
    assert.ok(dynamic.y < highestStaffLine, 'an explicit above placement belongs above the staff');
  });

  test('a crescendo is narrow at its START; a decrescendo is narrow at its END (mirror images)', () => {
    const body = (type) =>
      `<direction><direction-type><wedge type="${type}" number="1"/></direction-type></direction>` +
      half('C') +
      '<direction><direction-type><wedge type="stop" number="1"/></direction-type></direction>' +
      half('D');
    const cres = hairpins(render(body('crescendo')).svg)[0];
    const dim = hairpins(render(body('diminuendo')).svg)[0];
    assert.ok(cres.narrowX < cres.wideX, 'a crescendo opens left to right');
    assert.ok(dim.narrowX > dim.wideX, 'a decrescendo closes left to right');
  });

  test('several <dynamics> children in one element lay out left to right, not on one spot', () => {
    const { svg } = render(
      '<direction><direction-type><dynamics><sfz/><p/></dynamics></direction-type></direction>' +
        half('C') +
        half('D'),
    );
    const [sfz] = glyphPlacements(svg, 'dynamicSforzato');
    const [p] = glyphPlacements(svg, 'dynamicPiano');
    assert.ok(sfz !== undefined && p !== undefined);
    assert.ok(p.x > sfz.x, 'the second glyph must advance past the first');
    assert.equal(p.y, sfz.y);
  });

  test('a wedge that never stops reports UNMATCHED_WEDGE and draws nothing', () => {
    const { svg, diagnostics } = render(
      '<direction><direction-type><wedge type="crescendo"/></direction-type></direction>' +
        half('C') +
        half('D'),
    );
    assert.equal(hairpins(svg).length, 0);
    assert.ok([...diagnostics].some((d) => d.code === 'UNMATCHED_WEDGE'));
  });

  test('a wedge stop with no start reports UNMATCHED_WEDGE rather than throwing', () => {
    let result;
    assert.doesNotThrow(() => {
      result = render(
        '<direction><direction-type><wedge type="stop"/></direction-type></direction>' +
          half('C') +
          half('D'),
      );
    });
    assert.equal(hairpins(result.svg).length, 0);
    assert.ok([...result.diagnostics].some((d) => d.code === 'UNMATCHED_WEDGE'));
  });
});
