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
const FIXTURE = 'musescore-piano-defaults.musicxml';
const xml = fs.readFileSync(path.join(FIXTURES, FIXTURE), 'utf8');

/**
 * MuseScore writes `default-x` and `default-y` on every note and rest it
 * exports, and a `width` on every measure. That is not a hint: it is
 * MuseScore reporting the layout it actually produced, which makes this
 * file the strongest evidence available anywhere in this suite about
 * whether this engine draws what MuseScore draws.
 *
 * `default-y` is in tenths, positive UP, and -- on a grand staff --
 * measured from the top line of the PART's first staff for both staves.
 * A tenth is a tenth of a staff space, by definition of the format.
 */
const render = () => NE.renderFromMusicXml(xml, { domParser });

/** The five line positions of each staff, read off the drawing. */
function staffLines(svg) {
  return [
    ...new Set(
      [...svg.matchAll(/<line x1="0" y1="([\d.]+)"[^>]*stroke-width="0\.11"/g)].map((m) =>
        Number(m[1]),
      ),
    ),
  ].sort((a, b) => a - b);
}

/** Every `<note>` element's own body, with its attributes. */
function noteBlocks() {
  return xml
    .split('<note')
    .slice(1)
    .map((block) => ({
      head: block.slice(0, block.indexOf('>')),
      body: block.slice(0, block.indexOf('</note>')),
    }));
}

describe("MuseScore parity: the owner's own export, against what MuseScore says it drew", () => {
  test('every notehead lands EXACTLY where MuseScore put it -- all 185 of them', () => {
    const { svg } = render();
    const topLine = staffLines(svg)[0];
    const expected = noteBlocks()
      .filter((n) => !n.body.includes('<rest') && /default-y="/.test(n.head))
      .map((n) => Number((topLine - Number(/default-y="(-?[\d.]+)"/.exec(n.head)[1]) / 10).toFixed(4)))
      .sort((a, b) => a - b);
    const drawn = [...svg.matchAll(/<text x="[\d.]+" y="([\d.-]+)"[^>]*>(.)</g)]
      .filter((m) => {
        const cp = m[2].codePointAt(0);
        return cp >= 0xe0a0 && cp <= 0xe0ff;
      })
      .map((m) => Number(m[1]))
      .sort((a, b) => a - b);
    assert.equal(expected.length, 185, 'the fixture really does hold 185 pitched notes');
    assert.deepEqual(drawn, expected);
  });

  test('every rest sits where MuseScore put it -- on the middle line, not a space off it', () => {
    // This is what found the real bug: a grand staff is ONE measure with
    // two voices in it, the right hand's and the left hand's, and they
    // share no staff at all. Counting the measure's voices rather than
    // the staff's made every rest here a "second voice" rest and pushed
    // it a staff space clear of a voice that was never there.
    const { svg } = render();
    const topLine = staffLines(svg)[0];
    const expected = noteBlocks()
      .filter((n) => n.body.includes('<rest') && /default-y="/.test(n.head))
      .map((n) => Number((topLine - Number(/default-y="(-?[\d.]+)"/.exec(n.head)[1]) / 10).toFixed(4)))
      .sort((a, b) => a - b);
    const RESTS = new Set([0xe4e3, 0xe4e4, 0xe4e5, 0xe4e6, 0xe4e7, 0xe4e8]);
    const drawn = [...svg.matchAll(/<text x="[\d.]+" y="([\d.-]+)"[^>]*>(.)</g)]
      .filter((m) => RESTS.has(m[2].codePointAt(0)))
      .map((m) => Number(m[1]))
      .sort((a, b) => a - b);
    assert.equal(expected.length, 12);
    assert.deepEqual(drawn, expected);
  });

  test("every stem goes the way the FILE says, beamed groups included", () => {
    // The same bug flipped stems too, and overrode the <stem> on every
    // note of the piece: voice 1 forced up, voice 5 forced down. Three
    // more were overridden by the beam group deciding its own direction
    // from its noteheads where the file had already stated one.
    const { svg } = render();
    const stems = [...svg.matchAll(
      /<line x1="([\d.]+)" y1="([\d.-]+)" x2="([\d.]+)" y2="([\d.-]+)" stroke="[^"]*" stroke-width="0\.1" \/>/g,
    )]
      .filter((m) => Math.abs(Number(m[1]) - Number(m[3])) < 1e-9)
      .map((m) => Number(m[4]) < Number(m[2]));
    const stated = noteBlocks()
      .filter((n) => !n.body.includes('<rest') && !n.body.includes('<chord/>'))
      .map((n) => /<stem>(up|down)<\/stem>/.exec(n.body))
      .filter((m) => m !== null)
      .map((m) => m[1] === 'up');
    assert.equal(stated.length, 167, 'the fixture states a stem on every one of its notes');
    assert.equal(stems.length, stated.length, 'one drawn stem per note (a chord shares its own)');
    assert.equal(
      stems.filter(Boolean).length,
      stated.filter(Boolean).length,
      'and the same number of them go up',
    );
  });

  test('the SHAPE of every measure matches MuseScore to a thousandth of a staff space', () => {
    // Not the absolute width: MuseScore justifies each system out to the
    // page margin and this engine's scroll mode has no margin to reach.
    // What has to match is the shape -- where each attack sits WITHIN
    // the measure, relative to the rest of them. That is the spacing
    // law, and it is what the eye reads.
    const { playback } = render();
    const errors = [];
    for (const block of xml.split(/<measure number="/).slice(1)) {
      const number = Number(block.slice(0, block.indexOf('"')));
      const museScoreXs = [
        ...new Set(
          [...block.matchAll(/<note default-x="([\d.]+)"/g)].map((m) => Number(m[1]) / 10),
        ),
      ].sort((a, b) => a - b);
      const layout = playback.measureLayoutsByNumber.get(number);
      if (layout === undefined || museScoreXs.length < 2) continue;
      const ours = [...layout.positionsByTick.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, x]) => x);
      assert.equal(ours.length, museScoreXs.length, `measure ${number}: same number of attacks`);
      const scale =
        (museScoreXs[museScoreXs.length - 1] - museScoreXs[0]) / (ours[ours.length - 1] - ours[0]);
      let worst = 0;
      for (let i = 0; i < ours.length; i++) {
        worst = Math.max(worst, Math.abs(museScoreXs[i] - museScoreXs[0] - (ours[i] - ours[0]) * scale));
      }
      errors.push({ number, worst });
    }
    assert.equal(errors.length, 12);
    // Eleven of the twelve are exact. Measure 8 -- three cautionary
    // accidentals and two chords in one bar -- is 0.45sp out, because
    // its minimum-distance floors bind and MuseScore evens the result
    // out again when it justifies the system. Scroll mode has no system
    // to justify, so that last bit of evening never happens here.
    const exact = errors.filter((e) => e.worst < 0.002);
    assert.equal(exact.length, 11, `11 measures exact, got ${exact.length}`);
    assert.ok(Math.max(...errors.map((e) => e.worst)) < 0.5);
  });

  test('the two staves of the grand staff sit exactly MuseScore\'s own distance apart', () => {
    // 6.5sp: MuseScore's `staffDistance`, and what this file's own
    // <staff-layout><staff-distance>65</staff-distance> states.
    const lines = staffLines(render().svg);
    assert.equal(lines.length, 10);
    assert.ok(Math.abs(lines[5] - lines[4] - 6.5) < 1e-9);
  });

  test('and the whole file still renders with no diagnostics at all', () => {
    assert.deepEqual([...render().diagnostics], []);
  });
});
