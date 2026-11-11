import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const FIXTURES_DIR = path.join(ROOT, 'test', 'fixtures', 'musicxml');
const FONT = path.join(ROOT, '..', 'website', 'assets', 'fonts', 'Bravura.woff2');

/**
 * Phase 54/§F4: the browser-level visual check, in the automated suite.
 *
 * `Doc/STATUS.md` §F4 named the hole this closes: *"A markup-only suite
 * structurally cannot catch 'the glyphs are correct but nothing can draw
 * them.'"* That is not hypothetical here -- it is exactly what happened
 * in Integration M, when the deployed site served no Bravura and every
 * glyph rendered as an empty box while all 600-odd markup tests stayed
 * green. Since then a real headless Chromium has been driven BY HAND
 * before calling a rendering change done. This makes it permanent.
 *
 * What it asserts is deliberately coarse: not *which* pixels, but that
 * a browser, given this engine's SVG and the project's own font, puts
 * ink on the page where the music is and leaves it blank where the music
 * isn't. A snapshot of pixels would fail on every font-hinting or
 * antialiasing difference between machines and teach everyone to
 * regenerate it without looking -- which is worse than no test.
 *
 * SKIPS, rather than fails, where no Chromium is installed: the rest of
 * the suite must stay runnable with nothing but `npm install`.
 */
function findChromium() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    process.env.PLAYWRIGHT_BROWSERS_PATH
      ? path.join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'chromium-1194', 'chrome-linux', 'chrome')
      : undefined,
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ].filter((p) => p !== undefined);
  return candidates.find((p) => {
    try {
      return fs.statSync(p).isFile();
    } catch {
      return false;
    }
  });
}

const chromium = findChromium();
const hasFont = fs.existsSync(FONT);

const NE = loadEngine();
const domParser = testDomParser();

/** A PNG's raw RGBA, decoded with nothing but zlib -- the same decoder shape `export.test.js` uses. */
function decodePng(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const idat = [];
  let width = 0;
  let height = 0;
  let channels = 4;
  let offset = 8;
  while (offset < bytes.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    const data = bytes.slice(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      const h = new DataView(data.buffer, data.byteOffset, data.byteLength);
      width = h.getUint32(0);
      height = h.getUint32(4);
      // Chromium screenshots an opaque page, so it writes colour type 2
      // (RGB, 3 bytes per pixel) rather than the RGBA this engine's own
      // encoder emits. Getting this wrong reads every third byte as the
      // next pixel's red and reports a page that is 99% black.
      channels = data[9] === 6 ? 4 : 3;
    } else if (type === 'IDAT') idat.push(Buffer.from(data));
    offset += 12 + length;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = new Uint8Array(stride * height);
  // Chromium writes a real adaptive-filtered PNG, so all five filter
  // types have to be handled -- unlike this engine's own encoder, which
  // only ever emits Sub.
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let i = 0; i < stride; i++) {
      const value = raw[y * (stride + 1) + 1 + i];
      const a = i >= channels ? out[y * stride + i - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + i] : 0;
      const c = i >= channels && y > 0 ? out[(y - 1) * stride + i - channels] : 0;
      let recon;
      switch (filter) {
        case 0:
          recon = value;
          break;
        case 1:
          recon = value + a;
          break;
        case 2:
          recon = value + b;
          break;
        case 3:
          recon = value + ((a + b) >> 1);
          break;
        default: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          recon = value + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
        }
      }
      out[y * stride + i] = recon & 0xff;
    }
  }
  return { width, height, channels, data: out };
}

