import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const NE = loadEngine();
const __dirname2 = path.dirname(fileURLToPath(import.meta.url));
const domParser2 = testDomParser();

describe('beam grouping (Phase 23)', () => {
  test('beamBeatTicks: simple meters use one denominator-note as the beat', () => {
    assert.equal(NE.beamBeatTicks(4, 4), 480); // quarter
    assert.equal(NE.beamBeatTicks(3, 4), 480);
    assert.equal(NE.beamBeatTicks(2, 2), 960); // half
    assert.equal(NE.beamBeatTicks(7, 8), 240); // eighth (irregular meter falls back to simple math)
  });

  test('beamBeatTicks: compound meters (6/8, 9/8, 12/8) use a dotted-quarter beat (3 eighths)', () => {
    assert.equal(NE.beamBeatTicks(6, 8), 720); // 3 x 240
    assert.equal(NE.beamBeatTicks(9, 8), 720);
    assert.equal(NE.beamBeatTicks(12, 8), 720);
  });

  test('3/8 is NOT treated as compound (numerator must be > 3)', () => {
    assert.equal(NE.beamBeatTicks(3, 8), 240); // plain eighth beat, not a dotted-quarter
  });

  test('8 eighth notes in 4/4 beam as a published edition does: two groups of four', () => {
    // The rule every edition follows and the one difference you see
    // first on a page: eighths in 4/4 are beamed by the HALF BAR, not by
    // the beat. Four beams of two is correct by the textbook and wrong
    // on paper.
    const events = Array.from({ length: 8 }, () => ({ durationType: 'eighth', isRest: false }));
    const starts = events.map((_, i) => i * 240);
    const groups = NE.groupBeams(events, starts, 4, 4);
    assert.equal(groups.length, 2);
    assert.deepEqual([...groups[0].eventIndices], [0, 1, 2, 3]);
    assert.deepEqual([...groups[1].eventIndices], [4, 5, 6, 7]);
  });

  test('2/4 pairs its two beats; 3/4 has an odd number of them and does not', () => {
    const eighths = (n) => Array.from({ length: n }, () => ({ durationType: 'eighth', isRest: false }));
    const starts = (n) => Array.from({ length: n }, (_, i) => i * 240);
    const twoFour = NE.groupBeams(eighths(4), starts(4), 2, 4);
    assert.equal(twoFour.length, 1, '2/4: one group of four');
    const threeFour = NE.groupBeams(eighths(6), starts(6), 3, 4);
    assert.equal(threeFour.length, 3, '3/4: 2+2+2, never 4+2');
    for (const g of threeFour) assert.equal(g.eventIndices.length, 2);
  });

  test('anything shorter than an eighth beams a beat at a time', () => {
    // A beat carrying sixteenths is beamed on its own, so the beat stays
    // visible -- that is what the reader is counting.
    const events = Array.from({ length: 8 }, () => ({ durationType: '16th', isRest: false }));
    const starts = events.map((_, i) => i * 120);
    const groups = NE.groupBeams(events, starts, 4, 4);
    assert.equal(groups.length, 2);
    for (const g of groups) assert.equal(g.eventIndices.length, 4);
  });

  test('the pairing is decided per beat pair, not once for the whole run', () => {
    // Four eighths then eight sixteenths, all in one unbroken run: the
    // eighths take the half bar, the sixteenths go a beat at a time.
    const events = [
      ...Array.from({ length: 4 }, () => ({ durationType: 'eighth', isRest: false })),
      ...Array.from({ length: 8 }, () => ({ durationType: '16th', isRest: false })),
    ];
    const starts = [0, 240, 480, 720, 960, 1080, 1200, 1320, 1440, 1560, 1680, 1800];
    const groups = NE.groupBeams(events, starts, 4, 4);
    assert.equal(groups.length, 3);
    assert.deepEqual([...groups].map((g) => g.eventIndices.length), [4, 4, 4]);
    assert.deepEqual([...groups[0].eventIndices], [0, 1, 2, 3]);
  });

  test('2/2 beats in half notes, so its eighths are four to a beam already', () => {
    const events = Array.from({ length: 8 }, () => ({ durationType: 'eighth', isRest: false }));
    const starts = events.map((_, i) => i * 240);
    const groups = NE.groupBeams(events, starts, 2, 2);
    assert.equal(groups.length, 2, 'a beam a beat, not one of eight');
    for (const g of groups) assert.equal(g.eventIndices.length, 4);
  });

  test('an override is the last word: the engine does not pair its beats back up', () => {
    const events = Array.from({ length: 8 }, () => ({ durationType: 'eighth', isRest: false }));
    const starts = events.map((_, i) => i * 240);
    const groups = NE.groupBeams(events, starts, 4, 4, 960); // 960 ticks = 4 eighth notes' worth
    assert.equal(groups.length, 2);
    assert.deepEqual([...groups[0].eventIndices], [0, 1, 2, 3]);
    assert.deepEqual([...groups[1].eventIndices], [4, 5, 6, 7]);
  });

  test('6/8 with 6 eighth notes groups into two groups of 3 (compound meter)', () => {
    const events = Array.from({ length: 6 }, () => ({ durationType: 'eighth', isRest: false }));
    const starts = events.map((_, i) => i * 240);
    const groups = NE.groupBeams(events, starts, 6, 8);
    assert.equal(groups.length, 2);
    assert.deepEqual([...groups[0].eventIndices], [0, 1, 2]);
    assert.deepEqual([...groups[1].eventIndices], [3, 4, 5]);
  });

  test('a rest in the middle of a beat breaks the group in two, never merging across it', () => {
    // Beat 1 (0-480 ticks): eighth, eighth-REST, eighth, eighth.
    const events = [
      { durationType: 'eighth', isRest: false },
      { durationType: 'eighth', isRest: true },
      { durationType: 'eighth', isRest: false },
      { durationType: 'eighth', isRest: false },
    ];
    const starts = [0, 240, 480, 720]; // note: 480+ is actually beat 2, illustrating the rest still splits beat 1's own run
    // Use a same-beat layout instead: all 4 within one 960-tick unit via override.
    const groups = NE.groupBeams(events, [0, 240, 480, 720], 4, 4, 960);
    // The rest at index 1 must break the run -- index 0 is alone (no group), indices 2-3 form one group.
    assert.equal(groups.length, 1);
    assert.deepEqual([...groups[0].eventIndices], [2, 3]);
  });

  test('a single beamable note surrounded by rests produces no group at all', () => {
    const events = [
      { durationType: 'eighth', isRest: true },
      { durationType: 'eighth', isRest: false },
      { durationType: 'eighth', isRest: true },
    ];
    const groups = NE.groupBeams(events, [0, 240, 480], 4, 4);
    assert.equal(groups.length, 0);
  });

  test('quarter notes and longer are never grouped, even with an override', () => {
    const events = Array.from({ length: 4 }, () => ({ durationType: 'quarter', isRest: false }));
    const starts = events.map((_, i) => i * 480);
    const groups = NE.groupBeams(events, starts, 4, 4, 1920);
    assert.equal(groups.length, 0);
  });

  test('beamedEventIndices collects every index across all groups', () => {
    const events = Array.from({ length: 8 }, () => ({ durationType: 'eighth', isRest: false }));
    const starts = events.map((_, i) => i * 240);
    const groups = NE.groupBeams(events, starts, 4, 4, 480);
    const indices = NE.beamedEventIndices(groups);
    assert.deepEqual([...indices].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7]);
  });
});

