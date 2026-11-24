#!/usr/bin/env node
/**
 * The Title / Info check (Plan V7).
 *
 * The Plan fixes the band's arrangement: the logo on the left, Title 1
 * beside it, Title 2 under it, and the metre, tempo, key and metronome
 * icon on one row. It also fixes what must survive: a long title may not
 * spill out of the band, in any of the three ratios.
 *
 * Every piece of text the band draws is recorded with the width it
 * measured, so an overflow is caught as a number rather than guessed at
 * from a clipped canvas.
 *
 * Requires chromium.
 *   node tools/test-title-info-browser.mjs
 */
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const exec = promisify(execFile);
const WEBSITE_ROOT = resolve(fileURLToPath(new URL('../../../../Website/', import.meta.url)));
const CHROMIUM = process.env.CHROMIUM_BIN || 'chromium';
const profile = await mkdtemp(join(tmpdir(), 'title-info-chromium-'));
let server;
let browser;
let cdp;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function findFreePort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => {
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', resolve);
  });
  const { port } = listener.address();
  await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForHttp(url, timeoutMs, child) {
  const startedAt = Date.now();
  let lastError;
  while (Date.now() - startedAt < timeoutMs) {
    if (child && child.exitCode !== null) {
      throw new Error(`Child process exited with code ${child.exitCode}${lastError ? `: ${lastError.message}` : ''}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status} from ${url}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${url}${lastError ? ` (${lastError.message})` : ''}`);
}

class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.next = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    };
  }

  async call(method, params = {}) {
    await this.ready;
    const id = ++this.next;
    return await new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function evaluate(expression) {
  const response = await cdp.call('Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise: true,
  });
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  return response.result.value;
}

const RATIOS = ['16:9', '1:1', '9:16'];
// Long enough to overrun the band even at 16:9, which is the widest frame.
const LONG_ONE = 'A VERY LONG DRUM PERFORMANCE TITLE THAT KEEPS GOING AND GOING AND GOING AND GOING AND GOING AND GOING AND GOING AND GOING';
const LONG_TWO = 'AND A SUBTITLE THAT IS ALSO FAR TOO LONG FOR THE BAND, SO IT HAS TO BE SHORTENED BEFORE IT IS DRAWN';

