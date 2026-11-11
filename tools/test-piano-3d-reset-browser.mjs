#!/usr/bin/env node
/**
 * Browser regression for the Piano 3D-model reset.
 * Confirms the active page uses Falling Notes and does not load the retired rig.
 *
 *   node tools/test-piano-3d-reset-browser.mjs
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
async function freePorts(count) {
  const servers = [];
  try {
    for (let i = 0; i < count; i += 1) {
      const server = createServer();
      await new Promise((resolvePromise, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolvePromise);
      });
      servers.push(server);
    }
    return servers.map((server) => server.address().port);
  } finally {
    await Promise.all(servers.map((server) => new Promise((resolvePromise) => server.close(resolvePromise))));
  }
}
const [httpPort, cdpPort] = await freePorts(2);
const profile = await mkdtemp(join(tmpdir(), 'piano-3d-reset-'));
const server = spawn('python3', ['-m', 'http.server', String(httpPort), '--bind', '127.0.0.1'], {
  cwd: ROOT,
  stdio: 'ignore',
});
let browser;
let cdp;
const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

async function waitForJson(url, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch {}
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.next = 0;
    this.pending = new Map();
    this.ready = new Promise((resolvePromise, reject) => {
      this.ws.onopen = resolvePromise;
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
    return await new Promise((resolvePromise, reject) => {
      this.pending.set(id, { resolve: resolvePromise, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.ws.close(); }
}

async function evaluate(expression) {
  const result = await cdp.call('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || 'Browser evaluation failed.');
  }
  return result.result.value;
}

try {
  browser = spawn('chromium', [
    '--headless=new', '--no-sandbox', '--mute-audio', '--enable-webgl', '--ignore-gpu-blocklist',
    '--use-gl=angle', '--use-angle=swiftshader-webgl', '--disable-dev-shm-usage',
    `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${join(profile, 'profile')}`,
    'about:blank',
  ], { stdio: 'ignore' });
  const targets = await waitForJson(`http://127.0.0.1:${cdpPort}/json`);
  const page = targets.find((entry) => entry.type === 'page');
  assert.ok(page, 'Chromium did not expose a page target');
  cdp = new Cdp(page.webSocketDebuggerUrl);
  await cdp.call('Page.enable');
  await cdp.call('Runtime.enable');
  await cdp.call('Page.navigate', { url: `http://127.0.0.1:${httpPort}/website/video-create/piano/` });

  const deadline = Date.now() + 25000;
  let pageReady = false;
  while (Date.now() < deadline && !pageReady) {
    try {
      pageReady = await evaluate("document.readyState === 'complete' && Boolean(document.querySelector('#pianoStage')) && typeof window.PianoEngine !== 'undefined'");
    } catch (error) {
      if (!/Execution context was destroyed|Cannot find context/i.test(String(error))) throw error;
    }
    if (!pageReady) await sleep(200);
  }
  assert.equal(pageReady, true, 'Piano page and Falling Notes engine did not load');

  const state = await evaluate(`(() => {
    const stage = document.querySelector('#pianoStage');
    const design = document.querySelector('#pianoDesign');
    const handOption = [...design.options].find((option) => option.value === 'hands');
    const rendererScript = [...document.scripts].some((script) => script.src.includes('piano-hand-3d.js'));
    design.value = 'hands';
    design.dispatchEvent(new Event('change', { bubbles: true }));
    return {
      handOptionDisabled: handOption?.disabled === true,
      rendererScriptLoaded: rendererScript,
      rendererGlobalPresent: typeof window.PianoHand3D !== 'undefined',
      selected: design.value,
      stageRenderer: stage.dataset.renderer || null,
      hint: document.querySelector('#keyboardHint')?.innerText || '',
    };
  })()`);

  assert.equal(state.handOptionDisabled, true, 'Hands option must be disabled during the model rebuild');
  assert.equal(state.rendererScriptLoaded, false, 'Piano page must not load the retired GLB renderer');
  assert.equal(state.rendererGlobalPresent, false, 'Retired renderer global must not be present');
  assert.equal(state.stageRenderer, 'svg', 'saved or forced Hands selection must safely fall back to SVG');
  assert.match(state.hint, /temporarily unavailable|being rebuilt/i, 'page must explain the temporary mode change');
  console.log(JSON.stringify({ status: 'passed', ...state }, null, 2));
} finally {
  cdp?.close();
  browser?.kill('SIGTERM');
  server.kill('SIGTERM');
  await sleep(300);
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
