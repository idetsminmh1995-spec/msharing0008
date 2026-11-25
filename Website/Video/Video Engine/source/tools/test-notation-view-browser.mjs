#!/usr/bin/env node
/**
 * The Notation View check (Plan V6).
 *
 * Four views are offered -- Page Landscape, Page Portrait, Page Square and
 * Horizontal. The Plan fixes what each one means: a Page sheet climbs
 * bottom to top, and Horizontal slides right to left under a marker that
 * stays put.
 *
 * The check reads what the engine actually drew, not what it meant to
 * draw: the sheet reaches the canvas through `drawImage`, so the offset
 * passed there is the movement itself.
 *
 * Requires chromium.
 *   node tools/test-notation-view-browser.mjs
 */
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const exec = promisify(execFile);
const WEBSITE_ROOT = resolve(fileURLToPath(new URL('../../../../Website/', import.meta.url)));
const CHROMIUM = process.env.CHROMIUM_BIN || 'chromium';
const profile = await mkdtemp(join(tmpdir(), 'notation-view-chromium-'));
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

// A long score is the point: a sheet that fits its part cannot scroll, so a
// short score would let a wrong direction pass without being exercised.
const SCORE = await readFile(new URL(
  '../../../../Notation/Notation Engine/test/fixtures/musicxml/44130-drum-eighths.musicxml',
  import.meta.url,
), 'utf8');

