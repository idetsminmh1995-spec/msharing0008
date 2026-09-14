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

describe('Phase 43/44 wired into rendering: real content-driven spacing', () => {
  test("4 equal-duration quarter notes space out at exactly 2.4sp apart -- §14.1's own reference-duration space, not the old fixed-width interpolation", () => {
    const { svg } = NE.renderFromMusicXml(load('simple-single-voice.musicxml'), { domParser });
    assert.match(svg, /x="6" y="9"/);
    assert.match(svg, /x="8\.4" y="8\.5"/);
    assert.match(svg, /x="10\.8" y="8"/);
    assert.match(svg, /x="13\.2" y="7\.5"/);
  });

  test("a measure's real width is now content-driven, not the old fixed MEASURE_WIDTH -- confirmed by two measures of the SAME file (different content) getting different widths", () => {
    const { svg } = NE.renderFromMusicXml(load('simple-single-voice.musicxml'), { domParser });
    // Measure 1 (4 quarters + a half note) and measure 2 (a half note + a
    // half rest) have different content, so their barlines -- and thus
    // their own widths -- must differ under real content-driven spacing,
    // unlike Phase 21's fixed-width layout where every measure was
    // identical regardless of content.
    const barlineXs = [...svg.matchAll(/<line x1="([\d.]+)" y1="[\d.]+" x2="\1" y2="[\d.]+" stroke="#000000" stroke-width="0\.16"/g)].map(
      (m) => Number(m[1]),
    );
    assert.equal(barlineXs.length, 2);
    const measure1Width = barlineXs[0];
    const measure2Width = barlineXs[1] - barlineXs[0];
    assert.notEqual(measure1Width, measure2Width);
  });

  test("CROSS-STAFF ALIGNMENT: a grand staff's bass-clef notes land at the EXACT same x as the treble-clef notes sharing their tick", () => {
    const { svg } = NE.renderFromMusicXml(load('piano-grand-staff.musicxml'), { domParser });
    const notes = [...svg.matchAll(/<text x="([\d.]+)" y="([\d.]+)"[^>]*>([\uE000-\uFFFF])<\/text>/g)]
      .filter((m) => m[3] === '\uE0A4' || m[3] === '\uE0A3')
      .map((m) => ({ x: m[1], isBass: Number(m[2]) > 10 }));
    const trebleXs = notes.filter((n) => !n.isBass).map((n) => n.x);
    const bassXs = notes.filter((n) => n.isBass).map((n) => n.x);
    // Treble: C5,E5 (tick 0, 480), G5-half (tick 960). Bass: C3-half,
    // G3-half (tick 0, 960). Both staves' FIRST and LAST attack points
    // must land at the SAME x -- the whole point of computing one
    // shared position map per measure across every staff.
    assert.equal(trebleXs[0], bassXs[0]); // first attack point (tick 0)
    assert.equal(trebleXs[trebleXs.length - 1], bassXs[bassXs.length - 1]); // last attack point (tick 960)
  });

  test('a CHORD occupies its own real spacing position, distinct from the note that follows it (regression: chords were once silently excluded from the position map)', () => {
    const { svg, diagnostics } = NE.renderFromMusicXml(load('chord.musicxml'), { domParser });
    assert.deepEqual([...diagnostics], []);
    const noteheadXs = [...svg.matchAll(/<text x="([^"]+)" y="[^"]*"[^>]*>\uE0A4<\/text>/g)].map((m) => m[1]);
    assert.deepEqual(noteheadXs, ['6', '6', '6']); // the chord's 3 notes, all at ONE shared x
    const halfNoteX = svg.match(/<text x="([^"]+)" y="[^"]*"[^>]*>\uE0A3<\/text>/)[1];
    assert.notEqual(halfNoteX, '6', "the note following the chord must NOT collide with the chord's own position");
  });

  test('a REST occupies its own real spacing position too, distinct from the chord before it and the note after it', () => {
    const { svg } = NE.renderFromMusicXml(load('chord.musicxml'), { domParser });
    const restX = svg.match(/<text x="([^"]+)" y="[^"]*"[^>]*>\uE4E5<\/text>/)[1];
    const chordX = [...svg.matchAll(/<text x="([^"]+)" y="[^"]*"[^>]*>\uE0A4<\/text>/g)][0][1];
    const halfNoteX = svg.match(/<text x="([^"]+)" y="[^"]*"[^>]*>\uE0A3<\/text>/)[1];
    assert.notEqual(restX, chordX);
    assert.notEqual(restX, halfNoteX);
    assert.ok(Number(restX) > Number(chordX) && Number(restX) < Number(halfNoteX));
  });
});
