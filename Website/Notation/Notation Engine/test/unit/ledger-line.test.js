import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const NE = loadEngine();
const domParser = testDomParser();

describe('ledger lines (Phase 14)', () => {
  test('middle C in treble clef needs exactly one ledger line below, at y=+1', () => {
    const position = NE.staffPositionForPitch(NE.TREBLE_CLEF, 'C', 4);
    assert.equal(position, 1);
    const lines = NE.computeLedgerLines(position, 5);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].y, 1);
  });

  test('middle C in bass clef needs exactly one ledger line above, at y=-5 (symmetric with the treble case)', () => {
    const position = NE.staffPositionForPitch(NE.BASS_CLEF, 'C', 4);
    assert.equal(position, -5);
    const lines = NE.computeLedgerLines(position, 5);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].y, -5);
  });

  test("C4 in alto clef (the clef's own reference, on the middle line) needs no ledger lines", () => {
    const position = NE.staffPositionForPitch(NE.ALTO_CLEF, 'C', 4);
    assert.equal(position, -2);
    const lines = NE.computeLedgerLines(position, 5);
    assert.equal(lines.length, 0);
  });

  test('a note 3 ledger lines above the staff gets 3 segments at consecutive integers', () => {
    // Treble top line is y=-4; three ledger lines above lands at y=-7.
    const lines = NE.computeLedgerLines(-7, 5);
    assert.deepEqual(
      [...lines].map((l) => l.y),
      [-5, -6, -7],
    );
  });

  test('a note 3 ledger lines below the staff gets 3 segments at consecutive integers', () => {
    const lines = NE.computeLedgerLines(3, 5);
    assert.deepEqual(
      [...lines].map((l) => l.y),
      [1, 2, 3],
    );
  });

  test('a note in the space just outside the staff (not yet on a ledger line) needs none', () => {
    assert.equal(NE.computeLedgerLines(0.5, 5).length, 0); // just below bottom line
    assert.equal(NE.computeLedgerLines(-4.5, 5).length, 0); // just above top line
  });

  test('a note in the second space beyond the staff still needs the nearer ledger line drawn', () => {
    const below = NE.computeLedgerLines(1.5, 5);
    assert.deepEqual(
      [...below].map((l) => l.y),
      [1],
    );
    const above = NE.computeLedgerLines(-5.5, 5);
    assert.deepEqual(
      [...above].map((l) => l.y),
      [-5],
    );
  });

  test('works for a non-5-line staff (e.g. a 1-line percussion staff)', () => {
    assert.deepEqual(
      [...NE.computeLedgerLines(2, 1)].map((l) => l.y),
      [1, 2],
    );
    assert.deepEqual(
      [...NE.computeLedgerLines(-2, 1)].map((l) => l.y),
      [-1, -2],
    );
  });

  test('a note inside the staff yields an empty list', () => {
    assert.equal(NE.computeLedgerLines(-2, 5).length, 0);
    assert.equal(NE.computeLedgerLines(0, 5).length, 0);
    assert.equal(NE.computeLedgerLines(-4, 5).length, 0);
  });

  test('rejects an invalid line count', () => {
    assert.throws(() => NE.computeLedgerLines(1, 0), /positive integer/);
    assert.throws(() => NE.computeLedgerLines(1, -3), /positive integer/);
    assert.throws(() => NE.computeLedgerLines(1, 2.5), /positive integer/);
  });
});

/**
 * A chord sits in ONE column, so its ledger lines belong to the chord, not
 * to each member: a line two members both need is drawn once. Drawing it
 * per member stacked identical `<line>` elements on the same y -- invisible
 * on screen, but two members needing the same line is the normal case for
 * a drum chord (crash and splash above the staff) and for any voiced chord
 * (A5 + C6).
 */