// The Plan offers two views only: `Page`, whose sheet shape follows the
// frame's ratio, and `Horizontal`. Every ratio is measured so a Page that
// kept one shape for all three would be caught.
const CASES = [
  { key: 'page-16:9', notation: 'page', size: { width: 1920, height: 1080 }, sheetWidth: 42 },
  { key: 'page-1:1', notation: 'page', size: { width: 1080, height: 1080 }, sheetWidth: 30, sheetHeight: 30 },
  { key: 'page-9:16', notation: 'page', size: { width: 1080, height: 1920 }, sheetWidth: 30, sheetHeight: 42 },
  { key: 'horizontal', notation: 'horizontal', size: { width: 1920, height: 1080 } },
];

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
    ready = await evaluate('Boolean(window.VideoEngine && window.VideoEngine.prepareNotationFor)');
    if (ready) break;
    await sleep(100);
  }
  assert.ok(ready, 'VideoEngine did not finish loading');

  const measured = await evaluate(`(async () => {
    const file = new File([${JSON.stringify(SCORE)}], 'long-score.musicxml', { type: 'application/xml' });
    const cases = ${JSON.stringify(CASES)};
    // Spread across the score, so every view crosses system boundaries and
    // the sheet has to travel for the reading line to stay on the notes.
    const times = [2, 40, 80, 120];
    const out = {};
    for (const testCase of cases) {
      const view = testCase.key;
      const settings = { instrument: 'drums', notation: testCase.notation, size: testCase.size };
      const state = await VideoEngine.prepareNotationFor(file, settings);
      if (!state || state.error) throw new Error(view + ': ' + (state ? state.error : 'no notation state'));
      const rect = VideoEngine.layoutFor('drums', testCase.size).rects.notation;
      const canvas = document.createElement('canvas');
      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      // The sheet is the only image the part draws; recording its offset is
      // recording the movement the Plan describes.
      const originalDrawImage = ctx.drawImage.bind(ctx);
      let sheet = null;
      ctx.drawImage = (image, dx, dy, ...rest) => {
        sheet = { dx, dy };
        return originalDrawImage(image, dx, dy, ...rest);
      };
      const frames = times.map((at) => {
        sheet = null;
        VideoEngine.drawNotationPart(ctx, { x: 0, y: 0, width: rect.width, height: rect.height }, at, state);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let dark = 0, red = 0, redX = 0, redY = 0, white = 0;
        let redTop = Infinity, redBottom = -Infinity;
        const rowInk = new Array(canvas.height).fill(0);
        const colInk = new Array(canvas.width).fill(0);
        for (let y = 0; y < canvas.height; y += 1) {
          for (let x = 0; x < canvas.width; x += 1) {
            const offset = (y * canvas.width + x) * 4;
            const r = data[offset], g = data[offset + 1], b = data[offset + 2];
            if (r > 140 && g < 90 && b < 90) {
              red += 1; redX += x; redY += y;
              if (y < redTop) redTop = y;
              if (y > redBottom) redBottom = y;
            } else if (r < 130 && g < 130 && b < 130) {
              dark += 1; rowInk[y] += 1; colInk[x] += 1;
            }
            else if (r > 240 && g > 240 && b > 240) white += 1;
          }
        }
        return {
          at, sheet, dark, white, red,
          redX: red ? redX / red : 0, redY: red ? redY / red : 0,
          redTop: red ? redTop : 0, redBottom: red ? redBottom : 0,
          // §၁၃.၂ / V21: ink on a band edge is an element sliced by the band.
          cut: {
            top: rowInk[0], bottom: rowInk[canvas.height - 1],
            left: colInk[0], right: colInk[canvas.width - 1],
          },
        };
      });
      const imageSpace = state.image.naturalWidth / state.viewBox.width;
      // How much bigger the drawn sheet is than the part showing it, along
      // the axis this view scrolls on. A sheet that fits cannot scroll, so
      // the direction checks below would pass without testing anything.
      const overflow = state.mode === 'scroll'
        ? (state.viewBox.width * ((rect.height * 0.9) / (state.ink.height / imageSpace))) / rect.width
        : (state.image.naturalHeight * (((rect.width * 0.98) / state.viewBox.width) / imageSpace)) / rect.height;
      out[view] = {
        mode: state.mode,
        sheet: state.sheet,
        seconds: state.seconds,
        viewBox: state.viewBox,
        rect: { width: rect.width, height: rect.height },
        overflow,
        frames,
      };
    }
    return out;
  })()`);

  const falling = (values) => values.every((value, index) => index === 0 || value < values[index - 1]);
  const report = {};

  for (const testCase of CASES) {
    const view = testCase.key;
    const result = measured[view];
    assert.ok(result, `The ${view} view produced no measurement`);
    const [first] = result.frames;
    const last = result.frames[result.frames.length - 1];
    assert.ok(result.seconds > 100, `The ${view} view needs the long score to scroll: ${result.seconds} s`);
    assert.ok(first.dark > 2000, `The ${view} view drew no notes: ${first.dark}`);
    assert.ok(first.white > result.rect.width * result.rect.height * 0.5,
      `The ${view} view did not draw a sheet: ${first.white}`);
    assert.ok(result.frames.every((frame) => frame.red > 0), `The ${view} view drew no cursor`);
    assert.ok(result.frames.every((frame) => frame.sheet), `The ${view} view drew no sheet image`);
    assert.ok(result.overflow > 2,
      `The ${view} sheet fits its part (${result.overflow.toFixed(2)}x), so no direction was tested`);

    // V21 / §၁៣.២: a staff, stem, beam, ledger or accidental running into an
    // edge is a note the viewer cannot read. Top and bottom are checked for
    // both views, because neither view scrolls that way -- the band's height
    // is the sheet's height, so ink there means the sheet was scaled wrong.
    for (const frame of result.frames) {
      assert.equal(frame.cut.top, 0,
        `The ${view} view cut notation at the band's top edge at ${frame.at}s: ${frame.cut.top} px`);
      assert.equal(frame.cut.bottom, 0,
        `The ${view} view cut notation at the band's bottom edge at ${frame.at}s: ${frame.cut.bottom} px`);
    }

    if (view === 'horizontal') {
      // Right to left under a marker that stays put: the sheet travels, the
      // cursor holds its reading line.
      assert.equal(result.mode, 'scroll', `Horizontal did not use the scroll layout: ${result.mode}`);
      const offsets = result.frames.map((frame) => frame.sheet.dx);
      assert.ok(falling(offsets), `Horizontal did not slide right to left: ${offsets}`);
      const markers = result.frames.map((frame) => Math.round(frame.redX));
      assert.equal(new Set(markers).size, 1, `Horizontal moved its marker: ${markers}`);
      report[view] = { mode: result.mode, offsets, markers, seconds: Number(result.seconds.toFixed(2)) };
      continue;
    }

    // Page: a sheet shaped like the frame, climbing bottom to top.
    assert.equal(result.mode, 'page', `The ${view} view did not use the page layout: ${result.mode}`);
    assert.equal(result.sheet?.width, testCase.sheetWidth,
      `The ${view} sheet is ${result.sheet?.width} staff spaces wide, not ${testCase.sheetWidth}`);
    if (testCase.sheetHeight) {
      assert.equal(result.sheet?.height, testCase.sheetHeight,
        `The ${view} sheet is ${result.sheet?.height} staff spaces tall, not ${testCase.sheetHeight}`);
    }
    const offsets = result.frames.map((frame) => frame.sheet.dy);
    assert.ok(falling(offsets), `The ${view} sheet did not climb bottom to top: ${offsets}`);
    // The reading line is where the cursor is drawn; it has to stay put
    // while the sheet moves under it. Its top and bottom edges are what say
    // so: a centroid slides a pixel whenever a notehead covers part of the
    // thin bar, which is the note's ink moving, not the marker's.
    const lines = result.frames.map((frame) => `${frame.redTop}-${frame.redBottom}`);
    assert.equal(new Set(lines).size, 1, `The ${view} view moved its reading line: ${lines}`);
    // §၁៣.២ also rules out sideways slicing for Page: a sheet that only
    // travels up and down is the sheet's own width inside the band, so its
    // side margins must stay clear. Horizontal is left out on purpose -- the
    // Plan keeps its left/right cut open (§၁៣.២'s open question), and a sheet
    // that travels sideways is meant to leave the band's sides.
    for (const frame of result.frames) {
      assert.equal(frame.cut.left, 0,
        `The ${view} view cut notation at the band's left edge at ${frame.at}s: ${frame.cut.left} px`);
      assert.equal(frame.cut.right, 0,
        `The ${view} view cut notation at the band's right edge at ${frame.at}s: ${frame.cut.right} px`);
    }
    assert.notEqual(first.sheet.dy, last.sheet.dy,
      `The ${view} view drew the same sheet offset at 2 s and 120 s`);
    report[view] = {
      mode: result.mode,
      sheet: result.sheet,
      viewBox: result.viewBox,
      offsets,
      readingLines: lines,
      seconds: Number(result.seconds.toFixed(2)),
    };
  }

  console.log(JSON.stringify({ views: report }, null, 2));
  console.log('Notation view check passed: Page at 16:9, 1:1 and 9:16, and Horizontal.');
} finally {
  cdp?.close();
  browser?.kill();
  server?.kill();
  await exec('rm', ['-rf', profile]).catch(() => {});
}
