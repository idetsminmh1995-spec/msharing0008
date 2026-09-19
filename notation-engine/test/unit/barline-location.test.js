import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const NE = loadEngine();
const domParser = testDomParser();
const render = (xml) => NE.renderFromMusicXml(xml, { domParser });

/** Every x= where the given glyph's own character is drawn, in document order. */
function glyphXs(svg, glyphName) {
  const char = NE.getGlyph(glyphName).char;
  const escaped = char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<text x="([\\d.]+)"[^>]*>${escaped}</text>`, 'g');
  return [...svg.matchAll(re)].map((m) => Number(m[1]));
}

// Three whole-note measures. Measure 2 states its repeat-begin barline via
// <barline location="left"> -- the way real files (this project's own
// Drum_Lesson_5.musicxml among them) commonly write the opening barline
// of a repeated section, on the section's FIRST measure, rather than as a
// location="right" (or unmarked, defaulting to "right") barline on the
// measure before it. Neither measure 1 nor measure 3 states a barline of
// its own, so both boundaries fall back to the ordinary default.
const XML = `<score-partwise version="3.1">
<part-list><score-part id="P1"/></part-list>
<part id="P1">
<measure number="1">
<attributes><divisions>1</divisions><key><fifths>0</fifths></key>
<time><beats>4</beats><beat-type>4</beat-type></time>
<clef><sign>G</sign><line>2</line></clef></attributes>
<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
</measure>
<measure number="2">
<barline location="left"><bar-style>heavy-light</bar-style><repeat direction="forward"/></barline>
<note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
</measure>
<measure number="3">
<note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>
</measure>
</part>
</score-partwise>`;

describe('barline location (Integration Q)', () => {
  test('a <barline location="left"> is captured in its OWN side-table fields, separate from the ending-barline ones', () => {
    const parsed = NE.parseMusicXml(XML, { domParser });
    assert.equal(parsed.attributes[1].leftBarlineStyle, 'heavy-light');
    assert.equal(parsed.attributes[1].leftRepeatDirection, 'forward');
    // Measure 2 declared nothing for its OWN (right-edge) barline.
    assert.equal(parsed.attributes[1].barlineStyle, undefined);
    assert.equal(parsed.attributes[1].repeatDirection, undefined);
  });

  test('the repeat-begin barline is drawn at the boundary BEFORE measure 2 (its left edge), not after it', () => {
    const { svg, diagnostics } = render(XML);
    assert.deepEqual([...diagnostics], []);

    const repeatDotXs = glyphXs(svg, 'repeatDot');
    // A repeat-begin draws a pair of dots (§9.5's own documented stroke
    // sequence: thick, thin, dots).
    assert.equal(repeatDotXs.length, 2);
    assert.equal(repeatDotXs[0], repeatDotXs[1]); // the pair shares one x

    const wholeNoteXs = glyphXs(svg, 'noteheadWhole');
    assert.equal(wholeNoteXs.length, 3); // C4, D4, E4
    const [measure1NoteX, measure2NoteX, measure3NoteX] = wholeNoteXs;

    // Before this fix, the dots landed at measure 2's OWN right edge --
    // between its note (D4) and measure 3's (E4) -- a whole measure late.
    const dotX = repeatDotXs[0];
    assert.ok(
      dotX > measure1NoteX && dotX < measure2NoteX,
      `expected the repeat dots (x=${dotX}) between measure 1's note (${measure1NoteX}) and measure 2's (${measure2NoteX}), not after it (measure 3's note is at ${measure3NoteX})`,
    );
  });

  test('a measure with no <barline> of its own, and no left-override from its successor, still gets the ordinary default (no repeat dots at all besides the one pair above)', () => {
    const { svg } = render(XML);
    const repeatDotXs = glyphXs(svg, 'repeatDot');
    // Only the ONE repeat-begin pair in the whole piece -- the boundary
    // after measure 2 (before measure 3) and the very end are both plain.
    assert.equal(repeatDotXs.length, 2);
  });
});
