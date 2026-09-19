import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';
import { generateScore } from '../helpers/generate-score.js';

const NE = loadEngine();
const domParser = testDomParser();

/**
 * Phase 53/§18.1: the performance budgets, as executable assertions.
 *
 * **Best of N, not the mean.** A budget asks "can it do this", and the
 * minimum of several runs is the least noise-polluted answer to that on a
 * shared machine -- a mean is dragged around by whatever else the box was
 * doing, which is not a fact about this engine. Every case warms up first,
 * so JIT compilation is not being timed instead of the code.
 *
 * **These numbers are the SLOW path.** They run in Node against jsdom,
 * whose DOM is far slower than a browser's -- on a 100-measure score,
 * jsdom takes ~40ms just to build the tree that Chromium builds in ~4ms.
 * The engine ships to browsers, where the same measurements are roughly
 * 4x faster (Chromium, same machine, 100 measures: parse 35.8ms, layout +
 * SVG 11.1ms, total 46.9ms). So passing HERE is a stronger claim than the
 * budget asks for, and the margins below are real margins.
 */
function best(fn, runs = 7) {
  fn(); // warm-up: never time the first, JIT-compiling run
  let min = Infinity;
  for (let i = 0; i < runs; i++) {
    const started = performance.now();
    fn();
    min = Math.min(min, performance.now() - started);
  }
  return min;
}

const xml100 = generateScore(100);
const xml50 = generateScore(50);

describe('Phase 53: the §18.1 performance budgets', () => {
  test('parse a 100-measure MusicXML in under 200ms', () => {
    const ms = best(() => NE.parseMusicXml(xml100, { domParser }));
    assert.ok(ms < 200, `parse took ${ms.toFixed(1)}ms, budget 200ms`);
  });

  test('lay out and render 100 measures to an SVG string in under 400ms', () => {
    // §18.1 budgets layout (300ms) and SVG output (100ms) separately.
    // This renderer fuses them -- it builds the string as it lays out,
    // in one pass -- so the honest assertion is against their sum rather
    // than an invented split of one measurement into two.
    const parsed = NE.parseMusicXml(xml100, { domParser });
    const ms = best(() => NE.renderParsedMusicXml(parsed));
    assert.ok(ms < 400, `layout + render took ${ms.toFixed(1)}ms, budget 400ms`);
  });

  test('a pure-scale resize stays under 16ms -- one frame', () => {
    const { svg } = NE.renderFromMusicXml(xml100, { domParser });
    const ms = best(() => NE.resizePureScale(svg, 1200, 200), 50);
    assert.ok(ms < 16, `resize took ${ms.toFixed(2)}ms, budget 16ms`);
  });

  test('a re-flow resize of 50 measures stays under 100ms', () => {
    // §18.1's own strategy: "the Score and layout result are cached so
    // resize/re-theme never re-parse". Re-flowing from a cached parse is
    // what that sentence describes, and what a host should do.
    const parsed = NE.parseMusicXml(xml50, { domParser });
    const ms = best(() =>
      NE.renderParsedMusicXml(parsed, {
        config: { layout: { mode: 'page' }, page: { pageWidth: 40 } },
      }),
    );
    assert.ok(ms < 100, `re-flow took ${ms.toFixed(1)}ms, budget 100ms`);
  });

  test('a cursor position update stays under 1ms -- it runs every frame', () => {
    const { playback } = NE.renderFromMusicXml(xml50, { domParser });
    const ms = best(
      () => NE.computeCursorPlacement(playback, 4096, { mode: 'notationMoves', viewportWidth: 800 }),
      500,
    );
    assert.ok(ms < 1, `cursor update took ${ms.toFixed(3)}ms, budget 1ms`);
  });

  test('positionToX is a binary search, not a scan: 10x the measures is not 10x the cost', () => {
    // §18.1's stated strategy, made checkable. A linear scan over the
    // position table would make the 500-measure lookup ~10x the
    // 50-measure one; a binary search makes it barely move.
    const small = NE.renderFromMusicXml(generateScore(50), { domParser }).playback;
    const large = NE.renderFromMusicXml(generateScore(500), { domParser }).playback;
    const lastTick = (pb) => {
      const events = [...NE.getEventStream(pb)];
      return events[events.length - 1].tick;
    };
    // Resolved OUTSIDE the timed closure: building the event-stream copy
    // is itself O(n), and timing it here would measure the test instead
    // of the lookup.
    const smallTick = lastTick(small);
    const largeTick = lastTick(large);
    const smallMs = best(() => NE.positionToX(small, smallTick), 2000);
    const largeMs = best(() => NE.positionToX(large, largeTick), 2000);
    assert.ok(
      largeMs < smallMs * 4 + 0.01,
      `500 measures cost ${largeMs.toFixed(4)}ms vs 50 measures ${smallMs.toFixed(4)}ms -- that looks linear`,
    );
  });
});

