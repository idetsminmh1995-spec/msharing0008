#!/usr/bin/env node
/**
 * Chromium integration test for the violin drawing -> Studio -> VideoEngine.
 *
 * The violin has no fingering engine and no frets, so there is nothing to
 * place on it: this checks that the drawing reaches the frame, that the
 * layout puts it beside the notation rather than stacked, and that the
 * export lifecycle behaves like the other instruments.
 *
 * Requires chromium, ffprobe, and Python 3 (Pillow for the frame's ink).
 *   node tools/test-violin-studio-browser.mjs
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
const profile = await mkdtemp(join(tmpdir(), 'studio-violin-chromium-'));
const output = join(profile, 'violin-output');
let server;
let browser;
let cdp;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Two 4/4 bars at the default 120 BPM: four seconds, which is the Plan's
 * length rule with no cap of the page's own. A violin part is ordinary
 * pitched notation -- there is no tablature to read and nothing to place.
 */
const VIOLIN_SCORE = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>Violin Studio Test</work-title></work>
  <part-list><score-part id="P1"><part-name>Violin</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><type>quarter</type></note>
    </measure>
    <measure number="2">
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>8</duration><type>whole</type></note>
    </measure>
  </part>
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
  const input = document.querySelector('[data-violin-musicxml-input]');
  const transfer = new DataTransfer();
  transfer.items.add(new File([${JSON.stringify(xml)}], ${JSON.stringify(name)}, {type: 'application/xml'}));
  input.files = transfer.files;
  input.dispatchEvent(new Event('change', {bubbles: true}));
  return true;
})()`);

async function waitForRender(label, timeoutMs = 120000, previousHref = null) {
  const startedAt = Date.now();
  let state;
  while (Date.now() - startedAt < timeoutMs) {
    state = JSON.parse(await evaluate("JSON.stringify({status:document.querySelector('[data-studio-status]').textContent,download:!document.querySelector('[data-video-download]').hidden,href:document.querySelector('[data-video-download]').href,name:document.querySelector('[data-video-download]').download,ready:document.querySelector('[data-video-output]').readyState})"));
    // A previous render leaves its own download in place, so a finished
    // render is one whose status says so and whose file is new.
    if (state.status.startsWith('Rendered ') && state.download && state.ready >= 1 &&
        state.href !== previousHref) return state;
    if (state.status.startsWith('Violin video render failed:')) return state;
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
    if (!event.request.url.includes('/Thank%20Video/')) {
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
    homeReady = await evaluate("document.readyState === 'complete' && Boolean(document.querySelector('[data-tool=Strings]'))");
    if (homeReady) break;
    await sleep(100);
  }
  assert.ok(homeReady, 'Create Video page did not show the Strings tool card');
  await evaluate("document.querySelector('[data-tool=Strings]').click()");
  const navigationStartedAt = Date.now();
  let navigated = false;
  while (Date.now() - navigationStartedAt < 10000) {
    try {
      navigated = await evaluate("location.pathname.endsWith('/studio.html') && new URLSearchParams(location.search).get('tool') === 'strings'");
    } catch {
      navigated = false;
    }
    if (navigated) break;
    await sleep(100);
  }
  if (!navigated) {
    throw new Error(`The Strings tool card did not navigate to its Studio route; current URL: ${await evaluate('location.href')}`);
  }

  const startedAt = Date.now();
  let ready = false;
  while (Date.now() - startedAt < 15000) {
    ready = await evaluate("Boolean(window.VideoEngine && !document.querySelector('[data-violin-controls]').hidden)");
    if (ready) break;
    await sleep(100);
  }
  assert.ok(ready, 'Violin controls or VideoEngine did not load');
  assert.equal(await evaluate("document.querySelector('[data-studio-title]').textContent"), 'Violin Studio');
  assert.equal(await evaluate("document.querySelector('[data-studio-generate]').textContent"), 'Generate Violin Video');
  // The shared Drum controls and every other instrument's controls stay
  // hidden: a Violin route that showed the drum pads would be a drum video.
  assert.equal(await evaluate("document.querySelector('[data-studio-settings]').hidden"), true, 'Violin route exposed the shared Drum settings');
  assert.equal(await evaluate("document.querySelector('[data-guitar-controls]').hidden"), true, 'Violin route exposed the Guitar controls');
  assert.equal(await evaluate("document.querySelector('[data-piano-controls]').hidden"), true, 'Violin route exposed the Piano controls');
  assert.equal(await evaluate("document.querySelector('[data-bass-controls]').hidden"), true, 'Violin route exposed the Bass controls');

  const controls = JSON.parse(await evaluate("JSON.stringify({aspect:document.querySelector('[data-violin-aspect]').value,name:document.querySelector('[data-violin-musicxml-name]').textContent,hasPhoto:Boolean(document.querySelector('[data-violin-photo]'))})"));
  assert.equal(controls.aspect, '16x9');
  assert.equal(controls.name, 'No file selected');
  // One drawing, so there is no picture to choose between.
  assert.equal(controls.hasPhoto, false, 'The Violin route offers a picture choice it has no drawings for');

  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  const mobile = JSON.parse(await evaluate("JSON.stringify({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,columns:getComputedStyle(document.querySelector('[data-studio-workspace]')).gridTemplateColumns,controlsWidth:document.querySelector('[data-violin-controls]').getBoundingClientRect().width})"));
  assert.ok(mobile.scrollWidth <= mobile.width, `Violin Studio overflows at phone width: ${JSON.stringify(mobile)}`);
  assert.equal(mobile.columns.trim().split(/\s+/).length, 1, 'Violin Studio did not use one column on phone');
  assert.ok(mobile.controlsWidth > 0, 'Violin controls are not visible on phone');
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  const desktop = JSON.parse(await evaluate("JSON.stringify({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,columns:getComputedStyle(document.querySelector('[data-studio-workspace]')).gridTemplateColumns})"));
  assert.ok(desktop.scrollWidth <= desktop.width, `Violin Studio overflows at desktop width: ${JSON.stringify(desktop)}`);
  assert.equal(desktop.columns.trim().split(/\s+/).length, 2, 'Violin Studio did not use two columns on desktop');

  // The layout is the Plan's own: notation beside the instrument, the Title
  // band across the foot. Portrait stacks because two columns would leave
  // neither part any width.
  const layouts = JSON.parse(await evaluate(`(() => {
    const E = window.VideoEngine;
    const landscape = E.layoutFor('violin', { width: 1280, height: 720, parts: ['notation','instrument','title'] });
    const portrait = E.layoutFor('violin', { width: 720, height: 1280, parts: ['notation','instrument','title'] });
    const band = (layout) => layout.rects.title.y + layout.rects.title.height;
    return JSON.stringify({
      landscapeShape: landscape.shape,
      portraitShape: portrait.shape,
      // Beside each other: the instrument starts to the right of the notation.
      sideBySide: landscape.rects.instrument.x > landscape.rects.notation.x + landscape.rects.notation.width - 1,
      // The band is at the foot, not between them.
      bandAtFoot: Math.abs(band(landscape) - (720 - landscape.pad)) <= 1,
      // Portrait stacks: the instrument sits below the notation.
      stacked: portrait.rects.instrument.y >= portrait.rects.notation.y + portrait.rects.notation.height - 1,
      portraitFullWidth: Math.abs(portrait.rects.instrument.width - portrait.rects.notation.width) <= 1,
    });
  })()`));
  assert.equal(layouts.landscapeShape, 'split', 'The violin layout is not the split one');
  assert.equal(layouts.sideBySide, true, 'The violin is not drawn beside the notation');
  assert.equal(layouts.bandAtFoot, true, 'The Title / Info band is not at the foot of the frame');
  assert.equal(layouts.stacked, true, 'The violin does not stack under the notation in portrait');
  assert.equal(layouts.portraitFullWidth, true, 'The portrait violin does not use the full frame width');

  // A route with no file must say so rather than render an empty frame.
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const noFileAt = Date.now();
  let noFile;
  while (Date.now() - noFileAt < 10000) {
    noFile = await evaluate("document.querySelector('[data-studio-status]').textContent");
    if (/Choose a MusicXML file/.test(noFile)) break;
    await sleep(100);
  }
  assert.match(noFile ?? '', /Choose a MusicXML file/, `A Violin render with no file did not say so: ${noFile}`);
  assert.equal(await evaluate("document.querySelector('[data-video-download]').hidden"), true, 'A Violin render with no file produced a download');

  await selectScore(VIOLIN_SCORE, 'violin-studio-test.musicxml');
  const selected = JSON.parse(await evaluate("JSON.stringify({name:document.querySelector('[data-violin-musicxml-name]').textContent,status:document.querySelector('[data-studio-status]').textContent})"));
  assert.equal(selected.name, 'violin-studio-test.musicxml', 'MusicXML selection name was not displayed');
  assert.match(selected.status, /MusicXML selected/);

  await evaluate("(() => { const set = (selector, value) => { const el = document.querySelector(selector); el.value = value; el.dispatchEvent(new Event('change', {bubbles:true})); }; set('[data-violin-aspect]', '9x16'); })()");
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const state = await waitForRender('Violin render');
  assert.ok(state.status.startsWith('Rendered '), `Violin render did not complete: ${state.status}`);
  assert.match(state.status, /no Thank You clip/, 'Violin export does not say its ending is missing');
  assert.ok(state.href.startsWith('blob:'), 'Violin export is not backed by a Blob URL');
  assert.match(state.name, /^violin-9x16\.(mp4|webm)$/);

  const result = await evaluate(`(async () => { const response = await fetch(${JSON.stringify(state.href)}); const bytes = new Uint8Array(await response.arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return { base64: btoa(binary), bytes: bytes.length, status: document.querySelector('[data-studio-status]').textContent, summary: document.querySelector('[data-violin-summary]').textContent }; })()`);
  // The summary says what this adapter does and does not do: the violin is
  // drawn, not fingered.
  assert.match(result.summary, /violin drawn, not fingered/, `Violin summary does not say what it draws: ${result.summary}`);
  const videoBytes = Buffer.from(result.base64, 'base64');
  assert.ok(videoBytes.length > 1000, 'Violin export is unexpectedly small');
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
  assert.ok(videoStream, 'Violin output has no video stream');
  assert.equal(audioStream, undefined, 'Violin output claims an audio track the engine cannot make');
  assert.equal(videoStream.width, 1080, 'Portrait violin video width is wrong');
  assert.equal(videoStream.height, 1920, 'Portrait violin video height is wrong');
  // The Plan's length rule, with no cap of the page's own.
  const scoreSeconds = Number(probe.format.duration);
  assert.ok(Math.abs(scoreSeconds - 4) < 0.4, `Violin video is not the score's length: ${scoreSeconds}s instead of 4s`);

  // The violin must actually be in the pixels. The drawing is a pale
  // outline on a black frame, so a frame that never received it is mostly
  // background with only the notation's white panel painted.
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
  // A frame with nothing drawn on it is all background; the notation's white
  // panel and the violin together are what make it a video.
  assert.ok(otherPixels > 0 && backgroundPixels > 0,
    `The violin frame has no drawn content: ${otherPixels} painted of ${backgroundPixels + otherPixels}`);

  // The instrument's own column must carry ink. In portrait the violin is
  // the bottom band, so a strip of that band away from the edges is checked
  // on its own -- the notation's white panel is a different band and would
  // otherwise answer for the violin.
  const { stdout: column } = await exec('python3', ['-c', `
from PIL import Image
image = Image.open(${JSON.stringify(framePath)}).convert('RGB')
width, height = image.size
pixels = image.load()
top = int(height * 0.62)
bottom = int(height * 0.90)
left = int(width * 0.15)
right = int(width * 0.85)
painted = 0
for y in range(top, bottom):
    for x in range(left, right):
        r, g, b = pixels[x, y]
        if abs(r - 11) + abs(g - 16) + abs(b - 24) > 30: painted += 1
print(painted)
`]);
  const paintedInColumn = Number(column.trim());
  assert.ok(paintedInColumn > 500, `The violin column is empty: only ${paintedInColumn} pixels painted`);

  // Determinism, part one: the same moment drawn twice is the same frame.
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const again = await waitForRender('Violin render again', 120000, state.href);
  assert.ok(again.status.startsWith('Rendered '), `The second Violin render did not complete: ${again.status}`);
  const againBytes = Buffer.from(await evaluate(`(async () => { const response = await fetch(${JSON.stringify(again.href)}); const bytes = new Uint8Array(await response.arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(binary); })()`), 'base64');
  const againPath = `${output}-again.mp4`;
  await writeFile(againPath, againBytes);
  const againFrame = `${output}-again-frame.png`;
  await exec('ffmpeg', ['-v', 'error', '-y', '-ss', '1.0', '-i', againPath, '-frames:v', '1', againFrame]);
  // An MP4 is lossy and the picture is an SVG Chromium rasterises afresh
  // each time, so two encodings differ by a few units at hard edges. A
  // drifting clock or a moved part is thousands of pixels, not a handful.
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
  assert.match(cancelledState?.status ?? '', /cancelled/i, `Cancelling a Violin render did not report a cancellation: ${cancelledState?.status}`);
  assert.equal(cancelledState.href, again.href, 'A cancelled render replaced the previous video');
  assert.equal(await evaluate("document.querySelector('[data-studio-generate]').textContent"), 'Generate Violin Video',
    'The generate button did not come back after a cancellation');

  // Seeking: the page's own scrubber is the only way a viewer moves through
  // the file, so a seek must land on the score's own moment.
  const seeked = JSON.parse(await evaluate(`(async () => {
    const video = document.querySelector('[data-video-output]');
    video.currentTime = 2.0;
    await new Promise((resolve) => { video.onseeked = resolve; setTimeout(resolve, 3000); });
    return JSON.stringify({ time: video.currentTime, ready: video.readyState, duration: video.duration });
  })()`));
  assert.ok(Math.abs(seeked.time - 2.0) < 0.2, `A seek did not land where it was asked: ${seeked.time}s`);
  assert.ok(seeked.ready >= 1, 'The video is not readable after a seek');

  // Landscape draws the violin in the right-hand column rather than a band.
  await evaluate("(() => { const el = document.querySelector('[data-violin-aspect]'); el.value = '16x9'; el.dispatchEvent(new Event('change', {bubbles:true})); })()");
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const landscape = await waitForRender('Landscape Violin render', 120000, again.href);
  assert.ok(landscape.status.startsWith('Rendered '), `The landscape render did not complete: ${landscape.status}`);
  assert.match(landscape.name, /^violin-16x9\.(mp4|webm)$/, `The landscape render is not named for its shape: ${landscape.name}`);
  const landscapePath = `${output}-landscape.mp4`;
  await writeFile(landscapePath, Buffer.from(await evaluate(`(async () => { const response = await fetch(${JSON.stringify(landscape.href)}); const bytes = new Uint8Array(await response.arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(binary); })()`), 'base64'));
  const landscapeProbe = JSON.parse((await exec('ffprobe', ['-v', 'error',
    '-show_entries', 'stream=codec_type,width,height', '-of', 'json', landscapePath])).stdout);
  const landscapeStream = landscapeProbe.streams.find((stream) => stream.codec_type === 'video');
  assert.equal(landscapeStream.width, 1920, 'Landscape violin video width is wrong');
  assert.equal(landscapeStream.height, 1080, 'Landscape violin video height is wrong');

  // In landscape the violin is the right-hand column, so ink must be there
  // and the left column must be the notation's panel.
  const landscapeFrame = `${output}-landscape-frame.png`;
  await exec('ffmpeg', ['-v', 'error', '-y', '-ss', '1.0', '-i', landscapePath, '-frames:v', '1', landscapeFrame]);
  const { stdout: rightColumn } = await exec('python3', ['-c', `
from PIL import Image
image = Image.open(${JSON.stringify(landscapeFrame)}).convert('RGB')
width, height = image.size
pixels = image.load()
left = int(width * 0.66)
right = int(width * 0.97)
top = int(height * 0.06)
bottom = int(height * 0.82)
painted = 0
for y in range(top, bottom):
    for x in range(left, right):
        r, g, b = pixels[x, y]
        if abs(r - 11) + abs(g - 16) + abs(b - 24) > 30: painted += 1
print(painted, (right - left) * (bottom - top))
`]);
  const [rightPainted, rightTotal] = rightColumn.trim().split(/\s+/).map(Number);
  assert.ok(rightPainted > 500, `The right-hand violin column is empty: only ${rightPainted} pixels painted of ${rightTotal}`);

  // The Plan's last part of the length: the Thank You clip closes the video
  // and is counted in it. The clip is two seconds, so four becomes six.
  const clipPath = join(profile, 'thank-you.mp4');
  await exec('ffmpeg', ['-v', 'error', '-y',
    '-f', 'lavfi', '-i', 'color=c=#0b1220:s=1280x720:d=2:r=30',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', clipPath]);
  thankYouClip = await readFile(clipPath);
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const thanked = await waitForRender('Violin render with a Thank You clip', 120000, landscape.href);
  assert.ok(thanked.status.startsWith('Rendered '), `Violin render did not complete: ${thanked.status}`);
  assert.match(thanked.status, /Thank You ending/, 'Violin export does not report its Thank You ending');
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
    ink: { backgroundPixels, otherPixels, paintedInColumn, rightPainted },
    layouts,
  }, null, 2));
} finally {
  cdp?.close();
  for (const child of [browser, server]) {
    if (!child || child.exitCode !== null) continue;
    child.kill('SIGTERM');
  }
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
