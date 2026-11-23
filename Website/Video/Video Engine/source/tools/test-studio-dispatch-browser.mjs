#!/usr/bin/env node
/**
 * The Studio dispatch rule from Plan §5: a tool either has an adapter of
 * its own or it is refused. It never falls through to the drum branch.
 *
 * The failure this guards against is quiet. `studio-video.js` is the drum
 * adapter, so a route that is not handled at the top of it renders a drum
 * video -- a bass request produces kick/snare/hi-hat lanes and a file to
 * download, and nothing in the page says the wrong thing happened. The
 * check is therefore not "does it work" but "does it refuse, and does it
 * refuse visibly".
 *
 * A tool with no adapter must:
 *   - not start a render
 *   - not leave a download behind
 *   - disable the controls rather than leave them looking usable
 *   - say why, in the status line
 *
 * Requires chromium and Python 3.
 *   node tools/test-studio-dispatch-browser.mjs
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const WEBSITE_ROOT = resolve(fileURLToPath(new URL('../../../../Website/', import.meta.url)));
const CHROMIUM = process.env.CHROMIUM_BIN || 'chromium';
const profile = await mkdtemp(join(tmpdir(), 'studio-dispatch-chromium-'));
let server;
let browser;
let cdp;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Routes that have an adapter, and the one slug that has none. */
const ADAPTED = ['drums', 'metronome', 'guitar', 'piano', 'bass', 'strings', 'voice'];
const UNADAPTED = 'theremin';

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

  close() { this.ws.close(); }
}

async function evaluate(expression) {
  const response = await cdp.call('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  return response.result.value;
}

/** Everything the page tells a person about the route, after it settles. */
const readStudio = () => evaluate(`JSON.stringify({
  status: document.querySelector('[data-studio-status]')?.textContent ?? '',
  downloadHidden: document.querySelector('[data-video-download]')?.hidden ?? null,
  downloadHref: document.querySelector('[data-video-download]')?.href ?? '',
  outputHidden: document.querySelector('[data-video-output]')?.hidden ?? null,
  generateDisabled: document.querySelector('[data-studio-generate]')?.disabled ?? null,
  disabledControls: [...document.querySelectorAll('[data-studio-settings] input,[data-studio-settings] select')].filter((control) => control.disabled).length,
  totalControls: document.querySelectorAll('[data-studio-settings] input,[data-studio-settings] select').length,
})`);

/** Loads a route and waits for its adapter to take over the page. */
async function openRoute(httpPort, tool, waitFor) {
  await cdp.call('Page.navigate', { url: `http://127.0.0.1:${httpPort}/studio.html?tool=${tool}` });
  const startedAt = Date.now();
  let state;
  while (Date.now() - startedAt < 20000) {
    await sleep(150);
    try {
      state = JSON.parse(await readStudio());
    } catch (error) {
      continue; // mid-navigation
    }
    if (waitFor(state)) return state;
  }
  throw new Error(`Route ${tool} did not settle: ${JSON.stringify(state)}`);
}

try {
  const httpPort = await findFreePort();
  const debugPort = await findFreePort();
  server = spawn('python3', ['-m', 'http.server', String(httpPort), '--bind', '127.0.0.1'], {
    cwd: WEBSITE_ROOT,
    stdio: 'ignore',
  });
  await waitForHttp(`http://127.0.0.1:${httpPort}/studio.html`, 10000, server);

  browser = spawn(CHROMIUM, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required',
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${join(profile, 'profile')}`,
    `http://127.0.0.1:${httpPort}/studio.html`,
  ], { stdio: 'ignore' });

  const devtoolsResponse = await waitForHttp(`http://127.0.0.1:${debugPort}/json`, 15000, browser);
  const devtools = await devtoolsResponse.json();
  const page = devtools.find((entry) => entry.type === 'page' && entry.url.includes('studio.html'));
  assert.ok(page, 'Chromium did not expose the Studio page');
  cdp = new Cdp(page.webSocketDebuggerUrl);
  await cdp.call('Runtime.enable');
  await cdp.call('Page.enable');

  const results = {};

  // 1. A route with no adapter refuses, and says so.
  const refused = await openRoute(httpPort, UNADAPTED,
    (state) => state.status.includes('not implemented yet'));
  assert.match(refused.status, /not implemented yet/,
    `an unadapted route did not explain itself: ${JSON.stringify(refused.status)}`);
  assert.equal(refused.generateDisabled, true,
    'an unadapted route left Generate Video enabled');
  assert.equal(refused.downloadHidden, true,
    'an unadapted route left a download link visible');
  assert.equal(refused.outputHidden, true,
    'an unadapted route produced a video element to play');
  assert.equal(refused.disabledControls, refused.totalControls,
    `an unadapted route left ${refused.totalControls - refused.disabledControls} of ${refused.totalControls} controls usable`);
  // The drum message names the routes that do work, so a person can tell a
  // typo from a missing feature.
  for (const tool of ['Drum', 'Metronome', 'Guitar', 'Piano', 'Bass', 'Strings', 'Voice']) {
    assert.ok(refused.status.includes(tool),
      `the refusal does not mention ${tool}: ${refused.status}`);
  }
  results.unadapted = { status: refused.status, disabledControls: refused.disabledControls };

  // 2. Clicking Generate on that route still renders nothing.
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  await sleep(1200);
  const afterClick = JSON.parse(await readStudio());
  assert.equal(afterClick.downloadHidden, true,
    'clicking Generate on an unadapted route produced a download');
  assert.equal(afterClick.outputHidden, true,
    'clicking Generate on an unadapted route produced a playable video');
  results.unadaptedAfterClick = { downloadHidden: afterClick.downloadHidden };

  // 3. Every adapted route is claimed by its own adapter, which means the
  //    drum adapter's status line is not what a person sees.
  for (const tool of ADAPTED) {
    const state = await openRoute(httpPort, tool,
      (current) => !current.status.includes('not implemented yet') && current.status.length > 0);
    assert.ok(!state.status.includes('not implemented yet'),
      `${tool} is adapted but the page refuses it: ${state.status}`);
    // The drum adapter's own prompt is exactly right for the drum route and
    // wrong for every other one: it is how a fall-through shows itself.
    if (tool !== 'drums') {
      assert.ok(!/default drum pattern/.test(state.status),
        `${tool} fell through to the drum adapter: ${state.status}`);
    }
    results[tool] = state.status.slice(0, 90);
  }

  console.log(JSON.stringify(results, null, 2));
} finally {
  cdp?.close();
  for (const child of [browser, server]) {
    if (!child || child.exitCode !== null) continue;
    child.kill('SIGTERM');
    await Promise.race([new Promise((resolve) => child.once('exit', resolve)), sleep(1500)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
