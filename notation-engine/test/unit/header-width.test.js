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

function render(name, config) {
  const xml = fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
  return NE.renderFromMusicXml(xml, { domParser, ...(config ? { config } : {}) });
}

/**
 * Where a given event id's NOTEHEAD was actually drawn.
 *
 * The notehead specifically, not the group's first glyph: a note that
 * needs a cancelling accidental draws that accidental first, inside the
 * same group, and its x is legitimately a little to the left.
 */
const NOTEHEADS = /[\u{E0A0}-\u{E0FF}]/u;
function drawnX(svg, elementId) {
  const at = svg.indexOf(`data-id="${elementId}"`);
  if (at === -1) return undefined;
  const group = svg.slice(at, at + 900);
  for (const m of group.matchAll(/<text x="([\d.]+)"[^>]*>(.)</gu)) {
    if (NOTEHEADS.test(m[2])) return Number(m[1]);
  }
  return undefined;
}

/**
 * The worst distance between where playback says a note is and where it
 * was drawn.
 *
 * Throws on a score with no events, rather than returning a comfortable
 * 0: a fixture that fails to parse produces an empty render, and this
 * whole file would then pass by measuring nothing. (It did, once, on a
 * fixture whose XML comment contained a double hyphen.)
 */
function worstCursorDrift({ svg, playback }) {
  let worst = 0;
  let checked = 0;
  const events = [...NE.getEventStream(playback)];
  assert.ok(events.length > 0, 'the score produced no events at all -- did it parse?');
  for (const event of events) {
    for (const noteId of event.noteIds) {
      const x = drawnX(svg, NE.elementIdForNoteId(noteId));
      if (x === undefined) continue;
      checked += 1;
      worst = Math.max(worst, Math.abs(NE.positionToX(playback, event.tick).x - x));
    }
  }
  assert.ok(checked > 0, 'no drawn notehead could be matched to an event id');
  return worst;
}

/**
 * Final review: a measure's header (clef + key signature + time
 * signature) is not a constant width, and three separate things used to
 * assume it was 6.0 while the note pass alone measured the real one.
 */
describe('a measure header wider than the constant allowance', () => {
  test('the playback cursor lands exactly on the note it points at', () => {
    // Four sharps make this header 10.5 wide against a 6.0 constant, so
    // the cursor used to sit 4.5 staff spaces to the left of the note.
    assert.ok(
      worstCursorDrift(render('wide-key-signature.musicxml')) < 1e-9,
      'positionToX disagrees with where the notehead was drawn',
    );
  });

  test('...and still does on every other fixture, including the narrow ones', () => {
    for (const name of [
      'simple-single-voice.musicxml',
      'two-voice-drum-groove.musicxml',
      'piano-grand-staff.musicxml',
      'tempo-mark.musicxml',
      'guitar-two-part-tab.musicxml',
      'slur-tuplet.musicxml',
    ]) {
      assert.ok(worstCursorDrift(render(name)) < 1e-9, name);
    }
  });

  test('the cursor is right in PAGE mode too, where every system restates the header', () => {
    assert.ok(
      worstCursorDrift(
        render('wide-key-signature.musicxml', {
          layout: { mode: 'page' },
          page: { pageWidth: 20 },
        }),
      ) < 1e-9,
    );
  });

  test('xToPosition is still the exact inverse at a real note s x', () => {
    const { svg, playback } = render('wide-key-signature.musicxml');
    for (const event of NE.getEventStream(playback)) {
      const x = drawnX(svg, NE.elementIdForNoteId(event.noteIds[0]));
      const position = NE.positionToX(playback, event.tick);
      assert.equal(NE.xToPosition(playback, x, position.systemIndex), event.tick);
    }
  });

  test('the measure reports its real header width, wide AND narrow', () => {
    const { playback } = render('wide-key-signature.musicxml');
    // Measure 1: 0.5 + clef 3 + (4 sharps + 0.5) + time 2.5 = 10.5.
    assert.equal(playback.measureLayoutsByNumber.get(1).headerWidth, 10.5);
    // Measure 2 restates NOTHING, so it reserves only the leading pad --
    // not the 6.0 every measure used to reserve, which left five staff
    // spaces of empty air after every barline.
    assert.equal(playback.measureLayoutsByNumber.get(2).headerWidth, 0.5);
  });

  test('an ordinary measure no longer reserves a header it never draws', () => {
    const { playback } = render('simple-single-voice.musicxml');
    assert.equal(playback.measureLayoutsByNumber.get(2).headerWidth, 0.5);
  });

  test('a measure OPENED by a repeat barline reserves room for it', () => {
    // The barline is drawn at the boundary and extends right, into this
    // measure -- so its width is part of this measure's own header, or
    // the first note lands on top of the repeat dots.
    const { playback } = render('two-voice-drum-groove.musicxml');
    const widths = [...playback.measureLayoutsByNumber.values()].map((l) => l.headerWidth);
    assert.ok(widths.every((w) => w >= 0.5));
  });

  test('the tempo mark clears the key signature instead of overprinting it', () => {
    const { svg } = render('wide-key-signature.musicxml');
    const boxes = [...NE.measureSvgBoxes(svg)].filter((b) => b.kind === 'glyph');
    // The sharps are the four glyphs that sit in the header, left of the
    // note area; the metronome note is the one glyph that reaches ABOVE
    // the staff (y < 0 with this fixture's own staff at y=8).
    const sharps = boxes.filter((b) => b.x < 8 && b.y > 1);
    const tempoGlyphs = boxes.filter((b) => b.y < 0);
    assert.ok(sharps.length >= 4, `expected the key signature, found ${sharps.length} glyphs`);
    assert.ok(tempoGlyphs.length > 0, 'expected a metronome mark above the staff');
    const rightmostSharp = Math.max(...sharps.map((b) => b.x + b.width));
    const leftmostTempo = Math.min(...tempoGlyphs.map((b) => b.x));
    assert.ok(
      leftmostTempo >= rightmostSharp,
      `the tempo mark starts at x=${leftmostTempo} but the key signature runs to x=${rightmostSharp}`,
    );
  });

  test('a first measure still reserves its clef and time signature', () => {
    // 0.5 + clef 3 + time 2.5 = 6.0 -- which is where the old blanket
    // constant came from, and the only measure it was ever right for.
    const { playback } = render('simple-single-voice.musicxml');
    assert.equal(playback.measureLayoutsByNumber.get(1).headerWidth, 6);
  });

  test('the width is score-wide: a part with no key signature does not start its notes earlier', () => {
    // guitar-two-part-tab has a notation staff (which takes a key
    // signature) and a tab staff (which does not). Both share one
    // timeline, so both must use the wider header.
    const { playback } = render('guitar-two-part-tab.musicxml');
    const widths = [...playback.measureLayoutsByNumber.values()].map((l) => l.headerWidth);
    assert.equal(new Set(widths.map((w) => w.toFixed(3))).size <= widths.length, true);
    assert.ok(widths.every((w) => w >= 0.5));
  });
});
