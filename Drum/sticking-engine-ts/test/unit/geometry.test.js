import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine } from '../helpers/load-engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'parity', 'golden', 'kit-distances.json'), 'utf8'),
);

const SE = loadEngine();

/**
 * The port reproduces CPython's correctly-rounded `math.dist` rather
 * than using `Math.hypot` or a naive square root, because ONE ULP is
 * not survivable here: the distance is multiplied into a candidate
 * score, the scores are summed across a 14-event lookahead window, and
 * the beam search keeps the higher total. On a 16th-note run across one
 * surface the two starting hands score almost exactly equally, so a
 * 1e-17 difference decides which hand starts -- and every note after it
 * inherits the swap. The first parity run mirrored 32 of 32 events for
 * exactly that reason.
 *
 * So the reproduction is checked, not trusted: every distance this kit
 * geometry can produce, against CPython's own output.
 */
describe('distance agrees with CPython, exactly, over the whole kit', () => {
  test('every pair of kit targets and neutral positions', () => {
    let checked = 0;
    for (const pair of GOLDEN.pairs) {
      const got = SE.distance2d(pair.x1, pair.y1, pair.x2, pair.y2);
      assert.equal(
        got,
        pair.distance,
        `${pair.from} -> ${pair.to}: ${got} vs CPython's ${pair.distance}`,
      );
      checked++;
    }
    // 16 kit targets + 4 neutral positions, every ordered pair.
    assert.equal(checked, 20 * 20, `expected 400 pairs, checked ${checked}`);
  });

  test('neither of the two obvious shortcuts would have passed that', () => {
    // This is the test that explains the previous one. If someone later
    // "simplifies" distance2d to one of these, the test above goes red
    // and this one says why -- so nobody has to rediscover it from a
    // drum part that came out mirrored.
    const hypotMisses = GOLDEN.pairs.filter(
      (p) => Math.hypot(p.x1 - p.x2, p.y1 - p.y2) !== p.distance,
    ).length;
    const sqrtMisses = GOLDEN.pairs.filter((p) => {
      const dx = p.x1 - p.x2;
      const dy = p.y1 - p.y2;
      return Math.sqrt(dx * dx + dy * dy) !== p.distance;
    }).length;
    assert.ok(hypotMisses > 0, `Math.hypot disagrees on ${hypotMisses} of ${GOLDEN.pairs.length}`);
    assert.ok(sqrtMisses > 0, `naive sqrt disagrees on ${sqrtMisses} of ${GOLDEN.pairs.length}`);
  });

  test('the subnormal and zero paths do not throw', () => {
    // vector_norm has branches for a zero maximum and for subnormal
    // exponents. No drum kit reaches them, and a function that crashes
    // on an input it can never see is still a crash waiting for the
    // first caller who feeds it something else.
    assert.equal(SE.distance2d(0, 0, 0, 0), 0);
    assert.ok(Number.isFinite(SE.distance2d(0, 0, 5e-324, 0)));
    assert.equal(SE.distance2d(0, 0, 3, 4), 5);
  });
});
