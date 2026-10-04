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
const load = (n) => fs.readFileSync(path.join(FIXTURES_DIR, n), 'utf8');

describe('metronome geometry (Integration D)', () => {
  test('every DurationType this engine supports has its own real, distinct metNote glyph', () => {
    const types = [
      'whole',
      'half',
      'quarter',
      'eighth',
      '16th',
      '32nd',
      '64th',
      '128th',
      '256th',
      '512th',
      '1024th',
    ];
    const seen = new Set();
    for (const t of types) {
      const glyph = NE.metronomeNoteGlyphName(t);
      assert.notEqual(NE.getGlyph(glyph), undefined, t);
      assert.ok(!seen.has(glyph), `duplicate glyph for ${t}`);
      seen.add(glyph);
    }
    assert.equal(seen.size, types.length);
  });

  test('the augmentation dot glyph is real', () => {
    assert.notEqual(NE.getGlyph(NE.metronomeDotGlyphName()), undefined);
  });

  test('the BPM half of the mark is TEXT, not glyph names -- "= 120", ready for the text font', () => {
    assert.equal(NE.metronomeTempoText(120), '= 120');
    assert.equal(NE.metronomeTempoText(96), '= 96');
    assert.equal(NE.metronomeTempoText(0), '= 0');
  });

  test('a negative or non-integer BPM throws rather than rendering nonsense', () => {
    assert.throws(() => NE.metronomeTempoText(-1), /non-negative integer/);
    assert.throws(() => NE.metronomeTempoText(1.5), /non-negative integer/);
  });

  test('the SMuFL fingering digits are NOT what a BPM is drawn with any more -- the real defect this replaced', () => {
    // fingering1's ink is 0.468sp wide and it carries a 0.08sp left side
    // bearing that no bounding box reports, so advancing digit-by-digit
    // by bounding-box width overlapped them. The numbers that proved it:
    const one = NE.getGlyph('fingering1');
    const inkWidth = one.bBox.bBoxNE[0] - one.bBox.bBoxSW[0];
    assert.ok(inkWidth < 0.5, 'a fingering digit really is under half a staff space wide');
    assert.ok(one.bBox.bBoxSW[0] > 0, 'and really does start right of its own origin');
    // So the engine must no longer offer a per-digit glyph route at all.
    assert.equal(NE.metronomeBpmDigitGlyphNames, undefined);
    assert.equal(NE.metronomeEqualsGlyphName, undefined);
  });
});

describe('plain-text width estimation (geometry/text-metrics.ts)', () => {
  test('a run is the sum of its characters, scaled by the font size', () => {
    const atOne = NE.estimateTextWidth('= 120', 1);
    assert.equal(NE.estimateTextWidth('= 120', 2), atOne * 2);
    assert.equal(NE.estimateTextWidth('', 10), 0);
  });

  test('it OVER-estimates every ordinary sans-serif face, which is the direction that is safe', () => {
    // Measured in Chromium with measureText at 100px: the widest digit
    // across Arial, Helvetica, Liberation Sans and DejaVu Sans at
    // weights 400 and 700 is DejaVu Sans Bold's 0.6958em.
    const widestRealDigit = 0.6958;
    assert.ok(NE.estimateTextWidth('0', 1) >= widestRealDigit);
    // Arial's own "= 120" is 2.5303em; the estimate must leave room for it.
    assert.ok(NE.estimateTextWidth('= 120', 1) >= 2.5303);
  });

  test('an unknown character still has a width -- it is never silently zero', () => {
    assert.equal(NE.estimateTextWidth('\u00e9', 1), NE.DEFAULT_ADVANCE_PER_EM);
  });
});

describe('metronome parsing (Integration D)', () => {
  test('<direction><metronome> is parsed into a TempoMarkEvent with the right beat-unit/dots/BPM', () => {
    const { tempoMarks } = NE.parseMusicXml(load('tempo-mark.musicxml'), { domParser });
    assert.equal(tempoMarks.length, 1);
    assert.equal(tempoMarks[0].beatUnit, 'quarter');
    assert.equal(tempoMarks[0].beatUnitDots, 1);
    assert.equal(tempoMarks[0].perMinute, 96);
    assert.equal(tempoMarks[0].partId, 'P1');
    assert.equal(tempoMarks[0].measureNumber, 1);
  });

  test('a <direction> with no <metronome> produces no tempo mark, and its <words> is captured rather than swallowed', () => {
    const { diagnostics, tempoMarks, directions } = NE.parseMusicXml(
      load('unknown-element.musicxml'),
      { domParser },
    );
    assert.equal(tempoMarks.length, 0);
    // Phase 35 Tier 2 changed what "no <metronome>" means: <words> is now
    // real parsed content, so this <direction> is recognized rather than
    // reported as unknown. The unknown-element guarantee itself still
    // holds -- the fixture's <bookmark> proves it, asserted in
    // musicxml-parser.test.js.
    assert.equal(directions.length, 1);
    assert.deepEqual([...directions[0].words], ['Allegro']);
    assert.equal(directions[0].placement, 'above');
    assert.ok([...diagnostics].some((d) => d.code === 'UNKNOWN_ELEMENT'));
  });

  test('a <metronome> missing <beat-unit> or <per-minute> reports UNSUPPORTED_METRONOME, never throws', () => {
    const xml =
      '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1"><measure number="1">' +
      '<attributes><divisions>2</divisions></attributes>' +
      '<direction><direction-type><metronome><per-minute>90</per-minute></metronome></direction-type></direction>' +
      '<note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>' +
      '</measure></part></score-partwise>';
    assert.doesNotThrow(() => NE.parseMusicXml(xml, { domParser }));
    const { diagnostics, tempoMarks } = NE.parseMusicXml(xml, { domParser });
    assert.equal(tempoMarks.length, 0);
    assert.ok([...diagnostics].some((d) => d.code === 'UNSUPPORTED_METRONOME'));
  });
});

