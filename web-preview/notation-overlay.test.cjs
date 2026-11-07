"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  computeSystemViewport,
  parseSvgMetrics,
  withEmbeddedBravura,
} = require("./notation-overlay.js");

const PAGE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="6300" viewBox="0 0 128 630"><g/></svg>';

test("reads the engine SVG pixel size and staff-space coordinate scale", () => {
  assert.deepEqual(parseSvgMetrics(PAGE_SVG), {
    widthPx: 1280,
    heightPx: 6300,
    viewBoxX: 0,
    viewBoxY: 0,
    viewBoxWidth: 128,
    viewBoxHeight: 630,
    pixelsPerViewBoxX: 10,
    pixelsPerViewBoxY: 10,
  });
});

test("crops the exact active page system and fits the 16:9 notation strip without stretching", () => {
  const metrics = parseSvgMetrics(PAGE_SVG);
  const crop = computeSystemViewport(metrics, 1280, 720, 3);
  assert.equal(crop.sourceX, 0);
  assert.equal(crop.sourceY, 30);
  assert.equal(crop.sourceWidth, 1280);
  assert.equal(crop.sourceHeight, 208);
  assert.equal(crop.bandY, 144);
  assert.equal(crop.bandHeight, 201.60000000000002);
  assert.equal(crop.destinationY, 144);
  assert.equal(crop.destinationHeight, crop.bandHeight);
  assert.ok(Math.abs(crop.destinationWidth - 1240.6153846153845) < 1e-9);
  assert.ok(Math.abs(crop.destinationX - 19.692307692307736) < 1e-9);
});

test("keeps the same Bravura staff size on portrait canvases when the strip has spare height", () => {
  const crop = computeSystemViewport(parseSvgMetrics(PAGE_SVG), 720, 1280, 45);
  assert.equal(crop.sourceY, 450);
  assert.equal(crop.sourceHeight, 208);
  assert.equal(crop.destinationHeight, 208);
  assert.equal(crop.destinationWidth, 720);
  assert.equal(crop.destinationX, 0);
  assert.equal(crop.destinationY, 256);
});

test("rejects malformed SVG geometry and systems that lie outside the rendered score", () => {
  assert.throws(() => parseSvgMetrics("<div/>"), /no SVG root/i);
  assert.throws(
    () => parseSvgMetrics('<svg width="20" height="10" viewBox="0 0 0 10"/>'),
    /empty viewBox/i,
  );
  assert.throws(
    () => computeSystemViewport(parseSvgMetrics(PAGE_SVG), 1280, 720, 700),
    /outside the SVG/i,
  );
});

test("embeds only the validated Bravura WOFF2 data URL in the SVG", () => {
  const dataUrl = "data:font/woff2;base64,QUJD";
  const result = withEmbeddedBravura(PAGE_SVG, dataUrl);
  assert.match(result, /@font-face/);
  assert.match(result, /font-family:'Bravura'/);
  assert.match(result, /data:font\/woff2;base64,QUJD/);
  assert.throws(
    () => withEmbeddedBravura(PAGE_SVG, "https://example.test/font.woff2"),
    /WOFF2 data URL/i,
  );
});
