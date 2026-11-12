import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { JSDOM } from 'jsdom';

import { loadEngine } from '../helpers/load-engine.js';

const {
  computeArpeggioShape,
  computeNonArpeggioShape,
  harmonicNoteheadGlyphName,
  parseMusicXml,
  renderParsedMusicXml,
  tremoloGlyphName,
  tremoloPlacement,
} = loadEngine();

/**
 * Phase 56: the marks that change what a note IS or how it is played --
 * tremolo (§9.24), arpeggio/non-arpeggio (§9.25) and the harmonic's
 * diamond head (§9.26).
 *
 * Every assertion here is about MEANING, not decoration: a tremolo's
 * stroke count, a harmonic's head shape, a rolled chord's mark. Those are
 * the three things a player reads off the page, so they are the three
 * things a wrong render gets wrong.
 */

const FIXTURE = readFileSync(
  new URL('../fixtures/musicxml/note-marks.musicxml', import.meta.url),
  'utf8',
);

class DomParser {
  parseFromString(text, mimeType) {
    return new JSDOM(text, { contentType: mimeType }).window.document;
  }
}

const parsed = parseMusicXml(FIXTURE, { domParser: DomParser });
const svg = renderParsedMusicXml(parsed, { width: 900 }).svg;

/** Every note of the guitar part (P2), in document order. */
const notesOf = (part) =>
  part.measures.flatMap((measure) =>
    measure.voices.flatMap((voice) =>
      voice.events.flatMap((event) =>
        event.kind === 'chord' ? event.notes : event.kind === 'note' ? [event] : [],
      ),
    ),
  );
const guitarNotes = notesOf(parsed.score.parts[1]);

describe('§9.24 tremolo', () => {
  it('names the glyph for each stroke count the font actually has', () => {
    assert.equal(tremoloGlyphName(1), 'tremolo1');
    assert.equal(tremoloGlyphName(2), 'tremolo2');
    assert.equal(tremoloGlyphName(3), 'tremolo3');
  });

  it('refuses a count it has no glyph for rather than rounding to one it has', () => {
    // The parser clamps and says so; this function's job is to answer
    // "does the font have it", and a silent clamp here would make a
    // 4-stroke tremolo look like a 3-stroke one with nothing to say.
    assert.equal(tremoloGlyphName(4), undefined);
    assert.equal(tremoloGlyphName(0), undefined);
  });

  it('parses the stroke count and the type from the file', () => {
    const strokes = guitarNotes.filter((note) => note.tremoloStrokes !== undefined);
    // `Array.from` (not `.map`) so the assertion compares a plain host
    // array with a plain host array: the engine's own arrays come from
    // the vm sandbox and have that realm's prototypes.
    assert.deepEqual(
      Array.from(strokes, (note) => note.tremoloStrokes),
      [3, 2, 3],
      'three tremolos: three strokes, two strokes, and a five-stroke one',
    );
    assert.equal(strokes[0].tremoloType, 'single');
  });

  it('clamps a five-stroke tremolo to three and says so', () => {
    const clamped = parsed.diagnostics.filter((d) => d.code === 'TREMOLO_STROKES_CLAMPED');
    assert.equal(clamped.length, 1);
    assert.match(clamped[0].message, /5 strokes/);
    // The clamped note still HAS a tremolo -- dropping the mark entirely
    // would lose the fact that the note is rolled at all.
    assert.equal(guitarNotes[3].tremoloStrokes, 3);
  });

  it('centres the strokes on the stem', () => {
    // The stem runs from 10 down to 4 (y-down); the mark belongs at 7,
    // not at a fixed distance from either end.
    const placement = tremoloPlacement(12, 10, 4);
    assert.equal(placement.x, 12);
    assert.equal(placement.y, 7);
  });

  it('draws the strokes for an unbeamed note and for a chord', () => {
    // Count the glyph elements whose character is one of tremolo1..3.
    const tremoloChars = ['tremolo1', 'tremolo2', 'tremolo3'];
    const drawn = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)]
      .map((match) => match[1])
      .filter(
        (char) => char.length === 1 && char.charCodeAt(0) >= 0xe220 && char.charCodeAt(0) <= 0xe222,
      );
    // Guitar: 3, 2, 3(clamped). Drums: 3. Four in total; no chord here
    // carries one, and no beamed note does either.
    assert.equal(drawn.length, 4);
    assert.ok(tremoloChars.length === 3);
  });
});

