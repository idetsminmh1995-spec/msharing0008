#!/usr/bin/env node
/**
 * Chromium integration test for Piano Hand Human Engine -> Studio -> VideoEngine.
 *
 * Requires chromium, ffprobe, and Python 3 (Pillow for the frame's ink).
 *   node tools/test-piano-studio-browser.mjs
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
const profile = await mkdtemp(join(tmpdir(), 'studio-piano-chromium-'));
const output = join(profile, 'piano-output');
let server;
let browser;
let cdp;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Two 4/4 bars at the default 120 BPM: four seconds. The second bar holds
 * one note across the barline with a tie, which is one sound written twice.
 */
const PIANO_SCORE = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>Piano Studio Test</work-title></work>
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type></note>
      <note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type></note>
      <note><chord/><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type></note>
    </measure>
    <measure number="2">
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>half</type>
        <tie type="start"/><notations><tied type="start"/></notations></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>half</type>
        <tie type="stop"/><notations><tied type="stop"/></notations></note>
    </measure>
  </part>
</score-partwise>`;

/** A score with no pitched note at all: there are no keys to press. */
const NO_PITCH_SCORE = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <note><rest/><duration>4</duration><type>whole</type></note>
  </measure></part>
</score-partwise>`;

/** Every note is below the 88-key piano's lowest key (A0), so nothing can be pressed. */
const OUT_OF_RANGE_SCORE = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
      <clef><sign>G</sign><line>2</line></clef></attributes>
    <note><pitch><step>C</step><octave>0</octave></pitch><duration>4</duration><type>whole</type></note>
  </measure></part>
</score-partwise>`;

/** One unplayable note below A0 among notes the piano can play. */
const MIXED_RANGE_SCORE = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
      <clef><sign>G</sign><line>2</line></clef></attributes>
    <note><pitch><step>C</step><octave>0</octave></pitch><duration>1</duration><type>quarter</type></note>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
  </measure></part>
</score-partwise>`;

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

/** Puts a score into the page's file input, the way a picker would. */
const selectScore = (xml, name) => evaluate(`(() => {
  const input = document.querySelector('[data-piano-musicxml-input]');
  const transfer = new DataTransfer();
  transfer.items.add(new File([${JSON.stringify(xml)}], ${JSON.stringify(name)}, {type: 'application/xml'}));
  input.files = transfer.files;
  input.dispatchEvent(new Event('change', {bubbles: true}));
  return true;
})()`);

// A page that refuses a score says why and stops; there is no file to wait for.
const REFUSAL = /no pitched notes|outside an 88-key piano|Choose a MusicXML file/;

