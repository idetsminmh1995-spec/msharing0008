#!/usr/bin/env node
/**
 * Chromium integration check for Studio -> VideoEngine -> preview/download.
 *
 * Requires chromium, ffprobe, and Python 3.
 *   node tools/test-studio-video-browser.mjs
 */
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const exec = promisify(execFile);
const WEBSITE_ROOT = resolve(fileURLToPath(new URL('../../../../Website/', import.meta.url)));
const CHROMIUM = process.env.CHROMIUM_BIN || 'chromium';
const profile = await mkdtemp(join(tmpdir(), 'studio-video-chromium-'));
const output = join(profile, 'studio-output');
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

async function evaluate(expression, options = {}) {
  const response = await cdp.call('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
    ...options,
  });
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  return response.result.value;
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
  while (Date.now() - startedAt < 10000) {
    ready = await evaluate("Boolean(window.VideoEngine && document.querySelector('[data-studio-generate]') && document.querySelector('[data-musicxml-input]') && document.querySelector('[data-logo-preview]'))");
    if (ready) break;
    await sleep(100);
  }
  assert.ok(ready, 'Studio or VideoEngine did not finish loading');

  await cdp.call('Emulation.setDeviceMetricsOverride', {
    width: 375, height: 812, deviceScaleFactor: 1, mobile: true,
  });
  const mobileLayout = await evaluate("JSON.stringify({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,columns:getComputedStyle(document.querySelector('[data-studio-workspace]')).gridTemplateColumns})");
  const mobile = JSON.parse(mobileLayout);
  assert.ok(mobile.scrollWidth <= mobile.width, `Studio overflows at phone width: ${JSON.stringify(mobile)}`);
  assert.equal(mobile.columns.trim().split(/\s+/).length, 1, 'Studio did not switch to one column on phone');
  await cdp.call('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  const desktopLayout = await evaluate("JSON.stringify({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,columns:getComputedStyle(document.querySelector('[data-studio-workspace]')).gridTemplateColumns})");
  const desktop = JSON.parse(desktopLayout);
  assert.ok(desktop.scrollWidth <= desktop.width, `Studio overflows at desktop width: ${JSON.stringify(desktop)}`);
  assert.equal(desktop.columns.trim().split(/\s+/).length, 2, `Studio did not show two columns on desktop: ${JSON.stringify(desktop)}`);

  await evaluate("document.querySelector('[data-studio-generate]').click()");

  const renderStarted = Date.now();
  let state;
  while (Date.now() - renderStarted < 60000) {
    state = await evaluate("JSON.stringify({status:document.querySelector('[data-studio-status]').textContent, videoReady:!document.querySelector('[data-video-output]').hidden && document.querySelector('[data-video-output]').readyState >= 1, href:document.querySelector('[data-video-download]').href, ext:document.querySelector('[data-video-download]').download})");
    state = JSON.parse(state);
    if (state.status.startsWith('Rendered ') && state.videoReady) break;
    if (state.status.startsWith('Video render failed:')) throw new Error(state.status);
    await sleep(150);
  }
  assert.ok(state?.status.startsWith('Rendered '), `Studio render did not complete: ${state?.status}`);
  assert.ok(state.videoReady, 'Rendered video did not load metadata');
  assert.ok(state.href.startsWith('blob:'), 'Studio preview is not backed by a Blob URL');

  const result = await evaluate(`(async () => { const response = await fetch(${JSON.stringify(state.href)}); const bytes = new Uint8Array(await response.arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return { base64: btoa(binary), bytes: bytes.length, status: document.querySelector('[data-studio-status]').textContent }; })()`);
  const videoBytes = Buffer.from(result.base64, 'base64');
  assert.ok(videoBytes.length > 1000, 'Studio export is unexpectedly small');
  const extension = state.ext.split('.').pop();
  const videoPath = `${output}.${extension}`;
  await writeFile(videoPath, videoBytes);
  const { stdout } = await exec('ffprobe', [
    '-v', 'error', '-show_entries', 'format=format_name,duration',
    '-show_entries', 'stream=codec_name,width,height', '-of', 'json', videoPath,
  ]);
  const probe = JSON.parse(stdout);
  assert.ok(Math.abs(Number(probe.format.duration) - 4) < 0.3, 'Studio video duration is not approximately four seconds');
  assert.equal(probe.streams[0].width, 1920);
  assert.equal(probe.streams[0].height, 1080);

  await evaluate("(() => { const ratio = document.querySelector('[data-video-ratio]'); const color = document.querySelector('[data-video-color]'); const count = document.querySelector('[data-count-voice-enabled]'); ratio.value = '9:16'; ratio.dispatchEvent(new Event('change', { bubbles: true })); color.value = 'white'; color.dispatchEvent(new Event('change', { bubbles: true })); count.value = 'on'; count.dispatchEvent(new Event('change', { bubbles: true })); document.querySelector('[data-studio-generate]').click(); })()");
  const portraitStartedAt = Date.now();
  let portraitState;
  while (Date.now() - portraitStartedAt < 60000) {
    portraitState = await evaluate("JSON.stringify({status:document.querySelector('[data-studio-status]').textContent, videoReady:!document.querySelector('[data-video-output]').hidden && document.querySelector('[data-video-output]').readyState >= 1, href:document.querySelector('[data-video-download]').href})");
    portraitState = JSON.parse(portraitState);
    if (portraitState.status.startsWith('Rendered ') && portraitState.videoReady && portraitState.href !== state.href) break;
    if (portraitState.status.startsWith('Video render failed:')) throw new Error(portraitState.status);
    await sleep(150);
  }
  assert.ok(portraitState?.status.startsWith('Rendered '), `Portrait render did not complete: ${portraitState?.status}`);
  const portraitResult = await evaluate(`(async () => { const response = await fetch(${JSON.stringify(portraitState.href)}); const bytes = new Uint8Array(await response.arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return { base64: btoa(binary), bytes: bytes.length, status: document.querySelector('[data-studio-status]').textContent }; })()`);
  const portraitBytes = Buffer.from(portraitResult.base64, 'base64');
  const portraitPath = `${output}.portrait.mp4`;
  await writeFile(portraitPath, portraitBytes);
  const portraitProbeResult = await exec('ffprobe', [
    '-v', 'error', '-show_entries', 'stream=codec_name,width,height', '-of', 'json', portraitPath,
  ]);
  const portraitProbe = JSON.parse(portraitProbeResult.stdout);
  assert.equal(portraitProbe.streams[0].width, 1080);
  assert.equal(portraitProbe.streams[0].height, 1920);
  console.log(JSON.stringify({ status: result.status, bytes: result.bytes, extension, ffprobe: probe }, null, 2));
} finally {
  cdp?.close();
  for (const child of [browser, server]) {
    if (!child || child.exitCode !== null) continue;
    child.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => child.once('exit', resolve)),
      sleep(1500),
    ]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
