import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine } from '../helpers/load-engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'parity', 'golden', 'deterministic-core.json'), 'utf8'),
);

const SE = loadEngine();

/**
 * Rule 12 draws every event's performed time and velocity from Python's
 * own RNG, and Rule 26 promises the same seed reproduces the same
 * performance. So the generator is part of the contract, not an
 * implementation detail a port may swap -- and this is the test that
 * says so.
 *
 * Every expected value here was produced by a real Python interpreter
 * (`scripts/generate_golden.py`), never by reading the port's output
 * back at itself.
 */
describe('CPython random.Random, reproduced exactly', () => {
  test('sha256 matches hashlib, including the multi-block and unicode cases', () => {
    for (const [input, expected] of Object.entries(GOLDEN.sha256)) {
      assert.equal(SE.sha256Hex(input), expected, `sha256(${JSON.stringify(input)})`);
    }
  });

  test('the padding boundary cases are covered, not assumed', () => {
    // 55/56 bytes straddle the one-block boundary (a length field needs 8
    // bytes and a block is 64), and 63/64/65 straddle the second. These
    // are where a hand-written SHA-256 is wrong if it is wrong at all.
    for (const n of [55, 56, 63, 64, 65]) {
      assert.ok('x'.repeat(n) in GOLDEN.sha256, `the golden file covers ${n} bytes`);
    }
  });

  test('random() reproduces Python s stream, bit for bit', () => {
    for (const [seed, streams] of Object.entries(GOLDEN.streams)) {
      const rng = new SE.PythonRandom(BigInt(seed));
      const got = [...streams.random].map(() => rng.random());
      assert.deepEqual(got, [...streams.random], `random() for seed ${seed}`);
    }
  });

  test('uniform() does too -- drawn AFTER six random() calls, so the state has to line up as well as the seeding', () => {
    for (const [seed, streams] of Object.entries(GOLDEN.streams)) {
      const rng = new SE.PythonRandom(BigInt(seed));
      for (let i = 0; i < streams.random.length; i++) rng.random();
      const got = [...streams.uniform].map(() => rng.uniform(-1.2, 1.2));
      assert.deepEqual(got, [...streams.uniform], `uniform() for seed ${seed}`);
    }
  });

  test('getrandbits(8) too', () => {
    for (const [seed, streams] of Object.entries(GOLDEN.streams)) {
      const rng = new SE.PythonRandom(BigInt(seed));
      for (let i = 0; i < streams.random.length; i++) rng.random();
      for (let i = 0; i < streams.uniform.length; i++) rng.uniform(-1.2, 1.2);
      const got = [...streams.getrandbits8].map(() => rng.getRandBits(8));
      assert.deepEqual(got, [...streams.getrandbits8], `getrandbits(8) for seed ${seed}`);
    }
  });

  test('a 64-bit seed is not truncated -- which is the whole reason the seed is a bigint', () => {
    // The engine's real seeds are the top 64 bits of a SHA-256 digest.
    // Passing one through a JS number would lose the low bits silently,
    // and every draw after it would be wrong but plausible.
    const big = 'ffffffffffffffff';
    assert.ok(String(BigInt('0x' + big)) in GOLDEN.streams, 'the golden file has this seed');
    const rng = new SE.PythonRandom(BigInt('0x' + big));
    assert.equal(rng.random(), GOLDEN.streams[String(BigInt('0x' + big))].random[0]);
  });
});