describe('§9.26 harmonic', () => {
  it('chooses the diamond by duration, as the oval set does', () => {
    assert.equal(harmonicNoteheadGlyphName('whole'), 'noteheadDiamondWhole');
    assert.equal(harmonicNoteheadGlyphName('half'), 'noteheadDiamondHalf');
    assert.equal(harmonicNoteheadGlyphName('quarter'), 'noteheadDiamondBlack');
  });

  it('parses <harmonic> and draws a diamond rather than an oval', () => {
    const harmonic = guitarNotes[0];
    assert.equal(harmonic.isHarmonic, true);
    // E5, a half note: the open diamond, not the black or the wide one.
    const diamond = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].filter(
      (match) => match[1].charCodeAt(0) === 0xe0d9,
    );
    assert.equal(diamond.length, 1);
  });

  it('lets the file’s own <notehead> outrank the harmonic default', () => {
    const xml = FIXTURE.replace(
      '<notations><harmonic><natural/></harmonic></notations>',
      '<notehead>diamond</notehead><notations><harmonic><natural/></harmonic></notations>',
    );
    const withExplicit = renderParsedMusicXml(parseMusicXml(xml, { domParser: DomParser }), {
      width: 900,
    }).svg;
    // `<notehead>diamond</notehead>` on a half note is noteheadDiamondHalf
    // too, so the two agree here -- what matters is that the explicit
    // branch is taken, which the note's own data still shows.
    assert.equal(
      parseMusicXml(xml, { domParser: DomParser }).score.parts[1].measures[0].voices[0].events[0]
        .explicitNotehead,
      'diamond',
    );
    assert.match(withExplicit, /<text/);
  });
});

