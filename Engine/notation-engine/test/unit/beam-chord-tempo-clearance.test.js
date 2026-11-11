import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';
import { eventGeometry } from '../helpers/svg-geometry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NE = loadEngine();
const domParser = testDomParser();

const glyphCount = (svg, name) => svg.split(NE.getGlyph(name).char).length - 1;

function glyphPlacements(svg, glyphName) {
  const ch = NE.getGlyph(glyphName).char;
  const out = [];
  const re = /<text([^>]*)>([^<]*)<\/text>/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    if (m[2] !== ch) continue;
    out.push({
      x: Number(/x="([^"]+)"/.exec(m[1])?.[1]),
      y: Number(/y="([^"]+)"/.exec(m[1])?.[1]),
    });
  }
  return out;
}

/** Every drawn line, with its stroke width -- beams are the 0.5-thick ones. */
function lines(svg) {
  const out = [];
  const re = /<line x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)"([^/]*)\/>/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    out.push({
      x1: +m[1],
      y1: +m[2],
      x2: +m[3],
      y2: +m[4],
      w: /stroke-width="([\d.]+)"/.exec(m[5])?.[1],
    });
  }
  return out;
}

const render = (xml) => NE.renderFromMusicXml(xml, { domParser });

/** An eighth note, optionally a chord continuation, with an explicit beam value. */
const eighth = (step, octave, beam, chord = '', stem = '') =>
  `<note>${chord}<pitch><step>${step}</step><octave>${octave}</octave></pitch>` +
  (stem ? `<stem>${stem}</stem>` : '') +
  '<duration>1</duration><voice>1</voice><type>eighth</type>' +
  (beam ? `<beam number="1">${beam}</beam>` : '') +
  '</note>';

const drumEighth = (displayStep, displayOctave, beam, chord = '') =>
  `<note>${chord}<unpitched><display-step>${displayStep}</display-step>` +
  `<display-octave>${displayOctave}</display-octave></unpitched>` +
  '<duration>1</duration><voice>1</voice><type>eighth</type>' +
  (beam ? `<beam number="1">${beam}</beam>` : '') +
  '</note>';

function measure(body, attrs = '') {
  return (
    '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">' +
    '<measure number="1"><attributes><divisions>2</divisions>' +
    '<time><beats>4</beats><beat-type>4</beat-type></time>' +
    `<clef><sign>G</sign><line>2</line></clef>${attrs}</attributes>` +
    body +
    '</measure></part></score-partwise>'
  );
}

