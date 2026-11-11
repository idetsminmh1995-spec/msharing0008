import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, '..', 'fixtures', 'musicxml');
const NE = loadEngine();
const domParser = testDomParser();
const load = (n) => fs.readFileSync(path.join(FIXTURES, n), 'utf8');

const render = (name, config) =>
  NE.renderFromMusicXml(load(name), { domParser, ...(config ? { config } : {}) }).svg;

const viewBox = (svg) => svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
const boxHeight = (svg) => viewBox(svg)[3];
/**
 * Where the top of the picture sits. The fit moves the BOX and never
 * the music, so a fitted render's viewBox starts at the ink rather than
 * at zero -- and a NEGATIVE value is the fit having GROWN the picture
 * upward to hold something the old fixed reserve was cutting off.
 */
const boxTop = (svg) => viewBox(svg)[1];

/** Every y the markup draws at, so "is anything outside the box" is answerable. */
function drawnYs(svg) {
  const ys = [];
  for (const m of svg.matchAll(/y1="(-?[\d.]+)"[^>]*y2="(-?[\d.]+)"/g)) ys.push(+m[1], +m[2]);
  for (const m of svg.matchAll(/<text[^>]*y="(-?[\d.]+)"/g)) ys.push(+m[1]);
  for (const m of svg.matchAll(/<rect[^>]*y="(-?[\d.]+)"/g)) ys.push(+m[1]);
  return ys;
}

/** The five staff lines: horizontal, and long enough not to be a stem. */
function staffSpan(svg) {
  const ys = [...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.-]+)" x2="([\d.]+)" y2="\2"/g)]
    .filter((m) => Number(m[3]) - Number(m[1]) > 4)
    .map((m) => Number(m[2]));
  return { top: Math.min(...ys), bottom: Math.max(...ys) };
}

const FIT = { layout: { fitSystemHeight: true } };
const QUIET = { barNumbers: { display: 'off' }, tempoMarks: { display: 'off' } };

describe('config.layout.fitSystemHeight', () => {
  test('off by default -- a score renders exactly as it always did', () => {
    for (const file of ['simple-single-voice.musicxml', 'musescore-drum-notes.musicxml']) {
      assert.equal(render(file), render(file, { layout: {} }), file);
    }
  });

  test('a drum chart ends up with a shorter box than the one it started from', () => {
    // Against the real baseline: what the engine gives with nothing
    // asked of it. Not against the marks-off box, which is SHORTER
    // still -- and short by too much, which is the clipping the test
    // below is about.
    const plain = render('musescore-drum-notes.musicxml');
    const fitted = render('musescore-drum-notes.musicxml', { ...QUIET, ...FIT });
    assert.ok(
      boxHeight(fitted) < boxHeight(plain),
      `${boxHeight(fitted)} should be under ${boxHeight(plain)}`,
    );
    const shareOf = (svg) => {
      const s = staffSpan(svg);
      return (s.bottom - s.top) / boxHeight(svg);
    };
    assert.ok(
      shareOf(fitted) > shareOf(plain) * 1.15,
      `the staff should be a clearly bigger share: ${shareOf(fitted)} vs ${shareOf(plain)}`,
    );
  });

  test('nothing is ever drawn outside the box it fitted', () => {
    for (const file of [
      'musescore-drum-notes.musicxml',
      'simple-single-voice.musicxml',
      'two-voice-drum-groove.musicxml',
      'beamed-eighths.musicxml',
      // The three the old predictive fit had to decline on, because it
      // could see notes and nothing else. Measuring the finished markup
      // sees all of them, so these are now the same case as the rest.
      'dynamics-hairpin.musicxml',
      'slur-tuplet.musicxml',
      'articulations-ornaments.musicxml',
    ]) {
      const svg = render(file, { ...QUIET, ...FIT });
      const top = boxTop(svg);
      const bottom = top + boxHeight(svg);
      const ys = drawnYs(svg);
      assert.ok(Math.min(...ys) >= top - 0.001, `${file}: ${Math.min(...ys)} is above ${top}`);
      assert.ok(Math.max(...ys) <= bottom + 0.001, `${file}: ${Math.max(...ys)} is below ${bottom}`);
    }
  });

  test('it GROWS the top when the reserve was too small -- the bug it was written for', () => {
    // With no tempo mark drawn, a system reserves four staff spaces
    // above the top line. This chart's china cymbal sits a space and a
    // half above the staff and its up stem goes three and a half higher
    // again, so the stem used to be cut off at the top of the picture.
    const clipped = render('musescore-drum-notes.musicxml', QUIET);
    assert.ok(Math.min(...drawnYs(clipped)) < 0, 'the fixture should still show the old clipping');
    const fitted = render('musescore-drum-notes.musicxml', { ...QUIET, ...FIT });
    // The box opens upward to hold it, rather than the music moving down.
    assert.ok(boxTop(fitted) < 0, `the box should start above zero, got ${boxTop(fitted)}`);
    assert.ok(
      Math.min(...drawnYs(fitted)) >= boxTop(fitted) - 0.001,
      'and everything drawn should now be inside it',
    );
  });

  test('a dynamic, a slur or an ornament is fitted around, not declined over', () => {
    // These are placed by passes that run long after the height used to
    // be decided, so the old predictive fit had to decline on all three
    // rather than risk trimming one off -- which meant declining on
    // very nearly every real score. The measurement happens after every
    // pass has drawn, so there is nothing left to decline over.
    for (const file of [
      'dynamics-hairpin.musicxml',
      'slur-tuplet.musicxml',
      'articulations-ornaments.musicxml',
    ]) {
      const fitted = boxHeight(render(file, { ...QUIET, ...FIT }));
      const plain = boxHeight(render(file, QUIET));
      assert.ok(fitted < plain, `${file}: ${fitted} should be under ${plain}`);
    }
  });

  test('the staff is the same size in staff spaces -- only the box around it moved', () => {
    const before = staffSpan(render('musescore-drum-notes.musicxml', QUIET));
    const after = staffSpan(render('musescore-drum-notes.musicxml', { ...QUIET, ...FIT }));
    assert.equal(after.bottom - after.top, before.bottom - before.top);
  });
});
