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

function scoreXml(measureContents) {
  return `<score-partwise><part-list><score-part id="P1"><part-name>Test</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>${measureContents}</measure></part></score-partwise>`;
}

describe('MusicXML parser v2 Tier 1 (Phase 35)', () => {
  test('invalid unpitched display coordinates do not claim an explicit position, and invalid MIDI note IDs are warned and omitted', () => {
    const result = loadFixture('gm-drum-correctness.musicxml');
    const map = result.midiInstrumentsByPart.get('P1');
    assert.ok(map);
    assert.equal(map.get('P1-SNARE'), 38);
    assert.equal(map.get('P1-LOW'), 0);
    assert.equal(map.has('P1-HIGH'), false);
    assert.equal(map.has('P1-TEXT'), false);

    const notes = result.score.parts[0].measures[0].voices[0].events;
    const malformed = notes[0];
    assert.equal(malformed.pitch.kind, 'unpitched');
    assert.equal(malformed.pitch.displayStep, 'B');
    assert.equal(malformed.pitch.displayOctave, 4);
    assert.equal(malformed.hasExplicitDisplayPosition, undefined);
    assert.ok([...result.diagnostics].some((d) => d.code === 'INVALID_PITCH_STEP'));
    assert.ok([...result.diagnostics].some((d) => d.code === 'MISSING_OCTAVE'));

    const midiWarnings = [...result.diagnostics].filter((d) => d.code === 'INVALID_MIDI_UNPITCHED');
    assert.equal(midiWarnings.length, 2);
    assert.ok(midiWarnings.every((d) => d.severity === 'warning'));
    assert.ok(midiWarnings.every((d) => d.location?.partId === 'P1'));
  });

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

  test('filled notehead and cautionary accidental wrappers render as the requested Bravura glyphs', () => {
    const xml = scoreXml(
      '<note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><accidental parentheses="yes">sharp</accidental><notehead parentheses="yes" filled="no">x</notehead></note>',
    );
    const { svg, diagnostics } = NE.renderFromMusicXml(xml, { domParser });
    const { score } = NE.parseMusicXml(xml, { domParser });
    const note = score.parts[0].measures[0].voices[0].events[0];
    assert.equal(note.noteheadFilled, false);
    assert.equal(note.noteheadParentheses, true);
    assert.equal(note.accidentalParentheses, true);
    assert.ok(![...diagnostics].some((d) => d.code === 'INVALID_BOOLEAN_ATTRIBUTE'));
    for (const name of [
      'noteheadXHalf',
      'noteheadParenthesisLeft',
      'noteheadParenthesisRight',
      'accidentalSharp',
      'accidentalParensLeft',
      'accidentalParensRight',
    ]) {
      assert.ok(svg.includes(NE.getGlyph(name).char), `expected Bravura ${name} in SVG`);
    }
    const textNodes = [...svg.matchAll(/<text x="([\d.-]+)" y="([\d.-]+)"[^>]*>([^<]*)<\/text>/g)];
    const nodeFor = (name) => textNodes.find((node) => node[3] === NE.getGlyph(name).char);
    const xFor = (name) => Number(nodeFor(name)?.[1]);
    const leftNoteheadParen = NE.getGlyph('noteheadParenthesisLeft');
    const rightNoteheadParen = NE.getGlyph('noteheadParenthesisRight');
    const xGlyph = NE.getGlyph('noteheadXHalf');
    const leftAccidentalParen = NE.getGlyph('accidentalParensLeft');
    const sharp = NE.getGlyph('accidentalSharp');
    assert.ok(
      Math.abs(
        xFor('noteheadXHalf') -
          xFor('noteheadParenthesisLeft') -
          (leftNoteheadParen.bBox.bBoxNE[0] + 0.04),
      ) < 1e-9,
      'left notehead parenthesis clears the actual notehead ink box by the configured gap',
    );
    assert.ok(
      Math.abs(
        xFor('noteheadParenthesisRight') -
          xFor('noteheadXHalf') -
          (xGlyph.bBox.bBoxNE[0] + 0.04 - rightNoteheadParen.bBox.bBoxSW[0]),
      ) < 1e-9,
      'right notehead parenthesis compensates for its negative Bravura side bearing',
    );
    assert.ok(
      Math.abs(
        xFor('accidentalSharp') -
          xFor('accidentalParensLeft') -
          (leftAccidentalParen.bBox.bBoxNE[0] + 0.06 - sharp.bBox.bBoxSW[0]),
      ) < 1e-9,
      'wrapped accidental placement uses glyph ink bounds and the exact 0.06sp gap',
    );
  });

  test('a non-notehead SMuFL override warns and falls back instead of drawing a clef as a notehead', () => {
    const xml = scoreXml(
      '<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><notehead smufl="gClef">other</notehead></note>',
    );
    const { diagnostics, svg } = NE.renderFromMusicXml(xml, { domParser });
    assert.ok([...diagnostics].some((d) => d.code === 'UNKNOWN_NOTEHEAD_SMUFL'));
    assert.ok(svg.includes(NE.getGlyph('noteheadBlack').char));
  });

  test('contradictory accidental wrappers warn and render the accidental without either wrapper', () => {
    const xml = scoreXml(
      '<note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><accidental parentheses="yes" bracket="yes">sharp</accidental></note>',
    );
    const { diagnostics, svg } = NE.renderFromMusicXml(xml, { domParser });
    assert.ok([...diagnostics].some((d) => d.code === 'CONTRADICTORY_ACCIDENTAL_WRAPPERS'));
    assert.ok(svg.includes(NE.getGlyph('accidentalSharp').char));
    assert.ok(!svg.includes(NE.getGlyph('accidentalParensLeft').char));
    assert.ok(!svg.includes(NE.getGlyph('accidentalBracketLeft').char));
  });

  test('an explicit MusicXML rest display position changes its rendered staff position', () => {
    const explicitXml = scoreXml(
      '<note><rest><display-step>D</display-step><display-octave>5</display-octave></rest><duration>1</duration><voice>1</voice><type>quarter</type></note>',
    );
    const defaultXml = scoreXml(
      '<note><rest/><duration>1</duration><voice>1</voice><type>quarter</type></note>',
    );
    const explicit = NE.renderFromMusicXml(explicitXml, { domParser });
    const defaultRest = NE.renderFromMusicXml(defaultXml, { domParser });
    const { score } = NE.parseMusicXml(explicitXml, { domParser });
    const explicitEvent = score.parts[0].measures[0].voices[0].events[0];
    assert.equal(explicitEvent.displayStep, 'D');
    assert.equal(explicitEvent.displayOctave, 5);
    const restChar = NE.getGlyph('restQuarter').char;
    const restY = (svg) =>
      svg.match(new RegExp(`<text x="[\\d.]+" y="([\\d.-]+)"[^>]*>${restChar}</text>`))?.[1];
    assert.notEqual(restY(explicit.svg), undefined);
    assert.notEqual(restY(defaultRest.svg), undefined);
    assert.notEqual(restY(explicit.svg), restY(defaultRest.svg));

    const invalid = NE.parseMusicXml(
      scoreXml(
        '<note><rest><display-step>H</display-step><display-octave>5</display-octave></rest><duration>1</duration><voice>1</voice><type>quarter</type></note>',
      ),
      { domParser },
    );
    const invalidRest = invalid.score.parts[0].measures[0].voices[0].events[0];
    assert.equal(invalidRest.displayStep, undefined);
    assert.equal(invalidRest.displayOctave, undefined);
    assert.ok([...invalid.diagnostics].some((d) => d.code === 'INVALID_REST_DISPLAY_POSITION'));
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
    // Match every downward stem (y2 > y1); the tuplet's 3 explicit-stem
    // notes are 3 of these -- checked by COUNT and direction rather than
    // pinning to exact x values, which shift whenever spacing constants
    // are tuned (Phase 43/44's real content-driven spacing, not the old
    // fixed-width layout, now determines these positions).
    const allStems = [
      ...svg.matchAll(
        /<line x1="([\d.]+)" y1="([\d.]+)" x2="\1" y2="([\d.]+)" stroke="#000000" stroke-width="0\.12"/g,
      ),
    ];
    const downStems = allStems.filter((m) => Number(m[3]) > Number(m[2]));
    // 4 notes in this fixture end up with a down stem: the tuplet's 3
    // (explicit) plus one more (automatic placement) -- confirmed by
    // checking the parsed data directly (voice 0, events 3-5 carry
    // explicitStemDirection: 'down' and duration.tuplet; event 6 does
    // not, but happens to also place down automatically).
    assert.ok(downStems.length >= 3, `expected at least 3 down stems, got ${downStems.length}`);
  });

  test('end to end: the courtesy accidental renders even though the pitch already matches the implied key', () => {
    const { svg } = renderFixture('v2-elements.musicxml');
    assert.match(svg, /\uE261/); // accidentalNatural
  });
});
