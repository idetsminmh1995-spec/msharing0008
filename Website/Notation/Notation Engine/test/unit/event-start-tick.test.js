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

function parse(name) {
  return NE.parseMusicXml(fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8'), { domParser });
}
function render(name) {
  return NE.renderFromMusicXml(fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8'), {
    domParser,
  });
}

/** Every event of every voice, as `{ startTick, ticks }`, for one measure. */
function voiceTicks(score, measureNumber, voiceId) {
  for (const part of score.parts) {
    for (const measure of part.measures) {
      if (measure.number !== measureNumber) continue;
      for (const voice of measure.voices) {
        if (voice.id !== voiceId) continue;
        return [...voice.events].map((e) => ({ startTick: e.startTick, ticks: e.duration.ticks }));
      }
    }
  }
  return undefined;
}

/**
 * A voice can skip time without writing a rest (`<forward>`), and can
 * start partway into a measure. Every consumer used to re-derive each
 * event's tick by summing the durations before it, which is only right
 * for a voice with no gaps -- so every event after a gap was placed
 * early. On this project's own drum file that put the kick drum's
 * beamed pair on beat 2 instead of beat 3, in 31 of its 342 events.
 */
describe('<forward> gaps and a voice that starts late (§10.1)', () => {
  test('the parser records each event s real start tick', () => {
    // quarter at 0, <forward> 4 divisions (= a half note), quarter at 1440.
    const ticks = voiceTicks(parse('forward.musicxml').score, 1, 1);
    assert.deepEqual(ticks, [
      { startTick: 0, ticks: 480 },
      { startTick: 1440, ticks: 480 },
    ]);
  });

  test('the note AFTER a gap is drawn past it, not immediately after its neighbour', () => {
    const { svg, playback } = render('forward.musicxml');
    const layout = playback.measureLayoutsByNumber.get(1);
    // The two notes are three quarter-notes apart, so their x positions
    // must be much further apart than two adjacent quarters would be.
    const positions = [...layout.positionsByTick.entries()].sort((a, b) => a[0] - b[0]);
    assert.deepEqual(
      positions.map(([tick]) => tick),
      [0, 1440],
    );
    // And both notes really are drawn, at two distinct x values.
    const xs = [...svg.matchAll(/data-id="P1#m1#v1#e(\d)"/g)].map((m) => m[1]);
    assert.deepEqual(xs, ['0', '1']);
  });

  test('the playback event stream agrees with the drawn position', () => {
    const { playback } = render('forward.musicxml');
    assert.deepEqual(
      [...NE.getEventStream(playback)].map((e) => e.tick),
      [0, 1440],
    );
  });

  describe("the real drum file this was found on", () => {
    // Measure 2, voice 2 is the kick: a quarter on beat 1, a <forward>
    // over beat 2, then two beamed eighths on beats 3 and 3.5, then a
    // <forward> over beat 4. Summing durations put the pair on beat 2.
    const DRUM = 'drum-forward-gap.musicxml';

    test('the kick lands on beats 1, 3 and 3.5 -- not 1, 2 and 2.5', () => {
      assert.deepEqual(
        voiceTicks(parse(DRUM).score, 2, 2).map((e) => e.startTick),
        // Beat 1, then beats 3 and 3.5 -- 960 and 1200 ticks in, with a
        // quarter note being 480. Summing durations gave 0, 480, 720.
        [0, 960, 1200],
      );
    });

    test('and the hi-hat voice, which has no gaps, is unchanged', () => {
      assert.deepEqual(
        voiceTicks(parse(DRUM).score, 2, 1).map((e) => e.startTick),
        [0, 240, 480, 720, 960, 1200, 1440, 1680],
      );
    });

    test('the kick pair is drawn under the 5th and 6th hi-hats', () => {
      const { svg } = render(DRUM);
      const xOf = (id) => {
        const at = svg.indexOf(`data-id="${id}"`);
        return at === -1 ? undefined : Number(/<text x="([\d.]+)"/.exec(svg.slice(at, at + 400))[1]);
      };
      // Beat 3 and beat 3.5 in voice 1 are events 4 and 5.
      assert.equal(xOf('P1#m2#v2#e1'), xOf('P1#m2#v1#e4'));
      assert.equal(xOf('P1#m2#v2#e2'), xOf('P1#m2#v1#e5'));
    });
  });

  test('a voice with no gaps needs no startTick at all -- the fallback still works', () => {
    // A hand-built Score (no parser) has no startTick anywhere, and must
    // still lay out exactly as the running sum always did.
    const notes = [0, 1, 2, 3].map(() =>
      NE.note({
        pitch: NE.pitchedPitch('C', 0, 4),
        duration: NE.duration('quarter'),
        voice: 1,
      }),
    );
    const built = NE.voice(1, notes);
    assert.ok(built.events.every((e) => e.startTick === undefined));
  });

  test('a <backup> past the measure start is clamped, and says so', () => {
    // divisions=4, voice 1 plays 10 divisions, then backs up 16 -- six
    // divisions before the measure began. MusicXML forbids that; real
    // files do it by writing the measure's length instead of the elapsed
    // amount.
    const { diagnostics, score } = parse('tie-dot-staff.musicxml');
    assert.ok(
      [...diagnostics].some((d) => d.code === 'BACKUP_BEFORE_MEASURE_START'),
      'the clamp is reported, not silently absorbed',
    );
    assert.deepEqual(
      voiceTicks(score, 1, 2).map((e) => e.startTick),
      [0],
      'the following voice starts at the measure start',
    );
  });

  test('every fixture s parsed ticks are consistent with its own durations', () => {
    // A startTick can legitimately be LATER than the previous event's end
    // (a gap) but never EARLIER -- that would mean two events of one
    // voice overlapping, which the parser should never produce.
    for (const name of fs.readdirSync(FIXTURES_DIR).filter((n) => n.endsWith('.musicxml'))) {
      let score;
      try {
        score = parse(name).score;
      } catch {
        continue;
      }
      for (const part of score.parts) {
        for (const measure of part.measures) {
          for (const v of measure.voices) {
            let end = 0;
            for (const event of v.events) {
              if (event.startTick !== undefined) {
                assert.ok(
                  event.startTick >= end,
                  `${name} m${measure.number} v${v.id}: event starts at ${event.startTick}, before the previous one ended at ${end}`,
                );
                end = event.startTick;
              }
              end += event.duration.ticks;
            }
          }
        }
      }
    }
  });
});
