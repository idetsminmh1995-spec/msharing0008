#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const PORT = 8778;
const CDP_PORT = 9338;
const pages = ['drum', 'piano', 'guitar', 'bass-guitar', 'metronome', 'violin'];
const viewports = [500, 800, 1400];
const profile = await mkdtemp(join(tmpdir(), 'cross-page-rollout-'));
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const browser = spawn('chromium', ['--headless=new', '--no-sandbox', '--disable-gpu', '--mute-audio', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${join(profile, 'profile')}`, `http://127.0.0.1:${PORT}/website/video-create/guitar/?test=1`], { stdio: 'ignore' });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitJson(url, timeout = 15000) { const started = Date.now(); while (Date.now() - started < timeout) { try { const r = await fetch(url); if (r.ok) return r.json(); } catch {} await sleep(100); } throw new Error(`Timed out waiting for ${url}`); }
class Cdp {
  constructor(url) { this.ws = new WebSocket(url); this.next = 0; this.pending = new Map(); this.ready = new Promise((resolve, reject) => { this.ws.onopen = resolve; this.ws.onerror = reject; }); this.ws.onmessage = (event) => { const msg = JSON.parse(event.data); const p = this.pending.get(msg.id); if (!p) return; this.pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result); }; }
  async call(method, params = {}) { await this.ready; const id = ++this.next; return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  close() { this.ws.close(); }
}
const results = [];
try {
  const targets = await waitJson(`http://127.0.0.1:${CDP_PORT}/json`);
  const target = targets.find((entry) => entry.type === 'page');
  assert(target, 'Chromium page target missing');
  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.call('Page.enable');
  await cdp.call('Runtime.enable');
  async function evalPage(expression, awaitPromise = false) { const result = await cdp.call('Runtime.evaluate', { expression, awaitPromise, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || 'Runtime evaluation failed'); return result.result?.value; }
  for (const instrument of pages) {
    await cdp.call('Page.navigate', { url: `http://127.0.0.1:${PORT}/website/video-create/${instrument}/?test=1` });
    await sleep(600);
    const ready = await evalPage('Boolean(document.querySelector("#videoFrame"))');
    assert.equal(ready, true, `${instrument}: video frame did not load`);
    let sharedGate = false;
    for (let attempt = 0; attempt < 30 && !sharedGate; attempt += 1) {
      sharedGate = await evalPage('Boolean(window.VideoAssetGate && document.querySelector(".video-asset-gate"))');
      if (!sharedGate) await sleep(100);
    }
    assert.equal(sharedGate, true, `${instrument}: shared asset gate did not load and mount`);
    const hasStabilityGuard = await evalPage('Boolean(window.VideoExportStability && document.querySelector("#upload-audio"))');
    if (hasStabilityGuard) {
      const guard = await evalPage(`(async () => {
      const frame = document.createElement('div');
      Object.assign(frame.style, { width: '640px', height: '360px', aspectRatio: '16 / 9' });
      document.body.append(frame);
      const input = document.querySelector('#upload-audio');
      const wav = new Uint8Array([82,73,70,70,38,0,0,0,87,65,86,69,102,109,116,32,16,0,0,0,1,0,1,0,68,172,0,0,136,88,1,0,2,0,16,0,100,97,116,97,2,0,0,0,0,0]);
      const dt = new DataTransfer(); dt.items.add(new File([wav], 'fixture.wav', { type: 'audio/wav' })); input.files = dt.files;
      const stability = window.VideoExportStability.create({ page: 'cross-page-test', frame, render: async () => { window.dispatchEvent(new Event('resize')); await new Promise((resolve) => setTimeout(resolve, 60)); } });
      const running = stability.run().then(() => ({ status: 'unexpected-success' })).catch((error) => ({ status: 'guarded', message: error.message, cleaned: frame.style.position === '' && !frame.classList.contains('export-freeze') && !document.body.classList.contains('is-rendering') }));
      return await running;
      })()`, true);
      assert.equal(guard.status, 'guarded', `${instrument}: resize guard did not stop export`);
      assert.match(guard.message, /resized during export/i);
      assert.equal(guard.cleaned, true, `${instrument}: pin cleanup did not run in finally`);
    }
    for (const zoom of [1, 1.5, 2]) for (const width of viewports) {
      await cdp.call('Emulation.setDeviceMetricsOverride', { width, height: Math.max(700, Math.round(width * 0.7)), deviceScaleFactor: 1, mobile: false });
      await evalPage(`document.documentElement.style.zoom = '${zoom}'`);
      await sleep(100);
      const layout = await evalPage('(() => { const frame=document.querySelector("#videoFrame"); return { width:Math.round(frame.getBoundingClientRect().width), height:Math.round(frame.getBoundingClientRect().height), cqw:getComputedStyle(frame).getPropertyValue("--frame-u").trim() }; })()');
      results.push({ instrument, width, zoom, layout });
    }
    await evalPage("document.documentElement.style.zoom = ''");
  }
  cdp.close();
} finally { browser.kill('SIGTERM'); server.kill('SIGTERM'); }
const evidence = {
  pages,
  viewports,
  results,
  sharedAssetGate: 'passed for all six active routes',
  resizeGuard: 'passed on routes with VideoExportStability enabled',
  status: 'passed',
};
await mkdir(join(ROOT, 'Doc/rollout/evidence'), { recursive: true });
await writeFile(join(ROOT, 'Doc/rollout/evidence/cross-page-rollout.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
