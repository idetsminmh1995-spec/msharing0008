import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NE = loadEngine();
const domParser = testDomParser();

function realSvg() {
  const xml = fs.readFileSync(
    path.join(__dirname, '..', 'fixtures', 'musicxml', 'simple-single-voice.musicxml'),
    'utf8',
  );
  return NE.renderFromMusicXml(xml, { domParser }).svg;
}

describe('extractViewBox (Phase 47, §16.3)', () => {
  test('reads the real width/height out of a real rendered SVG', () => {
    const vb = NE.extractViewBox(realSvg());
    assert.equal(vb.width, 29.6);
    assert.equal(vb.height, 16);
  });

  test('returns undefined for a string with no viewBox, rather than throwing', () => {
    assert.equal(NE.extractViewBox('<svg></svg>'), undefined);
    assert.equal(NE.extractViewBox('not svg at all'), undefined);
  });
});

describe('computePxPerStaffSpace (Phase 47, §16.3)', () => {
  test('a target that is proportionally WIDER than the content is height-constrained', () => {
    const vb = { width: 20, height: 10 }; // 2:1 aspect ratio
    // Target 400x100 is 4:1 -- wider than content, so HEIGHT is the constraint.
    const scale = NE.computePxPerStaffSpace(vb, 400, 100);
    assert.equal(scale, 10); // 100/10
  });

  test('a target that is proportionally TALLER than the content is width-constrained', () => {
    const vb = { width: 20, height: 10 };
    // Target 100x100 is 1:1 -- taller than content, so WIDTH is the constraint.
    const scale = NE.computePxPerStaffSpace(vb, 100, 100);
    assert.equal(scale, 5); // 100/20
  });

  test('SAME SCORE AT THREE SIZES producing correct width/height vs viewBox ratios', () => {
    const vb = { width: 30, height: 16 };
    for (const [targetW, targetH] of [
      [600, 320],
      [1200, 640],
      [300, 160],
    ]) {
      const scale = NE.computePxPerStaffSpace(vb, targetW, targetH);
      const widthPx = vb.width * scale;
      const heightPx = vb.height * scale;
      // The resulting pixel box must have the SAME aspect ratio as the viewBox.
      assert.ok(Math.abs(widthPx / heightPx - vb.width / vb.height) < 1e-9);
    }
  });
});

describe('resizePureScale (Phase 47, §16.3 O(1) fast path)', () => {
  test('rewrites width/height to the correct new pixel values', () => {
    const svg = realSvg();
    const result = NE.resizePureScale(svg, 800, 400);
    const widthMatch = result.svg.match(/width="([\d.]+)"/);
    const heightMatch = result.svg.match(/height="([\d.]+)"/);
    assert.ok(Number(widthMatch[1]) > 0);
    assert.ok(Number(heightMatch[1]) > 0);
  });

  test('A PURE-SCALE RESIZE PRODUCES IDENTICAL INNER SVG (proving no re-layout happened)', () => {
    const svg = realSvg();
    const result = NE.resizePureScale(svg, 800, 400);
    const innerOriginal = svg.replace(/<svg[^>]*>/, '');
    const innerResized = result.svg.replace(/<svg[^>]*>/, '');
    assert.equal(innerResized, innerOriginal);
  });

  test('the viewBox itself is completely unchanged by a resize', () => {
    const svg = realSvg();
    const result = NE.resizePureScale(svg, 800, 400);
    const vbBefore = svg.match(/viewBox="[^"]*"/)[0];
    const vbAfter = result.svg.match(/viewBox="[^"]*"/)[0];
    assert.equal(vbAfter, vbBefore);
  });

  test('RESIZE AFTER RESIZE RETURNING TO THE ORIGINAL SIZE produces byte-identical output to the original (determinism, §4.4)', () => {
    const original = realSvg();
    const originalWidthMatch = original.match(/width="([\d.]+)"/);
    const originalHeightMatch = original.match(/height="([\d.]+)"/);
    const originalWidth = Number(originalWidthMatch[1]);
    const originalHeight = Number(originalHeightMatch[1]);

    const resizedBig = NE.resizePureScale(original, 2000, 1000);
    const resizedBack = NE.resizePureScale(resizedBig.svg, originalWidth, originalHeight);

    assert.equal(resizedBack.svg, original);
  });

  test('a string with no recognizable viewBox is returned unchanged, not thrown on', () => {
    const result = NE.resizePureScale('<svg>not a real document</svg>', 100, 100);
    assert.equal(result.svg, '<svg>not a real document</svg>');
    assert.equal(result.pxPerStaffSpace, 0);
  });

  test('PERFORMANCE: stays well under one animation frame (16ms) even for a large document -- §16.3\'s own explicit requirement', () => {
    // Simulate a large, many-measure score by repeating real content many
    // times inside one big SVG string.
    const chunk = realSvg().replace(/<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    const bigInner = chunk.repeat(200);
    const bigSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="592" height="320" viewBox="0 0 29.6 16">\n${bigInner}\n</svg>`;

    const start = performance.now();
    NE.resizePureScale(bigSvg, 2000, 1000);
    const elapsedMs = performance.now() - start;

    assert.ok(elapsedMs < 16, `expected under 16ms, took ${elapsedMs.toFixed(2)}ms`);
  });
});

describe('needsReflow (Phase 47, §16.3 re-flow decision)', () => {
  test('SCROLL MODE never needs re-flow, regardless of how much the width changes -- it has no width-dependent breaking at all', () => {
    assert.equal(NE.needsReflow('scroll', 30, 30), false);
    assert.equal(NE.needsReflow('scroll', 30, 5), false);
    assert.equal(NE.needsReflow('scroll', 30, 1000), false);
  });

  test('PAGE MODE needs re-flow when the usable width genuinely changes', () => {
    assert.equal(NE.needsReflow('page', 25, 25), false);
    assert.equal(NE.needsReflow('page', 25, 20), true);
    assert.equal(NE.needsReflow('page', 25, 30), true);
  });
});
