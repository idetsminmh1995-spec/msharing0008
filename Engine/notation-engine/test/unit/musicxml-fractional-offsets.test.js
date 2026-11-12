import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const NE = loadEngine();
const domParser = testDomParser();

function score(body, divisions = '2') {
  return (
    '<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">' +
    `<measure number="1"><attributes><divisions>${divisions}</divisions></attributes>${body}</measure>` +
    '</part></score-partwise>'
  );
}

const note = (duration, voice = 1) =>
  `<note><pitch><step>C</step><octave>4</octave></pitch><duration>${duration}</duration><voice>${voice}</voice><type>quarter</type></note>`;
const parse = (xml) => NE.parseMusicXml(xml, { domParser });

function eventsFor(scoreResult, voiceId) {
  return [...scoreResult.parts[0].measures[0].voices.find((v) => v.id === voiceId).events];
}

describe('MusicXML decimal divisions and duration units', () => {
  test('fractional divisions preserve exact normalized note durations', () => {
    const result = parse(
      score(note('2') + '<forward><duration>1.25</duration></forward>' + note('0.5'), '2.5'),
    );
    assert.deepEqual(
      eventsFor(result.score, 1).map((event) => ({
        startTick: event.startTick,
        ticks: event.duration.ticks,
      })),
      [
        { startTick: 0, ticks: 384 },
        { startTick: 624, ticks: 96 },
      ],
    );
  });

  test('fractional backup duration moves a later voice by the exact division amount', () => {
    const result = parse(
      score(note('2', 1) + '<backup><duration>1.25</duration></backup>' + note('1.5', 2), '2.5'),
    );
    assert.equal(eventsFor(result.score, 1)[0].startTick, 0);
    assert.equal(eventsFor(result.score, 1)[0].duration.ticks, 384);
    assert.equal(eventsFor(result.score, 2)[0].startTick, 144);
    assert.equal(eventsFor(result.score, 2)[0].duration.ticks, 288);
  });
});

describe('MusicXML direction and harmony offsets', () => {
  test('direction offsets move visual marks but not playback tempo unless sound="yes"', () => {
    const xml = score(
      note('2') +
        '<direction><direction-type><dynamics><mf/></dynamics></direction-type>' +
        '<offset>1</offset></direction>' +
        '<direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>96</per-minute></metronome></direction-type>' +
        '<offset sound="no">1</offset></direction>' +
        note('2'),
    );
    const result = parse(xml);
    assert.equal(result.directions[0].tick, 720);
    assert.equal(result.tempoMarks[0].tick, 480);
    assert.equal(result.tempoMarks[0].visualTick, 720);
    assert.equal(eventsFor(result.score, 1)[1].startTick, 480);
  });

  test('sound="yes" applies the direction offset to playback tempo timing', () => {
    const result = parse(
      score(
        note('2') +
          '<direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>120</per-minute></metronome></direction-type>' +
          '<offset sound="yes">1</offset></direction>',
      ),
    );
    assert.equal(result.tempoMarks[0].tick, 720);
    assert.ok(!('visualTick' in result.tempoMarks[0]));
  });

  test('negative offsets are measure-local and harmony offsets do not advance the note cursor', () => {
    const result = parse(
      score(
        '<harmony><root><root-step>C</root-step></root><kind>major</kind><offset>1</offset></harmony>' +
          note('2') +
          '<direction><direction-type><words>rit.</words></direction-type><offset>-1</offset></direction>' +
          note('2'),
      ),
    );
    assert.equal(result.harmonies[0].tick, 240);
    assert.equal(result.directions[0].tick, 240);
    assert.deepEqual(
      eventsFor(result.score, 1).map((event) => event.startTick),
      [0, 480],
    );
  });

  test('fractional harmony alterations are preserved and unsupported stacked/numeral forms are diagnosed', () => {
    const result = parse(
      score(
        '<harmony><root><root-step>C</root-step><root-alter>0.5</root-alter></root><kind>major</kind></harmony>' +
          '<harmony><numeral><numeral-root>5</numeral-root></numeral><kind>major</kind>' +
          '<degree><degree-value>9</degree-value><degree-alter>0</degree-alter><degree-type>add</degree-type></degree></harmony>' +
          note('2'),
      ),
    );
    assert.equal(result.harmonies[0].rootAlter, 0.5);
    assert.ok(
      [...result.diagnostics].some(
        (diagnostic) => diagnostic.code === 'UNSUPPORTED_HARMONY_FEATURE',
      ),
    );
    assert.equal(eventsFor(result.score, 1)[0].startTick, 0);
  });

  test('an invalid offset is diagnosed and safely leaves the cursor and mark position unchanged', () => {
    const result = parse(
      score(
        note('2') +
          '<direction><direction-type><words>dolce</words></direction-type><offset>not-a-number</offset></direction>',
      ),
    );
    assert.equal(result.directions[0].tick, 480);
    assert.ok([...result.diagnostics].some((diagnostic) => diagnostic.code === 'INVALID_OFFSET'));
  });
});
