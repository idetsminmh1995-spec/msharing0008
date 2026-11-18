import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const NE = loadEngine();
const domParser = testDomParser();

/**
 * A one-measure, single-staff score whose only staff declares `lines`
 * staff lines. Everything else is the plainest possible notation so the
 * only thing that can move the geometry is the line count.
 */
function score(lines, body) {
  return (
    '<?xml version="1.0"?><score-partwise version="3.1">' +
    '<part-list><score-part id="P1"><part-name>X</part-name></score-part></part-list>' +
    '<part id="P1"><measure number="1">' +
    '<attributes><divisions>1</divisions><key><fifths>0</fifths></key>' +
    '<time><beats>4</beats><beat-type>4</beat-type></time>' +
    '<staves>1</staves>' +
    '<clef><sign>G</sign><line>2</line></clef>' +
    `<staff-details number="1"><staff-lines>${lines}</staff-lines></staff-details>` +
    '</attributes>' +
    body +
    '</measure></part></score-partwise>'
  );
}

const render = (lines, body) => NE.renderFromMusicXml(score(lines, body), { domParser }).svg;

const note = (step, octave) =>
  `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch>` +
  '<duration>4</duration><type>whole</type></note>';

const quarter = (step, octave) =>
  `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch>` +
  '<duration>1</duration><type>quarter</type></note>';

const rest = '<note><rest/><duration>4</duration><type>whole</type></note>';

/** The long horizontal lines are the staff's own lines; stems and ledgers are short. */
function staffLineYs(svg) {
  return [...svg.matchAll(/<line x1="([\d.]+)" y1="(-?[\d.]+)" x2="([\d.]+)" y2="\2"/g)]
    .filter((m) => Number(m[3]) - Number(m[1]) > 4)
    .map((m) => Number(m[2]));
}

/** The short horizontal lines drawn inside a note's own group are its ledger lines. */
function ledgerCount(svg) {
  const group = svg.match(/<g data-id="P1#m1#v1#e0">([\s\S]*?)<\/g>/);
  if (group === null) return 0;
  return (group[1].match(/stroke-width="0\.16"/g) ?? []).length;
}

/** The direction of the stem drawn in the note's group: 'up', 'down', or undefined if none. */
function stemDirection(svg) {
  const group = svg.match(/<g data-id="P1#m1#v1#e0">([\s\S]*?)<\/g>/);
  if (group === null) return undefined;
  const m = group[1].match(
    /<line x1="[\d.]+" y1="([\d.]+)" x2="[\d.]+" y2="([\d.]+)"[^>]*stroke-width="0\.12"/,
  );
  if (m === null) return undefined;
  return Number(m[2]) < Number(m[1]) ? 'up' : 'down';
}

/** The y of the whole/half rest glyph (U+E4E3) in the note group. */
function restGlyphY(svg) {
  const m = svg.match(/<text x="[\d.]+" y="(-?[\d.]+)" font-family="Bravura"[^>]*>\uE4E3<\/text>/);
  return m === null ? undefined : Number(m[1]);
}

