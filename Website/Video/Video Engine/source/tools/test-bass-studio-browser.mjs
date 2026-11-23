#!/usr/bin/env node
/**
 * Chromium integration test for Guitar Engine's measured bass pictures ->
 * Studio -> VideoEngine.
 *
 * Requires chromium, ffprobe, and Python 3 (Pillow for the frame's ink).
 *   node tools/test-bass-studio-browser.mjs
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
const profile = await mkdtemp(join(tmpdir(), 'studio-bass-chromium-'));
const output = join(profile, 'bass-output');
let server;
let browser;
let cdp;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Two 4/4 bars at the default 120 BPM: four seconds, which is the Plan's
 * length rule with no cap of the page's own.
 *
 * Bar 1 is TABBED: four-string tab, `staff-lines` 4, and every note carries
 * the `<string>`/`<fret>` pair somebody wrote down. Bar 2 has NO tablature,
 * so its notes have to be placed from their pitch, and it holds a two-note
 * chord so the frame has one moment with two marks on it.
 */
const BASS_SCORE = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>Bass Studio Test</work-title></work>
  <part-list><score-part id="P1"><part-name>Bass</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>F</sign><line>4</line></clef>
        <staff-details><staff-lines>4</staff-lines></staff-details>
      </attributes>
      <note><pitch><step>E</step><octave>2</octave></pitch><duration>2</duration><type>quarter</type>
        <notations><technical><string>4</string><fret>0</fret></technical></notations></note>
      <note><pitch><step>A</step><octave>2</octave></pitch><duration>2</duration><type>quarter</type>
        <notations><technical><string>3</string><fret>0</fret></technical></notations></note>
      <note><pitch><step>D</step><octave>3</octave></pitch><duration>2</duration><type>quarter</type>
        <notations><technical><string>2</string><fret>0</fret></technical></notations></note>
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>2</duration><type>quarter</type>
        <notations><technical><string>1</string><fret>0</fret></technical></notations></note>
    </measure>
    <measure number="2">
      <note><pitch><step>A</step><octave>2</octave></pitch><duration>8</duration><type>whole</type></note>
      <note><chord/><pitch><step>C</step><octave>3</octave></pitch><duration>8</duration><type>whole</type></note>
    </measure>
  </part>
</score-partwise>`;

/** Every note is below the four-string bass's low E (E1), so nothing can be played. */
const TOO_LOW_SCORE = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Bass</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
      <clef><sign>F</sign><line>4</line></clef></attributes>
    <note><pitch><step>C</step><octave>1</octave></pitch><duration>4</duration><type>whole</type></note>
  </measure></part>
</score-partwise>`;

/** A score with no pitched note at all: there is nothing to put on the neck. */
const NO_PITCH_SCORE = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Bass</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <note><rest/><duration>4</duration><type>whole</type></note>
  </measure></part>
</score-partwise>`;

/** One unplayable note among playable ones: the rest of the file still draws. */
const MIXED_RANGE_SCORE = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Bass</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
      <clef><sign>F</sign><line>4</line></clef></attributes>
    <note><pitch><step>C</step><octave>1</octave></pitch><duration>1</duration><type>quarter</type></note>
    <note><pitch><step>E</step><octave>2</octave></pitch><duration>1</duration><type>quarter</type></note>
    <note><pitch><step>A</step><octave>2</octave></pitch><duration>1</duration><type>quarter</type></note>
    <note><pitch><step>D</step><octave>3</octave></pitch><duration>1</duration><type>quarter</type></note>
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
  const input = document.querySelector('[data-bass-musicxml-input]');
  const transfer = new DataTransfer();
  transfer.items.add(new File([${JSON.stringify(xml)}], ${JSON.stringify(name)}, {type: 'application/xml'}));
  input.files = transfer.files;
  input.dispatchEvent(new Event('change', {bubbles: true}));
  return true;
})()`);

// A page that refuses a score says why and stops; there is no file to wait for.
const REFUSAL = /fits a 4-string bass|Choose a MusicXML file/;

