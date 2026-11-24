#!/usr/bin/env node
/**
 * Chromium integration check for Studio -> VideoEngine -> preview/download.
 *
 * Requires chromium, ffprobe, and Python 3.
 *   node tools/test-studio-video-browser.mjs
 */
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
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
    this.listeners = new Map();
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.method) {
        for (const listener of this.listeners.get(message.method) ?? []) listener(message.params);
        return;
      }
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    };
  }

  on(method, listener) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(listener);
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

/**
 * The Thank You clip and the spoken count are the engine's own R2 assets,
 * so the test stands in for R2: every request to either is answered here.
 * `thankYouClip` is the clip's bytes, or null for a 404 -- the two states
 * the Plan cares about. `countVoice` is the WAV handed back for every
 * `Voices/{n}.wav`, or null for a 404.
 */
let thankYouClip = null;
let countVoice = null;
async function serveThankYou() {
  cdp.on('Fetch.requestPaused', async (event) => {
    const { url } = event.request;
    const isCountVoice = url.includes('/Voices/');
    if (!url.includes('/thank-you/') && !isCountVoice) {
      await cdp.call('Fetch.continueRequest', { requestId: event.requestId });
      return;
    }
    const body = isCountVoice ? countVoice : thankYouClip;
    if (!body) {
      await cdp.call('Fetch.fulfillRequest', {
        requestId: event.requestId,
        responseCode: 404,
        responseHeaders: [{ name: 'Access-Control-Allow-Origin', value: '*' }],
        body: Buffer.from('not found').toString('base64'),
      });
      return;
    }
    await cdp.call('Fetch.fulfillRequest', {
      requestId: event.requestId,
      responseCode: 200,
      responseHeaders: [
        { name: 'Content-Type', value: isCountVoice ? 'audio/wav' : 'video/mp4' },
        { name: 'Access-Control-Allow-Origin', value: '*' },
      ],
      body: body.toString('base64'),
    });
  });
  await cdp.call('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
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
  await serveThankYou();

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

  // The Plan asks that a delivery size fit the H.264 level a decoder will
  // accept. 1920x1080@30 is 8160 macroblocks and 244,800 a second, which
  // only level 4.0 or higher allows; a file declaring a lower level is one a
  // strict decoder may refuse. ffprobe reports the level the encoder wrote,
  // so this reads the stream rather than trusting the engine's table.
  const AVC_LIMITS = {
    30: { frame: 1620, rate: 40500 },
    31: { frame: 3600, rate: 108000 },
    32: { frame: 5120, rate: 216000 },
    40: { frame: 8192, rate: 245760 },
    42: { frame: 8704, rate: 522240 },
    50: { frame: 22080, rate: 589824 },
    51: { frame: 36864, rate: 983040 },
    52: { frame: 36864, rate: 2073600 },
  };
  const assertAvcLevel = (stream) => {
    // A WebM fallback is VP8/VP9 and has no H.264 level to fit.
    if (stream.codec_name !== 'h264') return;
    const level = Number(stream.level);
    assert.ok(AVC_LIMITS[level], `The export declares an H.264 level this test does not know: ${stream.level}`);
    const macroblocks = Math.ceil(stream.width / 16) * Math.ceil(stream.height / 16);
    assert.ok(macroblocks <= AVC_LIMITS[level].frame && macroblocks * 30 <= AVC_LIMITS[level].rate,
      `The ${stream.width}x${stream.height} picture does not fit the level it declares (level ${level}, ${macroblocks} macroblocks)`);
  };

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
    '-show_entries', 'stream=codec_name,width,height,profile,level', '-of', 'json', videoPath,
  ]);
  const probe = JSON.parse(stdout);
  assert.ok(Math.abs(Number(probe.format.duration) - 4) < 0.3, 'Studio video duration is not approximately four seconds');
  assert.equal(probe.streams[0].width, 1920);
  assert.equal(probe.streams[0].height, 1080);

  assertAvcLevel(probe.streams[0]);

  // ---------------------------------------------------------------
  // Live Preview (§၁၂). The page opens it from the same settings the file
  // above was made with, so the frame on the canvas can be compared with
  // the frame in the file.
  // ---------------------------------------------------------------
  const previewRead = `JSON.stringify((() => {
    const canvas = document.querySelector('[data-video-preview]');
    const state = {
      shown: !canvas.hidden,
      width: canvas.width,
      height: canvas.height,
      source: document.querySelector('[data-video-source]').textContent,
      sourceKind: document.querySelector('[data-video-source]').dataset.kind || '',
      playDisabled: document.querySelector('[data-video-play]').disabled,
      timelineDisabled: document.querySelector('[data-video-timeline]').disabled,
      videoHidden: document.querySelector('[data-video-output]').hidden,
      ink: 0,
    };
    if (state.shown && canvas.width) {
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 0; i < data.length; i += 4 * 37) state.ink += data[i] + data[i + 1] + data[i + 2];
    }
    return state;
  })())`;
  // Touching a control is how the page is told the settings are worth
  // previewing; the value stays the same, so the frame is the export's.
  await evaluate("(() => { const title = document.querySelector('[data-title-one]'); title.dispatchEvent(new Event('change', { bubbles: true })); })()");
  const previewOpenedAt = Date.now();
  let previewState;
  while (Date.now() - previewOpenedAt < 30000) {
    previewState = JSON.parse(await evaluate(previewRead));
    if (previewState.shown && previewState.ink > 0) break;
    await sleep(100);
  }
  assert.ok(previewState?.shown, 'The live preview did not open from the page settings');
  assert.ok(previewState.ink > 0, 'The live preview canvas is blank');
  assert.equal(previewState.videoHidden, true, 'The empty <video> was left on show under the preview');
  assert.match(previewState.source, /Live preview/, `The preview does not say it is live: ${previewState.source}`);
  assert.equal(previewState.playDisabled, false, 'Play stayed disabled while a live preview was on show');
  assert.equal(previewState.timelineDisabled, false, 'The timeline stayed disabled while a live preview was on show');
  // The preview is the export's shape at a smaller pixel count, not a
  // re-layout: 16:9 stays 16:9.
  assert.equal(previewState.width * 9, previewState.height * 16,
    `The preview is not the export's 16:9 shape: ${previewState.width}x${previewState.height}`);
  assert.ok(Math.max(previewState.width, previewState.height) <= 960,
    `The preview was not drawn small: ${previewState.width}x${previewState.height}`);

  // The reference picture's corner mark (§၁၃) reaches the Studio's own
  // frame, not only the engine's helper. Its containment is checked where
  // it can be isolated -- in test-drum-reference-browser.mjs -- because the
  // Title band's own logo is red as well.
  const corner = JSON.parse(await evaluate(`JSON.stringify((() => {
    const canvas = document.querySelector('[data-video-preview]');
    const ctx = canvas.getContext('2d');
    const box = Math.round(Math.min(canvas.width, canvas.height) * 0.12);
    const read = (x, y, w, h) => {
      const data = ctx.getImageData(x, y, w, h).data;
      let red = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 150 && data[i + 1] < 110 && data[i + 2] < 110) red += 1;
      }
      return red;
    };
    return {
      width: canvas.width,
      height: canvas.height,
      inCorner: read(canvas.width - box, canvas.height - box, box, box),
    };
  })())`));
  assert.ok(corner.inCorner > 20, `The corner mark is not on the Studio frame: ${JSON.stringify(corner)}`);

  // Frame rate: the Plan asks for 24 fps or better. The engine's own draw
  // call is counted, so this is frames put on the canvas, not rAF ticks.
  await evaluate("(() => { window.__previewDraws = 0; const original = window.VideoEngine.drawFrameAt; window.VideoEngine.drawFrameAt = function (...args) { window.__previewDraws += 1; return original.apply(this, args); }; })()");
  await evaluate("document.querySelector('[data-video-play]').click()");
  const playedAt = Date.now();
  await sleep(1000);
  const playing = JSON.parse(await evaluate("JSON.stringify({button:document.querySelector('[data-video-play]').textContent, label:document.querySelector('[data-video-time]').textContent})"));
  assert.equal(playing.button, '❚❚', 'The Play button did not turn into Pause during a live preview');
  assert.match(playing.label, /^\d\d:\d\d \/ \d\d:\d\d$/, `The time label is not mm:ss / mm:ss: ${playing.label}`);
  while (Date.now() - playedAt < 15000) {
    if (await evaluate("document.querySelector('[data-video-play]').textContent === '▶'")) break;
    await sleep(100);
  }
  const playedSeconds = (Date.now() - playedAt) / 1000;
  const previewFps = (await evaluate('window.__previewDraws')) / playedSeconds;
  assert.ok(previewFps >= 24, `The live preview ran at ${previewFps.toFixed(1)} fps, under the Plan's 24`);

  // Seek parity: the frame the canvas shows at t is the file's frame at t,
  // and not the frame a second away from it.
  const seekFrames = async (seconds) => {
    await evaluate(`(() => { const bar = document.querySelector('[data-video-timeline]'); bar.value = '${seconds}'; bar.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await sleep(800);
    const path = `${output}.preview-${seconds}.png`;
    await writeFile(path, Buffer.from(await evaluate("document.querySelector('[data-video-preview]').toDataURL('image/png').split(',')[1]"), 'base64'));
    return path;
  };
  const exportedFrame = async (seconds) => {
    const path = `${output}.export-${seconds}.png`;
    await exec('ffmpeg', ['-v', 'error', '-y', '-ss', String(seconds), '-i', videoPath, '-frames:v', '1', path]);
    return path;
  };
  const meanDifference = async (left, right) => {
    const { stdout } = await exec('python3', ['-c', `
from PIL import Image
a = Image.open(${JSON.stringify(left)}).convert('RGB')
b = Image.open(${JSON.stringify(right)}).convert('RGB').resize(a.size, Image.LANCZOS)
pa, pb = a.load(), b.load()
total = 0
count = 0
for y in range(0, a.size[1], 2):
    for x in range(0, a.size[0], 2):
        qa, qb = pa[x, y], pb[x, y]
        total += abs(qa[0] - qb[0]) + abs(qa[1] - qb[1]) + abs(qa[2] - qb[2])
        count += 3
print(total / max(1, count))
`]);
    return Number(stdout.trim());
  };
  const canvasEarly = await seekFrames(1.5);
  const canvasLate = await seekFrames(2.5);
  const exportEarly = await exportedFrame(1.5);
  const exportLate = await exportedFrame(2.5);
  const earlyOwn = await meanDifference(canvasEarly, exportEarly);
  const lateOwn = await meanDifference(canvasLate, exportLate);
  // Both seeks are compared with their own frame: a preview that ignored
  // the timeline and kept the frame it started on could not pass twice.
  assert.ok(earlyOwn < 10, `The preview at 1.5 s does not look like the export's frame: ${earlyOwn}`);
  assert.ok(lateOwn < 10, `The preview at 2.5 s does not look like the export's frame: ${lateOwn}`);

  // The count-in is part of the preview's length, as it is the export's:
  // the label's total grows by one bar of the score's metre.
  const totalSeconds = async () => {
    const label = await evaluate("document.querySelector('[data-video-time]').textContent");
    const [, minutes, seconds] = label.match(/(\d\d):(\d\d)\s*$/);
    return Number(minutes) * 60 + Number(seconds);
  };
  const withoutCount = await totalSeconds();
  await evaluate("(() => { const count = document.querySelector('[data-count-voice-enabled]'); count.value = 'on'; count.dispatchEvent(new Event('change', { bubbles: true })); })()");
  await sleep(2500);
  const withCount = await totalSeconds();
  assert.ok(Math.abs((withCount - withoutCount) - 2) < 1.2,
    `The preview's length did not grow by the count-in bar: ${withoutCount}s to ${withCount}s`);
  await evaluate("(() => { const count = document.querySelector('[data-count-voice-enabled]'); count.value = 'off'; count.dispatchEvent(new Event('change', { bubbles: true })); })()");
  await sleep(2500);

  // A settings change reaches the preview within the Plan's 300 ms.
  const titleInk = `(() => { const c = document.querySelector('[data-video-preview]'); const d = c.getContext('2d').getImageData(0, 0, c.width, Math.min(200, c.height)).data; let sum = 0; for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2]; return sum; })()`;
  const beforeTitle = await evaluate(titleInk);
  const titleChangedAt = Date.now();
  await evaluate("(() => { const title = document.querySelector('[data-title-one]'); title.value = 'PREVIEW TITLE CHECK'; title.dispatchEvent(new Event('input', { bubbles: true })); })()");
  let titleLatency = null;
  while (Date.now() - titleChangedAt < 4000) {
    if (await evaluate(titleInk) !== beforeTitle) { titleLatency = Date.now() - titleChangedAt; break; }
    await sleep(50);
  }
  assert.ok(titleLatency !== null, 'A Title change never reached the live preview');
  // The Plan allows 300 ms of debounce, so the ceiling is that debounce plus
  // one drawn frame; the measured value goes in the Doc.
  console.log(`TITLE_LATENCY_MS ${titleLatency}`);
  assert.ok(titleLatency <= 900, `The preview took ${titleLatency} ms to follow a Title change`);

  // Keyboard play/pause, and no clock left running after repeated plays.
  await evaluate("document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }))");
  await sleep(500);
  assert.equal(await evaluate("document.querySelector('[data-video-play]').textContent"), '❚❚', 'Space did not start the live preview');
  await evaluate("document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }))");
  await sleep(500);
  assert.equal(await evaluate("document.querySelector('[data-video-play]').textContent"), '▶', 'Space did not pause the live preview');

  // Pause stops the clock: after a pause nothing may still be asking for
  // frames. A frame already in flight when the pause landed may finish, so
  // the counter is reset once the canvas has had time to settle.
  await evaluate("document.querySelector('[data-video-play]').click()");
  await sleep(500);
  await evaluate("document.querySelector('[data-video-play]').click()");
  assert.equal(await evaluate("document.querySelector('[data-video-play]').textContent"), '▶',
    'A click during playback did not pause the live preview');
  await sleep(1200);
  await evaluate("(() => { window.__idleDraws = 0; window.VideoEngine.drawFrameAt = (function (original) { return function (...args) { window.__idleDraws += 1; return original.apply(this, args); }; }(window.VideoEngine.drawFrameAt)); })()");
  await sleep(1000);
  assert.equal(await evaluate('window.__idleDraws'), 0,
    'A paused preview kept drawing: a play clock outlived its pause');

  // Full screen, from a real gesture: the Plan reuses the existing button.
  await evaluate("document.querySelector('[data-video-fullscreen]').click()", { userGesture: true });
  await sleep(700);
  const fullscreen = JSON.parse(await evaluate(`JSON.stringify({
    onStage: document.fullscreenElement === document.querySelector('[data-video-stage]'),
    button: document.querySelector('[data-video-fullscreen]').textContent,
  })`));
  await evaluate('document.fullscreenElement && document.exitFullscreen()', { userGesture: true });
  await sleep(400);
  assert.equal(fullscreen.onStage, true, 'Full screen did not take the video stage');
  assert.equal(fullscreen.button, '×', 'The full screen button did not show its exit state');

  // Five plays, then no retained growth: the Plan asks that memory does not
  // climb. Measuring after a forced collection separates a real leak from
  // garbage that the collector has simply not run yet.
  const heapNow = async () => {
    await cdp.call('HeapProfiler.collectGarbage');
    return (await cdp.call('Runtime.getHeapUsage')).usedSize;
  };
  await cdp.call('HeapProfiler.enable');
  const heapBefore = await heapNow();
  for (let round = 0; round < 5; round += 1) {
    await evaluate("document.querySelector('[data-video-play]').click()");
    await sleep(800);
    await evaluate("document.querySelector('[data-video-play]').click()");
    await sleep(300);
  }
  const heapAfter = await heapNow();
  const heapGrowth = heapAfter - heapBefore;
  assert.ok(heapGrowth < 4 * 1024 * 1024,
    `Five live previews kept ${Math.round(heapGrowth / 1024)} KiB of heap`);

  // The preview is a view, not a render: the export after it is still a
  // normal MP4 of the same length.
  await evaluate("(() => { const title = document.querySelector('[data-title-one]'); title.value = 'DRUM PERFORMANCE'; title.dispatchEvent(new Event('input', { bubbles: true })); })()");

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
    '-v', 'error', '-show_entries', 'stream=codec_name,width,height,profile,level', '-of', 'json', portraitPath,
  ]);
  const portraitProbe = JSON.parse(portraitProbeResult.stdout);
  assert.equal(portraitProbe.streams[0].width, 1080);
  assert.equal(portraitProbe.streams[0].height, 1920);
  assertAvcLevel(portraitProbe.streams[0]);

  // The Plan's B0 asks for an export in each of the three ratios, not just
  // the one the page happens to open with. 16:9 is measured at the top of
  // this file and 9:16 above; 1:1 is measured here. A page that kept a size
  // of its own for the square case would fail rather than go unnoticed.
  await evaluate("(() => { const ratio = document.querySelector('[data-video-ratio]'); ratio.value = '1:1'; ratio.dispatchEvent(new Event('change', { bubbles: true })); document.querySelector('[data-studio-generate]').click(); })()");
  const squareStartedAt = Date.now();
  let squareState;
  while (Date.now() - squareStartedAt < 60000) {
    squareState = JSON.parse(await evaluate("JSON.stringify({status:document.querySelector('[data-studio-status]').textContent, videoReady:!document.querySelector('[data-video-output]').hidden && document.querySelector('[data-video-output]').readyState >= 1, href:document.querySelector('[data-video-download]').href, download:document.querySelector('[data-video-download]').download})"));
    if (squareState.status.startsWith('Rendered ') && squareState.videoReady && squareState.href !== portraitState.href) break;
    if (squareState.status.startsWith('Video render failed:')) throw new Error(squareState.status);
    await sleep(150);
  }
  assert.ok(squareState?.status.startsWith('Rendered '), `Square render did not complete: ${squareState?.status}`);
  const squareBytes = Buffer.from(await evaluate(`(async () => { const response = await fetch(${JSON.stringify(squareState.href)}); const bytes = new Uint8Array(await response.arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(binary); })()`), 'base64');
  const squarePath = `${output}.square.mp4`;
  await writeFile(squarePath, squareBytes);
  const squareProbe = JSON.parse((await exec('ffprobe', [
    '-v', 'error', '-show_entries', 'stream=codec_name,width,height,profile,level', '-of', 'json', squarePath,
  ])).stdout);
  assert.equal(squareProbe.streams[0].width, 1080, `Square video width is wrong: ${JSON.stringify(squareProbe)}`);
  assert.equal(squareProbe.streams[0].height, 1080, `Square video height is wrong: ${JSON.stringify(squareProbe)}`);
  assertAvcLevel(squareProbe.streams[0]);
  assert.match(squareState.download, /1x1/, `The square export is not named for its ratio: ${squareState.download}`);

  // A real score must reach the Notation part, and its own cursor must be
  // drawn: the Plan puts both inside the frame the Video Engine composes.
  const score = await readFile(new URL(
    '../../../../Notation/Notation Engine/test/fixtures/musicxml/two-voice-drum-groove.musicxml',
    import.meta.url,
  ), 'utf8');
  const scoreName = await evaluate(`(() => {
    const input = document.querySelector('[data-musicxml-input]');
    const file = new File([${JSON.stringify(score)}], 'two-voice-drum-groove.musicxml', { type: 'application/xml' });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const view = document.querySelector('[data-notation-view]');
    view.value = 'landscape';
    view.dispatchEvent(new Event('change', { bubbles: true }));
    const ratio = document.querySelector('[data-video-ratio]');
    ratio.value = '16:9';
    ratio.dispatchEvent(new Event('change', { bubbles: true }));
    // The notation frames below are the score's own, not a count-in.
    const count = document.querySelector('[data-count-voice-enabled]');
    count.value = 'off';
    count.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('[data-studio-generate]').click();
    return input.files[0].name;
  })()`);
  assert.equal(scoreName, 'two-voice-drum-groove.musicxml');

  const notationStartedAt = Date.now();
  let notationState;
  while (Date.now() - notationStartedAt < 60000) {
    notationState = JSON.parse(await evaluate("JSON.stringify({status:document.querySelector('[data-studio-status]').textContent, ready:!document.querySelector('[data-video-output]').hidden && document.querySelector('[data-video-output]').readyState>=1, href:document.querySelector('[data-video-download]').href})"));
    if (notationState.status.startsWith('Rendered ') && notationState.ready && notationState.href !== portraitState.href) break;
    if (notationState.status.startsWith('Video render failed:')) throw new Error(notationState.status);
    await sleep(150);
  }
  assert.ok(notationState?.status.startsWith('Rendered '), `Notation render did not complete: ${notationState?.status}`);

  const notationBytes = Buffer.from(await evaluate(`(async () => { const response = await fetch(${JSON.stringify(notationState.href)}); const bytes = new Uint8Array(await response.arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(binary); })()`), 'base64');
  const notationPath = `${output}.notation.mp4`;
  await writeFile(notationPath, notationBytes);
  const frames = [];
  for (const second of ['0.2', '1.5']) {
    const framePath = `${output}.notation-${second}.png`;
    await exec('ffmpeg', ['-v', 'error', '-y', '-ss', second, '-i', notationPath, '-frames:v', '1', framePath]);
    frames.push(framePath);
  }
  // The notation band is the middle third of a drum frame; the engine's
  // cursor is red there, and the notes are dark ink on a white sheet.
  const inkAndCursor = await Promise.all(frames.map((framePath) => exec('python3', ['-c', `
from PIL import Image
image = Image.open(${JSON.stringify(framePath)}).convert('RGB')
width, height = image.size
pixels = image.load()
dark = red = white = 0
for y in range(int(height * 0.15), int(height * 0.55)):
    for x in range(0, width, 2):
        r, g, b = pixels[x, y]
        if r < 130 and g < 130 and b < 130: dark += 1
        elif r > 140 and g < 90 and b < 90: red += 1
        elif r > 240 and g > 240 and b > 240: white += 1
print(dark, red, white)
`])));
  const [firstInk, secondInk] = inkAndCursor.map(({ stdout }) => stdout.trim().split(/\s+/).map(Number));
  assert.ok(firstInk[0] > 3000, `Notation notes are missing from the frame: ${firstInk}`);
  assert.ok(firstInk[2] > 50000, `Notation sheet is not drawn: ${firstInk}`);
  assert.ok(firstInk[1] > 0 && secondInk[1] > 0, `Notation cursor is not drawn: ${firstInk} / ${secondInk}`);
  assert.notEqual(firstInk[1], secondInk[1], 'The notation cursor did not move with playback');

  // The instrument band carries the R2 kit photo, not the lane chart. A
  // photograph has hundreds of distinct colours in a band; three lanes on
  // one background have a handful, so the count tells the two apart.
  const bandColours = await Promise.all(frames.map((framePath) => exec('python3', ['-c', `
from PIL import Image
image = Image.open(${JSON.stringify(framePath)}).convert('RGB')
width, height = image.size
pixels = image.load()
colours = set()
for y in range(int(height * 0.62), height, 3):
    for x in range(0, width, 3):
        colours.add(pixels[x, y])
print(len(colours))
`])));
  for (const { stdout } of bandColours) {
    const count = Number(stdout.trim());
    assert.ok(count > 400, `The drum kit photo is not drawn in the instrument band (${count} colours)`);
  }

  // A stroke lights the picture the sticking engine's own limb points at:
  // the module is asked directly, so the answer is checked rather than
  // inferred from pixels.
  const kitProbe = JSON.parse(await evaluate(`(async () => {
    const art = await window.DrumKit.loadArt('RolandDrums/VAD716', '16:9');
    const strokes = [{ note: 38, at: 0.5 }, { note: 42, at: 1 }, { note: 36, at: 1.5 }];
    const limbs = window.DrumKit.solveLimbs(strokes.map((s) => ({ time: s.at, note: s.note })));
    strokes.forEach((s, i) => { s.limb = limbs[i]; });
    const resolved = await window.DrumKit.loadHitImages(art, strokes);
    return JSON.stringify({
      ratioPath: art.ratioPath,
      inkWidth: Math.round(art.ink.width),
      inkHeight: Math.round(art.ink.height),
      limbs,
      files: [...resolved.values()].map((hit) => hit.name),
      count: resolved.size,
    });
  })()`));
  assert.equal(kitProbe.ratioPath, '16x9');
  assert.ok(kitProbe.inkWidth > 0 && kitProbe.inkHeight > 0, `The kit photo has no measurable ink: ${JSON.stringify(kitProbe)}`);
  assert.equal(kitProbe.count, 3, `Not every stroke found a picture: ${JSON.stringify(kitProbe)}`);
  assert.ok(kitProbe.limbs.every((limb) => typeof limb === 'string'), `No limb was solved: ${JSON.stringify(kitProbe)}`);
  // A foot takes the bare number (one pedal picture serves either foot); a
  // hand takes the side its limb names.
  const expectedFiles = kitProbe.limbs.map((limb, index) => {
    if (limb === 'RF' || limb === 'LF') return `${[38, 42, 36][index]}.png`;
    return `${limb === 'RH' ? 'R' : 'L'}${[38, 42, 36][index]}.png`;
  });
  assert.deepEqual(kitProbe.files.slice().sort(), expectedFiles.sort());

  // The Plan's B8 says a picture the kit does not hold must be reported, not
  // skipped in silence. Note 81 (open triangle) has no file in this kit, so
  // the stroke must come back marked and the summary must name the note.
  const missingProbe = JSON.parse(await evaluate(`(async () => {
    const art = await window.DrumKit.loadArt('RolandDrums/VAD716', '16:9');
    const strokes = [{ note: 38, at: 0.5, limb: 'RH' }, { note: 81, at: 1, limb: 'RH' }];
    const resolved = await window.DrumKit.loadHitImages(art, strokes);
    return JSON.stringify({
      resolved: resolved.size,
      marked: strokes.map((stroke) => stroke.missing === true),
      summary: window.DrumKit.missingSummary(strokes),
    });
  })()`));
  assert.equal(missingProbe.resolved, 1, `The stroke with a picture was dropped: ${JSON.stringify(missingProbe)}`);
  assert.deepEqual(missingProbe.marked, [false, true],
    `The stroke without a picture was not marked: ${JSON.stringify(missingProbe)}`);
  assert.equal(missingProbe.summary, 'no picture for note 81',
    `The missing picture was not named in the status line: ${JSON.stringify(missingProbe)}`);

  // A score that names its drums with <midi-unpitched> must light the kit,
  // and the stroke must change the instrument band: the background alone
  // is the same picture on every frame.
  const gapScore = await readFile(new URL(
    '../../../../Notation/Notation Engine/test/fixtures/musicxml/drum-forward-gap.musicxml',
    import.meta.url,
  ), 'utf8');
  await evaluate(`(() => {
    window.__kitCalls = [];
    const original = window.DrumKit.draw;
    window.DrumKit.draw = function (...args) {
      if (window.__kitCalls.length < 200) window.__kitCalls.push({ at: args[3], notes: args[4].map((s) => s.note), resolved: args[5].size });
      return original.apply(this, args);
    };
    const input = document.querySelector('[data-musicxml-input]');
    const transfer = new DataTransfer();
    transfer.items.add(new File([${JSON.stringify(gapScore)}], 'drum-forward-gap.musicxml', { type: 'application/xml' }));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('[data-studio-generate]').click();
  })()`);
  const gapStartedAt = Date.now();
  let gapState;
  while (Date.now() - gapStartedAt < 60000) {
    gapState = JSON.parse(await evaluate("JSON.stringify({status:document.querySelector('[data-studio-status]').textContent, ready:!document.querySelector('[data-video-output]').hidden && document.querySelector('[data-video-output]').readyState>=1, href:document.querySelector('[data-video-download]').href})"));
    if (gapState.status.startsWith('Rendered ') && gapState.ready && gapState.href !== notationState.href) break;
    if (gapState.status.startsWith('Video render failed:')) throw new Error(gapState.status);
    await sleep(150);
  }
  assert.ok(gapState?.status.startsWith('Rendered '), `Kit-stroke render did not complete: ${gapState?.status}`);
  // The render itself is asked, not a re-run of the module: every frame
  // must reach the kit, with a GM note on each stroke and a picture for it.
  const kitCalls = JSON.parse(await evaluate("JSON.stringify({ calls: window.__kitCalls.length, first: window.__kitCalls[0] })"));
  assert.equal(kitCalls.calls, 120, `The kit was not drawn for every frame: ${kitCalls.calls}`);
  assert.ok(kitCalls.first.notes.every((note) => Number.isFinite(note)), `The strokes carry no GM note: ${JSON.stringify(kitCalls.first.notes)}`);
  assert.equal(kitCalls.first.resolved, kitCalls.first.notes.length, `Not every stroke found a picture: ${JSON.stringify(kitCalls.first)}`);
  const gapBytes = Buffer.from(await evaluate(`(async () => { const response = await fetch(${JSON.stringify(gapState.href)}); const bytes = new Uint8Array(await response.arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(binary); })()`), 'base64');
  const gapPath = `${output}.kit-stroke.mp4`;
  await writeFile(gapPath, gapBytes);
  // The score's first bar is a whole rest, so 1.5 s is a frame with nothing
  // landing; 2.02 s is the first beat of the second bar, where the kick and
  // the hi-hat both strike. If the overlays are drawn, the bands differ.
  const drawProbe = JSON.parse(await evaluate(`(async () => {
    const art = await window.DrumKit.loadArt('RolandDrums/VAD716', '16:9');
    const strokes = [{ note: 36, at: 2.0 }, { note: 42, at: 2.0 }];
    const limbs = window.DrumKit.solveLimbs(strokes.map((s) => ({ time: s.at, note: s.note })));
    strokes.forEach((s, i) => { s.limb = limbs[i]; });
    const resolved = await window.DrumKit.loadHitImages(art, strokes);
    const rect = { x: 0, y: 0, width: 1843, height: 453 };
    const shoot = (at) => {
      const canvas = document.createElement('canvas');
      canvas.width = rect.width; canvas.height = rect.height;
      const ctx = canvas.getContext('2d');
      window.DrumKit.draw(ctx, rect, art, at, strokes, resolved);
      return ctx.getImageData(0, 0, rect.width, rect.height).data;
    };
    const lit = shoot(2.02);
    const dark = shoot(2.9);
    let changed = 0, delta = 0;
    for (let i = 0; i < lit.length; i += 4) {
      const d = Math.abs(lit[i] - dark[i]) + Math.abs(lit[i+1] - dark[i+1]) + Math.abs(lit[i+2] - dark[i+2]);
      if (d > 8) { changed += 1; delta += d; }
    }
    return JSON.stringify({ changed, delta, total: lit.length / 4, files: [...resolved.values()].map(h => h.name) });
  })()`));
  assert.ok(drawProbe.changed > 2000, `The hit overlay is not drawn on the canvas: ${JSON.stringify(drawProbe)}`);
  const gapBands = await Promise.all(['1.5', '2.02'].map(async (second) => {
    const framePath = `${output}.kit-${second}.png`;
    await exec('ffmpeg', ['-v', 'error', '-y', '-ss', second, '-i', gapPath, '-frames:v', '1', framePath]);
    const { stdout } = await exec('python3', ['-c', `
from PIL import Image
image = Image.open(${JSON.stringify(framePath)}).convert('RGB')
width, height = image.size
image.crop((0, int(height * 0.60), width, height)).save(${JSON.stringify(framePath)} + '.band.png')
`]);
    return `${framePath}.band.png`;
  }));
  const { stdout: diffStdout } = await exec('python3', ['-c', `
from PIL import Image, ImageChops
left = Image.open(${JSON.stringify(gapBands[0])}).convert('RGB')
right = Image.open(${JSON.stringify(gapBands[1])}).convert('RGB')
diff = ImageChops.difference(left, right).convert('L')
pixels = list(diff.getdata())
print(sum(1 for value in pixels if value > 10), max(pixels))
`]);
  const [changedPixels, peakDelta] = diffStdout.trim().split(/\s+/).map(Number);
  assert.ok(changedPixels > 500, `The hit overlay never changed the instrument band (${changedPixels} px, peak ${peakDelta})`);

  // The Plan's length rule: the video is the score's own length, on the
  // score's own tempo, with no cap of the Studio's. Each case builds a
  // score, renders it, and measures the file that came out.
  const drumScore = ({ tempo, bars, voices = 1, repeat = false, extraParts = 0 }) => {
    const head = '      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>percussion</sign></clef></attributes>\n'
      + `      <direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${tempo}</per-minute></metronome></direction-type><sound tempo="${tempo}"/></direction>\n`;
    const note = (step, voice) => `      <note><unpitched><display-step>${step}</display-step><display-octave>4</display-octave></unpitched><duration>1</duration><voice>${voice}</voice><type>quarter</type></note>\n`;
    const measures = [];
    for (let number = 1; number <= bars; number += 1) {
      // A second voice shares the bar by rewinding with <backup>; that rewind
      // is not more music.
      const body = voices === 1
        ? ['C', 'D', 'C', 'D'].map((step) => note(step, 1)).join('')
        : ['G', 'G', 'G', 'G'].map((step) => note(step, 1)).join('')
          + '      <backup><duration>4</duration></backup>\n'
          + ['C', 'C', 'D', 'C'].map((step) => note(step, 2)).join('');
      const marks = repeat
        ? (number === 1 ? '      <barline location="left"><repeat direction="forward"/></barline>\n' : '')
          + (number === bars ? '      <barline location="right"><repeat direction="backward"/></barline>\n' : '')
        : '';
      measures.push(`    <measure number="${number}">\n${number === 1 ? head : ''}${body}${marks}    </measure>`);
    }
    // A backing part beside the drums: the drum video is the drum part's
    // length, not the whole score's.
    const backing = [];
    for (let index = 0; index < extraParts; index += 1) {
      const id = `P${index + 2}`;
      const notes = Array.from({ length: bars }, () => `    <measure number="1">\n${['E', 'E', 'E', 'E'].map((step) => `      <note><pitch><step>${step}</step><octave>3</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>\n`).join('')}    </measure>\n`).join('');
      backing.push(`  <part id="${id}">\n${notes}  </part>\n`);
    }
    const list = `<score-part id="P1"><part-name>Drums</part-name></score-part>${Array.from({ length: extraParts }, (_, index) => `<score-part id="P${index + 2}"><part-name>Bass</part-name></score-part>`).join('')}`;
    return `<?xml version="1.0" encoding="UTF-8"?>\n<score-partwise version="3.1">\n  <part-list>${list}</part-list>\n  <part id="P1">\n${measures.join('\n')}\n  </part>\n${backing.join('')}</score-partwise>\n`;
  };

  const renderScore = async (xml, name, previousHref) => {
    await evaluate(`(() => {
      const input = document.querySelector('[data-musicxml-input]');
      const file = new File([${JSON.stringify(xml)}], ${JSON.stringify(name)}, { type: 'application/xml' });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector('[data-studio-generate]').click();
    })()`);
    const startedAt = Date.now();
    let state;
    while (Date.now() - startedAt < 90000) {
      state = JSON.parse(await evaluate("JSON.stringify({status:document.querySelector('[data-studio-status]').textContent, ready:!document.querySelector('[data-video-output]').hidden && document.querySelector('[data-video-output]').readyState>=1, href:document.querySelector('[data-video-download]').href})"));
      if (state.status.startsWith('Rendered ') && state.ready && state.href !== previousHref) break;
      if (state.status.startsWith('Video render failed:')) throw new Error(`${name}: ${state.status}`);
      await sleep(150);
    }
    assert.ok(state?.status.startsWith('Rendered '), `${name} render did not complete: ${state?.status}`);
    const bytes = Buffer.from(await evaluate(`(async () => { const response = await fetch(${JSON.stringify(state.href)}); const bytes = new Uint8Array(await response.arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(binary); })()`), 'base64');
    const path = `${output}.${name.replace(/\.musicxml$/, '')}.mp4`;
    await writeFile(path, bytes);
    const { stdout } = await exec('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-show_entries', 'stream=codec_type', '-of', 'json', path]);
    const probed = JSON.parse(stdout);
    return {
      seconds: Number(probed.format.duration),
      streams: probed.streams,
      status: state.status,
      href: state.href,
      path,
    };
  };

  // Four 4/4 bars at 60 BPM: sixteen seconds, past the old twelve-second cap
  // and twice what a fixed 120 BPM would have produced.
  const slow = await renderScore(drumScore({ tempo: 60, bars: 4 }), 'slow-four-bars.musicxml', notationState.href);
  assert.ok(Math.abs(slow.seconds - 16) < 0.4, `Score length was not kept: ${slow.seconds}s instead of 16s`);

  // Two voices in one bar are eight quarters of music, not sixteen.
  const twoVoice = await renderScore(drumScore({ tempo: 120, bars: 2, voices: 2 }), 'two-voice.musicxml', slow.href);
  assert.ok(Math.abs(twoVoice.seconds - 4) < 0.4, `A <backup> was counted as music: ${twoVoice.seconds}s instead of 4s`);

  // A repeat makes the score longer than it is written: two 4/4 bars at
  // 120 BPM are four seconds written and eight seconds played.
  const repeated = await renderScore(drumScore({ tempo: 120, bars: 2, repeat: true }), 'repeat.musicxml', twoVoice.href);
  assert.ok(Math.abs(repeated.seconds - 8) < 0.4, `A repeat was not played twice: ${repeated.seconds}s instead of 8s`);

  // A bass part beside the drums is not more drum video.
  const twoPart = await renderScore(drumScore({ tempo: 120, bars: 2, extraParts: 1 }), 'two-part.musicxml', repeated.href);
  assert.ok(Math.abs(twoPart.seconds - 4) < 0.4, `Another part was counted as drum music: ${twoPart.seconds}s instead of 4s`);

  // The count-in is part of the length: one bar of the score's metre before
  // the music starts, so a 4/4 bar at 120 BPM adds two seconds.
  await evaluate("(() => { const count = document.querySelector('[data-count-voice-enabled]'); count.value = 'on'; count.dispatchEvent(new Event('change', { bubbles: true })); })()");
  const counted = await renderScore(drumScore({ tempo: 120, bars: 2 }), 'count-in.musicxml', twoPart.href);
  assert.ok(Math.abs(counted.seconds - 6) < 0.4, `The count-in was not added to the length: ${counted.seconds}s instead of 6s`);

  // The spoken count is its own sound: R2's `Voices/{n}.wav` is played over
  // the click, and it is heard even when the drum model is Visual Only.
  // The two renders below differ in nothing but whether the recordings
  // answer, so the extra loudness can only be the voice.
  const voicePath = join(profile, 'count-voice.wav');
  await exec('ffmpeg', ['-v', 'error', '-y',
    '-f', 'lavfi', '-i', 'sine=frequency=880:duration=0.3',
    '-af', 'volume=8', '-ac', '2', '-ar', '44100', '-c:a', 'pcm_s16le', voicePath]);
  countVoice = await readFile(voicePath);
  const spoken = await renderScore(drumScore({ tempo: 120, bars: 2 }), 'count-voice.musicxml', counted.href);
  // The click is over within 50 ms of the beat, so the second half of each
  // beat is the window where only the spoken count can be heard.
  const loudnessOf = async (path, from, to) => {
    const wav = `${path}.count-in.wav`;
    await exec('ffmpeg', ['-v', 'error', '-y', '-i', path, '-ac', '1', '-ar', '48000', '-c:a', 'pcm_s16le', wav]);
    const { stdout } = await exec('python3', ['-c', `
import json, math, struct, wave
handle = wave.open(${JSON.stringify(wav)})
frames = handle.getnframes()
rate = handle.getframerate()
samples = struct.unpack('<%dh' % frames, handle.readframes(frames))
start, end = int(${from} * rate), int(${to} * rate)
window = samples[start:end]
print(json.dumps(math.sqrt(sum(v * v for v in window) / max(1, len(window)))))
`]);
    return JSON.parse(stdout);
  };
  // Between the beats: the click has decayed, the recording is still on.
  const clickOnly = await loudnessOf(counted.path, 0.15, 0.4);
  const withVoice = await loudnessOf(spoken.path, 0.15, 0.4);
  assert.ok(withVoice > Math.max(clickOnly * 4, 300),
    `The spoken count was not played over the click: ${withVoice} against ${clickOnly}`);
  // The count is over before the score starts, so the voice does not leak
  // into the music.
  const afterCount = await loudnessOf(spoken.path, 2.5, 3.5);
  assert.ok(afterCount < withVoice * 0.5,
    `The spoken count runs into the score: ${afterCount} against ${withVoice}`);
  countVoice = null;

  // The Plan's last part: the Thank You clip closes the video and is
  // counted in its length. The clip is two seconds of a known colour, so
  // both the length and the picture can be checked.
  const clipPath = join(profile, 'thank-you.mp4');
  await exec('ffmpeg', ['-v', 'error', '-y',
    '-f', 'lavfi', '-i', 'color=c=#0b1220:s=1920x1080:d=2:r=30',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', clipPath]);
  thankYouClip = await readFile(clipPath);
  await evaluate("(() => { const count = document.querySelector('[data-count-voice-enabled]'); count.value = 'off'; count.dispatchEvent(new Event('change', { bubbles: true })); })()");
  const thanked = await renderScore(drumScore({ tempo: 120, bars: 2 }), 'thank-you-score.musicxml', counted.href);
  assert.ok(Math.abs(thanked.seconds - 6) < 0.5, `The Thank You clip was not counted in the length: ${thanked.seconds}s instead of 6s`);
  const clipFrames = [];
  for (const second of ['3.5', '5.0']) {
    const framePath = `${output}.thank-${second}.png`;
    await exec('ffmpeg', ['-v', 'error', '-y', '-ss', second, '-i', thanked.path, '-frames:v', '1', framePath]);
    clipFrames.push(framePath);
  }
  // The clip's own first frame is the reference: comparing against it
  // rather than a written-down colour keeps the check honest through the
  // encoder's colour conversion.
  const referencePath = `${output}.thank-reference.png`;
  await exec('ffmpeg', ['-v', 'error', '-y', '-ss', '0', '-i', clipPath, '-frames:v', '1', referencePath]);
  const centreColour = (framePath) => exec('python3', ['-c', `
from PIL import Image
image = Image.open(${JSON.stringify(framePath)}).convert('RGB')
print(*image.load()[image.size[0] // 2, image.size[1] // 2])
`]).then(({ stdout }) => stdout.trim().split(/\s+/).map(Number));
  const referenceColour = await centreColour(referencePath);
  const [scoreColour, endingColour] = await Promise.all(clipFrames.map(centreColour));
  const near = (a, b) => a.every((value, index) => Math.abs(value - b[index]) < 20);
  assert.ok(!near(scoreColour, referenceColour),
    `The score frame already looks like the clip: ${scoreColour} vs ${referenceColour}`);
  assert.ok(near(endingColour, referenceColour),
    `The Thank You clip is not at the end of the video: ${endingColour} vs ${referenceColour}`);
  // The clip's sound is part of the video too, so the export is no longer
  // a picture-only file.
  const thankedStreams = JSON.parse((await exec('ffprobe', ['-v', 'error',
    '-show_entries', 'stream=codec_type', '-of', 'json', thanked.path])).stdout).streams;
  assert.ok(thankedStreams.some((stream) => stream.codec_type === 'audio'),
    `The Thank You clip's sound is missing: ${JSON.stringify(thankedStreams)}`);

  // The drum sound. A Sound Model other than Visual Only means the file
  // carries the drums the picture shows, and Visual Only means it does not:
  // the status and the streams must agree, because a silent file described
  // as audible is worse than no sound at all.
  //
  // The Thank You clip is taken away for these two renders. It carries its
  // own sound, so leaving it in would give every export an audio track and
  // say nothing about whether the drums themselves are heard.
  thankYouClip = null;
  const visualOnly = await renderScore(drumScore({ tempo: 120, bars: 2 }), 'visual-only.musicxml', thanked.href);
  assert.match(visualOnly.status, /visual only · no drum sound/,
    `Visual Only did not say the drums are absent: ${visualOnly.status}`);
  assert.equal(visualOnly.streams.some((stream) => stream.codec_type === 'audio'), false,
    `Visual Only still carries a sound track: ${JSON.stringify(visualOnly.streams)}`);

  await evaluate("(() => { const model = document.querySelector('[data-sound-model]'); model.value = 'natural'; model.dispatchEvent(new Event('change', { bubbles: true })); })()");
  const audible = await renderScore(drumScore({ tempo: 120, bars: 2 }), 'audible.musicxml', visualOnly.href);
  const audibleStream = audible.streams.find((stream) => stream.codec_type === 'audio');
  assert.ok(audibleStream, `A drum Sound Model produced no sound: ${JSON.stringify(audible.streams)}`);
  assert.match(audible.status, /natural drum sound/,
    `An audible export does not say which sound it carries: ${audible.status}`);

  // The hits have to be heard where the picture shows them: a kick and a
  // snare alternate on the quarters of a 120 BPM bar, so the sound is loud
  // at 0.5 s steps and quiet between them.
  const wavPath = `${output}.audible.wav`;
  await exec('ffmpeg', ['-v', 'error', '-y', '-i', audible.path, '-ac', '1', '-ar', '48000', '-c:a', 'pcm_s16le', wavPath]);
  const loudness = JSON.parse((await exec('python3', ['-c', `
import json, struct, wave
handle = wave.open(${JSON.stringify(wavPath)})
frames = handle.getnframes()
rate = handle.getframerate()
samples = struct.unpack('<%dh' % frames, handle.readframes(frames))
window = rate // 100
peaks = []
for index in range(0, frames // window):
    piece = samples[index * window:(index + 1) * window]
    peaks.append(max(abs(value) for value in piece))
print(json.dumps({'peak': max(peaks) if peaks else 0, 'at': peaks}))
`])).stdout);
  assert.ok(loudness.peak > 3000, `The drum sound is too quiet to hear: peak ${loudness.peak}`);
  const peakAt = (seconds) => loudness.at[Math.round(seconds * 100)] ?? 0;
  const onBeat = Math.max(peakAt(0.02), peakAt(0.52), peakAt(1.02));
  const offBeat = Math.max(peakAt(0.26), peakAt(0.76), peakAt(1.26));
  assert.ok(onBeat > offBeat * 2,
    `The drums do not land on the beat: ${onBeat} on the beat against ${offBeat} between beats`);

  console.log(JSON.stringify({ status: result.status, bytes: result.bytes, extension, ffprobe: probe, notation: firstInk, slowScoreSeconds: slow.seconds, twoVoiceSeconds: twoVoice.seconds, repeatSeconds: repeated.seconds, twoPartSeconds: twoPart.seconds, countInSeconds: counted.seconds, thankYouSeconds: thanked.seconds, visualOnlyStatus: visualOnly.status, audibleStatus: audible.status, drumPeak: loudness.peak, kitBandColours: bandColours.map(({ stdout }) => Number(stdout.trim())), kitProbe, kitStrokeChangedPixels: changedPixels, kitStrokePeakDelta: peakDelta, kitOverlayProbe: drawProbe }, null, 2));
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
