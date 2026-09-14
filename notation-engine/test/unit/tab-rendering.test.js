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

describe('tab string-to-line mapping (Integration C)', () => {
  test('string 1 is the TOP line and the last string is the BOTTOM line -- the mapping every source agrees on', () => {
    assert.equal(NE.tabStringPosition(1, 6), -5); // top line of a 6-line staff
    assert.equal(NE.tabStringPosition(6, 6), 0); // bottom line
  });

  test('middle strings land on their own lines, in order', () => {
    assert.deepEqual(
      [2, 3, 4, 5].map((s) => NE.tabStringPosition(s, 6)),
      [-4, -3, -2, -1],
    );
  });

  test('the mapping adapts to a 4-line (bass guitar) tab staff', () => {
    assert.equal(NE.tabStringPosition(1, 4), -3);
    assert.equal(NE.tabStringPosition(4, 4), 0);
  });

  test('a string outside the staff throws rather than silently drawing off-staff', () => {
    assert.throws(() => NE.tabStringPosition(7, 6), /outside a 6-line tab staff/);
    assert.throws(() => NE.tabStringPosition(0, 6), /outside a 6-line tab staff/);
  });
});

describe('fret digit glyphs (Integration C)', () => {
  test('every single digit 0-9 maps to a real, distinct glyph', () => {
    const seen = new Set();
    for (let n = 0; n <= 9; n++) {
      const [glyph] = NE.fretDigitGlyphNames(n);
      assert.notEqual(NE.getGlyph(glyph), undefined, glyph);
      assert.ok(!seen.has(glyph), `duplicate glyph for ${n}`);
      seen.add(glyph);
    }
    assert.equal(seen.size, 10);
  });

  test("digits 6-9 resolve correctly despite SMuFL's non-contiguous codepoints", () => {
    // 0-5 live at U+ED10..ED15 but 6-9 jump to U+ED24..ED27, so computing
    // a codepoint arithmetically would silently produce wrong glyphs here.
    for (const n of [6, 7, 8, 9]) {
      const [glyph] = NE.fretDigitGlyphNames(n);
      assert.equal(glyph, `fingering${n}`);
      assert.notEqual(NE.getGlyph(glyph), undefined);
    }
  });

  test('a two-digit fret returns two glyphs, most significant first', () => {
    // Spread into this realm first -- the engine runs in a VM sandbox, so
    // deepEqual against a sandboxed array fails on reference identity
    // despite identical contents (the same quirk Phase 8's harness notes).
    assert.deepEqual([...NE.fretDigitGlyphNames(12)], ['fingering1', 'fingering2']);
    assert.deepEqual([...NE.fretDigitGlyphNames(24)], ['fingering2', 'fingering4']);
  });

  test('a negative or non-integer fret throws rather than rendering nonsense', () => {
    assert.throws(() => NE.fretDigitGlyphNames(-1), /non-negative integer/);
    assert.throws(() => NE.fretDigitGlyphNames(1.5), /non-negative integer/);
  });
});

describe('tab parsing (Integration C)', () => {
  test('<string> and <fret> are read from <notations><technical>', () => {
    const { score } = NE.parseMusicXml(load('guitar-tab-frets.musicxml'), { domParser });
    const events = [...score.parts[0].measures[0].voices[0].events];
    assert.equal(events[0].stringNumber, 6);
    assert.equal(events[0].fret, 0);
    assert.equal(events[2].stringNumber, 1);
    assert.equal(events[2].fret, 12);
  });
});

describe('tab rendering end to end (Integration C)', () => {
  const render = () => NE.renderFromMusicXml(load('guitar-tab-frets.musicxml'), { domParser });

  test('renders with no diagnostics -- a tab staff is no longer skipped', () => {
    assert.deepEqual([...render().diagnostics], []);
  });

  test('draws a six-line tab staff', () => {
    assert.equal((render().svg.match(/stroke-width="0\.13"/g) ?? []).length, 6);
  });

  test('each fret number sits on ITS OWN string line', () => {
    const { svg } = render();
    // 6-line staff with its bottom line at y=8 -> lines at 8,7,6,5,4,3.
    // string 6 -> y=8, string 5 -> y=7, string 2 -> y=4, string 1 -> y=3.
    assert.match(svg, /y="8"[^>]*>\uED10/); // fret 0 on string 6 (bottom line)
    assert.match(svg, /y="7"[^>]*>\uED13/); // fret 3 on string 5
    assert.match(svg, /y="4"[^>]*>\uED25/); // fret 7 on string 2
    assert.match(svg, /y="3"[^>]*>\uED11/); // fret 12's "1" on string 1 (top line)
  });

  test('a two-digit fret draws BOTH digits, side by side rather than overprinted', () => {
    const { svg } = render();
    const onTopLine = [...svg.matchAll(/<text x="([\d.]+)" y="3"[^>]*>(.)<\/text>/g)].filter(
      (m) => m[2].codePointAt(0) >= 0xed10,
    );
    assert.equal(onTopLine.length, 2, 'expected both digits of fret 12');
    assert.notEqual(onTopLine[0][1], onTopLine[1][1], 'digits must not share an x position');
    assert.ok(Number(onTopLine[1][1]) > Number(onTopLine[0][1]), 'second digit must follow the first');
  });

  test('each number masks the staff line behind it', () => {
    const { svg } = render();
    // One background rect for the document, plus one mask per number (4).
    const rects = svg.match(/<rect[^>]*fill="#ffffff"/g) ?? [];
    assert.equal(rects.length, 5);
  });

  test('a tab note with no <string>/<fret> is reported, not silently dropped', () => {
    const { diagnostics } = NE.renderFromMusicXml(load('guitar-two-part-tab.musicxml'), { domParser });
    assert.ok([...diagnostics].some((d) => d.code === 'TAB_NOTE_MISSING_STRING_OR_FRET'));
  });
});