async function waitForRender(label, timeoutMs = 120000, previousHref = null) {
  const startedAt = Date.now();
  let state;
  while (Date.now() - startedAt < timeoutMs) {
    state = JSON.parse(await evaluate("JSON.stringify({status:document.querySelector('[data-studio-status]').textContent,download:!document.querySelector('[data-video-download]').hidden,href:document.querySelector('[data-video-download]').href,name:document.querySelector('[data-video-download]').download,ready:document.querySelector('[data-video-output]').readyState})"));
    // A previous render leaves its own download in place, so a finished
    // render is one whose status says so and whose file is new.
    if (state.status.startsWith('Rendered ') && state.download && state.ready >= 1 &&
        state.href !== previousHref) return state;
    if (state.status.startsWith('Bass video render failed:')) return state;
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
    homeReady = await evaluate("document.readyState === 'complete' && Boolean(document.querySelector('[data-tool=Bass]'))");
    if (homeReady) break;
    await sleep(100);
  }
  assert.ok(homeReady, 'Create Video page did not show the Bass tool card');
  await evaluate("document.querySelector('[data-tool=Bass]').click()");
  const navigationStartedAt = Date.now();
  let navigated = false;
  while (Date.now() - navigationStartedAt < 10000) {
    try {
      navigated = await evaluate("location.pathname.endsWith('/studio.html') && new URLSearchParams(location.search).get('tool') === 'bass'");
    } catch {
      navigated = false;
    }
    if (navigated) break;
    await sleep(100);
  }
  if (!navigated) {
    throw new Error(`Bass tool card did not navigate to its Studio route; current URL: ${await evaluate('location.href')}`);
  }

  const startedAt = Date.now();
  let ready = false;
  while (Date.now() - startedAt < 15000) {
    ready = await evaluate("Boolean(window.VideoEngine && window.GuitarEngine && !document.querySelector('[data-bass-controls]').hidden)");
    if (ready) break;
    await sleep(100);
  }
  assert.ok(ready, 'Bass controls, GuitarEngine, or VideoEngine did not load');
  assert.equal(await evaluate("document.querySelector('[data-studio-title]').textContent"), 'Bass Studio');
  assert.equal(await evaluate("document.querySelector('[data-studio-generate]').textContent"), 'Generate Bass Video');
  assert.equal(await evaluate("document.querySelector('[data-studio-settings]').hidden"), true, 'Bass route exposed the shared Drum settings');
  assert.equal(await evaluate("document.querySelector('[data-guitar-controls]').hidden"), true, 'Bass route exposed the Guitar controls');
  assert.equal(await evaluate("document.querySelector('[data-piano-controls]').hidden"), true, 'Bass route exposed the Piano controls');

  const controls = JSON.parse(await evaluate("JSON.stringify({photo:document.querySelector('[data-bass-photo]').value,photos:[...document.querySelector('[data-bass-photo]').options].map(o=>o.value),aspect:document.querySelector('[data-bass-aspect]').value,name:document.querySelector('[data-bass-musicxml-name]').textContent})"));
  assert.deepEqual(controls.photos, ['jazz-drawn', 'precision-drawn'], 'The Bass picture list is not the two measured drawings');
  assert.equal(controls.photo, 'jazz-drawn');
  assert.equal(controls.aspect, '16x9');
  assert.equal(controls.name, 'No file selected');

  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  const mobile = JSON.parse(await evaluate("JSON.stringify({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,columns:getComputedStyle(document.querySelector('[data-studio-workspace]')).gridTemplateColumns,controlsWidth:document.querySelector('[data-bass-controls]').getBoundingClientRect().width})"));
  assert.ok(mobile.scrollWidth <= mobile.width, `Bass Studio overflows at phone width: ${JSON.stringify(mobile)}`);
  assert.equal(mobile.columns.trim().split(/\s+/).length, 1, 'Bass Studio did not use one column on phone');
  assert.ok(mobile.controlsWidth > 0, 'Bass controls are not visible on phone');
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  const desktop = JSON.parse(await evaluate("JSON.stringify({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,columns:getComputedStyle(document.querySelector('[data-studio-workspace]')).gridTemplateColumns})"));
  assert.ok(desktop.scrollWidth <= desktop.width, `Bass Studio overflows at desktop width: ${JSON.stringify(desktop)}`);
  assert.equal(desktop.columns.trim().split(/\s+/).length, 2, 'Bass Studio did not use two columns on desktop');

  // The neck the engine draws is a fact about the instrument: four strings,
  // E1 to G3 open, and the two outer ones measured off the picture itself.
  const geometry = JSON.parse(await evaluate(`(() => {
    const G = window.GuitarEngine;
    const photo = G.photoNamed('jazz-drawn', 'assets/bass/jazz-drawn.svg');
    const tuning = [28, 33, 38, 43];
    const lines = G.stringLines({ width: 1280, height: 400, strings: 4, photo });
    return JSON.stringify({
      frets: G.photoFretCount(photo),
      strings: lines.length,
      numbers: lines.map((line) => line.string),
      gaps: lines.map((line) => line.offset),
      tuning: G.tuningFor({ strings: 4, tuning }),
      guitarStrings: G.stringLines({ width: 1280, height: 400, photo }).length,
      names: G.PHOTOS ? Object.keys(G.PHOTOS).length : 0,
    });
  })()`));
  assert.equal(geometry.frets, 20, 'The Jazz Bass picture does not show twenty frets');
  assert.equal(geometry.strings, 4, 'The bass neck is not drawn with four strings');
  assert.deepEqual(geometry.numbers, [1, 2, 3, 4]);
  assert.deepEqual(geometry.tuning, [28, 33, 38, 43], 'The bass tuning is not E1 A1 D2 G2');
  // Four strings spread between the picture's two MEASURED outer strings:
  // each gap is a third of the band, so no two lines coincide and none is
  // outside it.
  const gaps = geometry.gaps;
  assert.equal(new Set(gaps.map((value) => value.toFixed(3))).size, 4, 'Two bass strings are drawn on the same line');
  const steps = gaps.slice(1).map((value, index) => value - gaps[index]);
  assert.ok(steps.every((step) => Math.abs(step - steps[0]) < 0.01), `Bass strings are not evenly spread: ${steps}`);
  assert.ok(steps[0] > 0, 'The bass strings are not in descending screen order');

  // A score with nothing to put on the neck is refused, not drawn empty.
  await selectScore(NO_PITCH_SCORE, 'rests-only.musicxml');
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const refused = await waitForRender('A score with no pitched notes');
  assert.match(refused.status, /fits a 4-string bass/, `A score with no pitched notes was not refused: ${refused.status}`);
  assert.equal(refused.download, false, 'A score with no pitched notes still produced a download');

  // A part below the low E cannot be played on this neck, so it is refused.
  await selectScore(TOO_LOW_SCORE, 'below-the-neck.musicxml');
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const unreachable = await waitForRender('A score below the neck');
  assert.match(unreachable.status, /fits a 4-string bass/, `A score below E1 was not refused: ${unreachable.status}`);
  assert.equal(unreachable.download, false, 'A score below E1 still produced a download');

  // One unplayable note among playable ones does not cost the whole video.
  await selectScore(MIXED_RANGE_SCORE, 'one-note-below-the-neck.musicxml');
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const mixed = await waitForRender('A score with one unplayable note');
  assert.ok(mixed.status.startsWith('Rendered '), `One unplayable note stopped the render: ${mixed.status}`);

  await selectScore(BASS_SCORE, 'bass-studio-test.musicxml');
  const selected = JSON.parse(await evaluate("JSON.stringify({name:document.querySelector('[data-bass-musicxml-name]').textContent,status:document.querySelector('[data-studio-status]').textContent})"));
  assert.equal(selected.name, 'bass-studio-test.musicxml', 'MusicXML selection name was not displayed');
  assert.match(selected.status, /MusicXML selected/);

  await evaluate("(() => { const set = (selector, value) => { const el = document.querySelector(selector); el.value = value; el.dispatchEvent(new Event('change', {bubbles:true})); }; set('[data-bass-aspect]', '9x16'); })()");
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const state = await waitForRender('Bass render', 120000, mixed.href);
  assert.ok(state.status.startsWith('Rendered '), `Bass render did not complete: ${state.status}`);
  assert.match(state.status, /no Thank You clip/, 'Bass export does not say its ending is missing');
  assert.ok(state.href.startsWith('blob:'), 'Bass export is not backed by a Blob URL');
  assert.match(state.name, /^bass-jazz-drawn-9x16\.(mp4|webm)$/);

  const result = await evaluate(`(async () => { const response = await fetch(${JSON.stringify(state.href)}); const bytes = new Uint8Array(await response.arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return { base64: btoa(binary), bytes: bytes.length, status: document.querySelector('[data-studio-status]').textContent, summary: document.querySelector('[data-bass-summary]').textContent }; })()`);
  // Four tabbed notes, then two placed by pitch -- and the second bar's two
  // notes are a chord, which is still two notes on two strings.
  assert.match(result.summary, /6 notes/, `Bass summary counted the wrong notes: ${result.summary}`);
  assert.match(result.summary, /4 from tab, 2 by pitch/, `Bass summary did not report where the positions came from: ${result.summary}`);
  const videoBytes = Buffer.from(result.base64, 'base64');
  assert.ok(videoBytes.length > 1000, 'Bass export is unexpectedly small');
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
  assert.ok(videoStream, 'Bass output has no video stream');
  assert.equal(audioStream, undefined, 'Bass output claims an audio track the engine cannot make');
  assert.equal(videoStream.width, 720, 'Portrait bass video width is wrong');
  assert.equal(videoStream.height, 1280, 'Portrait bass video height is wrong');
  // The Plan's length rule, with no cap of the page's own.
  const scoreSeconds = Number(probe.format.duration);
  assert.ok(Math.abs(scoreSeconds - 4) < 0.4, `Bass video is not the score's length: ${scoreSeconds}s instead of 4s`);

  // The bass must actually be in the pixels, not just in the shape list.
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
  assert.ok(otherPixels > backgroundPixels, `The bass frame is mostly empty: ${otherPixels} painted of ${backgroundPixels + otherPixels}`);

  // The neck is the first band of a guitar-shaped stack, so it must reach the
  // top gutter. A neck floating under an empty strip would mean the page
  // reserved a band taller than the drawing and left the rest as nothing.
  const { stdout: top } = await exec('python3', ['-c', `
from PIL import Image
image = Image.open(${JSON.stringify(framePath)}).convert('RGB')
width, height = image.size
pixels = image.load()
first = height
for y in range(height):
    for x in range(0, width, 2):
        r, g, b = pixels[x, y]
        if abs(r - 11) + abs(g - 16) + abs(b - 24) > 24:
            first = y
            break
    if first != height:
        break
print(first, height)
`]);
  const [firstPaintedRow, frameHeight] = top.trim().split(/\s+/).map(Number);
  assert.ok(firstPaintedRow <= 40,
    `The bass neck leaves an empty band above it: first painted row ${firstPaintedRow} of ${frameHeight}`);

  // Determinism, part one: the engine's own numbers. The same score at the
  // same moment must produce the same shapes -- same marks, same places.
  // That is what this page decides, and it is checked exactly.
  const shapes = JSON.parse(await evaluate(`(() => {
    const G = window.GuitarEngine;
    const photo = G.photoNamed('jazz-drawn', 'assets/bass/jazz-drawn.svg');
    const options = { width: 1280, height: 400, seconds: 0.5, photo, strings: 4, handLegend: false,
      notes: [{ string: 3, fret: 2, startSeconds: 0, endSeconds: 2 }] };
    const once = G.stageShapes(options);
    const twice = G.stageShapes(options);
    return JSON.stringify({ same: JSON.stringify(once) === JSON.stringify(twice), count: once.length,
      marks: once.filter((shape) => shape.role === 'mark').map((shape) => [Math.round(shape.x), Math.round(shape.y)]) });
  })()`));
  assert.equal(shapes.same, true, 'The same moment drew two different shape lists');
  assert.ok(shapes.marks.length > 0, 'The moment with a note drawn on it has no mark');

  // Frame determinism: the same score drawn twice is the same pixels.
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const again = await waitForRender('Bass render again', 120000, state.href);
  assert.ok(again.status.startsWith('Rendered '), `The second Bass render did not complete: ${again.status}`);
  const againBytes = Buffer.from(await evaluate(`(async () => { const response = await fetch(${JSON.stringify(again.href)}); const bytes = new Uint8Array(await response.arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(binary); })()`), 'base64');
  const againPath = `${output}-again.mp4`;
  await writeFile(againPath, againBytes);
  const againFrame = `${output}-again-frame.png`;
  await exec('ffmpeg', ['-v', 'error', '-y', '-ss', '1.0', '-i', againPath, '-frames:v', '1', againFrame]);
  // An MP4 is lossy, and the picture is an SVG Chromium rasterises afresh
  // each time, so two encodings of the same frame differ by a few units at
  // hard edges -- a handful of pixels along a string's own edge. A moved
  // mark or a drifting clock is a different animal: thousands of pixels.
  // The exact check that our own drawing did not change is the shape-list
  // one above; this is the guard on what reached the file.
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
    `The same score drew a different frame the second time: ${movedPixels} of ${totalPixels} pixels moved`);

  // A render the user stops leaves no file behind and says so.
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
  assert.match(cancelledState?.status ?? '', /cancelled/i, `Cancelling a Bass render did not report a cancellation: ${cancelledState?.status}`);
  assert.equal(cancelledState.href, again.href, 'A cancelled render replaced the previous video');
  assert.equal(await evaluate("document.querySelector('[data-studio-generate]').textContent"), 'Generate Bass Video',
    'The generate button did not come back after a cancellation');

  // Seeking: the page's own scrubber is the only way a viewer moves through
  // the file, so a seek must land on the score's own moment rather than at
  // the start. Two seconds in is the second half of the first bar.
  const seeked = JSON.parse(await evaluate(`(async () => {
    const video = document.querySelector('[data-video-output]');
    video.currentTime = 2.0;
    await new Promise((resolve) => { video.onseeked = resolve; setTimeout(resolve, 3000); });
    return JSON.stringify({ time: video.currentTime, ready: video.readyState, duration: video.duration });
  })()`));
  assert.ok(Math.abs(seeked.time - 2.0) < 0.2, `A seek did not land where it was asked: ${seeked.time}s`);
  assert.ok(seeked.ready >= 1, 'The video is not readable after a seek');

  // The Precision picture is a second measured neck, and choosing it must
  // change the file rather than silently drawing the Jazz again.
  await evaluate("(() => { const el = document.querySelector('[data-bass-photo]'); el.value = 'precision-drawn'; el.dispatchEvent(new Event('change', {bubbles:true})); })()");
  await evaluate("(() => { const el = document.querySelector('[data-bass-aspect]'); el.value = '16x9'; el.dispatchEvent(new Event('change', {bubbles:true})); })()");
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const precision = await waitForRender('Bass render with the Precision picture', 120000, again.href);
  assert.ok(precision.status.startsWith('Rendered '), `The Precision render did not complete: ${precision.status}`);
  assert.match(precision.name, /^bass-precision-drawn-16x9\.(mp4|webm)$/, `The Precision render is not named for its picture: ${precision.name}`);
  const precisionProbe = JSON.parse((await exec('ffprobe', ['-v', 'error',
    '-show_entries', 'stream=codec_type,width,height', '-of', 'json',
    await (async () => {
      const path = `${output}-precision.mp4`;
      await writeFile(path, Buffer.from(await evaluate(`(async () => { const response = await fetch(${JSON.stringify(precision.href)}); const bytes = new Uint8Array(await response.arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(binary); })()`), 'base64'));
      return path;
    })(),
  ])).stdout);
  const precisionStream = precisionProbe.streams.find((stream) => stream.codec_type === 'video');
  assert.equal(precisionStream.width, 1280, 'Landscape bass video width is wrong');
  assert.equal(precisionStream.height, 720, 'Landscape bass video height is wrong');

  // The Plan's last part of the length: the Thank You clip closes the video
  // and is counted in it. The clip is two seconds, so four becomes six.
  const clipPath = join(profile, 'thank-you.mp4');
  await exec('ffmpeg', ['-v', 'error', '-y',
    '-f', 'lavfi', '-i', 'color=c=#0b1220:s=1280x720:d=2:r=30',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', clipPath]);
  thankYouClip = await readFile(clipPath);
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const thanked = await waitForRender('Bass render with a Thank You clip', 120000, precision.href);
  assert.ok(thanked.status.startsWith('Rendered '), `Bass render did not complete: ${thanked.status}`);
  assert.match(thanked.status, /Thank You ending/, 'Bass export does not report its Thank You ending');
  const thankedPath = `${output}-thanked.mp4`;
  await writeFile(thankedPath, Buffer.from(await evaluate(`(async () => { const response = await fetch(${JSON.stringify(thanked.href)}); const bytes = new Uint8Array(await response.arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(binary); })()`), 'base64'));
  const thankedProbe = JSON.parse((await exec('ffprobe', ['-v', 'error',
    '-show_entries', 'format=duration', '-show_entries', 'stream=codec_type',
    '-of', 'json', thankedPath])).stdout);
  const thankedSeconds = Number(thankedProbe.format.duration);
  assert.ok(Math.abs(thankedSeconds - 6) < 0.5, `The Thank You clip was not counted in the length: ${thankedSeconds}s instead of 6s`);
  assert.ok(thankedProbe.streams.some((stream) => stream.codec_type === 'audio'),
    `The Thank You clip's sound is missing: ${JSON.stringify(thankedProbe.streams)}`);

  console.log(JSON.stringify({
    status: result.status, summary: result.summary, bytes: result.bytes, download: state.name,
    ffprobe: probe, scoreSeconds, thankYouSeconds: thankedSeconds,
    ink: { backgroundPixels, otherPixels }, geometry,
  }, null, 2));
} finally {
  cdp?.close();
  for (const child of [browser, server]) {
    if (!child || child.exitCode !== null) continue;
    child.kill('SIGTERM');
  }
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