async function waitForRender(label, timeoutMs = 120000, previousHref = null) {
  const startedAt = Date.now();
  let state;
  while (Date.now() - startedAt < timeoutMs) {
    state = JSON.parse(await evaluate("JSON.stringify({status:document.querySelector('[data-studio-status]').textContent,download:!document.querySelector('[data-video-download]').hidden,href:document.querySelector('[data-video-download]').href,name:document.querySelector('[data-video-download]').download,ready:document.querySelector('[data-video-output]').readyState})"));
    // A previous render leaves its own download in place, so a finished
    // render is one whose status says so and whose file is new.
    if (state.status.startsWith('Rendered ') && state.download && state.ready >= 1 &&
        state.href !== previousHref) return state;
    if (state.status.startsWith('Piano video render failed:')) return state;
    if (!state.download && REFUSAL.test(state.status)) return state;
    await sleep(150);
  }
  throw new Error(`${label} did not finish: ${state?.status}`);
}

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
  await serveThankYou();

  const homeStartedAt = Date.now();
  let homeReady = false;
  while (Date.now() - homeStartedAt < 10000) {
    homeReady = await evaluate("document.readyState === 'complete' && Boolean(document.querySelector('[data-tool=Piano]'))");
    if (homeReady) break;
    await sleep(100);
  }
  assert.ok(homeReady, 'Create Video page did not show the Piano tool card');
  await evaluate("document.querySelector('[data-tool=Piano]').click()");
  const navigationStartedAt = Date.now();
  let navigated = false;
  while (Date.now() - navigationStartedAt < 10000) {
    try {
      navigated = await evaluate("location.pathname.endsWith('/studio.html') && new URLSearchParams(location.search).get('tool') === 'piano'");
    } catch {
      navigated = false;
    }
    if (navigated) break;
    await sleep(100);
  }
  if (!navigated) {
    throw new Error(`Piano tool card did not navigate to its Studio route; current URL: ${await evaluate('location.href')}`);
  }

  const startedAt = Date.now();
  let ready = false;
  while (Date.now() - startedAt < 15000) {
    ready = await evaluate("Boolean(window.VideoEngine && window.PianoHandEngine && !document.querySelector('[data-piano-controls]').hidden)");
    if (ready) break;
    await sleep(100);
  }
  assert.ok(ready, 'Piano bundle, VideoEngine, or Piano controls did not load');
  assert.equal(await evaluate("document.querySelector('[data-studio-title]').textContent"), 'Piano Studio');
  assert.equal(await evaluate("document.querySelector('[data-studio-settings]').hidden"), true, 'Piano route exposed the shared Drum settings');
  assert.equal(await evaluate("document.querySelector('[data-guitar-controls]').hidden"), true, 'Piano route exposed the Guitar controls');

  const controls = JSON.parse(await evaluate("JSON.stringify({aspect:document.querySelector('[data-piano-aspect]').value,name:document.querySelector('[data-piano-musicxml-name]').textContent})"));
  assert.equal(controls.aspect, '16x9');
  assert.equal(controls.name, 'No file selected');

  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  const mobile = JSON.parse(await evaluate("JSON.stringify({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,columns:getComputedStyle(document.querySelector('[data-studio-workspace]')).gridTemplateColumns,controlsWidth:document.querySelector('[data-piano-controls]').getBoundingClientRect().width})"));
  assert.ok(mobile.scrollWidth <= mobile.width, `Piano Studio overflows at phone width: ${JSON.stringify(mobile)}`);
  assert.equal(mobile.columns.trim().split(/\s+/).length, 1, 'Piano Studio did not use one column on phone');
  assert.ok(mobile.controlsWidth > 0, 'Piano controls are not visible on phone');
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  const desktop = JSON.parse(await evaluate("JSON.stringify({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,columns:getComputedStyle(document.querySelector('[data-studio-workspace]')).gridTemplateColumns})"));
  assert.ok(desktop.scrollWidth <= desktop.width, `Piano Studio overflows at desktop width: ${JSON.stringify(desktop)}`);
  assert.equal(desktop.columns.trim().split(/\s+/).length, 2, 'Piano Studio did not use two columns on desktop');

  // The keyboard the engine draws is a fact about the instrument: 88 keys,
  // and a black key sits between the two whites it belongs between.
  const geometry = JSON.parse(await evaluate(`(() => {
    const P = window.PianoHandEngine;
    const keyboard = P.buildKeyboard(88);
    const c4 = keyboard.byMidi.get(60);
    const cSharp4 = keyboard.byMidi.get(61);
    const boundary = (P.whiteIndex(62) - P.whiteIndex(21)) * P.WHITE_KEY_WIDTH_MM;
    return JSON.stringify({
      count: keyboard.keys.length,
      first: keyboard.first,
      last: keyboard.last,
      c4White: c4 ? c4.isBlack === false : null,
      cSharpBlack: cSharp4 ? cSharp4.isBlack === true : null,
      cSharpCentre: cSharp4 ? cSharp4.x + cSharp4.width / 2 - boundary : null,
      press: [P.keyPressDepthMm(0, {timeMs: 100, durationMs: 200}), P.keyPressDepthMm(200, {timeMs: 100, durationMs: 200})],
      dip: P.KEY_DIP_MM,
    });
  })()`));
  assert.equal(geometry.count, 88, 'The engine keyboard is not an 88-key piano');
  assert.equal(geometry.first, 21);
  assert.equal(geometry.last, 108);
  assert.equal(geometry.c4White, true, 'C4 is not a white key');
  assert.equal(geometry.cSharpBlack, true, 'C#4 is not a black key');
  assert.ok(Math.abs(geometry.cSharpCentre) < 1, `C#4 is not centred on the white-key boundary: ${geometry.cSharpCentre}mm off`);
  assert.equal(geometry.press[0], 0, 'A key is down before its note starts');
  assert.equal(geometry.press[1], geometry.dip, 'A key does not reach full depth while its note sounds');

  // A score with nothing to press is refused, not rendered as an empty piano.
  await selectScore(NO_PITCH_SCORE, 'rests-only.musicxml');
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const refused = await waitForRender('A score with no pitched notes');
  assert.match(refused.status, /no pitched notes/, `A score with no pitched notes was not refused: ${refused.status}`);
  assert.equal(refused.download, false, 'A score with no pitched notes still produced a download');

  // A score the instrument cannot reach is refused too: an empty keyboard
  // with a few notes crammed under it would be a picture of nothing.
  await selectScore(OUT_OF_RANGE_SCORE, 'below-the-keyboard.musicxml');
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const unreachable = await waitForRender('A score below the keyboard');
  assert.match(unreachable.status, /outside an 88-key piano/, `A score below A0 was not refused: ${unreachable.status}`);
  assert.equal(unreachable.download, false, 'A score below A0 still produced a download');

  // One unplayable note among playable ones does not cost the whole video:
  // the keys it can reach are drawn and the rest of the file is ignored.
  await selectScore(MIXED_RANGE_SCORE, 'one-note-below-the-keyboard.musicxml');
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const mixed = await waitForRender('A score with one unplayable note');
  assert.ok(mixed.status.startsWith('Rendered '), `One unplayable note stopped the render: ${mixed.status}`);

  await selectScore(PIANO_SCORE, 'piano-studio-test.musicxml');
  const selected = JSON.parse(await evaluate("JSON.stringify({name:document.querySelector('[data-piano-musicxml-name]').textContent,status:document.querySelector('[data-studio-status]').textContent})"));
  assert.equal(selected.name, 'piano-studio-test.musicxml', 'MusicXML selection name was not displayed');
  assert.match(selected.status, /MusicXML selected/);

  await evaluate("(() => { const set = (selector, value) => { const el = document.querySelector(selector); el.value = value; el.dispatchEvent(new Event('change', {bubbles:true})); }; set('[data-piano-aspect]', '9x16'); })()");
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const state = await waitForRender('Piano render', 120000, mixed.href);
  assert.ok(state.status.startsWith('Rendered '), `Piano render did not complete: ${state.status}`);
  assert.match(state.status, /no Thank You clip/, 'Piano export does not say its ending is missing');
  assert.ok(state.href.startsWith('blob:'), 'Piano export is not backed by a Blob URL');
  assert.match(state.name, /^piano-9x16\.(mp4|webm)$/);

  const result = await evaluate(`(async () => { const response = await fetch(${JSON.stringify(state.href)}); const bytes = new Uint8Array(await response.arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return { base64: btoa(binary), bytes: bytes.length, status: document.querySelector('[data-studio-status]').textContent, summary: document.querySelector('[data-piano-summary]').textContent }; })()`);
  // Six notes in the first bar, then the tie's two halves joined into one.
  assert.match(result.summary, /7 notes/, `Piano summary did not join the tie: ${result.summary}`);
  const videoBytes = Buffer.from(result.base64, 'base64');
  assert.ok(videoBytes.length > 1000, 'Piano export is unexpectedly small');
  const extension = state.name.split('.').pop();
  const videoPath = `${output}.${extension}`;
  await writeFile(videoPath, videoBytes);
  const { stdout } = await exec('ffprobe', [
    '-v', 'error', '-show_entries', 'format=format_name,duration',
    '-show_entries', 'stream=codec_type,codec_name,width,height', '-of', 'json', videoPath,
  ]);
  const probe = JSON.parse(stdout);
  const videoStream = probe.streams.find((stream) => stream.codec_type === 'video');
  const audioStream = probe.streams.find((stream) => stream.codec_type === 'audio');
  assert.ok(videoStream, 'Piano output has no video stream');
  assert.equal(audioStream, undefined, 'Piano output claims an audio track the engine cannot make');
  assert.equal(videoStream.width, 720, 'Portrait piano video width is wrong');
  assert.equal(videoStream.height, 1280, 'Portrait piano video height is wrong');
  // The Plan's length rule, with no cap of the page's own: two 4/4 bars at
  // the default 120 BPM are four seconds, and no 12-second cap applies.
  const scoreSeconds = Number(probe.format.duration);
  assert.ok(Math.abs(scoreSeconds - 4) < 0.4, `Piano video is not the score's length: ${scoreSeconds}s instead of 4s`);

  // The keyboard must actually be in the pixels, not just in the shape list.
  const framePath = `${output}-frame.png`;
  await exec('ffmpeg', ['-v', 'error', '-y', '-ss', '1.0', '-i', videoPath, '-frames:v', '1', framePath]);
  const { stdout: ink } = await exec('python3', ['-c', `
from PIL import Image
image = Image.open(${JSON.stringify(framePath)}).convert('RGB')
width, height = image.size
pixels = image.load()
background = 0
other = 0
for y in range(0, height, 2):
    for x in range(0, width, 2):
        r, g, b = pixels[x, y]
        if abs(r - 11) + abs(g - 16) + abs(b - 24) <= 24: background += 1
        else: other += 1
print(background, other)
`]);
  const [backgroundPixels, otherPixels] = ink.trim().split(/\s+/).map(Number);
  assert.ok(otherPixels > backgroundPixels, `The piano frame is mostly empty: ${otherPixels} painted of ${backgroundPixels + otherPixels}`);

  // The keyboard is the last band of a portrait frame, so it must reach the
  // bottom gutter. A keyboard floating above an empty strip would mean the
  // page reserved a band taller than the keys and left the rest as nothing.
  const { stdout: bottom } = await exec('python3', ['-c', `
from PIL import Image
image = Image.open(${JSON.stringify(framePath)}).convert('RGB')
width, height = image.size
pixels = image.load()
last = 0
for y in range(height):
    for x in range(0, width, 2):
        r, g, b = pixels[x, y]
        if abs(r - 11) + abs(g - 16) + abs(b - 24) > 24:
            last = y
            break
print(last, height)
`]);
  const [lastPaintedRow, frameHeight] = bottom.trim().split(/\s+/).map(Number);
  assert.ok(frameHeight - lastPaintedRow <= 40,
    `The keyboard leaves an empty band under it: last painted row ${lastPaintedRow} of ${frameHeight}`);

  // Frame determinism: the same score drawn twice is the same pixels. A
  // renderer that read the wall clock, or kept state between frames, would
  // drift here even though both files are the right length.
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const again = await waitForRender('Piano render again', 120000, state.href);
  assert.ok(again.status.startsWith('Rendered '), `The second Piano render did not complete: ${again.status}`);
  const againBytes = Buffer.from(await evaluate(`(async () => { const response = await fetch(${JSON.stringify(again.href)}); const bytes = new Uint8Array(await response.arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(binary); })()`), 'base64');
  const againPath = `${output}-again.mp4`;
  await writeFile(againPath, againBytes);
  const againFrame = `${output}-again-frame.png`;
  await exec('ffmpeg', ['-v', 'error', '-y', '-ss', '1.0', '-i', againPath, '-frames:v', '1', againFrame]);
  // An MP4 is lossy, so two encodings of the same frame differ by a few
  // units at hard edges. A moved cursor or a drifting clock is a different
  // animal: thousands of pixels, far apart in colour. So the test allows
  // the encoder's rounding and nothing more.
  const { stdout: drift } = await exec('python3', ['-c', `
from PIL import Image
first = Image.open(${JSON.stringify(framePath)}).convert('RGB')
second = Image.open(${JSON.stringify(againFrame)}).convert('RGB')
one, two = first.load(), second.load()
width, height = first.size
moved = worst = 0
for y in range(height):
    for x in range(width):
        delta = sum(abs(one[x, y][channel] - two[x, y][channel]) for channel in range(3))
        if delta > 12:
            moved += 1
            worst = max(worst, delta)
print(moved, worst, width * height)
`]);
  const [movedPixels, worstDelta, totalPixels] = drift.trim().split(/\s+/).map(Number);
  assert.ok(movedPixels / totalPixels < 0.0005,
    `The same score drew a different frame the second time: ${movedPixels} of ${totalPixels} pixels moved`);
  assert.ok(worstDelta <= 48, `The second render changed a colour rather than rounding one: delta ${worstDelta}`);

  // A render the user stops leaves no file behind and says so, rather than
  // finishing in the background and swapping a video in under them.
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  await sleep(120);
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const cancelledAt = Date.now();
  let cancelledState;
  while (Date.now() - cancelledAt < 30000) {
    cancelledState = JSON.parse(await evaluate("JSON.stringify({status:document.querySelector('[data-studio-status]').textContent,download:!document.querySelector('[data-video-download]').hidden,href:document.querySelector('[data-video-download]').href})"));
    if (/cancelled/i.test(cancelledState.status)) break;
    await sleep(100);
  }
  assert.match(cancelledState?.status ?? '', /cancelled/i, `Cancelling a Piano render did not report a cancellation: ${cancelledState?.status}`);
  assert.equal(cancelledState.href, again.href, 'A cancelled render replaced the previous video');
  assert.equal(await evaluate("document.querySelector('[data-studio-generate]').textContent"), 'Generate Piano Video',
    'The generate button did not come back after a cancellation');

  // The keys must be the instrument's own shape, not equal-width stripes:
  // a black key is 11mm on a 23.5mm white, so it is a little under half as
  // wide on screen. Equal widths would mean the geometry never reached the
  // canvas, and a keyboard of even stripes does not read as a piano.
  const { stdout: keyWidths } = await exec('python3', ['-c', `
from PIL import Image
image = Image.open(${JSON.stringify(framePath)}).convert('RGB')
width, height = image.size
pixels = image.load()
def runs(y, test):
    out, current, count = [], None, 0
    for x in range(width):
        value = test(pixels[x, y])
        if current is None or value == current:
            count += 1
            current = value
        else:
            out.append((current, count))
            current, count = value, 1
    out.append((current, count))
    return out
black = lambda pixel: sum(pixel) < 160
white = lambda pixel: pixel[0] > 200
blacks = [count for dark, count in runs(int(height * 0.86), black) if dark and count > 4]
whites = [count for lit, count in runs(height - 20, white) if lit and count > 4]
print(len(blacks), len(whites), (sum(blacks) / len(blacks)) if blacks else 0, (sum(whites) / len(whites)) if whites else 0)
`]);
  const [blackCount, whiteCount, blackWidth, whiteWidth] = keyWidths.trim().split(/\s+/).map(Number);
  assert.ok(whiteCount >= 15, `The frame shows only ${whiteCount} white keys`);
  assert.ok(blackCount >= 12, `The frame shows only ${blackCount} black keys`);
  const keyRatio = blackWidth / whiteWidth;
  assert.ok(Math.abs(keyRatio - 11 / (165 / 7)) < 0.06,
    `Black keys are not the instrument's width: ratio ${keyRatio.toFixed(3)} instead of ${(11 / (165 / 7)).toFixed(3)}`);

  // The Plan's last part of the length: the Thank You clip closes the video
  // and is counted in it. The clip is two seconds, so four becomes six.
  const clipPath = join(profile, 'thank-you.mp4');
  await exec('ffmpeg', ['-v', 'error', '-y',
    '-f', 'lavfi', '-i', 'color=c=#0b1220:s=720x1280:d=2:r=30',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', clipPath]);
  thankYouClip = await readFile(clipPath);
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const thanked = await waitForRender('Piano render with a Thank You clip', 120000, again.href);
  assert.ok(thanked.status.startsWith('Rendered '), `Piano render did not complete: ${thanked.status}`);
  assert.match(thanked.status, /Thank You ending/, 'Piano export does not report its Thank You ending');
  const thankedBytes = Buffer.from(await evaluate(`(async () => { const response = await fetch(${JSON.stringify(thanked.href)}); const bytes = new Uint8Array(await response.arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(binary); })()`), 'base64');
  const thankedPath = `${output}-thanked.mp4`;
  await writeFile(thankedPath, thankedBytes);
  const thankedProbe = JSON.parse((await exec('ffprobe', ['-v', 'error',
    '-show_entries', 'format=duration', '-show_entries', 'stream=codec_type',
    '-of', 'json', thankedPath])).stdout);
  const thankedSeconds = Number(thankedProbe.format.duration);
  assert.ok(Math.abs(thankedSeconds - 6) < 0.5, `The Thank You clip was not counted in the length: ${thankedSeconds}s instead of 6s`);
  assert.ok(thankedProbe.streams.some((stream) => stream.codec_type === 'audio'),
    `The Thank You clip's sound is missing: ${JSON.stringify(thankedProbe.streams)}`);

  console.log(JSON.stringify({ status: result.status, summary: result.summary, bytes: result.bytes, download: state.name, ffprobe: probe, scoreSeconds, thankYouSeconds: thankedSeconds, ink: { backgroundPixels, otherPixels } }, null, 2));
} finally {
  cdp?.close();
  for (const child of [browser, server]) {
    if (!child || child.exitCode !== null) continue;
    child.kill('SIGTERM');
  }
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
