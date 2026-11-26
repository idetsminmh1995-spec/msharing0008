#!/usr/bin/env node
/**
 * `.mxl` scores reach the video (Plan §၂, "MusicXML ဖိုင်").
 *
 * A `.mxl` is a ZIP archive, so `file.text()` returns the archive bytes
 * rather than a score. Every studio used to hand the file straight to
 * `parseMusicXml`, and the Drum page skipped `.mxl` outright, so a `.mxl`
 * either drew no notation or fell back to the default drum pattern.
 *
 * The check reads the score text back out of a real archive, then renders
 * the notation from it and confirms the Notation part has a real length --
 * the thing a placeholder or a fallback cannot have. A corrupt archive must
 * fail loudly instead of drawing an empty sheet.
 *
 * Requires chromium.
 *   node tools/test-mxl-score-browser.mjs
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
const profile = await mkdtemp(join(tmpdir(), 'mxl-score-chromium-'));
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

// The archive carries its score behind META-INF/container.xml, so reading it
// exercises the pointer lookup rather than a guess at the entry name.
const MXL_PATH = new URL(
  '../../../../Notation/Notation Engine/test/fixtures/mxl/simple-single-voice.mxl',
  import.meta.url,
);
const mxlBase64 = (await readFile(MXL_PATH)).toString('base64');

// Every studio that takes a score: the six MusicXML inputs on the shared page.
const INPUTS = [
  'data-musicxml-input',
  'data-metronome-musicxml-input',
  'data-piano-musicxml-input',
  'data-guitar-musicxml-input',
  'data-bass-musicxml-input',
  'data-violin-musicxml-input',
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
    ready = await evaluate('Boolean(window.VideoEngine && window.VideoEngine.readScoreText)');
    if (ready) break;
    await sleep(100);
  }
  assert.ok(ready, 'VideoEngine.readScoreText is missing');

  const measured = await evaluate(`(async () => {
    // Loaded up front so a regression reports what it broke rather than a
    // missing API from whichever call needed the engine first.
    await VideoEngine.loadNotationEngine();
    const bytes = Uint8Array.from(atob(${JSON.stringify(mxlBase64)}), (character) => character.charCodeAt(0));
    const file = new File([bytes], 'simple-single-voice.mxl', { type: 'application/vnd.recordare.musicxml' });
    const text = await VideoEngine.readScoreText(file);

    // The same archive read straight from the page's own unzip, so the
    // engine's text is compared to the archive's content rather than to a
    // string this test already knows.
    const archive = new Uint8Array(await file.arrayBuffer());
    const direct = window.NotationEngine.unzipMxl(archive, window.DOMParser);

    const settings = {
      instrument: 'drums',
      notation: 'page',
      size: { width: 1920, height: 1080 },
    };
    const state = await VideoEngine.prepareNotationFor(file, settings);
    const rect = VideoEngine.layoutFor('drums', { width: 1920, height: 1080 }).rects.notation;
    const canvas = document.createElement('canvas');
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let dark = 0;
    if (state && !state.error) {
      VideoEngine.drawNotationPart(ctx, { x: 0, y: 0, width: rect.width, height: rect.height }, 1, state);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let index = 0; index < data.length; index += 4) {
        if (data[index] < 130 && data[index + 1] < 130 && data[index + 2] < 130) dark += 1;
      }
    }

    // A file that is not a ZIP must be refused with a reason, not drawn as
    // an empty sheet.
    const broken = new File([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])], 'broken.mxl', { type: 'application/vnd.recordare.musicxml' });
    let brokenError = null;
    try {
      await VideoEngine.readScoreText(broken);
    } catch (error) {
      brokenError = error.message || String(error);
    }

    return {
      textMatchesArchive: text === direct.xmlText,
      textStartsWithScore: text.trimStart().startsWith('<?xml') && text.includes('<score-partwise'),
      directDiagnostics: (direct.diagnostics || []).length,
      stateError: state && state.error ? state.error : null,
      seconds: state && state.seconds ? state.seconds : 0,
      mode: state ? state.mode : null,
      dark,
      brokenError,
      accepts: ${JSON.stringify(INPUTS)}.map((attribute) => {
        const input = document.querySelector('[' + attribute + ']');
        return { attribute, accept: input ? input.getAttribute('accept') : null };
      }),
    };
  })()`);

  assert.equal(measured.directDiagnostics, 0, 'The fixture archive itself reports diagnostics');
  assert.ok(measured.textMatchesArchive, 'readScoreText did not return the archive\'s own score text');
  assert.ok(measured.textStartsWithScore, 'The extracted text is not a MusicXML score');
  assert.equal(measured.stateError, null, `The .mxl notation failed: ${measured.stateError}`);
  assert.ok(measured.seconds > 1, `The .mxl notation has no length: ${measured.seconds} s`);
  assert.equal(measured.mode, 'page', `The .mxl notation used the wrong mode: ${measured.mode}`);
  assert.ok(measured.dark > 500, `The .mxl notation drew nothing: ${measured.dark} dark pixels`);
  assert.ok(measured.brokenError, 'A file that is not a .mxl archive was accepted');
  assert.match(measured.brokenError, /mxl|archive|ZIP/i, `The refusal does not explain itself: ${measured.brokenError}`);

  for (const { attribute, accept } of measured.accepts) {
    assert.ok(accept, `The ${attribute} input is missing`);
    assert.ok(accept.includes('.mxl'), `The ${attribute} input does not offer .mxl: ${accept}`);
  }

  console.log(JSON.stringify({
    seconds: Number(measured.seconds.toFixed(2)),
    mode: measured.mode,
    dark: measured.dark,
    brokenError: measured.brokenError,
    inputs: measured.accepts.map((entry) => entry.attribute),
  }, null, 2));
  console.log('The .mxl score check passed: the archive reaches the notation part and a broken one is refused.');
} finally {
  cdp?.close();
  browser?.kill();
  server?.kill();
  await exec('rm', ['-rf', profile]).catch(() => {});
}
