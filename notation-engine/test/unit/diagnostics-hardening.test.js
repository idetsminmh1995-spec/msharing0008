import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, '..', '..', 'src', 'parser', 'musicxml');
const TEST_UNIT_DIR = __dirname;

const NE = loadEngine();
const domParser = testDomParser();

/** Every stable diagnostic code the parser can emit, discovered by scanning the actual source rather than maintained as a hand-written list -- a future recovery rule can't quietly ship without this test noticing it has no code, and (via the coverage test below) no assertion either. */
function discoverEmittedCodes() {
  const codes = new Set();
  for (const name of fs.readdirSync(SRC_DIR)) {
    if (!name.endsWith('.ts')) continue;
    const content = fs.readFileSync(path.join(SRC_DIR, name), 'utf8');
    for (const m of content.matchAll(/diagnostic\(\s*'\w+'\s*,\s*'([A-Z_0-9]+)'/g)) {
      codes.add(m[1]);
    }
  }
  return [...codes].sort();
}

describe('diagnostics and partial-render hardening (Phase 38, §10.7)', () => {
  test('every diagnostic code the parser source can emit is asserted SOMEWHERE across the whole test suite', () => {
    const codes = discoverEmittedCodes();
    assert.ok(codes.length > 0, 'the scan itself found nothing -- likely a regex/path problem, not real coverage');

    const testFiles = fs.readdirSync(TEST_UNIT_DIR).filter((f) => f.endsWith('.test.js'));
    const combinedTestSource = testFiles
      .map((f) => fs.readFileSync(path.join(TEST_UNIT_DIR, f), 'utf8'))
      .join('\n');

    for (const code of codes) {
      assert.ok(combinedTestSource.includes(`'${code}'`), `No test anywhere asserts the ${code} diagnostic`);
    }
  });

  test('a completely empty string input never throws, and produces UNSUPPORTED_ROOT-class diagnostics', () => {
    const result = NE.parseMusicXml('', { domParser });
    assert.equal(result.score.parts.length, 0);
    assert.ok([...result.diagnostics].some((d) => d.code === 'UNSUPPORTED_ROOT'));
  });

  test('genuinely non-XML garbage text never throws', () => {
    assert.doesNotThrow(() => NE.parseMusicXml('this is not xml at all {{{', { domParser }));
    const result = NE.parseMusicXml('this is not xml at all {{{', { domParser });
    assert.equal(result.score.parts.length, 0);
  });

  test('a <score-partwise> with a <part> but zero <measure> elements never throws and produces NO_MEASURES', () => {
    const xml = '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1"></part></score-partwise>';
    const result = NE.parseMusicXml(xml, { domParser });
    assert.ok([...result.diagnostics].some((d) => d.code === 'NO_MEASURES'));
  });

  test('a negative <duration> never throws (recovers via the same missing/invalid-duration path)', () => {
    const xml =
      '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1"><measure number="1">' +
      '<attributes><divisions>2</divisions></attributes>' +
      '<note><pitch><step>C</step><octave>4</octave></pitch><duration>-4</duration><voice>1</voice></note>' +
      '</measure></part></score-partwise>';
    assert.doesNotThrow(() => NE.renderFromMusicXml(xml, { domParser }));
  });

  test('an absurdly large <duration> never throws', () => {
    const xml =
      '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1"><measure number="1">' +
      '<attributes><divisions>2</divisions></attributes>' +
      '<note><pitch><step>C</step><octave>4</octave></pitch><duration>999999999</duration><voice>1</voice></note>' +
      '</measure></part></score-partwise>';
    assert.doesNotThrow(() => NE.renderFromMusicXml(xml, { domParser }));
  });

  test('a zero <divisions> never throws (would otherwise divide by zero computing ticks), and produces INVALID_DIVISIONS', () => {
    const xml =
      '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1"><measure number="1">' +
      '<attributes><divisions>0</divisions></attributes>' +
      '<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>' +
      '</measure></part></score-partwise>';
    assert.doesNotThrow(() => NE.renderFromMusicXml(xml, { domParser }));
    const result = NE.parseMusicXml(xml, { domParser });
    assert.ok([...result.diagnostics].some((d) => d.code === 'INVALID_DIVISIONS'));
  });

  test('deeply malformed pitch data (missing step AND octave together) never throws', () => {
    const xml =
      '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1"><measure number="1">' +
      '<attributes><divisions>2</divisions></attributes>' +
      '<note><pitch></pitch><duration>4</duration><voice>1</voice></note>' +
      '</measure></part></score-partwise>';
    assert.doesNotThrow(() => NE.renderFromMusicXml(xml, { domParser }));
  });

  test('renderFromMusicXml on a totally empty Score (zero parts) still returns a valid, well-formed SVG string, never throws', () => {
    const { svg } = NE.renderFromMusicXml('<not-a-score/>', { domParser });
    assert.match(svg, /^<svg /);
    assert.match(svg, /<\/svg>$/);
  });
});
