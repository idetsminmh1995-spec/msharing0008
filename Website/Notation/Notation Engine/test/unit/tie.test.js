import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const NE = loadEngine();
const domParser = testDomParser();

describe('ties (Phase 26)', () => {
  test('a down-stem note gets its tie above (opposite the stem)', () => {
    assert.equal(NE.tieSide('down'), 'above');
  });

  test('an up-stem note gets its tie below (opposite the stem)', () => {
    assert.equal(NE.tieSide('up'), 'below');
  });

  test("a whole note (no stem) still resolves a side via its automatic direction, matching 'imagine where the stem would go'", () => {
    // A high note's automatic direction would be 'down' (above middle
    // line), so its tie -- computed the same way as any other note's --
    // goes above.
    const middle = NE.middleLineY(5);
    const highNotePosition = -4; // above the middle line
    const wouldBeDirection = NE.automaticStemDirection(highNotePosition, middle);
    assert.equal(NE.tieSide(wouldBeDirection), 'above');
  });

  test('computeTieShape carries the side and a real bulge height through unchanged', () => {
    const shape = NE.computeTieShape(5, 10, 8, 'above');
    assert.equal(shape.startX, 5);
    assert.equal(shape.endX, 10);
    assert.equal(shape.y, 8);
    assert.equal(shape.side, 'above');
    assert.ok(shape.bulgeHeight > 0);
  });

  test('renderTie produces a filled path (not a stroked line) using the notehead Y as its baseline', () => {
    const shape = NE.computeTieShape(5, 10, 8, 'above');
    const svg = NE.renderTie(shape, { color: '#000000', midpointThickness: 0.22 });
    assert.match(svg, /<path /);
    assert.match(svg, /fill="#000000"/);
    assert.match(svg, /stroke="none"/);
    assert.match(svg, /M 5 8/);
  });

  test("renderTie's 'above' side bulges to a smaller (more negative) Y than the baseline", () => {
    const shape = NE.computeTieShape(5, 10, 8, 'above');
    const svg = NE.renderTie(shape, { color: '#000000', midpointThickness: 0.22 });
    // Both control points should be < 8 (above, in this engine's Y-down convention).
    const ys = [...svg.matchAll(/Q [\d.]+ (-?[\d.]+)/g)].map((m) => Number(m[1]));
    assert.equal(ys.length, 2);
    assert.ok(ys.every((y) => y < 8));
  });

  test("renderTie's 'below' side bulges to a larger (more positive) Y than the baseline", () => {
    const shape = NE.computeTieShape(5, 10, 8, 'below');
    const svg = NE.renderTie(shape, { color: '#000000', midpointThickness: 0.22 });
    const ys = [...svg.matchAll(/Q [\d.]+ (-?[\d.]+)/g)].map((m) => Number(m[1]));
    assert.equal(ys.length, 2);
    assert.ok(ys.every((y) => y > 8));
  });

  test('the two curves forming the lens have different heights (the taper), not the same value twice', () => {
    const shape = NE.computeTieShape(5, 10, 8, 'above');
    const svg = NE.renderTie(shape, { color: '#000000', midpointThickness: 0.22 });
    const ys = [...svg.matchAll(/Q [\d.]+ (-?[\d.]+)/g)].map((m) => Number(m[1]));
    assert.notEqual(ys[0], ys[1]);
  });
  /**
   * The drawn curve, not the path's control points: a quadratic peaks at
   * half its control point's height, which is exactly what used to make
   * every tie in the engine half as thick and half as high as it said it
   * was. These read the shape back off the path the way a renderer does.
   *
   * Tolerances are a ten-thousandth because `svgNumber` writes four
   * decimals -- the path on the page is the rounded one, so the rounding
   * is part of what is being checked, not noise to see past.
   */
  const quadPeak = (y0, control) => (y0 + control) / 2;

  const controlYs = (svg) => [...svg.matchAll(/Q [\d.-]+ (-?[\d.]+)/g)].map((m) => Number(m[1]));

  test('the drawn curve reaches the height the shape states, not half of it', () => {
    const shape = NE.computeTieShape(5, 10, 8, 'above');
    const svg = NE.renderTie(shape, { color: '#000000', midpointThickness: 0.21 });
    const [inner, outer] = controlYs(svg).map((c) => quadPeak(8, c));
    const centre = (inner + outer) / 2;
    assert.ok(
      Math.abs(8 - centre - shape.bulgeHeight) < 1e-4,
      `curve peaks ${String(8 - centre)} above the baseline, shape says ${String(shape.bulgeHeight)}`,
    );
  });

  test('the drawn lens is as thick at its middle as the midpoint thickness asks', () => {
    const shape = NE.computeTieShape(5, 10, 8, 'above');
    const svg = NE.renderTie(shape, { color: '#000000', midpointThickness: 0.21 });
    const [inner, outer] = controlYs(svg).map((c) => quadPeak(8, c));
    assert.ok(Math.abs(Math.abs(inner - outer) - 0.21) < 1e-4, `drawn ${String(Math.abs(inner - outer))}`);
  });

  test('a longer tie arcs higher than a short one, and a very short one still arcs', () => {
    const short = NE.computeTieShape(0, 1.2, 8, 'above').bulgeHeight;
    const long = NE.computeTieShape(0, 12, 8, 'above').bulgeHeight;
    assert.ok(long > short, `${String(long)} should exceed ${String(short)}`);
    // Flatter than it is thick reads as a smudge, not a curve.
    assert.ok(short >= 0.21 * 2);
  });
});