describe('a chord draws each ledger line once', () => {
  /** Horizontal rules that are not staff lines, as {y, x1, x2}, in draw order. */
  function ledgerLines(svg) {
    const staff = new Set(
      [...svg.matchAll(/<line x1="[^"]+" y1="([^"]+)" x2="[^"]+" y2="([^"]+)"([^/]*)\/>/g)]
        .filter((m) => m[1] === m[2] && m[3].includes('stroke-width="0.13"'))
        .map((m) => m[1]),
    );
    return [...svg.matchAll(/<line x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"([^/]*)\/>/g)]
      .filter((m) => m[2] === m[4] && m[1] !== m[3] && !staff.has(m[2]))
      .map((m) => ({ y: Number(m[2]), x1: Number(m[1]), x2: Number(m[3]) }));
  }

  const render = (xml) => NE.renderFromMusicXml(xml, { domParser }).svg;
  const part = (body, instruments = '') =>
    '<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Kit</part-name>' +
    instruments +
    '</score-part></part-list><part id="P1"><measure number="1"><attributes>' +
    '<divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time>' +
    '<clef><sign>percussion</sign><line>2</line></clef></attributes>' +
    body +
    '</measure></part></score-partwise>';
  const rest = '<note><rest/><duration>6</duration><voice>1</voice><type>half</type><dot/></note>';
  const drum = (step, octave, id, chord = '') =>
    `<note>${chord}<unpitched><display-step>${step}</display-step>` +
    `<display-octave>${octave}</display-octave></unpitched>` +
    `<duration>2</duration><voice>1</voice><type>quarter</type>` +
    `<instrument id="${id}"/></note>`;
  const instrument = (id, gm) =>
    `<midi-instrument id="${id}"><midi-channel>10</midi-channel>` +
    `<midi-unpitched>${gm + 1}</midi-unpitched></midi-instrument>`;

  test('a drum chord whose members need the SAME ledger line draws it once', () => {
    // Crash Cymbal 1 (GM 49) sits on staff position -5, which needs the -5
    // line. The second member sits on C6, position -6, which needs the -5
    // AND -6 lines. The chord therefore needs two lines -- one pass per
    // member drew the -5 line twice.
    const svg = render(
      part(
        drum('A', 5, 'P1-A') + drum('C', 6, 'P1-B', '<chord/>') + rest,
        instrument('P1-A', 49) + instrument('P1-B', 55),
      ),
    );
    const lines = ledgerLines(svg);
    assert.equal(lines.length, 2, `expected the -5 and -6 lines, got ${JSON.stringify(lines)}`);
    assert.equal(new Set(lines.map((l) => l.y)).size, lines.length, 'no two lines share a y');
  });

  test("a pitched chord draws the union of its members' ledger lines, each once", () => {
    // A5 needs one line above the treble staff, C6 needs two. The chord
    // needs two -- not three, which is what one pass per member produced.
    const xml =
      '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">' +
      '<measure number="1"><attributes><divisions>2</divisions>' +
      '<time><beats>4</beats><beat-type>4</beat-type></time>' +
      '<clef><sign>G</sign><line>2</line></clef></attributes>' +
      '<note><pitch><step>A</step><octave>5</octave></pitch><duration>2</duration>' +
      '<voice>1</voice><type>quarter</type></note>' +
      '<note><chord/><pitch><step>C</step><octave>6</octave></pitch><duration>2</duration>' +
      '<voice>1</voice><type>quarter</type></note>' +
      rest +
      '</measure></part></score-partwise>';
    const lines = ledgerLines(render(xml));
    assert.equal(lines.length, 2, `expected 2 ledger lines, got ${JSON.stringify(lines)}`);
    assert.equal(new Set(lines.map((l) => l.y)).size, lines.length, 'no two lines share a y');
  });

  test('a chord inside the staff draws no ledger lines at all', () => {
    const svg = render(
      part(
        drum('F', 4, 'P1-A') + drum('C', 5, 'P1-B', '<chord/>') + rest,
        instrument('P1-A', 36) + instrument('P1-B', 38),
      ),
    );
    assert.deepEqual(ledgerLines(svg), []);
  });

  test('a single note still draws its own ledger lines, one pass', () => {
    const svg = render(part(drum('A', 5, 'P1-A') + rest, instrument('P1-A', 49)));
    const lines = ledgerLines(svg);
    assert.equal(lines.length, 1);
  });
});
