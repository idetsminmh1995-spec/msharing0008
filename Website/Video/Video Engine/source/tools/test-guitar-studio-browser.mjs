#!/usr/bin/env node
/**
 * Chromium integration test for Guitar Engine -> Studio -> VideoEngine.
 *
 * Requires chromium, ffprobe, and Python 3 (Pillow for the frame's ink).
 *   node tools/test-guitar-studio-browser.mjs
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
const profile = await mkdtemp(join(tmpdir(), 'studio-guitar-chromium-'));
const output = join(profile, 'guitar-output');
let server;
let browser;
let cdp;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Four notes on four strings, then two more: the neck has something to show. */
const TAB_SCORE = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>Guitar Studio Test</work-title></work>
  <part-list><score-part id="P1"><part-name>Guitar</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>TAB</sign><line>5</line></clef>
        <staff-details><staff-lines>6</staff-lines></staff-details>
      </attributes>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type>
        <notations><technical><string>1</string><fret>0</fret><fingering>0</fingering></technical></notations></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type>
        <notations><technical><string>3</string><fret>2</fret><fingering>1</fingering></technical></notations></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type>
        <notations><technical><string>4</string><fret>3</fret><fingering>2</fingering></technical></notations></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><type>quarter</type>
        <notations><technical><string>6</string><fret>3</fret><fingering>3</fingering></technical></notations></note>
    </measure>
    <measure number="2">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>half</type>
        <notations><technical><string>1</string><fret>0</fret></technical></notations></note>
      <note><pitch><step>A</step><octave>3</octave></pitch><duration>4</duration><type>half</type>
        <notations><technical><string>5</string><fret>0</fret></technical></notations></note>
    </measure>
  </part>
