#!/usr/bin/env node
/**
 * Chromium integration test for Metronome Engine -> Studio -> VideoEngine.
 *
 * Requires chromium, ffprobe, and Python 3.
 *   node tools/test-metronome-studio-browser.mjs
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
const profile = await mkdtemp(join(tmpdir(), 'studio-metronome-chromium-'));
const output = join(profile, 'metronome-output');
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

try {
  const httpPort = await findFreePort();
  const debugPort = await findFreePort();
  server = spawn('python3', ['-m', 'http.server', String(httpPort), '--bind', '127.0.0.1'], {
    cwd: WEBSITE_ROOT,
    stdio: 'ignore',
  });
  await waitForHttp(`http://127.0.0.1:${httpPort}/index.html`, 10000, server);

  browser = spawn(CHROMIUM, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--mute-audio',
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${join(profile, 'profile')}`,
    `http://127.0.0.1:${httpPort}/index.html`,
  ], { stdio: 'ignore' });
  const devtools = await (await waitForHttp(`http://127.0.0.1:${debugPort}/json`, 15000, browser)).json();
  const page = devtools.find((entry) => entry.type === 'page' && entry.url.includes('/index.html'));
  assert.ok(page, 'Chromium did not open the Create Video page');
  cdp = new Cdp(page.webSocketDebuggerUrl);
  await cdp.call('Page.enable');
  await cdp.call('Runtime.enable');

  const homeStartedAt = Date.now();
  let homeReady = false;
  while (Date.now() - homeStartedAt < 10000) {
    homeReady = await evaluate("document.readyState === 'complete' && Boolean(document.querySelector('[data-tool=Metronome]'))");
    if (homeReady) break;
    await sleep(100);
  }
  assert.ok(homeReady, 'Create Video page did not show the Metronome tool card');
  await evaluate("document.querySelector('[data-tool=Metronome]').click()");
  const navigationStartedAt = Date.now();
  let navigated = false;
  while (Date.now() - navigationStartedAt < 10000) {
    try {
      navigated = await evaluate("location.pathname.endsWith('/studio.html') && new URLSearchParams(location.search).get('tool') === 'metronome'");
    } catch {
      navigated = false;
    }
    if (navigated) break;
    await sleep(100);
  }
  if (!navigated) {
    throw new Error(`Metronome tool card did not navigate to its Studio route; current URL: ${await evaluate('location.href')}`);
  }

  const startedAt = Date.now();
  let ready = false;
  while (Date.now() - startedAt < 10000) {
    ready = await evaluate("Boolean(window.VideoEngine && window.MetronomeDesigns && window.MetronomeDesigns.listDesigns().length === 11 && !document.querySelector('[data-metronome-controls]').hidden)");
    if (ready) break;
    await sleep(100);
  }
  assert.ok(ready, 'Metronome bundle, VideoEngine, or Metronome controls did not load');
  assert.equal(await evaluate("document.querySelector('[data-studio-title]').textContent"), 'Metronome Studio');
  assert.equal(await evaluate("document.querySelector('[data-studio-settings]').hidden"), true, 'Metronome route exposed the shared Drum settings');

  await cdp.call('Emulation.setDeviceMetricsOverride', {
    width: 375, height: 812, deviceScaleFactor: 1, mobile: true,
  });
  const mobileLayout = JSON.parse(await evaluate("JSON.stringify({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,columns:getComputedStyle(document.querySelector('[data-studio-workspace]')).gridTemplateColumns,controlsWidth:document.querySelector('[data-metronome-controls]').getBoundingClientRect().width})"));
  assert.ok(mobileLayout.scrollWidth <= mobileLayout.width, `Metronome Studio overflows at phone width: ${JSON.stringify(mobileLayout)}`);
  assert.equal(mobileLayout.columns.trim().split(/\s+/).length, 1, 'Metronome Studio did not use one column on phone');
  assert.ok(mobileLayout.controlsWidth > 0, 'Metronome controls are not visible on phone');

  await cdp.call('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  const desktopLayout = JSON.parse(await evaluate("JSON.stringify({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,columns:getComputedStyle(document.querySelector('[data-studio-workspace]')).gridTemplateColumns})"));
  assert.ok(desktopLayout.scrollWidth <= desktopLayout.width, `Metronome Studio overflows at desktop width: ${JSON.stringify(desktopLayout)}`);
  assert.equal(desktopLayout.columns.trim().split(/\s+/).length, 2, 'Metronome Studio did not use two columns on desktop');

  await evaluate("(() => { const bpm = document.querySelector('[data-metronome-bpm]'); bpm.value = '30'; bpm.dispatchEvent(new Event('input', {bubbles:true})); })()");
  const invalidSettings = JSON.parse(await evaluate("JSON.stringify({disabled:document.querySelector('[data-studio-generate]').disabled,status:document.querySelector('[data-studio-status]').textContent})"));
  assert.ok(invalidSettings.disabled, 'Metronome render was not blocked above the 12-second limit');
  assert.match(invalidSettings.status, /12 seconds/);

  await evaluate("(() => { const set = (selector, value) => { const el = document.querySelector(selector); el.value = value; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); }; set('[data-metronome-design]', 'sweep-dial'); set('[data-metronome-aspect]', '9x16'); set('[data-metronome-bpm]', '96'); set('[data-metronome-bars]', '1'); set('[data-metronome-numerator]', '3'); set('[data-metronome-denominator]', '8'); })()");
  const previewReadyAt = Date.now();
  let preview = null;
  while (Date.now() - previewReadyAt < 10000) {
    preview = JSON.parse(await evaluate("JSON.stringify({src:document.querySelector('[data-metronome-preview]').src,visible:!document.querySelector('[data-metronome-preview]').hidden,naturalWidth:document.querySelector('[data-metronome-preview]').naturalWidth,estimate:document.querySelector('[data-metronome-duration]').textContent,status:document.querySelector('[data-studio-status]').textContent})"));
    if (preview.visible && preview.naturalWidth > 0) break;
    await sleep(100);
  }
  assert.ok(preview?.visible && preview.naturalWidth > 0, 'Metronome SVG preview did not decode');
  assert.match(preview.estimate, /0\.94 sec/, `Unexpected meter duration calculation: ${preview.estimate}`);
  assert.match(preview.status, /synthesized click track/i, 'Preview state does not explain the click track');

  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const renderStarted = Date.now();
  let state;
  while (Date.now() - renderStarted < 90000) {
    state = JSON.parse(await evaluate("JSON.stringify({status:document.querySelector('[data-studio-status]').textContent,videoReady:!document.querySelector('[data-video-output]').hidden && document.querySelector('[data-video-output]').readyState >= 1,href:document.querySelector('[data-video-download]').href,download:document.querySelector('[data-video-download]').download})"));
    if (state.status.startsWith('Rendered ') && state.videoReady) break;
    if (state.status.startsWith('Metronome video render failed:')) throw new Error(state.status);
    await sleep(150);
  }
  assert.ok(state?.status.startsWith('Rendered '), `Metronome render did not complete: ${state?.status}`);
  assert.ok(state.videoReady, 'Metronome video preview did not load metadata');
  assert.ok(state.href.startsWith('blob:'), 'Metronome export is not backed by a Blob URL');
  assert.match(state.download, /^metronome-sweep-dial-9x16\.(mp4|webm)$/);

  const result = await evaluate(`(async () => { const response = await fetch(${JSON.stringify(state.href)}); const bytes = new Uint8Array(await response.arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return { base64: btoa(binary), bytes: bytes.length, status: document.querySelector('[data-studio-status]').textContent }; })()`);
  const videoBytes = Buffer.from(result.base64, 'base64');
  assert.ok(videoBytes.length > 1000, 'Metronome export is unexpectedly small');
  const extension = state.download.split('.').pop();
  const videoPath = `${output}.${extension}`;
  await writeFile(videoPath, videoBytes);
  const { stdout } = await exec('ffprobe', [
    '-v', 'error', '-show_entries', 'format=format_name,duration',
    '-show_entries', 'stream=codec_type,codec_name,width,height,sample_rate,channels', '-of', 'json', videoPath,
  ]);
  const probe = JSON.parse(stdout);
  const videoStream = probe.streams.find((stream) => stream.codec_type === 'video');
  const audioStream = probe.streams.find((stream) => stream.codec_type === 'audio');
  assert.ok(videoStream, 'Metronome output has no video stream');
  assert.ok(audioStream, 'Metronome output has no synthesized click-track audio');
  assert.equal(videoStream.width, 720, 'Portrait video width is wrong');
  assert.equal(videoStream.height, 1280, 'Portrait video height is wrong');
  assert.ok(Math.abs(Number(probe.format.duration) - 0.9375) < 0.2, 'Video duration does not match 3/8 at quarter-note 96 BPM');
  console.log(JSON.stringify({ status: result.status, bytes: result.bytes, download: state.download, ffprobe: probe }, null, 2));
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
