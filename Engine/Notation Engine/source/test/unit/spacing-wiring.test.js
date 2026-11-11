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
  const barlineXs = (svg) =>
    [
      ...svg.matchAll(
        /<line x1="([\d.]+)" y1="[\d.]+" x2="\1" y2="[\d.]+" stroke="#000000" stroke-width="0\.16"/g,
      ),
    ].map((m) => Number(m[1]));

  test("4 equal-duration quarter notes are spaced EVENLY, and they fill the bar -- §14.1's proportional space stretched (§14.3) to the width the measure really got", () => {
    const { svg } = NE.renderFromMusicXml(load('simple-single-voice.musicxml'), { domParser });
    const xs = [...svg.matchAll(/<text x="([\d.]+)" y="[\d.]+"[^>]*>\uE0A4</g)].map((m) =>
      Number(m[1]),
    );
    assert.equal(xs.length, 4);
    // Equal durations earn equal space, and stretching the measure to
    // its real width must not disturb that -- only its scale.
    const gaps = xs.slice(1).map((x, i) => x - xs[i]);
    for (const gap of gaps) assert.equal(gap, gaps[0]);
    // And the bar is FILLED. The last quarter note is one more gap
    // short of the barline, not left in the first third of the bar
    // with empty staff after it -- which is what the measure's
    // minimum-width floor used to produce, and what read on screen as
    // missing music.
    assert.equal(barlineXs(svg)[0] - xs[3], gaps[0]);
  });

  test('a half note and a half rest divide their bar in half -- the stretch is proportional, so the rest is not flung towards the barline', () => {
    const { svg } = NE.renderFromMusicXml(load('simple-single-voice.musicxml'), { domParser });
    // Measure 2 of the fixture: a half note then a half rest, in 4/4.
    const halfNoteX = Number(svg.match(/<text x="([\d.]+)" y="[\d.]+"[^>]*>\uE0A3</)[1]);
    const halfRestX = Number(svg.match(/<text x="([\d.]+)" y="[\d.]+"[^>]*>\uE4E4</)[1]);
    const [firstBarline, secondBarline] = barlineXs(svg);
    assert.ok(halfNoteX > firstBarline, 'the half note belongs to measure 2');
    assert.equal(halfRestX - halfNoteX, secondBarline - halfRestX);
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