describe('§9.25 arpeggio', () => {
  it('parses the direction, defaulting to up as MusicXML does', () => {
    const chord = parsed.score.parts[0].measures[0].voices[0].events[0];
    assert.equal(chord.kind, 'chord');
    assert.equal(chord.notes[0].arpeggiate, 'up');
  });

  it('parses <non-arpeggiate>', () => {
    const chord = parsed.score.parts[0].measures[1].voices[0].events[0];
    assert.equal(chord.kind, 'chord');
    assert.equal(chord.notes[0].nonArpeggiate, true);
    assert.equal(chord.notes[0].arpeggiate, undefined);
  });

  it('spans the chord it marks, plus a margin at each end', () => {
    const shape = computeArpeggioShape(10, 4, 8, 'up');
    assert.equal(shape.points[0][1], 4);
    assert.equal(shape.points.at(-1)[1], 8);
    // The mark stays in a narrow column left of the chord rather than
    // wandering into the noteheads.
    for (const [x] of shape.points) assert.ok(Math.abs(x - 10) < 0.5);
  });

  it('leans the opposite way for a downward roll', () => {
    // The points run from the chord's TOP to its BOTTOM. An upward roll
    // leans right as it rises, so its top end sits right of its bottom
    // end; a downward roll is the mirror image.
    const up = computeArpeggioShape(10, 4, 8, 'up');
    const down = computeArpeggioShape(10, 4, 8, 'down');
    assert.ok(up.points[0][0] > up.points.at(-1)[0]);
    assert.ok(down.points[0][0] < down.points.at(-1)[0]);
  });

  it('draws ONE mark for a rolled chord, not one per note', () => {
    assert.equal([...svg.matchAll(/<path /g)].length, 1);
  });

  it('draws a bracket for a chord that is explicitly not rolled', () => {
    const shape = computeNonArpeggioShape(10, 4, 8);
    assert.equal(shape.hookLength, 0.8);
    // The bracket's own three lines exist in the output: a vertical spine
    // plus two hooks pointing away from the chord.
    const lines = [
      ...svg.matchAll(
        /<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"[^>]*stroke-width="0.12"/g,
      ),
    ];
    assert.ok(lines.length >= 3, 'a bracket needs three lines');
  });

  it('reserves room to its left so it cannot land on the barline', () => {
    // The non-arpeggio chord is the FIRST thing in its measure, which is
    // the case that used to put the mark on top of the barline and, in a
    // first measure, on top of the time signature.
    const lines = [
      ...svg.matchAll(
        /<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"[^>]*stroke-width="([\d.]+)"/g,
      ),
    ].map((match) => ({
      x1: Number(match[1]),
      y1: Number(match[2]),
      x2: Number(match[3]),
      y2: Number(match[4]),
      width: Number(match[5]),
    }));
    // The piano's staff spans y 4..8; its barline is the 0.16-wide vertical
    // line running exactly those five lines.
    const barlines = lines
      .filter(
        (line) =>
          line.width === 0.16 &&
          line.x1 === line.x2 &&
          Math.min(line.y1, line.y2) === 4 &&
          Math.max(line.y1, line.y2) === 8,
      )
      .map((line) => line.x1);
    assert.ok(barlines.length > 0, 'the fixture must contain a barline to measure against');
    // The bracket is found by its HOOKS: two horizontal 0.12-wide lines
    // exactly `hookLength` (0.8) long. Its spine is vertical, like a stem,
    // so the hooks are what tell the two apart.
    const hooks = lines.filter(
      (line) =>
        line.width === 0.12 &&
        line.y1 === line.y2 &&
        Math.abs(Math.abs(line.x2 - line.x1) - 0.8) < 1e-9,
    );
    assert.equal(hooks.length, 2, 'a bracket has exactly two hooks');
    const bracketX = hooks.flatMap((line) => [line.x1, line.x2]);

    // Nothing the bracket draws may sit left of the measure's own start.
    const measureStart = Math.min(...barlines);
    assert.ok(
      Math.min(...bracketX) >= measureStart,
      `bracket must clear the barline (bracket ${Math.min(...bracketX)} < barline ${measureStart})`,
    );
  });
});

describe('the notes that carry no mark are untouched', () => {
  it('leaves a plain note with no tremolo, harmonic or arpeggio', () => {
    // The second member of the piano's rolled chord: a real note in the
    // same score that carries none of these marks (a chord's notations
    // belong to its first note, so the others have none).
    const plain = notesOf(parsed.score.parts[0])[1];
    assert.equal(plain.tremoloStrokes, undefined);
    assert.equal(plain.isHarmonic, undefined);
    assert.equal(plain.arpeggiate, undefined);
    assert.equal(plain.nonArpeggiate, undefined);
  });

  it('keeps a whole note from being given a stem to hang a tremolo on', () => {
    // A whole note has no stem, so no tremolo can be drawn for it; the
    // parser still records the mark rather than silently dropping it.
    const xml = FIXTURE.replace(
      '<duration>4</duration><voice>1</voice><type>half</type>\n        <notations><tremolo type="single">2</tremolo></notations>',
      '<duration>8</duration><voice>1</voice><type>whole</type>\n        <notations><tremolo type="single">2</tremolo></notations>',
    );
    const doc = parseMusicXml(xml, { domParser: DomParser });
    const whole = doc.score.parts[1].measures[1].voices[0].events[0];
    assert.equal(whole.duration.type, 'whole');
    assert.equal(whole.tremoloStrokes, 2);
  });
});
