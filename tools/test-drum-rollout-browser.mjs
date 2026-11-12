#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';

const exec = promisify(execFile);
const ROOT = resolve(new URL('..', import.meta.url).pathname);
const PORT = 8777;
const CDP_PORT = 9337;
const evidenceDir = join(ROOT, 'Doc/rollout/evidence');
await mkdir(evidenceDir, { recursive: true });
const profile = await mkdtemp(join(tmpdir(), 'drum-rollout-'));
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const browser = spawn('chromium', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--mute-audio',
  `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${join(profile, 'profile')}`,
  `http://127.0.0.1:${PORT}/website/video-create/drum/?debug=1&test=1`,
], { stdio: 'ignore' });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitJson(url, timeout = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { const response = await fetch(url); if (response.ok) return response.json(); } catch {}
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${url}`);
}
class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url); this.next = 0; this.pending = new Map();
    this.ready = new Promise((resolve, reject) => { this.ws.onopen = resolve; this.ws.onerror = reject; });
    this.ws.onmessage = (event) => { const msg = JSON.parse(event.data); const pending = this.pending.get(msg.id); if (!pending) return; this.pending.delete(msg.id); msg.error ? pending.reject(new Error(msg.error.message)) : pending.resolve(msg.result); };
  }
  async call(method, params = {}) { await this.ready; const id = ++this.next; return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  close() { this.ws.close(); }
}
async function evaluate(cdp, expression, awaitPromise = true) {
  const result = await cdp.call('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
try {
  const targets = await waitJson(`http://127.0.0.1:${CDP_PORT}/json`);
  const target = targets.find((entry) => entry.type === 'page');
  assert.ok(target, 'Chromium page target missing');
  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.call('Page.enable');
  await cdp.call('Runtime.enable');
  await sleep(2500);

  const viewports = [500, 800, 1400];
  const screenshots = [];
  for (const width of viewports) {
    await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: width === 500 ? 1 : width === 800 ? 1.5 : 2, mobile: false });
    await sleep(150);
    const image = await cdp.call('Page.captureScreenshot', { format: 'png', fromSurface: true });
    const filename = `drum-${width}.png`;
    await writeFile(join(evidenceDir, filename), Buffer.from(image.data, 'base64'));
    screenshots.push(filename);
  }
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 800, height: 900, deviceScaleFactor: 1.5, mobile: false });
  const firstStable = await cdp.call('Page.captureScreenshot', { format: 'png', fromSurface: true });
  await sleep(100);
  const secondStable = await cdp.call('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const deterministic = createHash('sha256').update(firstStable.data).digest('hex') === createHash('sha256').update(secondStable.data).digest('hex');
  assert.equal(deterministic, true, 'same viewport screenshots were not deterministic');

  const pageState = await evaluate(cdp, `(() => ({
    title: document.title,
    hasGatePanel: Boolean(document.querySelector('#assetGatePanel')),
    hasCopyReport: Boolean(document.querySelector('[data-video-gate-copy]')),
    hasDownloadReport: Boolean(document.querySelector('[data-video-gate-download]')),
    hasRetryButton: Boolean(document.querySelector('#retryKitAssets')),
    hasAssetLoader: Boolean(window.AssetLoader),
    hasRenderReport: Boolean(window.RenderReport),
    hasExportTestHook: Boolean(window.__DrumExportTest),
    debugQuery: new URL(location.href).searchParams.get('debug'),
    viewport: { width: innerWidth, height: innerHeight },
  }))()`);
  assert.equal(pageState.hasGatePanel, true);
  assert.equal(pageState.hasCopyReport, true);
  assert.equal(pageState.hasDownloadReport, true);
  assert.equal(pageState.hasAssetLoader, true);
  assert.equal(pageState.hasRenderReport, true);
  assert.equal(pageState.hasExportTestHook, true);

  const pinTest = await evaluate(cdp, `(() => {
    const pinned = window.__DrumExportTest.pinExportFrame();
    const size = { width: pinned.rect.width, height: pinned.rect.height };
    window.dispatchEvent(new Event('resize'));
    let guard = '';
    try { window.__DrumExportTest.assertPinnedFrame(pinned.rect); } catch (error) { guard = error.message; }
    pinned.release();
    return { size, guard };
  })()`);
  assert.ok(pinTest.size.width > 0 && pinTest.size.height > 0);
  assert.match(pinTest.guard, /resized|size changed/i);

  const failureTest = await evaluate(cdp, `(async () => {
    const originalFetch = window.fetch;
    const calls = [];
    window.AssetLoader.clearRecords();
    window.fetch = async (url) => {
      calls.push(String(url));
      if (String(url).includes('/missing')) return { ok: false, status: 404, blob: async () => new Blob() };
      return { ok: false, status: 500, blob: async () => new Blob() };
    };
    const image = { naturalWidth: 100, naturalHeight: 100, complete: true, removeAttribute() {}, async decode() {} };
    let missing = '', server = '';
    try { await window.AssetLoader.loadImage('/missing', image, 'R38.png'); } catch (error) { missing = error.message; }
    try { await window.AssetLoader.loadImage('/server-500', image, 'Drum Bg.png'); } catch (error) { server = error.message; }
    window.fetch = originalFetch;
    return { missing, server, attempts404: calls.filter((url) => url.includes('/missing')).length, attempts500: calls.filter((url) => url.includes('/server-500')).length, records: window.AssetLoader.getRecords() };
  })()`);
  assert.equal(failureTest.attempts404, 1, 'Browser 404 unexpectedly retried');
  assert.equal(failureTest.attempts500, 4, 'Browser 500 did not retry three times');
  assert.match(failureTest.missing, /HTTP 404/);
  assert.match(failureTest.server, /HTTP 500/);

  const evidence = {
    phase: 'A0-A4 / B / C / D browser acceptance',
    generatedAt: new Date().toISOString(),
    page: `http://127.0.0.1:${PORT}/website/video-create/drum/?debug=1&test=1`,
    viewports,
    screenshots,
    pageState,
    failureTest,
    pinTest,
    deterministic,
    status: 'passed',
  };
  await writeFile(join(evidenceDir, 'drum-rollout-browser.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
  cdp.close();
} finally {
  browser.kill('SIGTERM'); server.kill('SIGTERM'); await sleep(500); await rm(profile, { recursive: true, force: true, maxRetries: 5 });
}