describe('staff-line count reaches note geometry (PLAN Part F)', () => {
  test('the staff draws exactly the lines its <staff-lines> declares', () => {
    for (const lines of [1, 3, 4, 5, 6]) {
      assert.equal(staffLineYs(render(lines, note('B', 4))).length, lines, `${lines}-line staff`);
    }
  });

  test('a high note above a SHORTER staff needs more ledger lines than above a 5-line staff', () => {
    // C6 sits four staff-spaces above the top line of a 5-line staff (2
    // ledgers). A 3-line staff's top line is two spaces lower, so the same
    // pitch is six spaces up and needs 4; a 6-line staff's top line is one
    // space higher, so it needs 1. Before Part F all three were hardcoded
    // to the 5-line answer (2).
    assert.equal(ledgerCount(render(3, note('C', 6))), 4);
    assert.equal(ledgerCount(render(5, note('C', 6))), 2);
    assert.equal(ledgerCount(render(6, note('C', 6))), 1);
  });

  test("a pitch that sits ON a 5-line staff's top line needs ledgers above a shorter staff", () => {
    // G5 is exactly the top line of a 5-line staff, so it needs no ledger
    // there; it is two lines above a 3-line staff's top (2 ledgers) and
    // inside a 6-line staff's extra line (none).
    assert.equal(ledgerCount(render(3, note('G', 5))), 2);
    assert.equal(ledgerCount(render(5, note('G', 5))), 0);
    assert.equal(ledgerCount(render(6, note('G', 5))), 0);
  });

  test('stem direction follows the staff middle line, not a fixed 5-line middle', () => {
    // B4 is exactly the middle line of a 5-line staff, so it takes the
    // "up" stem an at-or-below-middle note gets. A 3-line staff's middle
    // line is two positions lower (G4), so the same B4 is now ABOVE the
    // middle and takes a down stem. A 6-line staff's middle sits between
    // B4 and C5, so B4 is below it and stays up.
    assert.equal(stemDirection(render(3, quarter('B', 4))), 'down');
    assert.equal(stemDirection(render(5, quarter('B', 4))), 'up');
    assert.equal(stemDirection(render(6, quarter('B', 4))), 'up');
  });

  test('a whole rest sits against the staff middle line, whatever the line count', () => {
    // The rest's baseline tracks middleLineY, so it moves with the staff's
    // own line count instead of assuming a 5-line staff: a 3-line staff's
    // rest sits lower (absolute y) than a 5-line one's, which in turn sits
    // lower than a 6-line one's.
    assert.equal(restGlyphY(render(3, rest)), 6);
    assert.equal(restGlyphY(render(5, rest)), 5);
    assert.equal(restGlyphY(render(6, rest)), 4.5);
  });

  test('a 5-line staff is byte-identical whether or not the line count is declared', () => {
    const withoutDetails =
      '<?xml version="1.0"?><score-partwise version="3.1">' +
      '<part-list><score-part id="P1"><part-name>X</part-name></score-part></part-list>' +
      '<part id="P1"><measure number="1">' +
      '<attributes><divisions>1</divisions><key><fifths>0</fifths></key>' +
      '<time><beats>4</beats><beat-type>4</beat-type></time>' +
      '<staves>1</staves>' +
      '<clef><sign>G</sign><line>2</line></clef>' +
      '</attributes>' +
      note('C', 5) +
      '</measure></part></score-partwise>';
    assert.equal(NE.renderFromMusicXml(withoutDetails, { domParser }).svg, render(5, note('C', 5)));
  });
});

describe('TAB clef placement (PLAN Part F)', () => {
  /** A one-measure tab staff with `lines` string lines and a single open string-1 note. */
  function tabScore(lines) {
    return (
      '<?xml version="1.0"?><score-partwise version="3.1">' +
      '<part-list><score-part id="P1"><part-name>Guitar TAB</part-name></score-part></part-list>' +
      '<part id="P1"><measure number="1">' +
      '<attributes><divisions>1</divisions>' +
      '<time><beats>4</beats><beat-type>4</beat-type></time>' +
      `<staff-details><staff-lines>${lines}</staff-lines></staff-details>` +
      '<clef><sign>TAB</sign><line>5</line></clef>' +
      '</attributes>' +
      '<note><pitch><step>E</step><octave>2</octave></pitch>' +
      '<duration>4</duration><type>whole</type>' +
      '<notations><technical><string>1</string><fret>0</fret></technical></notations>' +
      '</note></measure></part></score-partwise>'
    );
  }

  const tabSvg = (lines) => NE.renderFromMusicXml(tabScore(lines), { domParser }).svg;

  /** The y of the tab clef glyph (SMuFL U+E06D). */
  const tabClefY = (svg) => {
    const m = svg.match(/<text x="[\d.]+" y="(-?[\d.]+)"[^>]*>\uE06D<\/text>/);
    return m === null ? undefined : Number(m[1]);
  };

  test('the tab clef is centred on a 6-line tab staff, not a unit-spacing guess', () => {
    // The staff's six lines sit 1.5 apart, so its centre is not the -2.5 the
    // clef constant names in staff-space units but that value times the 1.5
    // spacing. Before Part F the glyph was drawn a fixed 1.25 units too low.
    const svg = tabSvg(6);
    const ys = staffLineYs(svg);
    assert.equal(ys.length, 6);
    assert.equal(tabClefY(svg), (Math.min(...ys) + Math.max(...ys)) / 2);
  });
});
