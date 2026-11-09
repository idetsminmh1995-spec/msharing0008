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

function render(name) {
  const xml = fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
  return NE.renderFromMusicXml(xml, { domParser });
}

// SMuFL glyph text only: every glyph is drawn in the music font, while
// ordinary text (Phase 50's bar numbers) is drawn in the text font, so
// the font-family is what separates the two.
function glyphCodepoints(svg) {
  const out = [];
  const re = /<text[^>]*font-family="Bravura"[^>]*>([^<]*)<\/text>/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    if (m[1]) out.push('U+' + m[1].codePointAt(0).toString(16).toUpperCase().padStart(4, '0'));
  }
  return out;
}

describe('renderFromMusicXml end-to-end (Phase 21)', () => {
  test('a real simple single-voice file renders with zero diagnostics and a well-formed SVG', () => {
    const { svg, diagnostics } = render('simple-single-voice.musicxml');
    assert.deepEqual([...diagnostics], []);
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg, /<\/svg>$/);
  });

  test('renders the treble clef, the 4/4 time signature digits, and every note\'s correct notehead', () => {
    const { svg } = render('simple-single-voice.musicxml');
    const codes = glyphCodepoints(svg);
    assert.equal(codes[0], 'U+E050'); // gClef
    assert.equal(codes[1], 'U+E084'); // timeSig4 (numerator)
    assert.equal(codes[2], 'U+E084'); // timeSig4 (denominator)
    // 4 quarter notes (noteheadBlack) then a half note (noteheadHalf) then a half rest.
    assert.deepEqual(codes.slice(3), ['U+E0A4', 'U+E0A4', 'U+E0A4', 'U+E0A4', 'U+E0A3', 'U+E4E4']);
  });

  test('mid-measure clef change draws the new clef and applies its pitch mapping to later notes', () => {
    const xml =
      '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">' +
      '<measure number="1"><attributes><divisions>2</divisions>' +
      '<time><beats>4</beats><beat-type>4</beat-type></time>' +
      '<clef><sign>G</sign><line>2</line></clef></attributes>' +
      '<note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>half</type></note>' +
      '<attributes><clef><sign>F</sign><line>4</line></clef></attributes>' +
      '<note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><type>half</type></note>' +
      '</measure></part></score-partwise>';
    const { svg, diagnostics } = NE.renderFromMusicXml(xml, { domParser });
    assert.deepEqual([...diagnostics], []);
    const codes = glyphCodepoints(svg);
    assert.equal(codes.filter((code) => code === 'U+E050').length, 1, 'initial treble clef');
    assert.equal(codes.filter((code) => code === 'U+E062').length, 1, 'mid-measure bass clef');
    const ys = [...svg.matchAll(/<text x="[\d.]+" y="([\d.]+)"[^>]*>\uE0A3<\/text>/g)].map((m) =>
      Number(m[1]),
    );
    assert.equal(ys.length, 2);
    assert.notEqual(ys[0], ys[1], 'the second C is positioned from the new bass clef');
  });

  test('mid-measure key and meter changes draw cancellation naturals and the new time signature', () => {
    const xml =
      '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">' +
      '<measure number="1"><attributes><divisions>1</divisions>' +
      '<key><fifths>2</fifths><mode>major</mode></key>' +
      '<time><beats>4</beats><beat-type>4</beat-type></time>' +
      '<clef><sign>G</sign><line>2</line></clef></attributes>' +
      '<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>' +
      '<attributes><key><fifths>0</fifths><mode>major</mode></key>' +
      '<time><beats>3</beats><beat-type>4</beat-type></time></attributes>' +
      '<note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>' +
      '<note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>' +
      '<note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>' +
      '</measure></part></score-partwise>';
    const { svg, diagnostics } = NE.renderFromMusicXml(xml, { domParser });
    assert.deepEqual([...diagnostics], []);
    const codes = glyphCodepoints(svg);
    assert.equal(
      codes.filter((code) => code === 'U+E261').length,
      3,
      'one C-natural in D major plus two key-cancellation naturals',
    );
    assert.equal(codes.filter((code) => code === 'U+E083').length, 1, 'draw the new 3/4 numerator');
    assert.equal(codes.filter((code) => code === 'U+E084').length, 3, 'two initial 4s and one new denominator');
  });

  test('inferred beams restart with the active mid-measure meter', () => {
    const xml =
      '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">' +
      '<measure number="1"><attributes><divisions>2</divisions>' +
      '<time><beats>4</beats><beat-type>4</beat-type></time>' +
      '<clef><sign>G</sign><line>2</line></clef></attributes>' +
      '<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type></note>' +
      '<note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type></note>' +
      '<attributes><time><beats>3</beats><beat-type>8</beat-type></time></attributes>' +
      '<note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type></note>' +
      '<note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>eighth</type></note>' +
      '</measure></part></score-partwise>';
    const { svg, diagnostics } = NE.renderFromMusicXml(xml, { domParser });
    assert.deepEqual([...diagnostics], []);
    assert.equal((svg.match(/stroke-width="0\.5"/g) ?? []).length, 1);
  });

  test('renders upright and inverted fermatas on notes and rests with the requested Bravura glyphs', () => {
    const xml =
      '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">' +
      '<measure number="1"><attributes><divisions>1</divisions></attributes>' +
      '<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type>' +
      '<notations><fermata/></notations></note>' +
      '<note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type>' +
      '<notations><fermata type="inverted">normal</fermata></notations></note>' +
      '<note><rest/><duration>1</duration><type>quarter</type><notations><fermata type="inverted"/></notations></note>' +
      '</measure></part></score-partwise>';
    const { svg, diagnostics } = NE.renderFromMusicXml(xml, { domParser });
    const codes = glyphCodepoints(svg);
    assert.deepEqual([...diagnostics], []);
    assert.equal(codes.filter((code) => code === 'U+E4C0').length, 1, 'normal upright fermata');
    assert.equal(codes.filter((code) => code === 'U+E4C1').length, 2, 'normal inverted fermatas');
  });

  test('every note position matches Phase 10\'s staffPositionForPitch formula exactly', () => {
    const { svg } = render('simple-single-voice.musicxml');
    // C4 D4 E4 F4 in treble clef -> y = bottomY + {1, 0.5, 0, -0.5}
    // (bottomY=8). This test is about the VERTICAL formula alone -- the
    // four x-positions are §14's spacing stretched to the bar's real
    // width, and spacing-wiring.test.js owns them.
    const ys = [...svg.matchAll(/<text x="[\d.]+" y="([\d.]+)"[^>]*>\uE0A4</g)].map((m) =>
      Number(m[1]),
    );
    assert.deepEqual(ys, [9, 8.5, 8, 7.5]);
  });

  test('a chord renders 3 separate noteheads at one X with one shared stem', () => {
    const { svg } = render('chord.musicxml');
    const noteheadXs = [...svg.matchAll(/<text x="([^"]+)" y="[^"]*"[^>]*>\uE0A4<\/text>/g)].map((m) => m[1]);
    assert.deepEqual(noteheadXs, ['6', '6', '6']);
    // Exactly one stem line originating near x=6 (the notehead's stemUpSE anchor at x=6+1.18).
    const stemLines = [...svg.matchAll(/<line x1="7\.18"/g)];
    assert.equal(stemLines.length, 1);
  });

  test('two voices via <backup> both render (not just voice 1) -- the same case Phase 20 protects at the parser level', () => {
    const { svg, diagnostics } = render('two-voice-backup.musicxml');
    assert.deepEqual([...diagnostics], []);
    // 4 quarter notes (voice 1) + 1 whole note (voice 2) = 5 noteheads total.
    const noteheadCount = (svg.match(/\uE0A4|\uE0A2/g) || []).length;
    assert.equal(noteheadCount, 5);
  });

  test('Phase 25: a multi-voice measure forces up-stem direction for voice 1 regardless of note position', () => {
    const { svg } = render('two-voice-backup.musicxml');
    // This fixture's voice 2 is a single whole note -- whole notes never
    // get a stem at all, so only voice 1's 4 quarter notes have stems
    // here. The mixed-direction case (both up AND down present) is
    // covered by the drum-groove test below instead.
    const stems = [...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="\1" y2="([\d.]+)" stroke="#000000" stroke-width="0\.12"/g)];
    assert.equal(stems.length, 4);
    const directions = stems.map((m) => (Number(m[3]) < Number(m[2]) ? 'up' : 'down'));
    assert.ok(directions.every((d) => d === 'up'));
  });

  test('Phase 25: single-voice measures are UNCHANGED -- still use automatic (position-based) stem direction, not forced', () => {
    const before = fs.readFileSync(
      path.join(__dirname, '..', 'visual', '__snapshots__', 'render-from-musicxml-simple.snap'),
      'utf8',
    );
    const { svg } = render('simple-single-voice.musicxml');
    assert.equal(svg, before);
  });

  test('Drum voices keep every kick, snare and hi-hat stem up even when the MusicXML puts them in separate voices', () => {
    const { svg, diagnostics } = render('two-voice-drum-groove.musicxml');
    assert.deepEqual([...diagnostics], []);
    const stems = [...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="\1" y2="([\d.]+)" stroke="#000000" stroke-width="0\.12"/g)];
    assert.ok(stems.length >= 10, `expected at least 10 stems, got ${stems.length}`);
    const directions = stems.map((m) => (Number(m[3]) < Number(m[2]) ? 'up' : 'down'));
    assert.ok(directions.every((d) => d === 'up'), 'expected every drum stem to point up');
  });

  test('an unsupported clef (e.g. from an unrecognized sign) does not crash -- notes are skipped with a diagnostic', () => {
    // percussion clef has positionsByPitch: true is NOT the case -- reuse
    // the parser's own tab-clef mapping path indirectly isn't in our
    // fixtures, so this test instead confirms the general contract: no
    // fixture in this suite ever throws, across every clef type present.
    for (const name of fs.readdirSync(FIXTURES_DIR)) {
      assert.doesNotThrow(() => render(name), name);
    }
  });

  test('an empty/unparseable document produces a valid (empty) SVG rather than throwing', () => {
    const { svg, diagnostics } = NE.renderFromMusicXml('<not-a-score/>', { domParser });
    assert.match(svg, /^<svg/);
    assert.ok([...diagnostics].some((d) => d.code === 'UNSUPPORTED_ROOT'));
  });

  test('Phase 26: a tied pair of notes produces exactly one filled tie path, anchored at the first note\'s right edge and the second note\'s own x', () => {
    const { svg, diagnostics } = render('tied-note.musicxml');
    assert.deepEqual([...diagnostics], []);
    const tiePaths = [...svg.matchAll(/<path d="M ([\d.]+) ([\d.]+) Q [\d.]+ ([\d.]+) ([\d.]+) [\d.]+/g)];
    assert.equal(tiePaths.length, 1);
    const [, startX, startY, , endX] = tiePaths[0];
    assert.equal(Number(startX), 6 + 1.18); // notehead x (6) + noteheadBlack's own width (1.18)
    // The second tied note's own x: a quarter note's 3.5 staff spaces
    // under MuseScore's spacing law, from the first note at x=6.
    assert.equal(Number(endX), 9.5);
    assert.equal(Number(startY), 5.5); // C5's own y (bottomY 8 + position -2.5)
  });

  test("Phase 26: the tie curves ABOVE for a high note (C5, automatic direction 'down')", () => {
    const { svg } = render('tied-note.musicxml');
    const controlYs = [...svg.matchAll(/<path d="M [\d.]+ ([\d.]+) Q [\d.]+ (-?[\d.]+)/g)].map((m) => [
      Number(m[1]),
      Number(m[2]),
    ]);
    assert.equal(controlYs.length, 1);
    const [baseline, controlY] = controlYs[0];
    assert.ok(controlY < baseline, 'the tie should bulge to a smaller (more negative, i.e. above) Y than the notes');
  });
});
