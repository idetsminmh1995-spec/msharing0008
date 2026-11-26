#!/usr/bin/env node
/**
 * The Notation clip check (Plan V14, §၁၃.២).
 *
 * The Plan states the completion criterion in pixels, not in intent: a frame
 * composed without the Notation part and the same frame composed with it
 * must differ by ZERO outside the Notation rect. That is the property the
 * clip exists for -- the sheet travels, and a sheet that escaped its rect
 * would paint over Title / Info and over the drum kit.
 *
 * So this check renders both frames for every ratio and both views, then
 * walks the pixels outside the rect and counts the ones that moved. It also
 * confirms the part DID draw inside the rect, so a part that drew nothing
 * cannot pass by leaving the outside untouched.
 *
 * Requires chromium.
 *   node tools/test-notation-clip-browser.mjs
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const WEBSITE_ROOT = resolve(fileURLToPath(new URL('../../../../Website/', import.meta.url)));
const CHROMIUM = process.env.CHROMIUM_BIN || 'chromium';
const profile = await mkdtemp(join(tmpdir(), 'notation-clip-chromium-'));
let server;
let browser;
let cdp;

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function findFreePort() {
  const listener = net.createServer();
  await new Promise((done, fail) => {
    listener.once('error', fail);
    listener.listen(0, '127.0.0.1', done);
  });
  const { port } = listener.address();
  await new Promise((done, fail) => listener.close((error) => error ? fail(error) : done()));
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
    this.ready = new Promise((done, fail) => {
      this.ws.onopen = done;
      this.ws.onerror = fail;
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
    return await new Promise((done, fail) => {
      this.pending.set(id, { resolve: done, reject: fail });
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

// A long score, so the sheet really travels and a missing clip would have
// something to spill over.
const SCORE = await readFile(new URL(
  '../../../../Notation/Notation Engine/test/fixtures/musicxml/44130-drum-eighths.musicxml',
  import.meta.url,
), 'utf8');

const CASES = [
  { key: 'page-16:9', notation: 'page', size: { width: 1920, height: 1080 } },
  { key: 'page-1:1', notation: 'page', size: { width: 1080, height: 1080 } },
  { key: 'page-9:16', notation: 'page', size: { width: 1080, height: 1920 } },
  { key: 'horizontal-16:9', notation: 'horizontal', size: { width: 1920, height: 1080 } },
  { key: 'horizontal-1:1', notation: 'horizontal', size: { width: 1080, height: 1080 } },
  { key: 'horizontal-9:16', notation: 'horizontal', size: { width: 1080, height: 1920 } },
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
    // Two frames per view: the start of the score and deep into it, so a
    // sheet that only spilled once it had scrolled is still caught.
    const times = [2, 90];
    const out = {};
    for (const testCase of cases) {
      const settings = { instrument: 'drums', notation: testCase.notation, size: testCase.size };
      const state = await VideoEngine.prepareNotationFor(file, settings);
      if (!state || state.error) throw new Error(testCase.key + ': ' + (state ? state.error : 'no state'));
      const layout = VideoEngine.layoutFor('drums', testCase.size);
      const rect = layout.rects.notation;
      const canvas = document.createElement('canvas');
      canvas.width = testCase.size.width;
      canvas.height = testCase.size.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      // The other two parts draw flat blocks, so anything the notation paints
      // over them is a change the pixel walk below will see.
      const otherParts = {
        title: (target, part) => {
          target.fillStyle = '#204060';
          target.fillRect(part.x, part.y, part.width, part.height);
        },
        instrument: (target, part) => {
          target.fillStyle = '#604020';
          target.fillRect(part.x, part.y, part.width, part.height);
        },
      };
      const frames = [];
      for (const at of times) {
        const read = async (withNotation) => {
          ctx.fillStyle = '#f2f2f2';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await VideoEngine.composeFrame(ctx, {
            instrument: 'drums',
            width: canvas.width,
            height: canvas.height,
            parts: {
              ...otherParts,
              ...(withNotation ? { notation: (target, part) => VideoEngine.drawNotationPart(target, part, at, state) } : {}),
            },
          });
          return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        };
        const without = await read(false);
        const withPart = await read(true);
        let outside = 0;
        let inside = 0;
        for (let y = 0; y < canvas.height; y += 1) {
          for (let x = 0; x < canvas.width; x += 1) {
            const offset = (y * canvas.width + x) * 4;
            const moved = without[offset] !== withPart[offset]
              || without[offset + 1] !== withPart[offset + 1]
              || without[offset + 2] !== withPart[offset + 2]
              || without[offset + 3] !== withPart[offset + 3];
            if (!moved) continue;
            const inRect = x >= rect.x && x < rect.x + rect.width
              && y >= rect.y && y < rect.y + rect.height;
            if (inRect) inside += 1;
            else outside += 1;
          }
        }
        frames.push({ at, outside, inside });
      }
      out[testCase.key] = {
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        size: testCase.size,
        frames,
      };
    }
    return out;
  })()`);

  const report = {};
  for (const testCase of CASES) {
    const result = measured[testCase.key];
    assert.ok(result, `The ${testCase.key} case produced no measurement`);
    for (const frame of result.frames) {
      // The Plan's own criterion: zero pixels outside the rect may differ.
      assert.equal(frame.outside, 0,
        `The ${testCase.key} view painted ${frame.outside} px outside its rect at ${frame.at}s`);
      // And the part has to have drawn, or "nothing outside" is vacuous.
      assert.ok(frame.inside > 1000,
        `The ${testCase.key} view drew almost nothing inside its rect at ${frame.at}s: ${frame.inside} px`);
    }
    report[testCase.key] = {
      rect: result.rect,
      frames: result.frames,
    };
  }

  console.log(JSON.stringify(report, null, 2));
  console.log('Notation clip check passed: zero pixels outside the rect at 16:9, 1:1 and 9:16, Page and Horizontal.');
} finally {
  cdp?.close();
  browser?.kill('SIGKILL');
  server?.kill('SIGKILL');
}
