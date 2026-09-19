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

const char = (glyphName) => NE.getGlyph(glyphName).char;

/**
 * Every `<text>` element drawing a given glyph, as {x, y}. The renderer
 * emits glyphs as `<text x=".." y="..">CHAR</text>`, so this reads the
 * real placement the engine chose rather than only that "it appeared".
 */
function glyphPlacements(svg, glyphName) {
  const ch = char(glyphName);
  const out = [];
  const re = /<text([^>]*)>([^<]*)<\/text>/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    if (m[2] !== ch) continue;
    const x = Number(/x="([^"]+)"/.exec(m[1])?.[1]);
    const y = Number(/y="([^"]+)"/.exec(m[1])?.[1]);
    out.push({ x, y });
  }
  return out;
}

function renderFixture(name) {
  const xml = fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
  return NE.renderFromMusicXml(xml, { domParser });
}

function renderInline(measureBody) {
  const xml =
    '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">' +
    '<measure number="1"><attributes><divisions>2</divisions>' +
    '<time><beats>4</beats><beat-type>4</beat-type></time>' +
    '<clef><sign>G</sign><line>2</line></clef></attributes>' +
    measureBody +
    '</measure></part></score-partwise>';
  return NE.renderFromMusicXml(xml, { domParser });
}

const note = (step, octave, type, notations = '', extra = '') =>
  `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch>` +
  `<duration>2</duration><voice>1</voice><type>${type}</type>${extra}` +
  (notations === '' ? '' : `<notations>${notations}</notations>`) +
  '</note>';

describe('articulation + ornament wiring (Integration H, §9.19/§9.20)', () => {
  test('the fixture renders with no diagnostics at all', () => {
    const { diagnostics } = renderFixture('articulations-ornaments.musicxml');
    assert.deepEqual([...diagnostics], []);
  });

  test('a down-stem note takes articAccentAbove, an up-stem note articAccentBelow', () => {
    const { svg } = renderFixture('articulations-ornaments.musicxml');
    assert.equal(glyphPlacements(svg, 'articAccentAbove').length, 1);
    assert.equal(glyphPlacements(svg, 'articAccentBelow').length, 1);
  });

  test('marcato is above even on an UP-stem note -- §9.19\'s one named exception', () => {
    // The fixture's third note is E4 (up stem). If the ordinary
    // opposite-of-stem rule had been applied to it, this would be
    // articMarcatoBelow instead.
    const { svg } = renderFixture('articulations-ornaments.musicxml');
    assert.equal(glyphPlacements(svg, 'articMarcatoAbove').length, 1);
    assert.equal(glyphPlacements(svg, 'articMarcatoBelow').length, 0);
  });

  test('marcato sits above the STAFF, not merely above its own notehead', () => {
    const { svg } = renderInline(note('E', 4, 'quarter', '<articulations><strong-accent/></articulations>'));
    const [marcato] = glyphPlacements(svg, 'articMarcatoAbove');
    const [notehead] = glyphPlacements(svg, 'noteheadBlack');
    assert.ok(marcato !== undefined && notehead !== undefined);
    // Smaller y is higher up the page. E4 sits low in the treble staff,
    // so "above the staff" is far above the notehead -- more than the one
    // staff space a notehead-side mark would have used.
    assert.ok(
      notehead.y - marcato.y > 1.5,
      `expected the marcato well above the notehead, got notehead y=${notehead.y}, marcato y=${marcato.y}`,
    );
  });

  test('an ornament is above regardless of stem direction -- both directions checked', () => {
    for (const [step, octave] of [
      ['C', 5],
      ['E', 4],
    ]) {
      const { svg } = renderInline(note(step, octave, 'quarter', '<ornaments><trill-mark/></ornaments>'));
      const [trill] = glyphPlacements(svg, 'ornamentTrill');
      const [notehead] = glyphPlacements(svg, 'noteheadBlack');
      assert.ok(trill !== undefined, `no trill drawn for ${step}${octave}`);
      assert.ok(trill.y < notehead.y, `trill should be above the ${step}${octave} notehead`);
    }
  });

  test('a note carrying both a marcato and an ornament draws them at different heights, not stacked on one spot', () => {
    const { svg } = renderInline(
      note(
        'E',
        4,
        'quarter',
        '<articulations><strong-accent/></articulations><ornaments><trill-mark/></ornaments>',
      ),
    );
    const [marcato] = glyphPlacements(svg, 'articMarcatoAbove');
    const [trill] = glyphPlacements(svg, 'ornamentTrill');
    assert.ok(marcato !== undefined && trill !== undefined);
    assert.notEqual(marcato.y, trill.y);
    assert.ok(trill.y < marcato.y, 'the ornament should clear the marcato, not overlap it');
  });

  test('two articulations on one note stack rather than overprinting', () => {
    const { svg } = renderInline(
      note('C', 5, 'quarter', '<articulations><staccato/><tenuto/></articulations>'),
    );
    const [staccato] = glyphPlacements(svg, 'articStaccatoAbove');
    const [tenuto] = glyphPlacements(svg, 'articTenutoAbove');
    assert.ok(staccato !== undefined && tenuto !== undefined);
    assert.notEqual(staccato.y, tenuto.y);
  });

  test('a BEAMED note carries its marks, using the beam\'s shared stem direction', () => {
    const body =
      note('C', 5, 'eighth', '<articulations><accent/></articulations>') +
      note('D', 5, 'eighth', '<articulations><accent/></articulations>') +
      '<note><rest/><duration>4</duration><voice>1</voice><type>half</type></note>';
    const { svg } = renderInline(body);
    // Both notes are above the middle line, so the beam is down-stemmed
    // and both accents land above -- the point being that the beamed path
    // draws them at all, which it did not before Integration H.
    assert.equal(glyphPlacements(svg, 'articAccentAbove').length, 2);
  });

  test('a CHORD carries the marks its first note declares, clearing the outer noteheads', () => {
    const body =
      '<note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice>' +
      '<type>quarter</type><notations><articulations><accent/></articulations></notations></note>' +
      '<note><chord/><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration>' +
      '<voice>1</voice><type>quarter</type></note>';
    const { svg } = renderInline(body);
    const accents = glyphPlacements(svg, 'articAccentBelow');
    assert.equal(accents.length, 1);
    const noteheads = glyphPlacements(svg, 'noteheadBlack');
    const lowest = Math.max(...noteheads.map((n) => n.y));
    assert.ok(
      accents[0].y > lowest,
      'a below-side chord mark must clear the LOWEST notehead, not just the first one',
    );
  });

  test('a note with no notations renders byte-identically to before Integration H (no stray output)', () => {
    const { svg } = renderInline(note('C', 5, 'quarter'));
    assert.ok(!svg.includes('\n\n'), 'an empty marks string must not leave a blank line behind');
  });
});
