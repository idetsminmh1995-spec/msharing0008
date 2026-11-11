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
const DOT = '';

describe('augmentation dot placement (Integration W)', () => {
  test('a note IN a space keeps its own height; a note ON a line moves up into the space above', () => {
    // Positions run in half-spaces with whole numbers on the lines.
    assert.equal(NE.dotPosition(-2), -2.5, 'on the middle line -> the space above it');
    assert.equal(NE.dotPosition(-2.5), -2.5, 'already in a space -> unchanged');
    assert.equal(NE.dotPosition(0), -0.5, 'on the bottom line -> the space above it');
  });

  test('a dot never lands on a staff line', () => {
    for (let p = -6; p <= 6; p += 0.5) {
      assert.ok(!Number.isInteger(NE.dotPosition(p)), `position ${p} put its dot on a line`);
    }
  });

  test('the first dot clears the notehead, and further dots are evenly spaced after it', () => {
    const placed = [...NE.dotPlacements(3, 10, -1.5)];
    assert.equal(placed.length, 3);
    assert.equal(placed[0].x, 10 + NE.DOT_NOTE_DISTANCE);
    assert.ok(Math.abs(placed[1].x - placed[0].x - NE.DOT_DOT_DISTANCE) < 1e-9);
    assert.ok(Math.abs(placed[2].x - placed[1].x - NE.DOT_DOT_DISTANCE) < 1e-9);
    for (const p of placed) assert.equal(p.position, -1.5);
  });

  test("a rest's dot sits closer in, since there is no notehead to clear", () => {
    const note = [...NE.dotPlacements(1, 10, -1.5, 'note')][0];
    const rest = [...NE.dotPlacements(1, 10, -1.5, 'rest')][0];
    assert.ok(rest.x < note.x);
    assert.equal(rest.x, 10 + NE.DOT_REST_DISTANCE);
  });

  test('an undotted note asks for no dots at all', () => {
    assert.deepEqual([...NE.dotPlacements(0, 10, -1.5)], []);
  });

  test("a chord's dots share one column, measured from its widest notehead", () => {
    const placed = [...NE.chordDotPlacements(1, 10, [-1.5, -3.5])];
    assert.equal(placed.length, 2);
    assert.equal(placed[0].x, placed[1].x);
  });

  test('two chord notes a SECOND apart get their dots separated instead of stacked', () => {
    // A line note and the space above it would both want the same space.
    const rows = [...NE.chordDotPlacements(1, 10, [-2, -2.5])].map((p) => p.position);
    assert.equal(new Set(rows).size, 2, 'two dots, two different heights');
    assert.ok(!rows.some((r) => Number.isInteger(r)), 'and neither of them on a line');
  });
});

describe('augmentation dots end to end (Integration W)', () => {
  test("a dotted note is DRAWN dotted -- the defect this closes, where `duration.dots` reached the tick maths and never the page", () => {
    const { svg } = NE.renderFromMusicXml(load('dotted-eighth-sixteenth.musicxml'), { domParser });
    const dots = [...svg.matchAll(new RegExp(`<text x="([\\d.]+)" y="([\\d.-]+)"[^>]*>${DOT}<`, 'g'))];
    assert.equal(dots.length, 1, 'the bar has exactly one dotted note');
    const dotX = Number(dots[0][1]);
    const dotY = Number(dots[0][2]);
    // It belongs to the first note, and sits to its RIGHT.
    const firstNoteX = Number(svg.match(/<text x="([\d.]+)" y="[\d.-]+"[^>]*></)[1]);
    assert.ok(dotX > firstNoteX);
    // C4 in treble sits on its ledger line below the staff, so its dot
    // moves up half a space -- which means a half-space offset from the
    // staff's own whole-number lines.
    const staffLines = [...svg.matchAll(/<line x1="0" y1="([\d.]+)"[^>]*stroke-width="0.13"/g)].map(
      (m) => Number(m[1]),
    );
    assert.ok(staffLines.length >= 5);
    assert.ok(
      staffLines.every((y) => Math.abs(y - dotY) > 0.25),
      'the dot must not be drawn on a staff line',
    );
  });

  test('a dotted REST is drawn dotted too', () => {
    const { svg } = NE.renderFromMusicXml(load('mixed-duration-beam.musicxml'), { domParser });
    assert.equal((svg.match(new RegExp(DOT, 'g')) ?? []).length, 1);
  });

  test('a score with nothing dotted draws no dots at all', () => {
    const { svg } = NE.renderFromMusicXml(load('simple-single-voice.musicxml'), { domParser });
    assert.doesNotMatch(svg, new RegExp(DOT));
  });
});

describe('a courtesy accidental on a CHORD member (Integration W)', () => {
  // The single-note path passed `hasExplicitAccidental` to the state
  // machine and the chord path forgot to, so a cautionary accidental
  // written on a chord member was dropped -- and a chord is where real
  // files put most of them.
  const xml = (accidental) =>
    '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1"><measure number="1">' +
    '<attributes><divisions>4</divisions><key><fifths>5</fifths></key>' +
    '<time><beats>1</beats><beat-type>4</beat-type></time>' +
    '<clef><sign>G</sign><line>2</line></clef></attributes>' +
    '<note><pitch><step>G</step><alter>1</alter><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>' +
    '<note><chord/><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type>' +
    accidental +
    '</note>' +
    '</measure></part></score-partwise>';

  test('is drawn when the file writes one, even though the key signature already implies it', () => {
    const { svg } = NE.renderFromMusicXml(
      xml('<accidental cautionary="yes">natural</accidental>'),
      { domParser },
    );
    assert.match(svg, //, 'the cautionary natural must be drawn');
  });

  test('and is NOT drawn when the file writes none', () => {
    const { svg } = NE.renderFromMusicXml(xml(''), { domParser });
    assert.doesNotMatch(svg, //);
  });
});
