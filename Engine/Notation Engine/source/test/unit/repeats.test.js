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

function render(name, config) {
  const xml = fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
  return NE.renderFromMusicXml(xml, { domParser, ...(config ? { config } : {}) });
}

/** "1 2 3 1(2) 2(2) ..." -- the played order, with each repeat pass marked. */
function playedOrder(plan) {
  return [...plan.entries].map((e) => (e.pass > 1 ? `${e.measureNumber}(${e.pass})` : `${e.measureNumber}`));
}

/** A one-part score whose measures are described by short specs, so a repeat structure can be written in one line. */
function repeatScore(measures) {
  const body = measures
    .map((m, i) => {
      const attributes =
        i === 0
          ? '<attributes><divisions>1</divisions><key><fifths>0</fifths></key>' +
            '<time><beats>4</beats><beat-type>4</beat-type></time>' +
            '<clef><sign>percussion</sign><line>2</line></clef></attributes>'
          : '';
      const left = [];
      if (m.start) left.push('<repeat direction="forward"/>');
      if (m.endingStart) left.push(`<ending number="${m.endingStart}" type="start"/>`);
      const right = [];
      if (m.endingStop) right.push(`<ending number="${m.endingStop}" type="stop"/>`);
      if (m.end) right.push(`<repeat direction="backward"${m.times ? ` times="${m.times}"` : ''}/>`);
      return (
        `<measure number="${i + 1}">${attributes}` +
        (left.length > 0 ? `<barline location="left">${left.join('')}</barline>` : '') +
        '<note><unpitched><display-step>F</display-step><display-octave>4</display-octave></unpitched>' +
        '<duration>4</duration><voice>1</voice><type>whole</type></note>' +
        (right.length > 0 ? `<barline location="right">${right.join('')}</barline>` : '') +
        '</measure>'
      );
    })
    .join('');
  return (
    '<score-partwise version="4.0"><part-list><score-part id="P1"/></part-list>' +
    `<part id="P1">${body}</part></score-partwise>`
  );
}

function orderOf(measures) {
  const { playback } = NE.renderFromMusicXml(repeatScore(measures), { domParser });
  return playedOrder(playback.performance);
}

/**
 * A repeat is written IN THE FILE, so reading it is the engine's job.
 *
 * §17.2 used to say the opposite -- that a host wanting the marker to
 * jump back at a repeat must supply the tick it jumped to -- and the
 * visible result was a cursor that simply STOPPED at the repeat barline
 * on an ordinary drum chart, which is what the user reported.
 */
