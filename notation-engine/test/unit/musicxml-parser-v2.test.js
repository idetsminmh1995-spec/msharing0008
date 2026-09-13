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

function loadFixture(name) {
  const xml = fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
  return NE.parseMusicXml(xml, { domParser });
}

function renderFixture(name) {
  const xml = fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
  return NE.renderFromMusicXml(xml, { domParser });
}

describe('MusicXML parser v2 Tier 1 (Phase 35)', () => {
  test('midi-instrument parses into a per-part GM note map, with the 1-based-to-0-based correction applied', () => {
    const result = loadFixture('v2-elements.musicxml');
    const map = result.midiInstrumentsByPart.get('P1');
    assert.notEqual(map, undefined);
    // The fixture's <midi-unpitched>43</midi-unpitched> should become GM 42.
    assert.equal(map.get('P1-I43'), 42);
  });

  test('an explicit <notehead> override is captured on the parsed Note', () => {
    const result = loadFixture('v2-elements.musicxml');
    const events = result.score.parts[0].measures[0].voices[0].events;
    assert.equal(events[0].explicitNotehead, 'x');
  });

  test('a <grace/> note has zero ticks (borrows time, never advances the cursor) and no MISSING_DURATION warning', () => {
    const result = loadFixture('v2-elements.musicxml');
    assert.ok(![...result.diagnostics].some((d) => d.code === 'MISSING_DURATION'));
    const events = result.score.parts[0].measures[0].voices[0].events;
    const graceEvents = [...events].filter((e) => e.kind === 'note' && e.isGrace);
    assert.equal(graceEvents.length, 2);
    for (const g of graceEvents) assert.equal(g.duration.ticks, 0);
  });

  test('the grace slash attribute distinguishes acciaccatura (slash="yes") from appoggiatura (no slash)', () => {
    const result = loadFixture('v2-elements.musicxml');
    const events = result.score.parts[0].measures[0].voices[0].events;
    const graceEvents = [...events].filter((e) => e.kind === 'note' && e.isGrace);
    assert.equal(graceEvents[0].graceSlash, true);
    assert.equal(graceEvents[1].graceSlash, false);
  });

  test('<time-modification> populates Duration.tuplet with the real ratio', () => {
    const result = loadFixture('v2-elements.musicxml');
    const events = result.score.parts[0].measures[0].voices[0].events;
    const tripletNotes = [...events].filter((e) => e.duration.tuplet !== undefined);
    assert.equal(tripletNotes.length, 3);
    for (const n of tripletNotes) {
      assert.equal(n.duration.tuplet.actualNotes, 3);
      assert.equal(n.duration.tuplet.normalNotes, 2);
    }
  });

  test('an explicit <stem> direction is captured on the parsed Note', () => {
    const result = loadFixture('v2-elements.musicxml');
    const events = result.score.parts[0].measures[0].voices[0].events;
    const tripletNotes = [...events].filter((e) => e.duration.tuplet !== undefined);
    for (const n of tripletNotes) assert.equal(n.explicitStemDirection, 'down');
  });

  test('an explicit <accidental> element is captured as hasExplicitAccidental', () => {
    const result = loadFixture('v2-elements.musicxml');
    const events = result.score.parts[0].measures[0].voices[0].events;
    const last = events[events.length - 1];
    assert.equal(last.hasExplicitAccidental, true);
  });

  test('end to end: the explicit notehead renders as the real X glyph', () => {
    const { svg, diagnostics } = renderFixture('v2-elements.musicxml');
    assert.deepEqual([...diagnostics], []);
    assert.match(svg, /\uE0A9/); // noteheadXBlack
  });

  test('end to end: both grace notes render as their own distinct, correct precomposed glyphs (not swept into the following beam group)', () => {
    const { svg } = renderFixture('v2-elements.musicxml');
    assert.match(svg, /\uE561/); // graceNoteAcciaccaturaStemDown
    assert.match(svg, /\uE563/); // graceNoteAppoggiaturaStemDown
  });

  test('end to end: all 3 tuplet notes render with a DOWN stem, matching the explicit <stem> override', () => {
    const { svg } = renderFixture('v2-elements.musicxml');
    const stems = [
      ...svg.matchAll(
        /<line x1="(1[03]\.5|16\.5)" y1="([\d.]+)" x2="\1" y2="([\d.]+)" stroke="#000000" stroke-width="0\.12"/g,
      ),
    ];
    assert.equal(stems.length, 3);
    for (const m of stems) assert.ok(Number(m[3]) > Number(m[2]), `expected a down stem at x=${m[1]}`);
  });

  test('end to end: the courtesy accidental renders even though the pitch already matches the implied key', () => {
    const { svg } = renderFixture('v2-elements.musicxml');
    assert.match(svg, /\uE261/); // accidentalNatural
  });
});
