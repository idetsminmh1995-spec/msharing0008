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

  test('the augmentation dot and equals-sign glyphs are both real', () => {
    assert.notEqual(NE.getGlyph(NE.metronomeDotGlyphName()), undefined);
    assert.notEqual(NE.getGlyph(NE.metronomeEqualsGlyphName()), undefined);
  });

  test("every digit 0-9 resolves to a real, distinct glyph, matching Integration C's fingering digits", () => {
    const seen = new Set();
    for (let n = 0; n <= 9; n++) {
      const [glyph] = NE.metronomeBpmDigitGlyphNames(n);
      assert.equal(glyph, NE.fretDigitGlyphNames(n)[0], 'should reuse the same digit family as tab frets');
      seen.add(glyph);
    }
    assert.equal(seen.size, 10);
  });

  test("digits 6-9 resolve correctly despite the underlying glyph set's non-contiguous codepoints", () => {
    for (const n of [6, 7, 8, 9]) {
      const [glyph] = NE.metronomeBpmDigitGlyphNames(n);
      assert.equal(glyph, `fingering${n}`);
    }
  });

  test('a multi-digit BPM returns multiple glyphs, most significant first', () => {
    assert.deepEqual([...NE.metronomeBpmDigitGlyphNames(120)], ['fingering1', 'fingering2', 'fingering0']);
  });

  test('a negative or non-integer BPM throws rather than rendering nonsense', () => {
    assert.throws(() => NE.metronomeBpmDigitGlyphNames(-1), /non-negative integer/);
    assert.throws(() => NE.metronomeBpmDigitGlyphNames(1.5), /non-negative integer/);
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

  test('a <direction> with no <metronome> still reports UNKNOWN_ELEMENT, not silently swallowed', () => {
    const { diagnostics, tempoMarks } = NE.parseMusicXml(load('unknown-element.musicxml'), { domParser });
    assert.equal(tempoMarks.length, 0);
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

  test('every component -- note, dot, equals, both BPM digits -- shares the SAME baseline y', () => {
    const { svg } = render();
    const ys = new Set();
    for (const cp of [0xeca5, 0xecb7, 0xe08f, 0xed24, 0xed27]) {
      const ch = String.fromCodePoint(cp);
      const m = svg.match(new RegExp(`x="[\\d.]+" y="([\\d.]+)"[^>]*>${ch}`));
      assert.notEqual(m, null, `glyph U+${cp.toString(16)} not found`);
      ys.add(m[1]);
    }
    assert.equal(ys.size, 1, 'every metronome-mark component should share one baseline');
  });

  test('the dotted quarter note and its dot both render, the dot AFTER the note', () => {
    const { svg } = render();
    const noteX = Number(svg.match(/x="([\d.]+)" y="[\d.]+"[^>]*>\uECA5/)[1]);
    const dotX = Number(svg.match(/x="([\d.]+)" y="[\d.]+"[^>]*>\uECB7/)[1]);
    assert.ok(dotX > noteX, 'the augmentation dot should follow the note glyph');
  });

  test('the BPM "96" renders as two separate, correctly-ordered digit glyphs', () => {
    const { svg } = render();
    const nineX = Number(svg.match(/x="([\d.]+)" y="[\d.]+"[^>]*>\uED27/)[1]); // fingering9
    const sixX = Number(svg.match(/x="([\d.]+)" y="[\d.]+"[^>]*>\uED24/)[1]); // fingering6
    assert.ok(sixX > nineX, 'the "6" must follow the "9"');
  });

  test('the equals sign sits between the note/dot and the digits', () => {
    const { svg } = render();
    const dotX = Number(svg.match(/x="([\d.]+)" y="[\d.]+"[^>]*>\uECB7/)[1]);
    const equalsX = Number(svg.match(/x="([\d.]+)" y="[\d.]+"[^>]*>\uE08F/)[1]);
    const nineX = Number(svg.match(/x="([\d.]+)" y="[\d.]+"[^>]*>\uED27/)[1]);
    assert.ok(equalsX > dotX && nineX > equalsX);
  });

  test('a measure with no tempo mark draws nothing extra above the staff', () => {
    const { svg } = NE.renderFromMusicXml(load('simple-single-voice.musicxml'), { domParser });
    assert.doesNotMatch(svg, /\uECA5|\uECB7|\uE08F/);
  });
});