</score-partwise>`;

/** The same notes with no tablature at all: positions cannot be invented. */
const NO_TAB_SCORE = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Guitar</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
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
  const input = document.querySelector('[data-guitar-musicxml-input]');
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
    if (state.download && state.ready >= 1 && state.href !== previousHref) return state;
    if (state.status.startsWith('Guitar video render failed:')) return state;
    await sleep(150);
  }
  throw new Error(`${label} did not finish: ${state?.status}`);
}

/**
 * The Thank You clip lives on the engine's R2 bucket, so the test answers
 * for it: `clip` is its bytes, or null for the 404 the Plan allows.
 */
let thankYouClip = null;
/**
 * A picture the page is told not to find. Plan §5 says a required asset that
 * will not load stops the export; a neck drawn without its strings would be
 * a wrong video, not a missing one.
 */
let missingPicture = null;
async function serveThankYou() {
  cdp.on('Fetch.requestPaused', async (event) => {
    if (missingPicture && event.request.url.includes(missingPicture)) {
      await cdp.call('Fetch.fulfillRequest', {
        requestId: event.requestId,
        responseCode: 404,
        responseHeaders: [{ name: 'Access-Control-Allow-Origin', value: '*' }],
        body: Buffer.from('not found').toString('base64'),
      });
      return;
    }
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
    homeReady = await evaluate("document.readyState === 'complete' && Boolean(document.querySelector('[data-tool=Guitar]'))");
    if (homeReady) break;
    await sleep(100);
  }
  assert.ok(homeReady, 'Create Video page did not show the Guitar tool card');
  await evaluate("document.querySelector('[data-tool=Guitar]').click()");
  const navigationStartedAt = Date.now();
  let navigated = false;
  while (Date.now() - navigationStartedAt < 10000) {
    try {
      navigated = await evaluate("location.pathname.endsWith('/studio.html') && new URLSearchParams(location.search).get('tool') === 'guitar'");
    } catch {
      navigated = false;
    }
    if (navigated) break;
    await sleep(100);
  }
  if (!navigated) {
    throw new Error(`Guitar tool card did not navigate to its Studio route; current URL: ${await evaluate('location.href')}`);
  }

  const startedAt = Date.now();
  let ready = false;
  while (Date.now() - startedAt < 15000) {
    ready = await evaluate("Boolean(window.VideoEngine && window.GuitarEngine && !document.querySelector('[data-guitar-controls]').hidden)");
    if (ready) break;
    await sleep(100);
  }
  assert.ok(ready, 'Guitar bundle, VideoEngine, or Guitar controls did not load');
  assert.equal(await evaluate("document.querySelector('[data-studio-title]').textContent"), 'Guitar Studio');
  assert.equal(await evaluate("document.querySelector('[data-studio-settings]').hidden"), true, 'Guitar route exposed the shared Drum settings');

  const controls = JSON.parse(await evaluate("JSON.stringify({photos:[...document.querySelectorAll('[data-guitar-photo] option')].map(o=>o.value),aspect:document.querySelector('[data-guitar-aspect]').value,picking:document.querySelector('[data-guitar-picking]').value,legend:document.querySelector('[data-guitar-hand-legend]').checked,name:document.querySelector('[data-guitar-musicxml-name]').textContent})"));
  assert.deepEqual(controls.photos, ['acoustic-drawn', 'classical-drawn', 'electric-drawn', 'strat-drawn'], 'Guitar pictures are not the four measured ones');
  assert.equal(controls.aspect, '16x9');
  assert.equal(controls.picking, 'pick');
  assert.equal(controls.legend, true);
  assert.equal(controls.name, 'No file selected');

  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  const mobile = JSON.parse(await evaluate("JSON.stringify({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,columns:getComputedStyle(document.querySelector('[data-studio-workspace]')).gridTemplateColumns,controlsWidth:document.querySelector('[data-guitar-controls]').getBoundingClientRect().width})"));
  assert.ok(mobile.scrollWidth <= mobile.width, `Guitar Studio overflows at phone width: ${JSON.stringify(mobile)}`);
  assert.equal(mobile.columns.trim().split(/\s+/).length, 1, 'Guitar Studio did not use one column on phone');
  assert.ok(mobile.controlsWidth > 0, 'Guitar controls are not visible on phone');
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  const desktop = JSON.parse(await evaluate("JSON.stringify({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,columns:getComputedStyle(document.querySelector('[data-studio-workspace]')).gridTemplateColumns})"));
  assert.ok(desktop.scrollWidth <= desktop.width, `Guitar Studio overflows at desktop width: ${JSON.stringify(desktop)}`);
  assert.equal(desktop.columns.trim().split(/\s+/).length, 2, 'Guitar Studio did not use two columns on desktop');

  // Determinism: the same second must paint the same frame, every time.
  const geometry = JSON.parse(await evaluate(`(() => {
    const G = window.GuitarEngine;
    const photo = G.photoNamed('classical-drawn', 'assets/guitar/classical-drawn.svg');
    const notes = [{string:1,fret:0,startSeconds:0,endSeconds:0.5},{string:3,fret:2,startSeconds:0.5,endSeconds:1}];
    const frame = (seconds) => JSON.stringify(G.stageShapes({width:1200,height:400,seconds,notes,photo}));
    const shapes = G.stageShapes({width:1200,height:400,seconds:0.6,notes,photo});
    const roles = {};
    for (const shape of shapes) roles[shape.role ?? shape.kind] = (roles[shape.role ?? shape.kind] ?? 0) + 1;
    return JSON.stringify({same: frame(0.6) === frame(0.6), differs: frame(0.6) !== frame(0.1), roles, count: shapes.length});
  })()`));
  assert.ok(geometry.same, 'stageShapes is not deterministic at one second');
  assert.ok(geometry.differs, 'stageShapes does not change between seconds');
  assert.ok(geometry.roles.photo >= 1, 'The guitar picture is not part of the frame');
  assert.ok(geometry.roles.fretNumber >= 1, 'The fret numbers are not part of the frame');
  assert.ok(geometry.roles.mark >= 1, 'A played note is not marked on the neck');

  // Each picture carries its own measurements, so the marks land on ITS strings.
  const pictures = JSON.parse(await evaluate(`(() => {
    const G = window.GuitarEngine;
    const out = {};
    for (const name of ['acoustic-drawn', 'classical-drawn', 'electric-drawn', 'strat-drawn']) {
      const photo = G.photoNamed(name, 'assets/guitar/' + name + '.svg');
      out[name] = {width: photo.width, height: photo.height, frets: photo.frets.length};
    }
    return JSON.stringify(out);
  })()`));
  assert.equal(pictures['acoustic-drawn'].width, 1743);
  assert.equal(pictures['classical-drawn'].width, 1513.5);
  assert.equal(pictures['electric-drawn'].width, 1920);
  assert.equal(pictures['strat-drawn'].width, 3058);

  // A score with no tablature is refused, not guessed at.
  await selectScore(NO_TAB_SCORE, 'no-tab.musicxml');
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const refused = await waitForRender('A score with no tablature');
  assert.match(refused.status, /no tablature positions/, `A score with no tablature was not refused: ${refused.status}`);
  assert.equal(refused.download, false, 'A score with no tablature still produced a download');

  await selectScore(TAB_SCORE, 'guitar-studio-test.musicxml');
  const selected = JSON.parse(await evaluate("JSON.stringify({name:document.querySelector('[data-guitar-musicxml-name]').textContent,status:document.querySelector('[data-studio-status]').textContent})"));
  assert.equal(selected.name, 'guitar-studio-test.musicxml', 'MusicXML selection name was not displayed');
  assert.match(selected.status, /MusicXML selected/);

  await evaluate("(() => { const set = (selector, value) => { const el = document.querySelector(selector); el.value = value; el.dispatchEvent(new Event('change', {bubbles:true})); }; set('[data-guitar-aspect]', '9x16'); set('[data-guitar-photo]', 'strat-drawn'); })()");
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const state = await waitForRender('Guitar render');
  assert.ok(state.status.startsWith('Rendered '), `Guitar render did not complete: ${state.status}`);
  assert.match(state.status, /no Thank You clip/, 'Guitar export does not say its ending is missing');
  assert.ok(state.href.startsWith('blob:'), 'Guitar export is not backed by a Blob URL');
  assert.match(state.name, /^guitar-strat-drawn-9x16\.(mp4|webm)$/);

  const result = await evaluate(`(async () => { const response = await fetch(${JSON.stringify(state.href)}); const bytes = new Uint8Array(await response.arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return { base64: btoa(binary), bytes: bytes.length, status: document.querySelector('[data-studio-status]').textContent, summary: document.querySelector('[data-guitar-summary]').textContent }; })()`);
  assert.match(result.summary, /6 notes/, `Guitar summary did not count the tablature notes: ${result.summary}`);
  const videoBytes = Buffer.from(result.base64, 'base64');
  assert.ok(videoBytes.length > 1000, 'Guitar export is unexpectedly small');
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
  assert.ok(videoStream, 'Guitar output has no video stream');
  assert.equal(audioStream, undefined, 'Guitar output claims an audio track the engine cannot make');
  assert.equal(videoStream.width, 720, 'Portrait guitar video width is wrong');
  assert.equal(videoStream.height, 1280, 'Portrait guitar video height is wrong');
  // The Plan's length rule, with no cap of the page's own: two 4/4 bars at
  // the default 120 BPM are four seconds, and no 12-second cap applies.
  const scoreSeconds = Number(probe.format.duration);
  assert.ok(Math.abs(scoreSeconds - 4) < 0.4, `Guitar video is not the score's length: ${scoreSeconds}s instead of 4s`);

  // The neck must actually be in the pixels, not just in the shape list.
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
  assert.ok(otherPixels > backgroundPixels, `The guitar frame is mostly empty: ${otherPixels} painted of ${backgroundPixels + otherPixels}`);

  // The Plan's last part of the length: the Thank You clip closes the video
  // and is counted in it. The clip is two seconds, so four becomes six.
  const clipPath = join(profile, 'thank-you.mp4');
  await exec('ffmpeg', ['-v', 'error', '-y',
    '-f', 'lavfi', '-i', 'color=c=#0b1220:s=720x1280:d=2:r=30',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', clipPath]);
  thankYouClip = await readFile(clipPath);
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const thanked = await waitForRender('Guitar render with a Thank You clip', 120000, state.href);
  assert.ok(thanked.status.startsWith('Rendered '), `Guitar render did not complete: ${thanked.status}`);
  assert.match(thanked.status, /Thank You ending/, 'Guitar export does not report its Thank You ending');
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

  // Plan §5: a required picture that will not load stops the export rather
  // than producing a neck with no strings on it.
  //
  // This runs last, and on a picture no earlier render has drawn, because
  // `imageCache` keeps what it fetched: a picture that loaded once is drawn
  // from memory, and one that failed once stays failed for the life of the
  // page. Blocking a picture that is already cached would prove nothing.
  missingPicture = 'electric-drawn.svg';
  await evaluate("(() => { const el = document.querySelector('[data-guitar-photo]'); el.value = 'electric-drawn'; el.dispatchEvent(new Event('change', {bubbles:true})); })()");
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const noPicture = await waitForRender('A render whose guitar picture is missing', 30000, thanked.href);
  assert.match(noPicture.status, /could not be loaded/i,
    `A missing guitar picture did not stop the export: ${noPicture.status}`);
  assert.equal(noPicture.href, thanked.href,
    'A missing guitar picture replaced the previous video with a broken one');
  missingPicture = null;

  console.log(JSON.stringify({ status: result.status, summary: result.summary, bytes: result.bytes, download: state.name, ffprobe: probe, scoreSeconds, thankYouSeconds: thankedSeconds, missingPicture: noPicture.status, ink: { backgroundPixels, otherPixels } }, null, 2));
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