describe('Phase 53: cost scales with the score, not with its square', () => {
  test('rendering 200 measures costs less than 3x rendering 100', () => {
    // Linear would be 2x. Quadratic would be 4x. 3x catches the latter
    // while leaving room for the constant factors and the noise a
    // shared machine adds.
    const parsed100 = NE.parseMusicXml(xml100, { domParser });
    const parsed200 = NE.parseMusicXml(generateScore(200), { domParser });
    const ms100 = best(() => NE.renderParsedMusicXml(parsed100), 5);
    const ms200 = best(() => NE.renderParsedMusicXml(parsed200), 5);
    assert.ok(
      ms200 < ms100 * 3,
      `100 measures: ${ms100.toFixed(1)}ms, 200 measures: ${ms200.toFixed(1)}ms`,
    );
  });

  test('parsing 200 measures costs less than 3x parsing 100', () => {
    const ms100 = best(() => NE.parseMusicXml(xml100, { domParser }), 5);
    const ms200 = best(() => NE.parseMusicXml(generateScore(200), { domParser }), 5);
    assert.ok(
      ms200 < ms100 * 3,
      `100 measures: ${ms100.toFixed(1)}ms, 200 measures: ${ms200.toFixed(1)}ms`,
    );
  });
});

describe('Phase 53: renderParsedMusicXml is the cached path §18.1 asks for', () => {
  test('it produces byte-identical output to the one-shot call', () => {
    const oneShot = NE.renderFromMusicXml(xml50, { domParser });
    const cached = NE.renderParsedMusicXml(NE.parseMusicXml(xml50, { domParser }));
    assert.equal(cached.svg, oneShot.svg);
    assert.deepEqual([...cached.diagnostics], [...oneShot.diagnostics]);
    assert.deepEqual(
      [...NE.getEventStream(cached.playback)].map((e) => e.tick),
      [...NE.getEventStream(oneShot.playback)].map((e) => e.tick),
    );
  });

  test('re-rendering from a cached parse is several times faster than re-parsing', () => {
    const parsed = NE.parseMusicXml(xml50, { domParser });
    const withParse = best(() => NE.renderFromMusicXml(xml50, { domParser }), 5);
    const cached = best(() => NE.renderParsedMusicXml(parsed), 5);
    assert.ok(
      cached * 2 < withParse,
      `cached ${cached.toFixed(1)}ms vs re-parsing ${withParse.toFixed(1)}ms -- the split bought nothing`,
    );
  });

  test('the same parse can be re-rendered with different configs, independently', () => {
    const parsed = NE.parseMusicXml(xml50, { domParser });
    const scroll = NE.renderParsedMusicXml(parsed, { config: { layout: { mode: 'scroll' } } });
    const page = NE.renderParsedMusicXml(parsed, { config: { layout: { mode: 'page' } } });
    const scrollAgain = NE.renderParsedMusicXml(parsed, { config: { layout: { mode: 'scroll' } } });
    assert.notEqual(page.svg, scroll.svg, 'the config really changed the output');
    assert.equal(scrollAgain.svg, scroll.svg, 'and rendering never mutated the cached parse');
  });
});
