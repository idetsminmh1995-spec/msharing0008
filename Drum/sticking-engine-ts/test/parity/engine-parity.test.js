import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine } from '../helpers/load-engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = path.join(__dirname, 'golden');
const NAMES = JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, 'index.json'), 'utf8'));

const SE = loadEngine();

/**
 * How close is close enough.
 *
 * Not zero: every arithmetic step here is IEEE754 double in both
 * languages, but `math.hypot` and `Math.hypot` are allowed to disagree
 * in the last bit, and the engine multiplies distances into scores. The
 * important claim is not "identical to the last bit" -- it is that the
 * two implementations make the SAME DECISIONS and land on the same
 * times to well inside a microsecond, which 1e-9 is.
 *
 * The decision fields (limb, instrument, stroke_type, velocity) are
 * compared EXACTLY. Those are the engine's actual output; a tolerance
 * on them would be a tolerance on being wrong.
 */
const EPSILON = 1e-9;

function loadGolden(name) {
  return JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, `${name}.json`), 'utf8'));
}

/**
 * Runs the PORT over a golden file's own recorded input.
 *
 * The JSON round-trip is not cosmetic. The bundle runs in a `vm`
 * sandbox, so everything it returns belongs to a DIFFERENT REALM and
 * `assert.deepEqual` reports "same structure but not reference-equal"
 * for arrays that are plainly identical. Round-tripping brings the
 * result into this realm -- and makes both sides of every comparison
 * plain JSON, which is what the golden file is.
 */
function runPort(input) {
  SE.resetIdCounter();
  const engine = new SE.Engine({
    style: SE.drummerStyle(),
    intent: SE.performanceIntent(),
    genre: input.genre,
    seed: input.seed,
    mode: input.mode,
  });
  return JSON.parse(JSON.stringify(SE.toPlainObject(engine.run({ noteList: input.notes }))));
}

/**
 * The port is judged against the Python, not against itself.
 *
 * Every expected value in `test/parity/golden/` is the REFERENCE
 * engine's own output, written by `scripts/generate_golden.py` running
 * `Drum/sticking-engine`. If these tests pass, the two implementations
 * agree; if they ever stop passing, the Python is right and the port is
 * wrong, in that order.
 */
describe('parity with the Python reference engine', () => {
  for (const name of NAMES) {
    describe(name, () => {
      const golden = loadGolden(name);
      const expected = golden.output;

      test('the same number of events survive Rule 2 s playability filter', () => {
        const got = runPort(golden.input);
        assert.equal(got.events.length, expected.events.length);
      });

      test('every event gets the same LIMB -- which is the whole point of the engine', () => {
        const got = runPort(golden.input);
        assert.deepEqual(
          got.events.map((e) => `${e.event_id}:${e.limb}`),
          expected.events.map((e) => `${e.event_id}:${e.limb}`),
        );
      });

      test('the same instrument, stroke type and velocity, exactly', () => {
        const got = runPort(golden.input);
        for (let i = 0; i < expected.events.length; i++) {
          const a = got.events[i];
          const b = expected.events[i];
          assert.equal(a.instrument, b.instrument, `${b.event_id} instrument`);
          assert.equal(a.stroke_type, b.stroke_type, `${b.event_id} stroke`);
          assert.equal(a.velocity, b.velocity, `${b.event_id} velocity`);
          assert.equal(a.source_id, b.source_id, `${b.event_id} source_id`);
        }
      });

      test('the same performed times and microtiming, to within a nanosecond', () => {
        const got = runPort(golden.input);
        for (let i = 0; i < expected.events.length; i++) {
          const a = got.events[i];
          const b = expected.events[i];
          assert.ok(
            Math.abs(a.time_seconds - b.time_seconds) < EPSILON,
            `${b.event_id} time: ${a.time_seconds} vs ${b.time_seconds}`,
          );
          assert.ok(
            Math.abs(a.microtiming_offset_ms - b.microtiming_offset_ms) < EPSILON,
            `${b.event_id} microtiming: ${a.microtiming_offset_ms} vs ${b.microtiming_offset_ms}`,
          );
          assert.ok(
            Math.abs(a.dynamic_level - b.dynamic_level) < EPSILON,
            `${b.event_id} dynamic_level`,
          );
        }
      });

      test('the same validation verdict and the same issues', () => {
        const got = runPort(golden.input);
        assert.equal(got.approved, expected.approved);
        assert.deepEqual(
          got.issues.map((i) => `${i.severity}:${i.code}:${i.event_id}`),
          expected.issues.map((i) => `${i.severity}:${i.code}:${i.event_id ?? null}`),
        );
      });

      test('the same duration', () => {
        const got = runPort(golden.input);
        assert.ok(
          Math.abs(got.duration_s - expected.duration_s) < EPSILON,
          `${got.duration_s} vs ${expected.duration_s}`,
        );
      });
    });
  }

  test('the fixtures cover more than one happy path', () => {
    // A parity suite that only ever runs one beat proves the port works
    // on one beat. These are the cases the rules themselves single out:
    // a rate no single hand can hold, a crossing the profile resists,
    // simultaneous events (including three, which two hands cannot
    // play), unmapped notes, the velocity thresholds, and nothing at all.
    const names = NAMES.join(' ');
    for (const kind of ['sixteenth-run', 'crossing-run', 'simultaneous', 'edges', 'empty']) {
      assert.ok(names.includes(kind), `the golden set covers ${kind}`);
    }
    for (const genre of ['rock', 'jazz', 'metal', 'funk', 'latin', 'generic']) {
      assert.ok(names.includes(genre), `the golden set covers the ${genre} idiom`);
    }
    assert.ok(names.includes('FAST') && names.includes('HIGH'), 'both Rule 40 search modes');
  });
});