describe('a chord inside a beam group (Integration M, §9.13)', () => {
  test('a 1/2/3-note drum chord uses one upward stem and stays connected to one shared beam', () => {
    const { svg, diagnostics } = render(
      measure(
        drumEighth('G', 5, 'begin') +
          drumEighth('C', 5, 'continue', '<chord/>') +
          drumEighth('F', 4, 'continue', '<chord/>') +
          drumEighth('G', 5, 'continue') +
          drumEighth('C', 5, 'continue', '<chord/>') +
          drumEighth('F', 4, 'continue', '<chord/>') +
          drumEighth('G', 5, 'end') +
          '<note><rest/><duration>5</duration><voice>1</voice><type>half</type></note>',
      ),
    );
    assert.deepEqual([...diagnostics], []);
    assert.equal(glyphPlacements(svg, 'noteheadBlack').length, 7);
    assert.equal(glyphPlacements(svg, 'noteheadXBlack').length, 0);
    assert.equal(lines(svg).filter((line) => line.w === '0.5').length, 1);
    assert.equal(glyphCount(svg, 'flag8thUp') + glyphCount(svg, 'flag8thDown'), 0);

    const stems = lines(svg).filter((line) => line.w === '0.12');
    assert.equal(stems.length, 3, 'each beamed event must draw one shared-direction stem');
    assert.ok(stems.every((stem) => stem.y2 < stem.y1), 'all drum stems must point upward');
    const beam = lines(svg).find((line) => line.w === '0.5');
    assert.ok(beam !== undefined);
    for (const stem of stems) {
      const beamY =
        beam.y1 + ((beam.y2 - beam.y1) * (stem.x1 - beam.x1)) / (beam.x2 - beam.x1 || 1);
      assert.ok(
        Math.abs(stem.y2 - beamY) < 0.3 || Math.abs(stem.y1 - beamY) < 0.3,
        `each chord stem must meet the shared beam at its own x (beam=${beamY}, stem=${stem.y1}->${stem.y2})`,
      );
    }
  });

  test('a beam spanning [note, chord, note] draws ONE beam and NO flags', () => {
    const { svg, diagnostics } = render(
      measure(
        eighth('C', 5, 'begin') +
          eighth('E', 5, 'continue') +
          eighth('G', 5, '', '<chord/>') +
          eighth('D', 5, 'end') +
          '<note><rest/><duration>5</duration><voice>1</voice><type>half</type></note>',
      ),
    );
    assert.deepEqual([...diagnostics], []);
    assert.equal(glyphCount(svg, 'flag8thUp'), 0, 'a beamed group must draw no flags');
    assert.equal(glyphCount(svg, 'flag8thDown'), 0);
    const beams = lines(svg).filter((l) => l.w === '0.5');
    assert.equal(beams.length, 1, 'one unbroken beam across all three events');
  });

  test('the chord that used to BREAK the beam now sits under it, with every member drawn', () => {
    const { svg } = render(
      measure(
        eighth('C', 5, 'begin') +
          eighth('E', 5, 'continue') +
          eighth('G', 5, '', '<chord/>') +
          eighth('D', 5, 'end') +
          '<note><rest/><duration>5</duration><voice>1</voice><type>half</type></note>',
      ),
    );
    // Four noteheads: C5, E5, G5 (the chord's two members) and D5.
    assert.equal(glyphPlacements(svg, 'noteheadBlack').length, 4);
    const beam = lines(svg).filter((l) => l.w === '0.5')[0];
    const chordXs = glyphPlacements(svg, 'noteheadBlack')
      .map((n) => n.x)
      .sort((a, b) => a - b);
    // The beam spans from the first notehead's x to the last one's.
    assert.ok(beam.x1 <= chordXs[0] + 1e-9);
    assert.ok(beam.x2 >= chordXs[chordXs.length - 1] - 1e-9);
  });

  test("a chord's stem reaches the beam from its FAR notehead, so the whole chord is joined", () => {
    const { svg } = render(
      measure(
        eighth('C', 5, 'begin') +
          eighth('C', 6, '', '<chord/>') +
          eighth('D', 5, 'end') +
          '<note><rest/><duration>6</duration><voice>1</voice><type>half</type></note>',
      ),
    );
    const beam = lines(svg).filter((l) => l.w === '0.5')[0];
    const stems = lines(svg).filter((l) => l.w === '0.12');
    // C6 sits well above the middle line, so this group is DOWN-stemmed
    // and its beam is below the noteheads. The beam is also SLOPED, so
    // each stem must meet it at that stem's OWN x, not at one fixed y.
    const beamYAt = (x) =>
      beam.y1 + ((beam.y2 - beam.y1) * (x - beam.x1)) / (beam.x2 - beam.x1 || 1);
    for (const s of stems) {
      const target = beamYAt(s.x1);
      const meetsBeam = Math.abs(s.y1 - target) < 0.3 || Math.abs(s.y2 - target) < 0.3;
      assert.ok(
        meetsBeam,
        `a stem must end on the beam at its own x (stem ${s.y1}->${s.y2} at x=${s.x1}, beam there = ${target})`,
      );
    }
    const longest = Math.max(...stems.map((s) => Math.abs(s.y2 - s.y1)));
    const shortest = Math.min(...stems.map((s) => Math.abs(s.y2 - s.y1)));
    assert.ok(longest > shortest, "the chord's stem spans further than a single note's");
  });

  test('a mixed-shape chord anchors its stem to the far notehead, not the widest glyph', () => {
    const { svg } = render(
      measure(
        eighth('C', 5, 'begin') +
          '<note><chord/><pitch><step>A</step><octave>5</octave></pitch>' +
          '<duration>1</duration><voice>1</voice><type>eighth</type>' +
          '<notehead>x</notehead><beam number="1">continue</beam></note>' +
          eighth('D', 5, 'end') +
          '<note><rest/><duration>5</duration><voice>1</voice><type>half</type></note>',
      ),
    );
    const chordX = glyphPlacements(svg, 'noteheadXBlack')[0]?.x;
    assert.notEqual(chordX, undefined, 'the mixed-shape chord must draw its X head');
    const stemAnchor = NE.getGlyph('noteheadXBlack').anchors.stemDownNW[0];
    const chordStemX = chordX + stemAnchor;
    const stemXs = lines(svg)
      .filter((line) => line.w === '0.12')
      .map((line) => line.x1);
    assert.ok(
      stemXs.some((x) => Math.abs(x - chordStemX) < 1e-4),
      `the chord stem must use the far X-head anchor at ${chordStemX}; got ${stemXs.join(', ')}`,
    );
  });

  test('a beamed chord honors <stem> on a continuation member when other events omit it', () => {
    const { svg, diagnostics } = render(
      measure(
        eighth('C', 5, 'begin') +
          eighth('E', 5, 'continue') +
          eighth('G', 5, 'continue', '<chord/>', 'up') +
          eighth('D', 5, 'end') +
          '<note><rest/><duration>5</duration><voice>1</voice><type>half</type></note>',
      ),
    );
    assert.deepEqual([...diagnostics], []);
    const chord = eventGeometry(svg, 'P1#m1#v1#e1');
    assert.equal(chord?.heads.length, 2, 'both chord noteheads must render');
    assert.equal(chord?.stem.direction, 'up', 'the later chord member states <stem>up</stem>');
    for (const event of [0, 1, 2]) {
      assert.equal(
        eventGeometry(svg, `P1#m1#v1#e${event}`)?.stem.direction,
        'up',
        `the unanimous file direction controls beamed event ${event}`,
      );
    }
    assert.equal(glyphCount(svg, 'flag8thUp') + glyphCount(svg, 'flag8thDown'), 0);
    assert.equal(lines(svg).filter((line) => line.w === '0.5').length, 1);
  });

  test("the project's own drum chart draws zero stray flags (it drew 62 before)", () => {
    const xml = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', '..', 'website', 'assets', 'Drum_Lesson_5.musicxml'),
      'utf8',
    );
    const { svg } = render(xml);
    // Every one of those 62 was a beam the FILE declared, broken by a
    // chord -- hi-hat and snare struck together, which is most of a real
    // drum groove.
    assert.equal(glyphCount(svg, 'flag8thUp') + glyphCount(svg, 'flag8thDown'), 0);
  });
});

