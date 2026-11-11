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

function render() {
  const xml = fs.readFileSync(path.join(FIXTURES_DIR, 'gm-drum-mapping.musicxml'), 'utf8');
  return NE.renderFromMusicXml(xml, { domParser });
}

describe('GM drum mapping wired into rendering (Phase 41, §13.1/§13.3)', () => {
  test('malformed display coordinates fall back to the valid GM position, and lookup warnings reach render diagnostics with location', () => {
    const xml = fs.readFileSync(path.join(FIXTURES_DIR, 'gm-drum-correctness.musicxml'), 'utf8');
    const { svg, diagnostics } = NE.renderFromMusicXml(xml, { domParser });

    // The first note's invalid H/not-a-number display position recovers as
    // B4, but that recovery must not suppress the known snare mapping.
    assert.match(svg, /y="5\.5"[^>]*>\uE0A4/);

    const outOfRange = [...diagnostics].filter((d) => d.code === 'DRUM_NOTE_OUT_OF_RANGE');
    assert.equal(outOfRange.length, 1);
    assert.equal(outOfRange[0].location.partId, 'P1');
    assert.equal(outOfRange[0].location.measureNumber, 1);
    assert.ok(
      ![...diagnostics].some((d) => d.code === 'DRUM_NOTE_UNMAPPED'),
      'invalid midi-unpitched values must not create a GM mapping and a second lookup warning',
    );
  });

  test('multi-staff extent uses the GM-resolved position when display coordinates are omitted', () => {
    const xml = fs.readFileSync(
      path.join(FIXTURES_DIR, 'gm-drum-two-staff-extent.musicxml'),
      'utf8',
    );
    const { svg } = NE.renderFromMusicXml(xml, {
      domParser,
      config: { drums: { mapping: { 36: { staffPosition: 8 } } } },
    });
    const staffLineYs = [
      ...svg.matchAll(
        /<line x1="0" y1="([\d.]+)" x2="[\d.]+" y2="\1" stroke="#000000" stroke-width="0\.13"/g,
      ),
    ]
      .map((match) => Number(match[1]))
      .sort((a, b) => a - b);
    assert.equal(staffLineYs.length, 10);
    const upperBottom = staffLineYs[4];
    const lowerBottom = staffLineYs[9];
    assert.ok(upperBottom !== undefined && lowerBottom !== undefined);
    assert.ok(
      lowerBottom - upperBottom > NE.DEFAULT_CONFIG.staves.minStaffDistance + 4,
      'the extreme GM position on the upper staff must increase the staff gap',
    );
  });

  test('a percussion note with an <instrument> resolving to a real GM note renders with nothing worse than a note to self', () => {
    const { diagnostics } = render();
    // This fixture deliberately states no <display-step>/<display-octave>
    // -- that is the case the GM drum table exists for, and the whole
    // point of the fixture. The parser says so once per missing element
    // at `info`, and nothing worse than that is allowed.
    const bad = [...diagnostics].filter((d) => d.severity !== 'info');
    assert.deepEqual(bad, []);
    assert.ok(
      [...diagnostics].every((d) => d.code === 'MISSING_DISPLAY_POSITION'),
      'the only thing to report here is the absent display position',
    );
  });

  test("the snare (GM 38) renders as a plain oval notehead, at the drum table's own staff position, stem up", () => {
    const { svg } = render();
    // Snare is the first note; its notehead glyph is noteheadBlack (U+E0A4), not the file's own display-step/octave position.
    // y=5.5 -- staffPosition -2.5 (the 3rd space from the bottom, above the
    // middle line), corrected from an earlier -1.5 after a real drum-lesson
    // MusicXML's own consistent encoding (62/62 snare notes at the same
    // display position) showed the table's default was a full staff-space
    // too low. See Doc/integration-n-drum-position-corrections.md.
    assert.match(svg, /x="6" y="5\.5"[^>]*>\uE0A4/);
  });

  test("the kick (GM 36) renders as a plain oval, at the kick's own staff position, stem UP with the rest of the drum chart", () => {
    const { svg } = render();
    // The kick is the SECOND attack. Its x is whatever §14's spacing,
    // stretched to the bar's real width, puts it at -- read off the
    // notehead rather than written down here, so this test keeps
    // testing the kick's SHAPE, POSITION and STEM and does not fail
    // again the next time the horizontal spacing changes.
    const kick = svg.match(/x="([\d.]+)" y="7\.5"[^>]*>\uE0A4/);
    assert.ok(kick, "expected a plain oval notehead at the kick's own y=7.5");
    const x = kick[1];
    const stems = [...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="[\d.]+" y2="([\d.]+)" stroke="#000000" stroke-width="0\.12"\s*\/>/g)].filter(
      (match) => Math.abs(Number(match[1]) - Number(x)) < 2,
    );
    assert.equal(stems.length, 1);
    assert.ok(Number(stems[0][3]) < Number(stems[0][2]), 'expected an up stem for the kick');
  });

  test("the closed hi-hat (GM 42) renders as an X notehead, at the hi-hat's own (much higher) staff position, stem up", () => {
    const { svg } = render();
    // y=3.5 -- staffPosition -4.5 (the space above the top line), corrected
    // from an earlier -4 (on the top line) by the same real-file evidence
    // as the snare fix above (248/248 hi-hat notes at one consistent
    // display position).
    assert.match(svg, /y="3\.5"[^>]*>\uE0A9/);
  });

  test('an explicit <notehead> override still wins over the GM-derived shape (priority order preserved)', () => {
    // The Phase 35 v2-elements fixture has a GM-linked hi-hat note with an
    // explicit <notehead>x</notehead> override -- confirm the explicit
    // override's shape is what actually renders, not silently replaced by
    // the GM default now that GM lookup exists.
    const xml = fs.readFileSync(path.join(FIXTURES_DIR, 'v2-elements.musicxml'), 'utf8');
    const { svg } = NE.renderFromMusicXml(xml, { domParser });
    assert.match(svg, /\uE0A9/); // noteheadXBlack, matching the file's own explicit override
  });

  test('a two-voice MuseScore-style groove preserves GM IDs, written positions, stems and aligned beats', () => {
    const xml = fs.readFileSync(
      path.join(FIXTURES_DIR, 'musescore-two-voice-drum-groove.musicxml'),
      'utf8',
    );
    const parsed = NE.parseMusicXml(xml, { domParser });
    const part = parsed.score.parts[0];
    assert.ok(part);
    const gmByInstrument = parsed.midiInstrumentsByPart.get(part.id);
    assert.ok(gmByInstrument);
    assert.equal(gmByInstrument.get('P1-KICK'), 36, 'MusicXML midi-unpitched 37 maps to GM 36');
    assert.equal(gmByInstrument.get('P1-SNARE'), 38, 'MusicXML midi-unpitched 39 maps to GM 38');
    assert.equal(gmByInstrument.get('P1-HH'), 42, 'MusicXML midi-unpitched 43 maps to GM 42');

    const measure = part.measures[0];
    assert.ok(measure);
    const attacks = measure.voices.flatMap((voice) =>
      voice.events.flatMap((event) => {
        const notes = event.kind === 'chord' ? event.notes : event.kind === 'note' ? [event] : [];
        return notes.map((note) => ({ tick: event.startTick, voice: voice.id, note }));
      }),
    );
    assert.equal(attacks.length, 10);
    const gmOf = (attack) => gmByInstrument.get(attack.note.instrumentId);
    const positionOf = (note) => `${note.pitch.displayStep}${note.pitch.displayOctave}`;
    const hats = attacks.filter((attack) => gmOf(attack) === 42);
    const snares = attacks.filter((attack) => gmOf(attack) === 38);
    const kicks = attacks.filter((attack) => gmOf(attack) === 36);
    assert.deepEqual(
      Array.from(hats, (attack) => attack.tick),
      [0, 480, 960, 1440],
    );
    assert.deepEqual(
      Array.from(snares, (attack) => attack.tick),
      [480, 1440],
    );
    assert.deepEqual(
      Array.from(kicks, (attack) => attack.tick),
      [0, 480, 960, 1440],
    );
    assert.ok(hats.every(({ note }) => positionOf(note) === 'G5' && note.explicitNotehead === 'x'));
    assert.ok(hats.every(({ note }) => note.explicitStemDirection === 'up'));
    assert.ok(snares.every(({ note }) => positionOf(note) === 'C5'));
    assert.ok(kicks.every(({ note }) => positionOf(note) === 'F4'));
    assert.ok(kicks.every(({ note }) => note.explicitStemDirection === 'down'));
    assert.equal(parsed.attributes[0].timeNumerator, 4);
    assert.equal(parsed.attributes[0].timeDenominator, 4);

    const rendered = NE.renderFromMusicXml(xml, { domParser });
    assert.deepEqual(Array.from(rendered.diagnostics), []);
    assert.ok(rendered.svg.includes('\uE0A9'), 'closed hi-hats use the X notehead glyph');
    assert.ok(rendered.svg.includes('\uE0A4'), 'kick/snare notes use the standard filled oval');
    assert.ok(rendered.svg.includes('130'), 'the quarter-note tempo marking is rendered');
  });

  test('the kick/hi-hat groove uses one clean shared beam without kick curves', () => {
    const xml = fs.readFileSync(
      path.join(FIXTURES_DIR, 'musescore-two-voice-drum-groove.musicxml'),
      'utf8',
    );
    const { svg } = NE.renderFromMusicXml(xml, { domParser });
    const beams = [...svg.matchAll(/<line x1="[\d.]+" y1="[\d.]+" x2="[\d.]+" y2="[\d.]+" stroke="#000000" stroke-width="0\.5"\s*\/>/g)];
    assert.equal(beams.length, 1, 'expected one shared beam for simultaneous hi-hat and kick attacks');
    assert.equal((svg.match(/<path\b/g) || []).length, 0, 'the kick voice must not add slur or curve paths');
  });
});