describe('metronome rendering end to end (Integration D)', () => {
  const render = () => NE.renderFromMusicXml(load('tempo-mark.musicxml'), { domParser });

  test('renders with no diagnostics', () => {
    assert.deepEqual([...render().diagnostics], []);
  });

  test('the mark is placed ABOVE the staff (a smaller y than the staff top)', () => {
    const { svg } = render();
    const noteMatch = svg.match(/x="[\d.]+" y="([\d.]+)"[^>]*>\uECA5/);
    assert.notEqual(noteMatch, null);
    assert.ok(Number(noteMatch[1]) < 4, 'expected the mark above the staff top (y=4)');
  });

  test('the note glyph, its dot and the "= 96" text all share ONE baseline', () => {
    const { svg } = render();
    const ys = new Set();
    for (const ch of ['\uECA5', '\uECB7']) {
      const m = svg.match(new RegExp(`x="[\\d.]+" y="([\\d.]+)"[^>]*>${ch}`));
      assert.notEqual(m, null, `glyph ${ch} not found`);
      ys.add(m[1]);
    }
    const textMatch = svg.match(/x="[\d.]+" y="([\d.]+)"[^>]*>= 96</);
    assert.notEqual(textMatch, null, 'the "= 96" text was not drawn');
    ys.add(textMatch[1]);
    assert.equal(ys.size, 1, 'every metronome-mark component should share one baseline');
  });

  test('the dotted quarter note and its dot both render, the dot AFTER the note', () => {
    const { svg } = render();
    const noteX = Number(svg.match(/x="([\d.]+)" y="[\d.]+"[^>]*>\uECA5/)[1]);
    const dotX = Number(svg.match(/x="([\d.]+)" y="[\d.]+"[^>]*>\uECB7/)[1]);
    assert.ok(dotX > noteX, 'the augmentation dot should follow the note glyph');
  });

  test('the BPM is ONE text element in the TEXT font, so the font spaces its own digits', () => {
    const { svg } = render();
    const marks = [...svg.matchAll(/<text [^>]*>= 96<\/text>/g)];
    assert.equal(marks.length, 1, 'exactly one tempo text run');
    const tag = marks[0][0];
    assert.match(tag, /font-family="Manrope, sans-serif"/);
    assert.match(tag, /font-size="2.4"/);
    assert.match(tag, /font-weight="bold"/);
    // And the old per-digit glyph route really is gone from the output.
    assert.doesNotMatch(svg, /[\uED10-\uED19]/, 'no fingering digits anywhere');
    assert.doesNotMatch(svg, /\uE08F/, 'no timeSigEquals glyph either');
  });

  test('the "= 96" starts clear to the RIGHT of the note and its dot', () => {
    const { svg } = render();
    const dotX = Number(svg.match(/x="([\d.]+)" y="[\d.]+"[^>]*>\uECB7/)[1]);
    const textX = Number(svg.match(/x="([\d.]+)" y="[\d.]+"[^>]*>= 96</)[1]);
    const dot = NE.getGlyph('metAugmentationDot');
    const dotWidth = dot.bBox.bBoxNE[0] - dot.bBox.bBoxSW[0];
    assert.ok(textX >= dotX + dotWidth, 'the text must not sit on top of the dot');
  });

  test('a measure with no tempo mark draws nothing extra above the staff', () => {
    const { svg } = NE.renderFromMusicXml(load('simple-single-voice.musicxml'), { domParser });
    assert.doesNotMatch(svg, /\uECA5|\uECB7/);
    assert.doesNotMatch(svg, />= \d/);
  });

  test('the tempo mark visually ALIGNS with the first note of the same measure -- both use the same noteAreaX (real bug: they used to use two different formulas)', () => {
    const { svg } = render();
    const markNoteX = Number(svg.match(/x="([\d.]+)" y="[\d.]+"[^>]*>\uECA5/)[1]);
    const firstRealNoteX = Number(svg.match(/x="([\d.]+)" y="[\d.]+"[^>]*>\uE0A3/)[1]);
    assert.equal(markNoteX, firstRealNoteX);
  });

  test("the measure holding the tempo mark is wide enough for it -- the barline lands clear past the mark's own right edge, never overlapping it", () => {
    const { svg } = render();
    const textX = Number(svg.match(/x="([\d.]+)" y="[\d.]+"[^>]*>= 96</)[1]);
    const markRightEdge = textX + NE.estimateTextWidth('= 96', 2.4);
    const barlineX = Number(svg.match(/<line x1="([\d.]+)" y1="[\d.]+" x2="\1" y2="[\d.]+" stroke="#000000" stroke-width="0\.16"/)[1]);
    assert.ok(barlineX > markRightEdge, `expected the barline (${barlineX}) clear past the tempo mark's own right edge (${markRightEdge})`);
  });
});
