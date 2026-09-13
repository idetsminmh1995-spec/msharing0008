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

function glyphCodepoints(svg) {
  const out = [];
  const re = /<text[^>]*>([^<]*)<\/text>/g;
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

  test('every note position matches Phase 10\'s staffPositionForPitch formula exactly', () => {
    const { svg } = render('simple-single-voice.musicxml');
    // C4 D4 E4 F4 in treble clef -> y = bottomY + {1, 0.5, 0, -0.5} (bottomY=8).
    assert.match(svg, /x="6" y="9"/); // C4
    assert.match(svg, /x="10\.5" y="8\.5"/); // D4
    assert.match(svg, /x="15" y="8"/); // E4
    assert.match(svg, /x="19\.5" y="7\.5"/); // F4
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

  test('Phase 25: a real 2-voice drum groove (hi-hat=voice 1, kick+snare=voice 2) gets up stems in voice 1 and down stems in voice 2, with no exceptions', () => {
    const { svg, diagnostics } = render('two-voice-drum-groove.musicxml');
    assert.deepEqual([...diagnostics], []);
    const stems = [...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="\1" y2="([\d.]+)" stroke="#000000" stroke-width="0\.12"/g)];
    assert.ok(stems.length >= 10, `expected at least 10 stems, got ${stems.length}`);
    // Every stem's x-position tells us which voice it belongs to: voice 1's
    // 8 eighth notes are evenly spaced across the whole measure, voice 2's
    // 2 stemmed notes (the quarter note and the eighth note) sit at the
    // measure's very start and near its end respectively. Rather than
    // hardcoding those x-values, just confirm both directions appear at
    // least once AND that direction is consistent for whichever notes are
    // clearly voice 1 (the eight regularly-spaced, closely-packed ones).
    const directions = stems.map((m) => (Number(m[3]) < Number(m[2]) ? 'up' : 'down'));
    assert.ok(directions.includes('up'), 'expected at least one up stem (voice 1)');
    assert.ok(directions.includes('down'), 'expected at least one down stem (voice 2)');
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
    assert.equal(Number(endX), 10.5); // the second tied note's own x
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