/**
 * A tie is drawn as a curve but HEARD as one longer note.
 *
 * The renderer draws two noteheads and a curve; a synthesiser has to be
 * told the opposite -- that the second notehead is the same note still
 * sounding. Without that the second note is struck again on the barline,
 * which is the one thing a tie exists to prevent.
 */
describe('ties in the event stream (§17.1)', () => {
  const XML = `<?xml version="1.0"?><score-partwise version="4.0">
    <part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>
    <part id="P1">
      <measure number="1">
        <attributes><divisions>4</divisions><key><fifths>0</fifths></key>
          <time><beats>4</beats><beat-type>4</beat-type></time>
          <clef><sign>G</sign><line>2</line></clef></attributes>
        <note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration>
          <tie type="start"/><voice>1</voice><type>whole</type>
          <notations><tied type="start"/></notations></note>
      </measure>
      <measure number="2">
        <note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration>
          <tie type="stop"/><voice>1</voice><type>whole</type>
          <notations><tied type="stop"/></notations></note>
      </measure>
    </part></score-partwise>`;

  const stream = () => {
    const { playback } = NE.renderFromMusicXml(XML, { domParser });
    return NE.getEventStream(playback);
  };

  test('the second notehead is marked as a continuation, not a new note', () => {
    const events = stream();
    assert.equal(events.length, 2);
    assert.notEqual(events[0].tiedFromPrevious, true, 'the first note starts the chain');
    assert.equal(events[1].tiedFromPrevious, true, 'the second note continues it');
  });

  test('the chain carries its whole sounding length, so it is not cut at the barline', () => {
    const [first, second] = stream();
    assert.equal(first.durationTicks, 1920, 'the first notehead is one bar as written');
    assert.equal(
      first.tieChainDurationTicks,
      first.durationTicks + second.durationTicks,
      'the chain lasts as long as both noteheads together',
    );
    assert.equal(second.tieChainDurationTicks, undefined, 'only the head of the chain carries it');
  });
});

/**
 * A chord ties its noteheads one at a time. A single flag on the event
 * cannot say that, and the first version of this code could not say it at
 * all: it keyed the open chain on the whole event's MIDI set, and the chord
 * suffix `#n0` on a note id also broke the voice grouping, so a chord tie
 * resolved to nothing and the second bar struck the note again.
 */