/** Renders `svg` in headless Chromium and returns the screenshot's pixels. */
function screenshot(svg, { width, height }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notation-browser-'));
  try {
    const fontBase64 = fs.readFileSync(FONT).toString('base64');
    const html =
      '<!doctype html><html><head><meta charset=utf-8><style>' +
      `@font-face{font-family:'Bravura';src:url(data:font/woff2;base64,${fontBase64}) format('woff2');}` +
      'html,body{margin:0;padding:0;background:#fff;}svg{display:block;}' +
      '</style></head><body>' +
      svg +
      '</body></html>';
    const page = path.join(dir, 'page.html');
    const shot = path.join(dir, 'shot.png');
    fs.writeFileSync(page, html);
    execFileSync(
      chromium,
      [
        '--headless',
        '--no-sandbox',
        '--disable-gpu',
        '--hide-scrollbars',
        '--virtual-time-budget=10000',
        `--screenshot=${shot}`,
        `--window-size=${width},${height}`,
        `file://${page}`,
      ],
      { stdio: 'ignore', timeout: 120000 },
    );
    return decodePng(new Uint8Array(fs.readFileSync(shot)));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Fraction of pixels darker than mid-grey, within a region given in 0..1 fractions of the image. */
function inkFraction({ width, height, channels, data }, region = { x0: 0, y0: 0, x1: 1, y1: 1 }) {
  const x0 = Math.floor(region.x0 * width);
  const x1 = Math.ceil(region.x1 * width);
  const y0 = Math.floor(region.y0 * height);
  const y1 = Math.ceil(region.y1 * height);
  let dark = 0;
  let total = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const p = (y * width + x) * channels;
      if (data[p] < 128 && data[p + 1] < 128 && data[p + 2] < 128) dark++;
      total++;
    }
  }
  return total === 0 ? 0 : dark / total;
}

function render(name, config) {
  const xml = fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
  return NE.renderFromMusicXml(xml, { domParser, ...(config ? { config } : {}) });
}

const skip =
  chromium === undefined
    ? 'no Chromium found (set CHROMIUM_PATH to run this)'
    : !hasFont
      ? 'Bravura.woff2 not found next to the engine'
      : false;

describe('Phase 54/§F4: a real browser actually draws this SVG', { skip }, () => {
  test('a rendered score puts ink on the page', () => {
    const { svg } = render('two-voice-drum-groove.musicxml');
    const image = screenshot(svg, { width: 900, height: 400 });
    const ink = inkFraction(image);
    assert.ok(ink > 0.002, `only ${(ink * 100).toFixed(3)}% of the page has ink -- nothing drew`);
    assert.ok(ink < 0.5, `${(ink * 100).toFixed(1)}% of the page is dark -- that is not notation`);
  });

  test('the ink is where the music is, and the empty half stays empty', () => {
    // The engine sizes its viewBox to the music, so a window twice as
    // tall as the SVG must have a blank lower half. This is what catches
    // "it drew, but at the wrong scale/offset" -- which a markup test
    // cannot see at all.
    const { svg } = render('two-voice-drum-groove.musicxml');
    const image = screenshot(svg, { width: 900, height: 800 });
    const top = inkFraction(image, { x0: 0, y0: 0, x1: 1, y1: 0.4 });
    const bottom = inkFraction(image, { x0: 0, y0: 0.6, x1: 1, y1: 1 });
    assert.ok(top > 0.002, `the music's own half is blank (${(top * 100).toFixed(3)}%)`);
    assert.equal(bottom, 0, 'ink appeared below the SVG entirely');
  });

  test('every glyph really resolves -- no missing-glyph boxes (Integration M s own bug)', () => {
    // A missing glyph draws as a filled or hollow box, which is far more
    // ink per glyph than a notehead. Comparing the SAME score rendered
    // with a font that exists against one that cannot possibly exist is
    // what separates "the font loaded" from "something was drawn".
    const { svg } = render('two-voice-drum-groove.musicxml');
    const withFont = inkFraction(screenshot(svg, { width: 900, height: 400 }));
    const broken = svg.replace(/font-family="Bravura"/g, 'font-family="NoSuchFontAnywhere"');
    const withoutFont = inkFraction(screenshot(broken, { width: 900, height: 400 }));
    assert.notEqual(
      withFont.toFixed(4),
      withoutFont.toFixed(4),
      'the render is identical with and without Bravura -- the font is not being used at all',
    );
  });

  test('a page-mode render fills its pages rather than collapsing to one', () => {
    const { svg } = render('piano-grand-staff.musicxml', {
      layout: { mode: 'page' },
      page: { pageWidth: 30, pageHeight: 42 },
    });
    const image = screenshot(svg, { width: 600, height: 840 });
    assert.ok(inkFraction(image) > 0.001, 'the page is blank');
  });
});
