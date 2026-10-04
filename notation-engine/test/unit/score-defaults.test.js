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
const FIXTURE = 'musescore-piano-defaults.musicxml';

describe("<defaults>: the engraving the FILE says it used (Integration W)", () => {
  const parsed = () => NE.parseMusicXml(load(FIXTURE), { domParser });

  test('tenths convert to staff spaces by the format\'s own fixed ratio, ten to one', () => {
    assert.equal(NE.TENTHS_PER_STAFF_SPACE, 10);
    assert.equal(NE.tenthsToStaffSpaces(65), 6.5);
    assert.ok(Math.abs(NE.tenthsToStaffSpaces(1.1) - 0.11) < 1e-9);
  });

  test('<scaling> ties tenths to the page: 40 tenths = 7mm is a 1.75mm staff space', () => {
    const { scaling } = parsed().defaults;
    assert.equal(scaling.millimetres, 7);
    assert.equal(scaling.tenths, 40);
    assert.equal(scaling.staffSpaceMm, 1.75);
  });

  test('every <line-width> the engine can use is read, in staff spaces', () => {
    const { lineWidths } = parsed().defaults;
    assert.ok(Math.abs(lineWidths.staff - 0.11) < 1e-9);
    assert.ok(Math.abs(lineWidths.stem - 0.1) < 1e-9);
    assert.ok(Math.abs(lineWidths.beam - 0.5) < 1e-9);
    assert.ok(Math.abs(lineWidths.leger - 0.16) < 1e-9);
    assert.ok(Math.abs(lineWidths.lightBarline - 0.18) < 1e-9);
    assert.ok(Math.abs(lineWidths.heavyBarline - 0.55) < 1e-9);
  });

  test('<note-size> is read as a MULTIPLIER, not as the percentage the file writes', () => {
    assert.equal(parsed().defaults.noteSizes.cue, 0.7);
    assert.equal(parsed().defaults.noteSizes['grace-cue'], 0.49);
  });

  test('the fonts the file names are kept, even though this engine draws in its own', () => {
    const { musicFont, wordFont } = parsed().defaults;
    assert.equal(musicFont.family, 'Leland');
    assert.equal(wordFont.family, 'Edwin');
    assert.equal(wordFont.size, 10);
  });

  test("a file with no <defaults> at all leaves it undefined rather than inventing one", () => {
    const plain = NE.parseMusicXml(load('simple-single-voice.musicxml'), { domParser });
    assert.equal(plain.defaults, undefined);
  });

  test("the file's own staff line width WINS over the music font's -- the Sec10.8 rule the beam hints already follow", () => {
    // Bravura's own staffLineThickness is 0.13; this file says 0.11.
    const { svg } = NE.renderFromMusicXml(load(FIXTURE), { domParser });
    assert.match(svg, /stroke-width="0\.11"/);
    assert.doesNotMatch(svg, /stroke-width="0\.13"/);
    // And a file that states nothing still gets the font's own number.
    const plain = NE.renderFromMusicXml(load('simple-single-voice.musicxml'), { domParser });
    assert.match(plain.svg, /stroke-width="0\.13"/);
  });
});

describe("<work>, <identification> and <credit>: what the score calls itself (Integration W)", () => {
  const parsed = () => NE.parseMusicXml(load(FIXTURE), { domParser });

  test('the work title and the composer are kept, not dropped', () => {
    const { identity } = parsed();
    assert.equal(identity.workTitle, 'Untitled score');
    assert.equal(identity.creators.composer, 'Composer / arranger');
    assert.deepEqual([...identity.software], ['MuseScore Studio 4.7.4']);
  });

  test("every <credit> is kept with its type and its stated place on the page", () => {
    const credits = [...parsed().credits];
    assert.equal(credits.length, 3);
    const title = credits.find((c) => c.types.includes('title'));
    assert.equal(title.words, 'Untitled score');
    assert.equal(title.justify, 'center');
    assert.equal(title.fontSize, 22);
    // default-x/default-y are tenths in the file and staff spaces here.
    assert.ok(Math.abs(title.x - 61.686) < 1e-6);
  });

  test('a file with no <work> or <credit> parses to empty rather than missing fields', () => {
    const plain = NE.parseMusicXml(load('simple-single-voice.musicxml'), { domParser });
    assert.equal(plain.identity.workTitle, undefined);
    assert.deepEqual({ ...plain.identity.creators }, {});
    assert.deepEqual([...plain.credits], []);
  });
});

describe('<print> layout hints (Integration W)', () => {
  test("a <staff-layout>'s staff distance is read, and no longer reported as ignored", () => {
    const { prints, diagnostics } = NE.parseMusicXml(load(FIXTURE), { domParser });
    const first = prints.find((p) => p.measureNumber === 1);
    assert.equal(first.layout.staffDistances[2], 6.5);
    assert.equal(first.layout.topSystemDistance, 17);
    assert.ok(
      ![...diagnostics].some((d) => /Ignored <print> layout hints/.test(d.message)),
      'the layout hints are read now, so nothing should report them as dropped',
    );
  });

  test('a <print> that only carries layout is recorded too, not only one asking for a break', () => {
    const { prints } = NE.parseMusicXml(load(FIXTURE), { domParser });
    const first = prints.find((p) => p.measureNumber === 1);
    assert.equal(first.newSystem, false);
    assert.equal(first.newPage, false);
    assert.notEqual(first.layout, undefined);
  });

  test('a system break is still reported as one', () => {
    const { prints } = NE.parseMusicXml(load(FIXTURE), { domParser });
    assert.deepEqual(
      [...prints].filter((p) => p.newSystem).map((p) => p.measureNumber),
      [5, 9],
    );
  });

  test('the whole file renders with no diagnostics at all now', () => {
    const { diagnostics } = NE.renderFromMusicXml(load(FIXTURE), { domParser });
    assert.deepEqual([...diagnostics], []);
  });
});
