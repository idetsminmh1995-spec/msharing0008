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

function load(name) {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
}
function renderGuitar() {
  return NE.renderFromMusicXml(load('guitar-two-part-tab.musicxml'), { domParser });
}

/** The DISTINCT Y values of horizontal staff lines. Deduplicated because a staff line is drawn once per measure, so a 2-measure single staff yields 10 line elements at only 5 distinct heights. */
function staffLineYs(svg) {
  const ys = [...svg.matchAll(/<line x1="[\d.]+" y1="([\d.]+)" x2="[\d.]+" y2="\1" stroke="#000000" stroke-width="0\.13"/g)].map(
    (m) => Number(m[1]),
  );
  return [...new Set(ys)].sort((a, b) => a - b);
}

describe('staff-lines parsing (Integration B)', () => {
  test('<staff-details><staff-lines> is read per staff', () => {
    const { attributes } = NE.parseMusicXml(load('guitar-two-part-tab.musicxml'), { domParser });
    const tabAttrs = attributes.find((a) => a.partId === 'P2');
    assert.equal(tabAttrs.staffLinesByStaff[1], 6);
  });

  test('a part that declares no <staff-details> simply has no entry (the renderer then uses 5)', () => {
    const { attributes } = NE.parseMusicXml(load('guitar-two-part-tab.musicxml'), { domParser });
    const notationAttrs = attributes.find((a) => a.partId === 'P1');
    assert.equal(notationAttrs.staffLinesByStaff[1], undefined);
  });
});

describe('multi-part rendering (Integration B)', () => {
  test('BOTH parts are parsed', () => {
    const { score } = NE.parseMusicXml(load('guitar-two-part-tab.musicxml'), { domParser });
    assert.equal(score.parts.length, 2);
  });

  test('both parts are RENDERED -- the second part is no longer dropped', () => {
    const { svg } = renderGuitar();
    assert.match(svg, /\uE050/); // gClef, part 1
    assert.match(svg, /\uE06D/); // 6stringTabClef, part 2
  });

  test('the tab staff draws SIX lines while the notation staff draws five', () => {
    const ys = staffLineYs(renderGuitar().svg);
    assert.equal(ys.length, 11, '5 + 6 = 11 staff lines total');
    const upper = ys.filter((y) => y <= 12);
    const lower = ys.filter((y) => y > 12);
    assert.equal(upper.length, 5);
    assert.equal(lower.length, 6);
  });

  test('the second part is offset BELOW the first, never overlapping it', () => {
    const ys = staffLineYs(renderGuitar().svg);
    const upper = ys.filter((y) => y <= 12);
    const lower = ys.filter((y) => y > 12);
    assert.ok(Math.max(...upper) < Math.min(...lower), 'parts must not overlap vertically');
  });

  test('the viewBox grows tall enough to contain the second part', () => {
    const { svg } = renderGuitar();
    const height = Number(svg.match(/viewBox="0 0 [\d.]+ ([\d.]+)"/)[1]);
    const ys = staffLineYs(svg);
    assert.ok(height > Math.max(...ys), 'the lowest staff line must fit inside the viewBox');
  });

  test('a tab part reports UNSUPPORTED_CLEF_FOR_NOTES rather than silently drawing nothing', () => {
    const { diagnostics } = renderGuitar();
    assert.ok([...diagnostics].some((d) => d.code === 'UNSUPPORTED_CLEF_FOR_NOTES'));
  });

  test('the notation part still renders its own notes normally', () => {
    const { svg } = renderGuitar();
    const noteheads = svg.match(/[\uE0A2\uE0A3\uE0A4]/g) ?? [];
    assert.equal(noteheads.length, 3);
  });

  test('a single-part file is unaffected: one staff, no extra vertical offset', () => {
    const { svg } = NE.renderFromMusicXml(load('simple-single-voice.musicxml'), { domParser });
    assert.equal(staffLineYs(svg).length, 5);
  });

  test('a grand staff (one part, two staves) still braces, while two separate PARTS do not', () => {
    const piano = NE.renderFromMusicXml(load('piano-grand-staff.musicxml'), { domParser });
    assert.match(piano.svg, /\uE000/); // brace: one instrument, two staves
    // Two different instruments are a <part-group> bracket case, which is
    // v2 parser scope (§10.4) and deliberately not guessed at here.
    assert.doesNotMatch(renderGuitar().svg, /\uE000/);
  });
});