describe('repeats: the score unfolded into the order it is played (§17.2)', () => {
  test('a score with no repeats plays straight through, and says so', () => {
    const { playback } = render('simple-single-voice.musicxml');
    assert.equal(playback.performance.hasRepeats, false);
    assert.deepEqual(
      playedOrder(playback.performance),
      [...playback.measureNumbersInOrder].map(String),
      'performance order and written order are the same list',
    );
  });

  test('a plain repeat plays its section twice -- MusicXML s own default for a <repeat> with no times', () => {
    assert.deepEqual(orderOf([{ start: true }, { end: true }, {}]), ['1', '2', '1(2)', '2(2)', '3']);
  });

  test('times="4" plays it four times, not two', () => {
    assert.deepEqual(orderOf([{ start: true }, { end: true, times: 4 }]), [
      '1',
      '2',
      '1(2)',
      '2(2)',
      '1(3)',
      '2(3)',
      '1(4)',
      '2(4)',
    ]);
  });

  test('a repeat-end with no repeat-begin goes back to the top of the score', () => {
    assert.deepEqual(orderOf([{}, { end: true }]), ['1', '2', '1(2)', '2(2)']);
  });

  test('first and second endings: the volta for the wrong pass is skipped', () => {
    assert.deepEqual(
      orderOf([
        { start: true },
        { endingStart: '1', endingStop: '1', end: true },
        { endingStart: '2' },
      ]),
      ['1', '2', '1(2)', '3'],
    );
  });

  test('an ending serving several passes ("1, 2, 3") is played on each of them', () => {
    const order = orderOf([
      { start: true },
      { endingStart: '1, 2, 3', endingStop: '1, 2, 3', end: true, times: 4 },
      { endingStart: '4' },
    ]);
    assert.deepEqual(order, ['1', '2', '1(2)', '2(2)', '1(3)', '2(3)', '1(4)', '3']);
  });

  test('a repeat nested inside another plays fully on EVERY outer pass', () => {
    // Outer 1-4, inner 2-3. The classic bug is the inner repeat playing
    // only on the first outer pass, because its counter was never reset.
    assert.deepEqual(
      orderOf([{ start: true }, { start: true }, { end: true }, { end: true }]),
      ['1', '2', '3', '2(2)', '3(2)', '4', '1(2)', '2(3)', '3(3)', '2(4)', '3(4)', '4(2)'],
    );
  });

  test('a repeat structure that cannot terminate is reported, not hung on', () => {
    // Two backward repeats and no forward one: the second sends us to
    // the top, and the first sends us there again, forever.
    const xml = repeatScore([{ end: true, times: 99 }, { end: true, times: 99 }]);
    const { playback, diagnostics } = NE.renderFromMusicXml(xml, { domParser });
    assert.ok(
      [...playback.repeatDiagnostics].some((d) => d.code === 'REPEAT_RUNAWAY'),
      'the resolver gave up and said why',
    );
    assert.ok(
      [...diagnostics].some((d) => d.code === 'REPEAT_RUNAWAY'),
      'and the render surfaces it on its own one diagnostic channel',
    );
    assert.deepEqual(playedOrder(playback.performance), ['1', '2'], 'falling back to straight through');
  });

  test('the performance is longer than the written score, in both ticks and seconds', () => {
    const { playback } = NE.renderFromMusicXml(repeatScore([{ start: true }, { end: true }]), {
      domParser,
    });
    const writtenTicks = 2 * 1920;
    assert.equal(playback.performance.totalTicks, 2 * writtenTicks);
    // Two 4/4 bars at the default 120 BPM is 4 seconds; played twice, 8.
    assert.ok(Math.abs(playback.performance.totalSeconds - 8) < 1e-6);
  });
});

describe('repeats: turning a moment of audio into a place on the page', () => {
  const xml = repeatScore([{ start: true }, { end: true }, {}]);

  test('the same second of audio maps to a DIFFERENT bar on the second pass', () => {
    const { playback } = NE.renderFromMusicXml(xml, { domParser });
    const at = (seconds) =>
      NE.performanceSecondsToWritten(playback.performance, playback.tempoMap, seconds);
    // 2s per bar at 120 BPM: bars 1,2 then 1,2 again, then bar 3.
    assert.equal(at(0).measureNumber, 1);
    assert.equal(at(2.5).measureNumber, 2);
    assert.equal(at(4.5).measureNumber, 1, 'back to bar 1');
    assert.equal(at(4.5).pass, 2, 'on its second pass');
    assert.equal(at(8.5).measureNumber, 3);
  });

  test('and the marker therefore goes BACKWARDS on the page at the repeat barline', () => {
    const { playback } = NE.renderFromMusicXml(xml, { domParser });
    const xAt = (seconds) =>
      NE.playheadX(
        playback,
        NE.performanceSecondsToWritten(playback.performance, playback.tempoMap, seconds).writtenTick,
      ).x;
    assert.ok(xAt(3.9) > xAt(4.1), 'the marker jumped back to the repeat s start');
    assert.ok(
      Math.abs(xAt(4.1) - xAt(0.1)) < 1e-9,
      'to exactly where it was at the same point of the first pass',
    );
  });

  test('performanceTickToWritten and writtenTickToPerformanceTicks are inverses', () => {
    const { playback } = NE.renderFromMusicXml(xml, { domParser });
    const plan = playback.performance;
    // Bar 2 beat 1 is written tick 1920, and is played twice.
    const performanceTicks = [...NE.writtenTickToPerformanceTicks(plan, 1920)];
    assert.equal(performanceTicks.length, 2);
    for (const tick of performanceTicks) {
      assert.equal(NE.performanceTickToWritten(plan, tick).writtenTick, 1920);
    }
  });

  test('a tick past the end of the performance is safe', () => {
    const { playback } = NE.renderFromMusicXml(xml, { domParser });
    const point = NE.performanceTickToWritten(playback.performance, 999999);
    assert.ok(Number.isFinite(point.writtenTick));
  });
});

