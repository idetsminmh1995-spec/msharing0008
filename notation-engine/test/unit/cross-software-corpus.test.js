import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORPUS_DIR = path.join(__dirname, '..', 'fixtures', 'cross-software');

const NE = loadEngine();
const domParser = testDomParser();

function render(name) {
  const xml = fs.readFileSync(path.join(CORPUS_DIR, name), 'utf8');
  return NE.renderFromMusicXml(xml, { domParser });
}

function parse(name) {
  const xml = fs.readFileSync(path.join(CORPUS_DIR, name), 'utf8');
  return NE.parseMusicXml(xml, { domParser });
}

describe('cross-software compatibility corpus (Phase 37, §10.8)', () => {
  test('every corpus fixture renders without throwing', () => {
    for (const name of fs.readdirSync(CORPUS_DIR)) {
      assert.doesNotThrow(() => render(name), name);
    }
  });

  test('tie via <tie> only, <tied> only, and both together all render BYTE-IDENTICAL output', () => {
    const a = render('tie-only.musicxml');
    const b = render('tied-only.musicxml');
    const c = render('tie-and-tied.musicxml');
    assert.equal(a.svg, b.svg);
    assert.equal(a.svg, c.svg);
    assert.match(a.svg, /<path d="M/); // a real tie was actually drawn, not silently skipped
  });

  test('<tied>-only (no <tie>) still produces tieStart/tieStop on the parsed Note -- the real fix this phase made', () => {
    const result = parse('tied-only.musicxml');
    const events = result.score.parts[0].measures[0].voices[0].events;
    assert.equal(events[0].tieStart, true);
    assert.equal(events[1].tieStop, true);
  });

  test('divisions declared independently per part are each honored correctly, not shared globally', () => {
    const result = parse('divisions-per-part.musicxml');
    // Both parts' whole notes must compute to the SAME real tick length
    // (1920 = one whole note) despite using totally different divisions
    // values (1 vs 8) -- a shared/leaked divisions variable would break one.
    assert.equal(result.score.parts[0].measures[0].voices[0].events[0].duration.ticks, 1920);
    assert.equal(result.score.parts[1].measures[0].voices[0].events[0].duration.ticks, 1920);
  });

  test('divisions changed mid-piece is honored correctly measure to measure', () => {
    const result = parse('divisions-changed-mid-piece.musicxml');
    assert.equal(result.score.parts[0].measures[0].voices[0].events[0].duration.ticks, 1920);
    assert.equal(result.score.parts[0].measures[1].voices[0].events[0].duration.ticks, 1920);
  });

  test('an explicit <beam> element is safely ignored, not crashed on -- notes still parse and render', () => {
    const result = render('explicit-beam-hints.musicxml');
    assert.deepEqual([...result.diagnostics], []);
    assert.match(result.svg, /\uE0A4/); // noteheadBlack -- the real notes still rendered
  });

  test('<attributes> appearing mid-measure (a clef change partway through) does not throw', () => {
    const { diagnostics } = render('attributes-mid-measure.musicxml');
    assert.deepEqual([...diagnostics], []);
  });

  test('a percussion note with no <display-step>/<display-octave> recovers via the documented fallback, not silently wrong', () => {
    const result = parse('percussion-no-display-step.musicxml');
    const codes = [...result.diagnostics].map((d) => d.code);
    assert.ok(codes.includes('INVALID_PITCH_STEP'));
    assert.ok(codes.includes('MISSING_OCTAVE'));
    const event = result.score.parts[0].measures[0].voices[0].events[0];
    assert.equal(event.pitch.displayStep, 'B'); // the documented neutral fallback
    assert.equal(event.pitch.displayOctave, 4);
  });

  test('<print> break hints are ignored gracefully (info-level UNKNOWN_ELEMENT), never an error', () => {
    const result = render('print-breaks.musicxml');
    const notable = [...result.diagnostics].filter((d) => d.severity !== 'info');
    assert.deepEqual(notable, []);
  });
});