try {
  const httpPort = await findFreePort();
  const debugPort = await findFreePort();
  server = spawn('python3', ['-m', 'http.server', String(httpPort), '--bind', '127.0.0.1'], {
    cwd: WEBSITE_ROOT, stdio: 'ignore',
  });
  await waitForHttp(`http://127.0.0.1:${httpPort}/studio.html`, 10000, server);

  browser = spawn(CHROMIUM, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--mute-audio',
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${join(profile, 'profile')}`,
    `http://127.0.0.1:${httpPort}/studio.html?tool=drums`,
  ], { stdio: 'ignore' });
  const devtools = await (await waitForHttp(`http://127.0.0.1:${debugPort}/json`, 15000, browser)).json();
  const page = devtools.find((entry) => entry.type === 'page' && entry.url.includes('/studio.html'));
  assert.ok(page, 'Chromium did not open the Studio page');
  cdp = new Cdp(page.webSocketDebuggerUrl);
  await cdp.call('Page.enable');
  await cdp.call('Runtime.enable');

  const startedAt = Date.now();
  let ready = false;
  while (Date.now() - startedAt < 15000) {
    ready = await evaluate('Boolean(window.VideoEngine && window.VideoEngine.drawTitlePart)');
    if (ready) break;
    await sleep(100);
  }
  assert.ok(ready, 'VideoEngine did not finish loading');

  const measured = await evaluate(`(async () => {
    const ratios = ${JSON.stringify(RATIOS)};
    const meta = { beats: 4, beatType: 4, bpm: 96, key: 'E minor' };
    const palette = VideoEngine.paletteFor('black');
    // A logo the band can actually draw: a small opaque square.
    const logo = document.createElement('canvas');
    logo.width = 120;
    logo.height = 60;
    const logoCtx = logo.getContext('2d');
    logoCtx.fillStyle = '#f20d3d';
    logoCtx.fillRect(0, 0, logo.width, logo.height);
    const logoImage = new Image();
    await new Promise((resolve, reject) => {
      logoImage.onload = resolve;
      logoImage.onerror = reject;
      logoImage.src = logo.toDataURL('image/png');
    });

    const out = {};
    for (const ratio of ratios) {
      const size = VideoEngine.sizeFor(ratio);
      const rect = VideoEngine.layoutFor('drums', { width: size.width, height: size.height }).rects.title;
      const cases = {};
      for (const [name, titleOne, titleTwo] of [
        ['normal', 'DRUM PERFORMANCE', 'VISUAL PREVIEW'],
        ['long', ${JSON.stringify(LONG_ONE)}, ${JSON.stringify(LONG_TWO)}],
        ['empty', '', ''],
      ]) {
        const canvas = document.createElement('canvas');
        canvas.width = rect.width;
        canvas.height = rect.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const texts = [];
        const images = [];
        const originalFillText = ctx.fillText.bind(ctx);
        const originalDrawImage = ctx.drawImage.bind(ctx);
        ctx.fillText = (text, x, y, maxWidth) => {
          texts.push({ text, x, y, width: ctx.measureText(text).width, maxWidth: maxWidth ?? null, font: ctx.font });
          return originalFillText(text, x, y, ...(maxWidth === undefined ? [] : [maxWidth]));
        };
        ctx.drawImage = (image, x, y, width, height, ...rest) => {
          images.push({ x, y, width, height });
          return originalDrawImage(image, x, y, width, height, ...rest);
        };
        VideoEngine.drawTitlePart(ctx, { x: 0, y: 0, width: rect.width, height: rect.height }, 0,
          meta, palette, {
            titleOne, titleTwo, logoImage, brand: 'M Sharing', model: 'Drum',
            notation: 'Page — Landscape', countEnabled: true, countDisplay: 'beats',
          });
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let ink = 0;
        for (let index = 3; index < data.length; index += 4) if (data[index] > 8) ink += 1;
        cases[name] = { texts, images, ink, rect: { width: rect.width, height: rect.height } };
      }
      out[ratio] = { size, rect: { width: rect.width, height: rect.height }, cases };
    }
    return out;
  })()`);

  const report = {};
  for (const ratio of RATIOS) {
    const { rect, cases } = measured[ratio];
    const normal = cases.normal;
    assert.ok(normal.ink > 200, `The ${ratio} band drew nothing`);

    // The logo sits on the left, and Title 1 starts to its right.
    const logo = normal.images[0];
    assert.ok(logo, `The ${ratio} band drew no logo`);
    assert.ok(logo.x < rect.width * 0.1, `The ${ratio} logo is not on the left: x=${logo.x}`);
    const titleOne = normal.texts.find((entry) => entry.text === 'DRUM PERFORMANCE');
    assert.ok(titleOne, `The ${ratio} band did not draw Title 1`);
    assert.ok(titleOne.x >= logo.x + logo.width,
      `Title 1 overlaps the logo in ${ratio}: ${titleOne.x} < ${logo.x + logo.width}`);

    // Title 2 sits under Title 1, on the same left edge.
    const titleTwo = normal.texts.find((entry) => entry.text === 'VISUAL PREVIEW');
    assert.ok(titleTwo, `The ${ratio} band did not draw Title 2`);
    assert.ok(titleTwo.y > titleOne.y, `Title 2 is not under Title 1 in ${ratio}: ${titleTwo.y} <= ${titleOne.y}`);
    assert.ok(Math.abs(titleTwo.x - titleOne.x) < rect.width * 0.02,
      `Title 2 does not share Title 1's left edge in ${ratio}: ${titleTwo.x} vs ${titleOne.x}`);

    // The stats row carries the metre, the tempo and the key.
    for (const label of ['4/4', '96 BPM', 'Key E minor']) {
      const item = normal.texts.find((entry) => entry.text === label);
      assert.ok(item, `The ${ratio} band did not print "${label}"`);
      assert.equal(Math.round(item.y), Math.round(normal.texts.find((entry) => entry.text === '4/4').y),
        `"${label}" is not on the metre's row in ${ratio}`);
    }

    // The user's own words are what is drawn, up to whatever has to be
    // dropped to fit. A band that replaced them with a default would fail
    // this: the drawn text has to start with what was typed.
    const long = cases.long;
    const longOne = long.texts.find((entry) => entry.text.startsWith(LONG_ONE.slice(0, 12)));
    assert.ok(longOne, `The ${ratio} band drew no Title 1 for the long case`);
    assert.ok(LONG_ONE.startsWith(longOne.text.replace(/\u2026$/, '')),
      `The ${ratio} band changed the title instead of shortening it: "${longOne.text}"`);

    for (const [name, entry] of Object.entries(cases)) {
      for (const text of entry.texts) {
        if (text.x + text.width > entry.rect.width + 1) {
          console.log('OVERFLOW', ratio, name, JSON.stringify(text.text.slice(0, 24)), Math.round(text.x + text.width), entry.rect.width);
        }
      }
    }
    // Nothing may leave the band, in any case.
    for (const [name, entry] of Object.entries(cases)) {
      for (const text of entry.texts) {
        assert.ok(text.x >= -1, `The ${ratio} ${name} band drew "${text.text}" left of the frame: ${text.x}`);
        assert.ok(text.x + text.width <= entry.rect.width + 1,
          `The ${ratio} ${name} band let "${text.text}" run past the frame: ${(text.x + text.width).toFixed(0)} > ${entry.rect.width}`);
      }
      for (const image of entry.images) {
        assert.ok(image.x + image.width <= entry.rect.width + 1,
          `The ${ratio} ${name} band let the logo run past the frame: ${image.x + image.width} > ${entry.rect.width}`);
      }
    }

    // A title long enough to be shortened still has to be shortened, not
    // dropped: an empty band is not a fit.
    assert.ok(long.ink > 200, `The ${ratio} band drew nothing for the long title`);

    report[ratio] = {
      rect,
      normal: normal.texts.map((entry) => ({ text: entry.text, x: Math.round(entry.x), width: Math.round(entry.width) })),
      long: long.texts.map((entry) => ({ text: entry.text, x: Math.round(entry.x), width: Math.round(entry.width) })),
    };
  }

  console.log(JSON.stringify({ bands: report }, null, 2));
  console.log('Title / Info check passed for 16:9, 1:1 and 9:16.');
} finally {
  cdp?.close();
  browser?.kill();
  server?.kill();
  await exec('rm', ['-rf', profile]).catch(() => {});
}