describe('repeats: what the reader sees (§9.18)', () => {
  test('a volta bracket is drawn per ending, labelled, with a hook at each real end', () => {
    const { svg } = render('repeat-voltas.musicxml');
    assert.ok(svg.includes('>1, 2, 3.<'), 'the first ending is labelled with all three passes');
    assert.ok(svg.includes('>4.<'), 'and the last ending with its own');
  });

  test('a "discontinue" ending has no closing hook, where a "stop" does', () => {
    const { svg } = render('repeat-voltas.musicxml');
    // Each bracket is a <g> of 2-3 <line>s: the horizontal one plus its
    // hooks. The first ending (stop) has two hooks, the last
    // (discontinue) only its opening one.
    const groups = [
      ...svg.matchAll(/<g>\s*((?:<line[^>]*\/>\s*){2,3})<text[^>]*>([^<]*)<\/text>\s*<\/g>/g),
    ];
    const byLabel = new Map(groups.map((m) => [m[2], (m[1].match(/<line/g) ?? []).length]));
    assert.equal(byLabel.get('1, 2, 3.'), 3, 'horizontal line + both hooks');
    assert.equal(byLabel.get('4.'), 2, 'horizontal line + opening hook only');
  });

  test('a repeat played more than twice says so on the page', () => {
    const { svg } = render('repeat-voltas.musicxml');
    assert.ok(svg.includes('×4'), 'the times count is drawn');
  });

  test('a plain 2x repeat draws NO count -- a repeat sign already says "twice"', () => {
    const xml = repeatScore([{ start: true }, { end: true }]);
    const { svg } = NE.renderFromMusicXml(xml, { domParser });
    assert.ok(!svg.includes('×'), 'nothing labelled');
  });

  test('a repeat-begin on the FIRST measure is actually drawn, dots and all', () => {
    // It was not. `openingBarlineWidth` reserved room for it from the
    // start, but only the PREVIOUS measure ever drew a boundary, and
    // measure 1 has no previous measure -- so a repeat from the top of
    // the chart, which is about as ordinary as a repeat gets, was blank
    // space where the sign should be.
    const { svg } = render('repeat-voltas.musicxml');
    const dot = NE.getGlyph('repeatDot').char;
    assert.equal(
      svg.split(dot).length - 1,
      4,
      'two dots opening the repeat, two closing it',
    );
  });

  test('and the clef is drawn clear of it, not on top of its dots', () => {
    // The dots of a repeat-begin on measure 1 used to land INSIDE the
    // percussion clef: the header reserved the barline's width and the
    // clef ignored it, starting at the measure's bare leading pad.
    const { svg, playback } = render('repeat-voltas.musicxml');
    const xOfGlyph = (name) => {
      const char = NE.getGlyph(name).char;
      const match = new RegExp(`<text x="([\\d.]+)"[^>]*>${char}</text>`).exec(svg);
      return match === null ? undefined : Number(match[1]);
    };
    const dotX = xOfGlyph('repeatDot');
    const clefX = xOfGlyph('unpitchedPercussionClef1');
    assert.ok(dotX !== undefined, 'the repeat dots are drawn');
    assert.ok(clefX !== undefined, 'the percussion clef is drawn');
    assert.ok(clefX > dotX, `the clef at ${clefX} must sit past the repeat dots at ${dotX}`);
    // And the first note still starts after the whole header.
    const layout = playback.measureLayoutsByNumber.get(1);
    assert.ok(layout.headerWidth > 6, 'the header covers barline + clef + time signature');
  });

  test('a score with no voltas is not pushed down to make room for one', () => {
    const plain = render('simple-single-voice.musicxml').svg;
    const heightOf = (svg) => Number(/viewBox="0 0 [\d.]+ ([\d.]+)"/.exec(svg)[1]);
    const withVoltas = render('repeat-voltas.musicxml').svg;
    assert.ok(
      heightOf(withVoltas) > heightOf(plain),
      'the volta score reserves the extra headroom its brackets need',
    );
  });
});
