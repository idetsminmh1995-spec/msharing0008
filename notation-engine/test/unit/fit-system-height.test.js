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

const boxHeight = (svg) => Number((svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/))[3]);

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
    ]) {
      const svg = render(file, { ...QUIET, ...FIT });
      const box = boxHeight(svg);
      const ys = drawnYs(svg);
      assert.ok(Math.min(...ys) >= -0.001, `${file}: ${Math.min(...ys)} is above the box`);
      assert.ok(Math.max(...ys) <= box + 0.001, `${file}: ${Math.max(...ys)} is below ${box}`);
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
    assert.ok(Math.min(...drawnYs(fitted)) >= 0, 'the fit should have grown the room back');
  });

  test('a score it cannot measure keeps the full reserve rather than guessing', () => {
    // Dynamics, slurs and tuplets are placed by passes that run after
    // the height is decided, so trimming to the notes alone would cut
    // them off. The fit declines instead.
    for (const file of [
      'dynamics-hairpin.musicxml',
      'slur-tuplet.musicxml',
      'articulations-ornaments.musicxml',
    ]) {
      assert.equal(
        boxHeight(render(file, { ...QUIET, ...FIT })),
        boxHeight(render(file, QUIET)),
        `${file} should not have been fitted`,
      );
    }
  });

  test('the staff is the same size in staff spaces -- only the box around it moved', () => {
    const before = staffSpan(render('musescore-drum-notes.musicxml', QUIET));
    const after = staffSpan(render('musescore-drum-notes.musicxml', { ...QUIET, ...FIT }));
    assert.equal(after.bottom - after.top, before.bottom - before.top);
  });
});
