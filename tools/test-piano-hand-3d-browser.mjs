#!/usr/bin/env node
/**
 * Real-browser smoke test for the production Piano Hands GLB and anchor data.
 * Requires Chromium and network access to the pinned Three.js CDN imports.
 *
 *   node tools/test-piano-hand-3d-browser.mjs
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
const profile = await mkdtemp(join(tmpdir(), 'piano-hand-3d-'));
const server = spawn('python3', ['-m', 'http.server', String(httpPort), '--bind', '127.0.0.1'], {
  cwd: ROOT,
  stdio: 'ignore',
});
let browser;
const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

async function waitForHttp(url, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await sleep(100);
  }
  throw new Error(`Timed out waiting for local web server ${url}`);
}

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

let cdp;
try {
  await waitForHttp(`http://127.0.0.1:${httpPort}/`);
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
      const evaluation = await cdp.call('Runtime.evaluate', {
        expression: 'Boolean(window.PianoHand3D?.ready && window.PianoHandEngine && document.querySelector("#pianoStage"))',
        returnByValue: true,
      });
      pageReady = evaluation.result.value === true;
    } catch (error) {
      if (!/Execution context was destroyed|Cannot find context/i.test(String(error))) throw error;
    }
    if (!pageReady) await sleep(200);
  }
  assert.equal(pageReady, true, 'Piano page, engine and 3D renderer did not load within 25 seconds');

  const evaluation = await cdp.call('Runtime.evaluate', {
    expression: `(async () => {
      const stage = document.querySelector('#pianoStage');
      const design = [...document.querySelectorAll('select')].find(select => [...select.options].some(option => option.value === 'hands'));
      if (!design) throw new Error('The Hands design selector was not found.');
      design.value = 'hands';
      design.dispatchEvent(new Event('change', { bubbles: true }));
      const ready = await window.PianoHand3D.ready(stage);
      const renderer = window.PianoHand3D.renderer;
      return {
        ready,
        anchorValidation: stage.dataset.glbAnchorValidation || null,
        error: stage.dataset.handErrorMessage || null,
        leftRoot: Boolean(renderer?.hands?.left),
        rightRoot: Boolean(renderer?.hands?.right),
        leftFingerAnchors: renderer?.handTipBoneOffsets?.left?.size || 0,
        rightFingerAnchors: renderer?.handTipBoneOffsets?.right?.size || 0,
      };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (evaluation.exceptionDetails) {
    throw new Error(evaluation.exceptionDetails.exception?.description || 'Browser evaluation failed.');
  }
  const result = evaluation.result.value;
  assert.equal(result.ready, true, result.error || 'Production piano hand scene did not become ready.');
  assert.equal(result.anchorValidation, 'anchors-and-distal-bones-present');
  assert.equal(result.leftRoot, true, 'left-hand GLB root is missing');
  assert.equal(result.rightRoot, true, 'right-hand GLB root is missing');
  assert.equal(result.leftFingerAnchors, 5, 'all five left fingertip-to-bone mappings must be present');
  assert.equal(result.rightFingerAnchors, 5, 'all five right fingertip-to-bone mappings must be present');
  console.log(JSON.stringify({ status: 'passed', ...result }, null, 2));
} finally {
  cdp?.close();
  browser?.kill('SIGTERM');
  server.kill('SIGTERM');
  await sleep(300);
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
