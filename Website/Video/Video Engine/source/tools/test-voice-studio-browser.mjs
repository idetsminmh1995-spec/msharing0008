#!/usr/bin/env node
/**
 * Chromium integration test for the Voice adapter: recording/import ->
 * Studio -> VideoEngine.
 *
 * A voice video is the one export here that has to carry sound, so this
 * checks the sound itself rather than only that an audio stream exists: a
 * known 440 Hz tone goes in, and the decoded output is measured for level
 * and for its pitch. It also checks what the page does when the microphone
 * is refused and when a file is not audio at all.
 *
 * Requires chromium, ffmpeg, ffprobe and Python 3 (Pillow for the frame's
 * ink).
 *   node tools/test-voice-studio-browser.mjs
 */
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const exec = promisify(execFile);
const WEBSITE_ROOT = resolve(fileURLToPath(new URL('../../../../Website/', import.meta.url)));
const CHROMIUM = process.env.CHROMIUM_BIN || 'chromium';
const profile = await mkdtemp(join(tmpdir(), 'studio-voice-chromium-'));
const output = join(profile, 'voice-output');
let server;
let browser;
let cdp;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The recording the test sings: a second and a half of silence, then a
 * second and a half of A440. The silence is what makes the waveform check
 * mean something -- a full-scale sine fills its band top to bottom and a
 * filled rectangle would pass, but only a waveform drawn from the sound
 * leaves the quiet half thin and the loud half tall.
 */
const TONE_SECONDS = 3;
const QUIET_SECONDS = 1.5;
const TONE_HZ = 440;

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

/** Puts a file into the page's input, the way a picker would. */
const selectAudio = (base64, name, type) => evaluate(`(() => {
  const binary = atob(${JSON.stringify(base64)});
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const input = document.querySelector('[data-voice-audio-input]');
  const transfer = new DataTransfer();
  transfer.items.add(new File([bytes], ${JSON.stringify(name)}, {type: ${JSON.stringify(type)}}));
  input.files = transfer.files;
  input.dispatchEvent(new Event('change', {bubbles: true}));
  return true;
})()`);

const status = () => evaluate("document.querySelector('[data-studio-status]').textContent");

async function waitForStatus(pattern, timeoutMs, label) {
  const startedAt = Date.now();
  let seen;
  while (Date.now() - startedAt < timeoutMs) {
    seen = await status();
    if (pattern.test(seen)) return seen;
    await sleep(120);
  }
  throw new Error(`${label} did not happen; status stayed: ${seen}`);
}

async function waitForRender(label, timeoutMs = 180000, previousHref = null) {
  const startedAt = Date.now();
  let state;
  while (Date.now() - startedAt < timeoutMs) {
    state = JSON.parse(await evaluate("JSON.stringify({status:document.querySelector('[data-studio-status]').textContent,download:!document.querySelector('[data-video-download]').hidden,href:document.querySelector('[data-video-download]').href,name:document.querySelector('[data-video-download]').download,ready:document.querySelector('[data-video-output]').readyState})"));
    if (state.status.startsWith('Rendered ') && state.download && state.ready >= 1 &&
        state.href !== previousHref) return state;
    if (state.status.startsWith('Voice video render failed:')) return state;
    await sleep(150);
  }
  throw new Error(`${label} did not finish: ${state?.status}`);
}

const bytesOf = (href) => evaluate(`(async () => {
  const response = await fetch(${JSON.stringify(href)});
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
})()`);

/**
 * The Thank You clip lives on the engine's R2 bucket, so the test answers
 * for it: `clip` is its bytes, or null for the 404 the Plan allows.
 */
let thankYouClip = null;
async function serveThankYou() {
  cdp.on('Fetch.requestPaused', async (event) => {
    if (!event.request.url.includes('/thank-you/')) {
      await cdp.call('Fetch.continueRequest', { requestId: event.requestId });
      return;
    }
    if (!thankYouClip) {
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
        { name: 'Content-Type', value: 'video/mp4' },
        { name: 'Access-Control-Allow-Origin', value: '*' },
      ],
      body: thankYouClip.toString('base64'),
    });
  });
  await cdp.call('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
}