describe('ties inside a chord (§17.1)', () => {
  const note = (step, octave, tie, chordMember) =>
    `<note>${chordMember ? '<chord/>' : ''}` +
    `<pitch><step>${step}</step><octave>${octave}</octave></pitch>` +
    '<duration>16</duration><voice>1</voice><type>whole</type>' +
    (tie === undefined ? '' : `<tie type="${tie}"/><notations><tied type="${tie}"/></notations>`) +
    '</note>';
  const score = (first, second) =>
    '<?xml version="1.0"?><score-partwise version="4.0"><part-list>' +
    '<score-part id="P1"><part-name>M</part-name></score-part></part-list>' +
    '<part id="P1">' +
    '<measure number="1"><attributes><divisions>4</divisions>' +
    '<time><beats>4</beats><beat-type>4</beat-type></time>' +
    '<clef><sign>G</sign><line>2</line></clef></attributes>' +
    first +
    '</measure>' +
    `<measure number="2">${second}</measure>` +
    '</part></score-partwise>';
  const streamOf = (xml) => NE.getEventStream(NE.renderFromMusicXml(xml, { domParser }).playback);

  test('a fully tied chord is one held chord, not a chord struck twice', () => {
    const [first, second] = streamOf(
      score(
        note('C', 4, 'start', false) + note('E', 4, 'start', true),
        note('C', 4, 'stop', false) + note('E', 4, 'stop', true),
      ),
    );
    assert.deepEqual(JSON.parse(JSON.stringify(first.sounding)), [
      { midi: 60, strike: true, ticks: 3840 },
      { midi: 64, strike: true, ticks: 3840 },
    ]);
    assert.deepEqual(JSON.parse(JSON.stringify(second.sounding)), [
      { midi: 60, strike: false, ticks: 3840 },
      { midi: 64, strike: false, ticks: 3840 },
    ]);
    assert.equal(second.tiedFromPrevious, true, 'every notehead is held over');
    assert.equal(first.tieChainDurationTicks, 3840);
  });

  test('a partially tied chord holds one notehead and restrikes the other', () => {
    const [first, second] = streamOf(
      score(
        note('C', 4, undefined, false) + note('E', 4, 'start', true),
        note('C', 4, undefined, false) + note('E', 4, 'stop', true),
      ),
    );
    assert.deepEqual(JSON.parse(JSON.stringify(first.sounding)), [
      { midi: 60, strike: true, ticks: 1920 },
      { midi: 64, strike: true, ticks: 3840 },
    ]);
    assert.deepEqual(JSON.parse(JSON.stringify(second.sounding)), [
      { midi: 60, strike: true, ticks: 1920 },
      { midi: 64, strike: false, ticks: 3840 },
    ]);
    assert.notEqual(second.tiedFromPrevious, true, 'one notehead is struck again, so the event is not wholly held');
    assert.equal(first.tieChainDurationTicks, undefined, 'the two noteheads have different lengths');
  });

  test('a chord with no ties is struck whole, twice', () => {
    const [first, second] = streamOf(
      score(
        note('C', 4, undefined, false) + note('E', 4, undefined, true),
        note('C', 4, undefined, false) + note('E', 4, undefined, true),
      ),
    );
    for (const event of [first, second]) {
      assert.deepEqual(JSON.parse(JSON.stringify(event.sounding)), [
        { midi: 60, strike: true, ticks: 1920 },
        { midi: 64, strike: true, ticks: 1920 },
      ]);
      assert.notEqual(event.tiedFromPrevious, true);
    }
  });

  test('a tie does not cross between two voices sounding the same chord', () => {
    const xml =
      '<?xml version="1.0"?><score-partwise version="4.0"><part-list>' +
      '<score-part id="P1"><part-name>M</part-name></score-part></part-list>' +
      '<part id="P1"><measure number="1"><attributes><divisions>4</divisions>' +
      '<time><beats>4</beats><beat-type>4</beat-type></time>' +
      '<clef><sign>G</sign><line>2</line></clef></attributes>' +
      '<note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration>' +
      '<tie type="start"/><voice>1</voice><type>whole</type>' +
      '<notations><tied type="start"/></notations></note>' +
      '<backup><duration>16</duration></backup>' +
      '<note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration>' +
      '<voice>2</voice><type>whole</type></note>' +
      '</measure><measure number="2">' +
      '<note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration>' +
      '<tie type="stop"/><voice>1</voice><type>whole</type>' +
      '<notations><tied type="stop"/></notations></note>' +
      '<backup><duration>16</duration></backup>' +
      '<note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration>' +
      '<voice>2</voice><type>whole</type></note>' +
      '</measure></part></score-partwise>';
    const events = NE.getEventStream(NE.renderFromMusicXml(xml, { domParser }).playback);
    // Voice 1's tie continues into voice 1's second bar; voice 2 is a
    // separate note and is struck both times.
    const voice2 = events.filter((e) => e.noteIds[0].includes('#v2#'));
    assert.deepEqual(JSON.parse(JSON.stringify(voice2.map((e) => e.sounding))), [
      [{ midi: 60, strike: true, ticks: 1920 }],
      [{ midi: 60, strike: true, ticks: 1920 }],
    ]);
  });
});