describe('tempo mark clearance (Integration M, §9.21)', () => {
  test('the mark clears the beams above high notes instead of cutting through them', () => {
    // Notes on the TOP line with up stems and a beam -- the drum-chart
    // case, where "2.5 above the top staff line" landed below the beam.
    const { svg } = render(
      measure(
        '<direction><direction-type><metronome><beat-unit>quarter</beat-unit>' +
          '<per-minute>120</per-minute></metronome></direction-type></direction>' +
          eighth('F', 5, 'begin') +
          eighth('F', 5, 'end') +
          '<note><rest/><duration>6</duration><voice>1</voice><type>half</type></note>',
      ),
    );
    const markY = glyphPlacements(svg, 'metNoteQuarterUp')[0]?.y;
    assert.ok(markY !== undefined, 'the tempo mark must be drawn');
    const beamY = Math.min(...lines(svg).filter((l) => l.w === '0.5').map((l) => Math.min(l.y1, l.y2)));
    // Smaller y is higher up the page.
    assert.ok(markY < beamY, `tempo mark (y=${markY}) must sit ABOVE the beam (y=${beamY})`);
  });

  test('the viewBox grows to hold the mark, so it is never clipped off the top', () => {
    const withMark = render(
      measure(
        '<direction><direction-type><metronome><beat-unit>quarter</beat-unit>' +
          '<per-minute>120</per-minute></metronome></direction-type></direction>' +
          eighth('F', 5, 'begin') +
          eighth('F', 5, 'end') +
          '<note><rest/><duration>6</duration><voice>1</voice><type>half</type></note>',
      ),
    );
    const markY = glyphPlacements(withMark.svg, 'metNoteQuarterUp')[0].y;
    assert.ok(markY > 0, `the mark must be inside the viewBox, got y=${markY}`);
  });

  test('a score with NO tempo mark gains no extra headroom at all', () => {
    const { svg } = render(
      measure(eighth('F', 5, 'begin') + eighth('F', 5, 'end') +
        '<note><rest/><duration>6</duration><voice>1</voice><type>half</type></note>'),
    );
    const height = Number(/viewBox="[^"]*?([\d.]+)"/.exec(svg)[1]);
    // The engine's own single-staff system height, unchanged -- which is
    // what keeps every non-tempo fixture byte-identical.
    assert.equal(height, 16);
  });
});