try {
  // The tone goes in as a plain WAV: a format the browser decodes without
  // any help, so a decode failure here is the page's, not the file's.
  const tonePath = join(profile, 'voice-tone.wav');
  await exec('ffmpeg', ['-v', 'error', '-y',
    // `anullsrc` has no duration of its own, so the length is bounded on
    // the input or ffmpeg generates silence forever.
    '-f', 'lavfi', '-t', String(QUIET_SECONDS), '-i', 'anullsrc=r=48000:cl=mono',
    '-f', 'lavfi', '-i', `sine=frequency=${TONE_HZ}:duration=${TONE_SECONDS - QUIET_SECONDS}:sample_rate=48000`,
    '-filter_complex', '[0:a][1:a]concat=n=2:v=0:a=1[out]', '-map', '[out]',
    '-ac', '1', '-c:a', 'pcm_s16le', tonePath]);
  const toneBase64 = (await readFile(tonePath)).toString('base64');

  const notAudioPath = join(profile, 'not-audio.wav');
  await writeFile(notAudioPath, Buffer.from('this is not audio, whatever the extension says\n'.repeat(40)));
  const notAudioBase64 = (await readFile(notAudioPath)).toString('base64');

  const httpPort = await findFreePort();
  const debugPort = await findFreePort();
  server = spawn('python3', ['-m', 'http.server', String(httpPort), '--bind', '127.0.0.1'], {
    cwd: WEBSITE_ROOT,
    stdio: 'ignore',
  });
  await waitForHttp(`http://127.0.0.1:${httpPort}/index.html`, 10000, server);

  browser = spawn(CHROMIUM, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--mute-audio',
    '--use-fake-device-for-media-stream',
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${join(profile, 'profile')}`,
    `http://127.0.0.1:${httpPort}/index.html`,
  ], { stdio: 'ignore' });
  const devtools = await (await waitForHttp(`http://127.0.0.1:${debugPort}/json`, 15000, browser)).json();
  const page = devtools.find((entry) => entry.type === 'page' && entry.url.includes('/index.html'));
  assert.ok(page, 'Chromium did not open the Create Video page');
  cdp = new Cdp(page.webSocketDebuggerUrl);
  await cdp.call('Page.enable');
  await cdp.call('Runtime.enable');
  await serveThankYou();

  const homeStartedAt = Date.now();
  let homeReady = false;
  while (Date.now() - homeStartedAt < 10000) {
    homeReady = await evaluate("document.readyState === 'complete' && Boolean(document.querySelector('[data-tool=Voice]'))");
    if (homeReady) break;
    await sleep(100);
  }
  assert.ok(homeReady, 'Create Video page did not show the Voice tool card');
  await evaluate("document.querySelector('[data-tool=Voice]').click()");
  const navigationStartedAt = Date.now();
  let navigated = false;
  while (Date.now() - navigationStartedAt < 10000) {
    try {
      navigated = await evaluate("location.pathname.endsWith('/studio.html') && new URLSearchParams(location.search).get('tool') === 'voice'");
    } catch {
      navigated = false;
    }
    if (navigated) break;
    await sleep(100);
  }
  if (!navigated) {
    throw new Error(`The Voice tool card did not navigate to its Studio route; current URL: ${await evaluate('location.href')}`);
  }

  const startedAt = Date.now();
  let ready = false;
  while (Date.now() - startedAt < 15000) {
    ready = await evaluate("Boolean(window.VideoEngine && !document.querySelector('[data-voice-controls]').hidden)");
    if (ready) break;
    await sleep(100);
  }
  assert.ok(ready, 'Voice controls or VideoEngine did not load');
  assert.equal(await evaluate("document.querySelector('[data-studio-title]').textContent"), 'Voice Studio');
  assert.equal(await evaluate("document.querySelector('[data-studio-generate]').textContent"), 'Generate Voice Video');
  // A Voice route that showed the drum pads would render a drum video.
  assert.equal(await evaluate("document.querySelector('[data-studio-settings]').hidden"), true, 'Voice route exposed the shared Drum settings');
  assert.equal(await evaluate("document.querySelector('[data-guitar-controls]').hidden"), true, 'Voice route exposed the Guitar controls');
  assert.equal(await evaluate("document.querySelector('[data-piano-controls]').hidden"), true, 'Voice route exposed the Piano controls');
  assert.equal(await evaluate("document.querySelector('[data-violin-controls]').hidden"), true, 'Voice route exposed the Violin controls');

  // With nothing recorded there is nothing to render, and the button says so
  // by being unavailable rather than by failing after the click.
  assert.equal(await evaluate("document.querySelector('[data-studio-generate]').disabled"), true,
    'The Voice route offered a render before any sound was chosen');

  // A voice frame is the Title band over the waveform: there is no notation
  // to place and no instrument to mark.
  const layouts = JSON.parse(await evaluate(`(() => {
    const E = window.VideoEngine;
    const out = {};
    for (const [name, size] of Object.entries({'16:9':[1280,720], '1:1':[720,720], '9:16':[720,1280]})) {
      const layout = E.layoutFor('voice', { width: size[0], height: size[1] });
      out[name] = {
        parts: layout.parts,
        hasNotation: Boolean(layout.rects.notation),
        titleAboveWaveform: layout.rects.title.y < layout.rects.instrument.y,
        ratio: layout.ratio,
      };
    }
    return JSON.stringify(out);
  })()`));
  for (const [ratio, layout] of Object.entries(layouts)) {
    assert.deepEqual(layout.parts, ['title', 'instrument'], `The voice layout at ${ratio} has parts a voice cannot draw`);
    assert.equal(layout.hasNotation, false, `The voice layout at ${ratio} reserved a notation part`);
    assert.equal(layout.titleAboveWaveform, true, `The voice title is not above the waveform at ${ratio}`);
    assert.equal(layout.ratio, ratio);
  }

  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  const mobile = JSON.parse(await evaluate("JSON.stringify({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,columns:getComputedStyle(document.querySelector('[data-studio-workspace]')).gridTemplateColumns,controlsWidth:document.querySelector('[data-voice-controls]').getBoundingClientRect().width})"));
  assert.ok(mobile.scrollWidth <= mobile.width, `Voice Studio overflows at phone width: ${JSON.stringify(mobile)}`);
  assert.equal(mobile.columns.trim().split(/\s+/).length, 1, 'Voice Studio did not use one column on phone');
  assert.ok(mobile.controlsWidth > 0, 'Voice controls are not visible on phone');
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  const desktop = JSON.parse(await evaluate("JSON.stringify({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,columns:getComputedStyle(document.querySelector('[data-studio-workspace]')).gridTemplateColumns})"));
  assert.ok(desktop.scrollWidth <= desktop.width, `Voice Studio overflows at desktop width: ${JSON.stringify(desktop)}`);
  assert.equal(desktop.columns.trim().split(/\s+/).length, 2, 'Voice Studio did not use two columns on desktop');

  // The microphone is the user's to allow. A refusal is reported as a
  // refusal, and the page stays usable -- the file path still works.
  await cdp.call('Browser.setPermission', {
    permission: { name: 'microphone' },
    setting: 'denied',
    origin: `http://127.0.0.1:${httpPort}`,
  });
  await evaluate("document.querySelector('[data-voice-record]').click()");
  const denied = await waitForStatus(/permission was denied/i, 15000, 'A refused microphone');
  assert.match(denied, /choose a recording instead/i, `A refused microphone did not offer the file path: ${denied}`);
  assert.equal(await evaluate("document.querySelector('[data-voice-record]').textContent"), 'Record from microphone',
    'A refused microphone left the button stuck in its recording state');
  assert.equal(await evaluate("document.querySelector('[data-studio-generate]').disabled"), true,
    'A refused microphone left a render available with no sound');

  // A file that is not audio must be refused before any render starts.
  await selectAudio(notAudioBase64, 'not-audio.wav', 'audio/wav');
  const undecodable = await waitForStatus(/could not be decoded/i, 20000, 'An undecodable file');
  assert.match(undecodable, /could not be decoded/i, `A file that is not audio was not refused: ${undecodable}`);
  assert.equal(await evaluate("document.querySelector('[data-video-download]').hidden"), true,
    'A file that is not audio still produced a download');

  // Now the real thing: the known tone, rendered in portrait.
  await selectAudio(toneBase64, 'voice-tone.wav', 'audio/wav');
  const loaded = await waitForStatus(/is ready/i, 20000, 'The tone file');
  assert.match(loaded, /is ready/i);
  const summary = await evaluate("document.querySelector('[data-voice-summary]').textContent");
  assert.match(summary, /voice-tone\.wav/, `The summary does not name the recording: ${summary}`);
  assert.match(summary, /3\.00 sec/, `The summary does not report the recording's length: ${summary}`);
  // The one thing this page must not do is claim a silent video is audible.
  assert.match(summary, /audible/, `The summary does not say the export will be audible: ${summary}`);
  assert.equal(await evaluate("document.querySelector('[data-studio-generate]').disabled"), false,
    'The generate button stayed unavailable with a decoded recording');

  await evaluate("(() => { const el = document.querySelector('[data-voice-aspect]'); el.value = '9x16'; el.dispatchEvent(new Event('change', {bubbles:true})); })()");
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const state = await waitForRender('Voice render');
  assert.ok(state.status.startsWith('Rendered '), `Voice render did not complete: ${state.status}`);
  assert.match(state.status, /audible/, `Voice export does not say it carries sound: ${state.status}`);
  assert.match(state.status, /no Thank You clip/, 'Voice export does not say its ending is missing');
  assert.match(state.name, /^voice-9x16\.(mp4|webm)$/);

  const videoBytes = Buffer.from(await bytesOf(state.href), 'base64');
  assert.ok(videoBytes.length > 1000, 'Voice export is unexpectedly small');
  const extension = state.name.split('.').pop();
  const videoPath = `${output}.${extension}`;
  await writeFile(videoPath, videoBytes);
  const probe = JSON.parse((await exec('ffprobe', ['-v', 'error',
    '-show_entries', 'format=format_name,duration',
    '-show_entries', 'stream=codec_type,codec_name,width,height,sample_rate,channels',
    '-of', 'json', videoPath])).stdout);
  const videoStream = probe.streams.find((stream) => stream.codec_type === 'video');
  const audioStream = probe.streams.find((stream) => stream.codec_type === 'audio');
  assert.ok(videoStream, 'Voice output has no video stream');
  assert.ok(audioStream, `Voice output has no audio stream, so the video is silent: ${JSON.stringify(probe.streams)}`);
  assert.equal(videoStream.width, 720, 'Portrait voice video width is wrong');
  assert.equal(videoStream.height, 1280, 'Portrait voice video height is wrong');
  assert.equal(Number(audioStream.channels), 1, 'The mono recording did not stay mono');
  const seconds = Number(probe.format.duration);
  assert.ok(Math.abs(seconds - TONE_SECONDS) < 0.4, `Voice video is not the recording's length: ${seconds}s instead of ${TONE_SECONDS}s`);

  // An audio stream can still be silence. This measures the sound itself.
  const { stderr: levels } = await exec('ffmpeg', ['-v', 'info', '-i', videoPath, '-af', 'volumedetect', '-f', 'null', '-'], { maxBuffer: 8 << 20 }).catch((error) => ({ stderr: error.stderr }));
  const mean = /mean_volume:\s*(-?[\d.]+) dB/.exec(levels ?? '');
  assert.ok(mean, `The export's level could not be measured: ${levels}`);
  assert.ok(Number(mean[1]) > -40, `The exported audio is silence: mean volume ${mean[1]} dB`);

  // Level alone would pass a hiss, so the pitch is measured too: a 440 Hz
  // tone crosses zero 880 times a second.
  const decodedPath = `${output}-audio.wav`;
  await exec('ffmpeg', ['-v', 'error', '-y', '-i', videoPath, '-ac', '1', '-ar', '48000', '-c:a', 'pcm_s16le', decodedPath]);
  const { stdout: pitchOut } = await exec('python3', ['-c', `
import sys, wave
with wave.open(sys.argv[1]) as handle:
    rate = handle.getframerate()
    frames = handle.readframes(handle.getnframes())
samples = memoryview(frames).cast('h')
# Inside the loud half, away from the join and from codec padding.
start = int(rate * 2.0)
end = int(rate * 2.9)
crossings = 0
previous = samples[start]
for index in range(start + 1, end):
    current = samples[index]
    if (previous < 0) != (current < 0):
        crossings += 1
    previous = current
print(crossings, end - start, rate)
`, decodedPath]);
  const [crossings, span, rate] = pitchOut.trim().split(/\s+/).map(Number);
  const measuredHz = (crossings / 2) * (rate / span);
  assert.ok(Math.abs(measuredHz - TONE_HZ) < 25,
    `The exported sound is not the tone that went in: ${measuredHz.toFixed(1)} Hz instead of ${TONE_HZ} Hz`);

  // The waveform must be in the pixels, and it must follow the sound.
  //
  // A lossy round trip moves a near-black background far enough that
  // "is this pixel background?" answers nothing, so brightness is what is
  // measured: the waveform is drawn in pale grey and blue, well above the
  // dark frame. The recording is silent for its first half, so the quiet
  // half of the band has to be a thin line and the loud half a tall bar.
  const framePath = `${output}-frame.png`;
  await exec('ffmpeg', ['-v', 'error', '-y', '-ss', '1.0', '-i', videoPath, '-frames:v', '1', framePath]);
  const { stdout: ink } = await exec('python3', ['-c', `
from PIL import Image
image = Image.open(${JSON.stringify(framePath)}).convert('RGB')
width, height = image.size
pixels = image.load()
top = int(height * 0.35)
bottom = int(height * 0.80)
middle = width // 2

def bright(x, y):
    r, g, b = pixels[x, y]
    return 0.299 * r + 0.587 * g + 0.114 * b > 80

# The playhead is a full-height line at the frame's own moment (1.0 s of
# 3.0 s, so a third of the way across); it is not the waveform, so its
# columns are left out of the thickness.
playhead = width // 3
def mean_thickness(left, right):
    total = 0
    columns = 0
    for x in range(left, right):
        if abs(x - playhead) <= 6:
            continue
        total += sum(1 for y in range(top, bottom) if bright(x, y))
        columns += 1
    return total / max(1, columns)

lit = sum(1 for y in range(0, height, 2) for x in range(0, width, 2) if bright(x, y))
print(mean_thickness(0, middle), mean_thickness(middle, width), lit)
`]);
  const [quietThickness, loudThickness, litPixels] = ink.trim().split(/\s+/).map(Number);
  assert.ok(litPixels > 0, 'The voice frame has nothing drawn on it');
  assert.ok(loudThickness > 8,
    `The loud half of the waveform is not drawn: it is ${loudThickness.toFixed(1)} px thick`);
  assert.ok(quietThickness < 4,
    `The silent half of the recording is drawn as sound: it is ${quietThickness.toFixed(1)} px thick`);
  assert.ok(loudThickness > quietThickness * 5,
    `The waveform does not follow the recording: quiet ${quietThickness.toFixed(1)} px, loud ${loudThickness.toFixed(1)} px`);

  // Determinism: the same moment drawn twice is the same frame.
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const again = await waitForRender('Voice render again', 180000, state.href);
  assert.ok(again.status.startsWith('Rendered '), `The second Voice render did not complete: ${again.status}`);
  const againPath = `${output}-again.${extension}`;
  await writeFile(againPath, Buffer.from(await bytesOf(again.href), 'base64'));
  const againFrame = `${output}-again-frame.png`;
  await exec('ffmpeg', ['-v', 'error', '-y', '-ss', '1.0', '-i', againPath, '-frames:v', '1', againFrame]);
  const { stdout: drift } = await exec('python3', ['-c', `
from PIL import Image
first = Image.open(${JSON.stringify(framePath)}).convert('RGB')
second = Image.open(${JSON.stringify(againFrame)}).convert('RGB')
one, two = first.load(), second.load()
width, height = first.size
moved = 0
for y in range(height):
    for x in range(width):
        delta = sum(abs(one[x, y][channel] - two[x, y][channel]) for channel in range(3))
        if delta > 12:
            moved += 1
print(moved, width * height)
`]);
  const [movedPixels, totalPixels] = drift.trim().split(/\s+/).map(Number);
  assert.ok(movedPixels / totalPixels < 0.0005,
    `The same recording drew a different frame the second time: ${movedPixels} of ${totalPixels} pixels moved`);

  // A render the user stops leaves the previous file in place and says so.
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  await sleep(120);
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const cancelled = await waitForStatus(/cancelled/i, 30000, 'A cancelled voice render');
  assert.match(cancelled, /cancelled/i);
  assert.equal(await evaluate("document.querySelector('[data-video-download]').href"), again.href,
    'A cancelled render replaced the previous video');
  assert.equal(await evaluate("document.querySelector('[data-studio-generate]').textContent"), 'Generate Voice Video',
    'The generate button did not come back after a cancellation');

  // A recording from the microphone is a real input path, not a file the
  // user happened to have. The fake device stands in for a real one.
  await cdp.call('Browser.setPermission', {
    permission: { name: 'microphone' },
    setting: 'granted',
    origin: `http://127.0.0.1:${httpPort}`,
  });
  await evaluate("document.querySelector('[data-voice-record]').click()");
  await waitForStatus(/Recording from the microphone/i, 15000, 'Microphone capture');
  assert.equal(await evaluate("document.querySelector('[data-voice-record]').textContent"), 'Stop recording',
    'The record button does not show that it is recording');
  await sleep(1600);
  await evaluate("document.querySelector('[data-voice-record]').click()");
  const recorded = await waitForStatus(/recording is ready/i, 30000, 'A finished recording');
  assert.match(recorded, /recording is ready/i);
  const recordedSummary = await evaluate("document.querySelector('[data-voice-summary]').textContent");
  assert.match(recordedSummary, /Microphone recording/, `A finished recording is not named as one: ${recordedSummary}`);
  assert.match(recordedSummary, /audible/, `A finished recording is not marked audible: ${recordedSummary}`);
  assert.equal(await evaluate("document.querySelector('[data-studio-generate]').disabled"), false,
    'A finished recording left no render available');

  // The Plan's last part of the length: the Thank You clip closes the video
  // and is counted in it, sound and all.
  const clipPath = join(profile, 'thank-you.mp4');
  await exec('ffmpeg', ['-v', 'error', '-y',
    '-f', 'lavfi', '-i', 'color=c=#0b1220:s=1280x720:d=2:r=30',
    '-f', 'lavfi', '-i', 'sine=frequency=660:duration=2',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', clipPath]);
  thankYouClip = await readFile(clipPath);
  await selectAudio(toneBase64, 'voice-tone.wav', 'audio/wav');
  await waitForStatus(/is ready/i, 20000, 'The tone file again');
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const thanked = await waitForRender('Voice render with a Thank You clip', 180000, again.href);
  assert.ok(thanked.status.startsWith('Rendered '), `Voice render did not complete: ${thanked.status}`);
  assert.match(thanked.status, /Thank You ending/, 'Voice export does not report its Thank You ending');
  const thankedPath = `${output}-thanked.${extension}`;
  await writeFile(thankedPath, Buffer.from(await bytesOf(thanked.href), 'base64'));
  const thankedProbe = JSON.parse((await exec('ffprobe', ['-v', 'error',
    '-show_entries', 'format=duration', '-show_entries', 'stream=codec_type',
    '-of', 'json', thankedPath])).stdout);
  const thankedSeconds = Number(thankedProbe.format.duration);
  assert.ok(Math.abs(thankedSeconds - (TONE_SECONDS + 2)) < 0.6,
    `The Thank You clip was not counted in the length: ${thankedSeconds}s instead of ${TONE_SECONDS + 2}s`);
  assert.ok(thankedProbe.streams.some((stream) => stream.codec_type === 'audio'),
    `The Thank You clip's sound is missing: ${JSON.stringify(thankedProbe.streams)}`);

  console.log(JSON.stringify({
    status: state.status, summary, recordedSummary, bytes: videoBytes.length, download: state.name,
    audio: { codec: audioStream.codec_name, channels: audioStream.channels, sampleRate: audioStream.sample_rate },
    meanVolumeDb: Number(mean[1]), measuredHz: Number(measuredHz.toFixed(1)),
    seconds, thankYouSeconds: thankedSeconds,
    ink: { quietThickness, loudThickness, litPixels },
    layouts,
  }, null, 2));
} finally {
  cdp?.close();
  for (const child of [browser, server]) {
    if (!child || child.exitCode !== null) continue;
    child.kill('SIGTERM');
  }
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
}