describe('explicit <beam> hints (§10.4/§10.8)', () => {
  const ev = (beamValue, isRest = false) => ({
    durationType: 'eighth',
    isRest,
    ...(beamValue !== undefined ? { beamValue } : {}),
  });

  test('hasExplicitBeams is false when nothing carries a hint, true when something does', () => {
    assert.equal(NE.hasExplicitBeams([ev(undefined), ev(undefined)]), false);
    assert.equal(NE.hasExplicitBeams([ev(undefined), ev('begin')]), true);
    // A rest's own hint (which real files never write) must not count as
    // the file "stating its beaming" -- rests are never beamed.
    assert.equal(NE.hasExplicitBeams([ev('begin', true)]), false);
  });

  test('begin/continue/end forms one group spanning exactly those events', () => {
    const groups = NE.groupBeamsFromHints([
      ev('begin'),
      ev('continue'),
      ev('continue'),
      ev('end'),
    ]);
    assert.equal(groups.length, 1);
    assert.deepEqual([...groups[0].eventIndices], [0, 1, 2, 3]);
  });

  test('two hinted runs separated by an unhinted note produce two groups, and the unhinted note is in neither', () => {
    const groups = NE.groupBeamsFromHints([
      ev('begin'),
      ev('end'),
      ev(undefined),
      ev('begin'),
      ev('end'),
    ]);
    assert.equal(groups.length, 2);
    assert.deepEqual([...groups[0].eventIndices], [0, 1]);
    assert.deepEqual([...groups[1].eventIndices], [3, 4]);
  });

  test('a rest breaks a hinted run exactly as it breaks an inferred one', () => {
    const groups = NE.groupBeamsFromHints([
      ev('begin'),
      ev('continue'),
      ev(undefined, true),
      ev('continue'),
      ev('end'),
    ]);
    assert.equal(groups.length, 2);
    assert.deepEqual([...groups[0].eventIndices], [0, 1]);
    assert.deepEqual([...groups[1].eventIndices], [3, 4]);
  });

  test('a lone hinted note is dropped -- it keeps its individual flag, matching groupBeams', () => {
    assert.deepEqual([...NE.groupBeamsFromHints([ev('begin'), ev(undefined)])], []);
  });

  test('malformed hints never throw: a continue/end with no open group simply opens one', () => {
    assert.doesNotThrow(() => NE.groupBeamsFromHints([ev('continue'), ev('end')]));
    const groups = NE.groupBeamsFromHints([ev('continue'), ev('end')]);
    assert.equal(groups.length, 1);
    assert.deepEqual([...groups[0].eventIndices], [0, 1]);
  });

  test('a back-to-back begin closes the previous group rather than swallowing it', () => {
    const groups = NE.groupBeamsFromHints([ev('begin'), ev('end'), ev('begin'), ev('end')]);
    assert.equal(groups.length, 2);
    assert.deepEqual([...groups[0].eventIndices], [0, 1]);
    assert.deepEqual([...groups[1].eventIndices], [2, 3]);
  });
});

describe('partial beams and hooks, end to end (Integration W)', () => {
  const NE2 = NE;
  const load = (n) =>
    fs.readFileSync(
      path.join(__dirname2, '..', 'fixtures', 'musicxml', n),
      'utf8',
    );

  /** Every beam line actually drawn, as [x1, x2, y1, y2], left to right. */
  const beamLines = (svg) =>
    [
      ...svg.matchAll(
        /<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)" stroke="[^"]*" stroke-width="0\.5" \/>/g,
      ),
    ].map((m) => ({ x1: Number(m[1]), y1: Number(m[2]), x2: Number(m[3]), y2: Number(m[4]) }));

  const render = () =>
    NE2.renderFromMusicXml(load('dotted-eighth-sixteenth.musicxml'), { domParser: domParser2 });

  test('renders with no diagnostics at all', () => {
    assert.deepEqual([...render().diagnostics], []);
  });

  test('a dotted eighth beamed to a sixteenth gets ONE full beam and one short hook', () => {
    const lines = beamLines(render().svg);
    // Three groups in the bar; the first is the dotted eighth + 16th.
    const first = lines.filter((l) => l.x1 < 11);
    assert.equal(first.length, 2, 'one primary beam and one hook');
    const [primary, hook] = first.sort((a, b) => b.x2 - b.x1 - (a.x2 - a.x1));
    assert.ok(
      primary.x2 - primary.x1 > hook.x2 - hook.x1,
      'the primary beam is the longer of the two',
    );
    // The hook is a stub of exactly BEAM_HOOK_LENGTH, ending on the
    // sixteenth's own stem (the group's right-hand end).
    assert.ok(Math.abs(hook.x2 - hook.x1 - NE2.BEAM_HOOK_LENGTH) < 1e-9);
    assert.ok(Math.abs(hook.x2 - primary.x2) < 1e-9, 'the hook ends on the last stem');
  });

  test('four sixteenths share two beams of the SAME full length', () => {
    const lines = beamLines(render().svg).filter((l) => l.x1 > 11 && l.x1 < 17);
    assert.equal(lines.length, 2);
    assert.equal(lines[0].x1, lines[1].x1);
    assert.equal(lines[0].x2, lines[1].x2);
  });

  test('two sixteenths inside a group of eighths share a real second line, not two hooks', () => {
    const lines = beamLines(render().svg).filter((l) => l.x1 > 17);
    assert.equal(lines.length, 2);
    const secondary = lines.reduce((a, b) => (b.x2 - b.x1 < a.x2 - a.x1 ? b : a));
    assert.ok(
      secondary.x2 - secondary.x1 > NE2.BEAM_HOOK_LENGTH,
      'two sixteenths in a row reach each other, so this is a line and not a stub',
    );
  });

  test("the dotted eighth does NOT get the sixteenth's beam -- the defect this closes", () => {
    // Before Integration W the line count was the MAX across the group,
    // so BOTH lines ran the group's full width and the dotted eighth
    // read as a sixteenth. The hook being shorter than the primary is
    // exactly that difference, asserted on the drawing itself.
    const first = beamLines(render().svg).filter((l) => l.x1 < 11);
    const widths = first.map((l) => l.x2 - l.x1).sort((a, b) => a - b);
    assert.equal(widths.length, 2);
    assert.ok(widths[0] < widths[1] / 2, 'the second line must be a stub, not a full beam');
  });
});
