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
  const inputControls = JSON.parse(await evaluate("JSON.stringify({musicXml:!!document.querySelector('[data-metronome-musicxml-input]'),name:document.querySelector('[data-metronome-musicxml-name]')?.textContent,countEnabled:document.querySelector('[data-metronome-count-voice-enabled]')?.value,countDisabled:document.querySelector('[data-metronome-count-voice]')?.disabled,soundModel:document.querySelector('[data-metronome-sound-model]')?.value,soundVolume:document.querySelector('[data-metronome-sound-volume-value]')?.value})"));
  assert.ok(inputControls.musicXml, 'Metronome MusicXML picker is missing');
  assert.equal(inputControls.name, 'No file selected');
  assert.equal(inputControls.countEnabled, 'off');
  assert.equal(inputControls.countDisabled, true, 'Count Voice type should be disabled while Count Voice is Off');
  assert.equal(inputControls.soundModel, 'default');
  assert.equal(inputControls.soundVolume, '80%');
  const selectedFile = JSON.parse(await evaluate("(() => { const input = document.querySelector('[data-metronome-musicxml-input]'); const transfer = new DataTransfer(); transfer.items.add(new File(['<score-partwise/>'], 'studio-test.musicxml', {type:'application/xml'})); input.files = transfer.files; input.dispatchEvent(new Event('change', {bubbles:true})); return JSON.stringify({name:document.querySelector('[data-metronome-musicxml-name]').textContent,status:document.querySelector('[data-studio-status]').textContent}); })()"));
  assert.equal(selectedFile.name, 'studio-test.musicxml', 'MusicXML selection name was not displayed');
  assert.match(selectedFile.status, /MusicXML selected/);
  const audioControls = JSON.parse(await evaluate("(() => { const set = (selector, value) => { const control = document.querySelector(selector); control.value = value; control.dispatchEvent(new Event('input', {bubbles:true})); control.dispatchEvent(new Event('change', {bubbles:true})); }; set('[data-metronome-count-voice-enabled]', 'on'); set('[data-metronome-count-voice]', 'numeric'); set('[data-metronome-count-volume]', '42'); set('[data-metronome-sound-model]', 'room'); set('[data-metronome-sound-volume]', '63'); return JSON.stringify({voiceDisabled:document.querySelector('[data-metronome-count-voice]').disabled,countDisabled:document.querySelector('[data-metronome-count-volume]').disabled,countVolume:document.querySelector('[data-metronome-count-volume-value]').value,soundVolume:document.querySelector('[data-metronome-sound-volume-value]').value,model:document.querySelector('[data-metronome-sound-model]').value}); })()"));
  assert.equal(audioControls.voiceDisabled, false, 'Count Voice type did not enable when Count Voice was turned on');
  assert.equal(audioControls.countDisabled, false, 'Count Voice volume did not enable when Count Voice was turned on');
  assert.equal(audioControls.countVolume, '42%');
  assert.equal(audioControls.soundVolume, '63%');
  assert.equal(audioControls.model, 'room');

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

  // The Plan fixes a video's length as the sum of its parts, so the page
  // must not cap it: a long metronome setting has to stay exportable and
  // report its real length. Only the Video Engine's memory guard may stop it.
  await evaluate("(() => { const set = (selector, value) => { const el = document.querySelector(selector); el.value = value; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); }; set('[data-metronome-bpm]', '30'); set('[data-metronome-bars]', '16'); set('[data-metronome-numerator]', '12'); })()");
  const longReadyAt = Date.now();
  let longSettings = null;
  while (Date.now() - longReadyAt < 10000) {
    longSettings = JSON.parse(await evaluate("JSON.stringify({disabled:document.querySelector('[data-studio-generate]').disabled,estimate:document.querySelector('[data-metronome-duration]').textContent,status:document.querySelector('[data-studio-status]').textContent})"));
    if (/384\.00 sec/.test(longSettings.estimate)) break;
    await sleep(100);
  }
  assert.equal(longSettings.disabled, false, `Metronome render is still capped by the page: ${longSettings.status}`);
  assert.match(longSettings.estimate, /384\.00 sec/, `The page does not report the full length: ${longSettings.estimate}`);

  await evaluate("(() => { const set = (selector, value) => { const el = document.querySelector(selector); el.value = value; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); }; set('[data-metronome-design]', 'sweep-dial'); set('[data-metronome-aspect]', '9x16'); set('[data-metronome-bpm]', '96'); set('[data-metronome-bars]', '1'); set('[data-metronome-numerator]', '3'); set('[data-metronome-denominator]', '8'); })()");
  const previewReadyAt = Date.now();
  let preview = null;
  while (Date.now() - previewReadyAt < 10000) {
    preview = JSON.parse(await evaluate("JSON.stringify({src:document.querySelector('[data-metronome-preview]').src,visible:!document.querySelector('[data-metronome-preview]').hidden,naturalWidth:document.querySelector('[data-metronome-preview]').naturalWidth,estimate:document.querySelector('[data-metronome-duration]').textContent,status:document.querySelector('[data-studio-status]').textContent})"));
    // The previous settings' preview is already on screen, so wait for the
    // label to describe the settings just chosen rather than for any frame.
    if (preview.visible && preview.naturalWidth > 0 && /0\.94 sec/.test(preview.estimate)) break;
    await sleep(100);
  }
  assert.ok(preview?.visible && preview.naturalWidth > 0, 'Metronome SVG preview did not decode');
  assert.match(preview.estimate, /0\.94 sec/, `Unexpected meter duration calculation: ${preview.estimate}`);
  assert.match(preview.status, /synthesized click track/i, 'Preview state does not explain the click track');

  // The mark has to be IN the document, not a path: a blob SVG cannot
  // resolve an href to a file, so a path would silently draw nothing.
  const logo = JSON.parse(await evaluate("(async () => { const img = document.querySelector('[data-metronome-preview]'); const text = await (await fetch(img.src)).text(); const tag = (text.match(/<image[^>]*>/) || [''])[0]; return JSON.stringify({present: tag.length > 0, inlined: /href=\"data:image\\/svg\\+xml/.test(tag), href: tag.slice(0, 60)}); })()"));
  assert.ok(logo.present, 'Metronome preview frame has no logo image at all');
  assert.ok(logo.inlined, `Metronome logo is not inlined as a data URI: ${logo.href}`);

  // A decoded <image> is not proof the pixels landed. Read the corner.
  const logoPixels = await evaluate("(async () => { const img = document.querySelector('[data-metronome-preview]'); const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0); const short = Math.min(canvas.width, canvas.height); const size = Math.round(short * 0.16); const pad = Math.round(short * 0.055); const data = ctx.getImageData(pad, pad, size, size).data; let painted = 0; for (let i = 0; i < data.length; i += 4) { if (data[i + 3] > 10 && (data[i] > 60 || data[i + 1] > 60 || data[i + 2] > 60)) painted += 1; } return painted; })()");
  assert.ok(logoPixels > 50, `Metronome logo did not paint in the corner (${logoPixels} non-background pixels)`);

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
  assert.match(result.status, /MusicXML selected but not yet used/);
  assert.match(result.status, /Count Voice not yet connected/);
  assert.match(result.status, /selected Sound Model not yet applied/);
  const videoBytes = Buffer.from(result.base64, 'base64');
  assert.ok(videoBytes.length > 1000, 'Metronome export is unexpectedly small');
  const extension = state.download.split('.').pop();
  const videoPath = `${output}.${extension}`;
  await writeFile(videoPath, videoBytes);
  const { stdout } = await exec('ffprobe', [
    '-v', 'error', '-show_entries', 'format=format_name,duration',
    '-show_entries', 'stream=codec_type,codec_name,width,height,profile,level,sample_rate,channels', '-of', 'json', videoPath,
  ]);
  const probe = JSON.parse(stdout);
  const videoStream = probe.streams.find((stream) => stream.codec_type === 'video');
  const audioStream = probe.streams.find((stream) => stream.codec_type === 'audio');
  assert.ok(videoStream, 'Metronome output has no video stream');
  assert.ok(audioStream, 'Metronome output has no synthesized click-track audio');
  assert.equal(videoStream.width, 1080, 'Portrait video width is wrong');
  assert.equal(videoStream.height, 1920, 'Portrait video height is wrong');
  assert.ok(Math.abs(Number(probe.format.duration) - 0.9375) < 0.2, 'Video duration does not match 3/8 at quarter-note 96 BPM');

  // The Plan's shared size rule (B1): a ratio's picture is the Video
  // Engine's delivery size, not a size the page keeps for itself. Portrait
  // is measured above; landscape and square are measured here, so a page
  // that quietly exported 720p would fail rather than pass on the one
  // ratio that happened to be measured.
  const renderAspect = async (aspect, previousHref) => {
    await evaluate(`(() => { const select = document.querySelector('[data-metronome-aspect]'); select.value = ${JSON.stringify(aspect)}; select.dispatchEvent(new Event('change', {bubbles:true})); })()`);
    await sleep(200);
    await evaluate("document.querySelector('[data-studio-generate]').click()");
    const startedAt = Date.now();
    let rendered;
    while (Date.now() - startedAt < 90000) {
      rendered = JSON.parse(await evaluate("JSON.stringify({status:document.querySelector('[data-studio-status]').textContent,videoReady:!document.querySelector('[data-video-output]').hidden && document.querySelector('[data-video-output]').readyState >= 1,href:document.querySelector('[data-video-download]').href,download:document.querySelector('[data-video-download]').download})"));
      if (rendered.status.startsWith('Rendered ') && rendered.videoReady && rendered.href !== previousHref) break;
      if (rendered.status.startsWith('Metronome video render failed:')) throw new Error(`${aspect}: ${rendered.status}`);
      await sleep(150);
    }
    assert.ok(rendered?.status.startsWith('Rendered '), `${aspect} render did not complete: ${rendered?.status}`);
    const bytes = Buffer.from(await evaluate(`(async () => { const response = await fetch(${JSON.stringify(rendered.href)}); const bytes = new Uint8Array(await response.arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(binary); })()`), 'base64');
    const path = `${output}-${aspect}.${rendered.download.split('.').pop()}`;
    await writeFile(path, bytes);
    const streams = JSON.parse((await exec('ffprobe', ['-v', 'error',
      '-show_entries', 'stream=codec_type,codec_name,width,height,profile,level', '-of', 'json', path])).stdout).streams;
    return { ...rendered, path, stream: streams.find((stream) => stream.codec_type === 'video') };
  };

  const landscape = await renderAspect('16x9', state.href);
  assert.equal(landscape.stream?.width, 1920, `Landscape width is not the engine's 1080p delivery size: ${landscape.stream?.width}`);
  assert.equal(landscape.stream?.height, 1080, `Landscape height is not the engine's 1080p delivery size: ${landscape.stream?.height}`);
  assert.match(landscape.download, /^metronome-sweep-dial-16x9\.(mp4|webm)$/,
    `The landscape export is not named for its ratio: ${landscape.download}`);

  const square = await renderAspect('1x1', landscape.href);
  assert.equal(square.stream?.width, 1080, `Square width is not the engine's delivery size: ${square.stream?.width}`);
  assert.equal(square.stream?.height, 1080, `Square height is not the engine's delivery size: ${square.stream?.height}`);
  // The Plan's remaining check: a delivery size must fit the H.264 level the
  // file declares, or a strict decoder may refuse it. 1080x1080@30 is 4624
  // macroblocks and 138,720 a second, which level 3.2 already allows, so
  // the assertion is the level's own table rather than a fixed number.
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
  const assertAvcLevel = (stream, label) => {
    // A WebM fallback is VP8/VP9 and has no H.264 level; ffprobe reports
    // -99 for "not applicable", so the codec decides, not the number.
    if (!stream || stream.codec_name !== 'h264') return;
    const level = Number(stream.level);
    assert.ok(AVC_LIMITS[level], `${label} declares an H.264 level this test does not know: ${stream.level}`);
    const macroblocks = Math.ceil(stream.width / 16) * Math.ceil(stream.height / 16);
    assert.ok(macroblocks <= AVC_LIMITS[level].frame && macroblocks * 30 <= AVC_LIMITS[level].rate,
      `${label} does not fit the level it declares (level ${level}, ${macroblocks} macroblocks)`);
  };
  assertAvcLevel(videoStream, 'Portrait');
  assertAvcLevel(landscape.stream, 'Landscape');
  assertAvcLevel(square.stream, 'Square');
  assert.match(square.download, /^metronome-sweep-dial-1x1\.(mp4|webm)$/,
    `The square export is not named for its ratio: ${square.download}`);

  // Back to the settings the determinism check below re-renders.
  await evaluate("(() => { const select = document.querySelector('[data-metronome-aspect]'); select.value = '9x16'; select.dispatchEvent(new Event('change', {bubbles:true})); })()");
  await sleep(200);

  // Frame determinism (Plan §5). The same settings rendered twice have to
  // draw the same frames: a renderer that read the wall clock, or carried
  // state from one frame to the next, would drift here even though both
  // files have the right length and the right codecs.
  //
  // The frame is taken mid-swing, where a drifting clock shows up. An MP4
  // is lossy, so two encodings of the same picture differ by a few units at
  // hard edges; that is allowed. A moved hand is thousands of pixels, far
  // apart in colour, and is not.
  const firstFrame = `${output}-first-frame.png`;
  await exec('ffmpeg', ['-v', 'error', '-y', '-ss', '0.4', '-i', videoPath, '-frames:v', '1', firstFrame]);

  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const againStarted = Date.now();
  let again;
  while (Date.now() - againStarted < 90000) {
    again = JSON.parse(await evaluate("JSON.stringify({status:document.querySelector('[data-studio-status]').textContent,videoReady:!document.querySelector('[data-video-output]').hidden && document.querySelector('[data-video-output]').readyState >= 1,href:document.querySelector('[data-video-download]').href})"));
    if (again.status.startsWith('Rendered ') && again.videoReady && again.href !== state.href) break;
    if (again.status.startsWith('Metronome video render failed:')) throw new Error(again.status);
    await sleep(150);
  }
  assert.ok(again?.status.startsWith('Rendered '), `The second Metronome render did not complete: ${again?.status}`);
  const againResult = await evaluate(`(async () => { const response = await fetch(${JSON.stringify(again.href)}); const bytes = new Uint8Array(await response.arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(binary); })()`);
  const againPath = `${output}-again.${extension}`;
  await writeFile(againPath, Buffer.from(againResult, 'base64'));
  const againFrame = `${output}-again-frame.png`;
  await exec('ffmpeg', ['-v', 'error', '-y', '-ss', '0.4', '-i', againPath, '-frames:v', '1', againFrame]);
  const { stdout: drift } = await exec('python3', ['-c', `
from PIL import Image
first = Image.open(${JSON.stringify(firstFrame)}).convert('RGB')
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
    `The same metronome settings drew a different frame the second time: ${movedPixels} of ${totalPixels} pixels moved`);
  assert.ok(worstDelta <= 48, `The second render changed a colour rather than rounding one: delta ${worstDelta}`);

  // Every design gets a picture (Plan §5, metronome "remaining" list). A
  // design that throws, or that draws nothing, would still pass the export
  // test above because that one only exercises `sweep-dial`. Each design is
  // rendered through the page's own preview path, so this covers the code
  // the user actually sees, and the eleven pictures are compared with each
  // other: two designs that draw the same frame mean one of them is dead.
  const designs = JSON.parse(await evaluate("JSON.stringify(window.MetronomeDesigns.listDesigns().map((design) => design.id))"));
  assert.equal(designs.length, 11, `Expected 11 metronome designs, found ${designs.length}`);
  const snapshots = {};
  for (const design of designs) {
    await evaluate(`(() => { const select = document.querySelector('[data-metronome-design]'); select.value = ${JSON.stringify(design)}; select.dispatchEvent(new Event('change', {bubbles:true})); })()`);
    const designReadyAt = Date.now();
    let shot = null;
    while (Date.now() - designReadyAt < 10000) {
      shot = JSON.parse(await evaluate(`(async () => {
        const DESIGN = ${JSON.stringify(design)};
        const image = document.querySelector('[data-metronome-preview]');
        if (image.hidden || !image.src || !image.naturalWidth) return JSON.stringify({ ready: false });
        // A refresh for the previous design can still be in flight. Its
        // frame is a real frame, so only the one the panel says it is
        // showing counts -- otherwise two designs compare as identical.
        if (image.dataset.design !== DESIGN) return JSON.stringify({ ready: false });
        const canvas = document.createElement('canvas');
        canvas.width = 240; canvas.height = 240;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 240, 240);
        ctx.drawImage(image, 0, 0, 240, 240);
        const data = ctx.getImageData(0, 0, 240, 240).data;
        let ink = 0, hash = 0;
        for (let i = 0; i < data.length; i += 4) {
          const value = data[i] + data[i + 1] * 3 + data[i + 2] * 7;
          if (value > 24) ink += 1;
          hash = (hash * 31 + value) % 2147483647;
        }
        return JSON.stringify({ ready: true, ink, hash, status: document.querySelector('[data-studio-status]').textContent });
      })()`));
      if (shot.ready) break;
      await sleep(100);
    }
    assert.ok(shot?.ready, `Design "${design}" did not produce a decodable preview`);
    assert.ok(shot.ink > 400, `Design "${design}" drew an almost empty frame (${shot.ink} lit samples)`);
    assert.doesNotMatch(shot.status, /failed|error/i, `Design "${design}" reported a failure: ${shot.status}`);
    snapshots[design] = shot.hash;
  }
  const duplicateDesigns = Object.entries(snapshots)
    .filter(([design, hash]) => Object.entries(snapshots).some(([other, value]) => other !== design && value === hash));
  assert.deepEqual(duplicateDesigns, [], `These designs drew an identical frame: ${duplicateDesigns.map(([design]) => design).join(', ')}`);

  // The Metronome Engine Plan's remaining item: the input and failure paths.
  // Three ways a page can be wrong without any picture looking wrong -- it
  // renders from settings it never validated, it keeps a file after the user
  // cancelled, or it reports success when the browser has no offline audio.
  await evaluate("(() => { const set = (selector, value) => { const el = document.querySelector(selector); el.value = value; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); }; set('[data-metronome-bpm]','120'); set('[data-metronome-bars]','4'); set('[data-metronome-numerator]','4'); set('[data-metronome-denominator]','4'); set('[data-metronome-aspect]','9x16'); })()");
  await sleep(400);
  const invalidInput = JSON.parse(await evaluate(`(() => {
    const set = (selector, value) => { const el = document.querySelector(selector); el.value = value; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); };
    const read = () => ({ disabled: document.querySelector('[data-studio-generate]').disabled, status: document.querySelector('[data-studio-status]').textContent });
    set('[data-metronome-bpm]', '');
    const emptyTempo = read();
    set('[data-metronome-bpm]', '120');
    set('[data-metronome-bars]', '99');
    const tooManyBars = read();
    set('[data-metronome-bars]', '4');
    set('[data-metronome-design]', 'no-such-design');
    const unknownDesign = read();
    set('[data-metronome-design]', 'sweep-dial');
    return JSON.stringify({ emptyTempo, tooManyBars, unknownDesign });
  })()`));
  assert.equal(invalidInput.emptyTempo.disabled, true, `An empty tempo still offered a render: ${invalidInput.emptyTempo.status}`);
  assert.match(invalidInput.emptyTempo.status, /Tempo must be an integer/);
  assert.equal(invalidInput.tooManyBars.disabled, true, `99 bars still offered a render: ${invalidInput.tooManyBars.status}`);
  assert.match(invalidInput.tooManyBars.status, /Bars must be an integer from 1 to 16/);
  assert.equal(invalidInput.unknownDesign.disabled, true, `An unknown design still offered a render: ${invalidInput.unknownDesign.status}`);
  assert.match(invalidInput.unknownDesign.status, /Choose one of the metronome designs/);

  // A long setting, so the cancel lands mid-render rather than after it.
  await evaluate("(() => { const set = (selector, value) => { const el = document.querySelector(selector); el.value = value; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); }; set('[data-metronome-bpm]','30'); set('[data-metronome-bars]','16'); })()");
  await sleep(400);
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  await sleep(600);
  const midRender = JSON.parse(await evaluate("JSON.stringify({label:document.querySelector('[data-studio-generate]').textContent,status:document.querySelector('[data-studio-status]').textContent})"));
  assert.match(midRender.label, /Cancel render/, `The render button did not turn into a cancel: ${JSON.stringify(midRender)}`);
  await evaluate("document.querySelector('[data-studio-generate]').click()");
  const cancelStartedAt = Date.now();
  let cancelled = null;
  while (Date.now() - cancelStartedAt < 20000) {
    cancelled = JSON.parse(await evaluate("JSON.stringify({status:document.querySelector('[data-studio-status]').textContent,label:document.querySelector('[data-studio-generate]').textContent,downloadHidden:document.querySelector('[data-video-download]').hidden,videoHidden:document.querySelector('[data-video-output]').hidden,disabled:document.querySelector('[data-studio-generate]').disabled})"));
    if (/cancelled/i.test(cancelled.status) && cancelled.label === 'Render metronome video') break;
    await sleep(150);
  }
  assert.match(cancelled?.status ?? '', /cancelled/i, `Cancelling did not report a cancelled render: ${cancelled?.status}`);
  assert.equal(cancelled.label, 'Render metronome video', 'The button did not return to its render label after a cancel');
  assert.equal(cancelled.disabled, false, 'The page stayed locked after a cancel');
  assert.equal(cancelled.downloadHidden, true, 'A cancelled render left a download link behind');
  assert.equal(cancelled.videoHidden, true, 'A cancelled render left a video on the page');

  // A browser with no OfflineAudioContext must say so, not export a silent
  // video or claim the click track was made.
  const noOfflineAudio = JSON.parse(await evaluate(`(async () => {
    const saved = [window.OfflineAudioContext, window.webkitOfflineAudioContext];
    window.OfflineAudioContext = undefined;
    window.webkitOfflineAudioContext = undefined;
    const set = (selector, value) => { const el = document.querySelector(selector); el.value = value; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); };
    set('[data-metronome-bpm]', '120');
    set('[data-metronome-bars]', '2');
    await new Promise((resolve) => setTimeout(resolve, 400));
    document.querySelector('[data-studio-generate]').click();
    const startedAt = Date.now();
    let state = { status: '', disabled: true };
    while (Date.now() - startedAt < 10000) {
      state = { status: document.querySelector('[data-studio-status]').textContent, disabled: document.querySelector('[data-studio-generate]').disabled, videoHidden: document.querySelector('[data-video-output]').hidden };
      if (/failed/i.test(state.status)) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    [window.OfflineAudioContext, window.webkitOfflineAudioContext] = saved;
    return JSON.stringify(state);
  })()`));
  assert.match(noOfflineAudio.status, /cannot create the metronome click track/,
    `A browser without OfflineAudioContext did not report the reason: ${noOfflineAudio.status}`);
  assert.equal(noOfflineAudio.disabled, false, 'The page stayed locked after the offline-audio failure');
  assert.equal(noOfflineAudio.videoHidden, true, 'A failed render left a video on the page');

  // Restoring the constructor has to leave the page working, not merely
  // unblocked: the next settings change must paint a preview again.
  await evaluate("(() => { const set = (selector, value) => { const el = document.querySelector(selector); el.value = value; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); }; set('[data-metronome-bars]','4'); })()");
  const recoveredAt = Date.now();
  let recovered = null;
  while (Date.now() - recoveredAt < 10000) {
    recovered = JSON.parse(await evaluate("JSON.stringify({visible:!document.querySelector('[data-metronome-preview]').hidden,naturalWidth:document.querySelector('[data-metronome-preview]').naturalWidth,disabled:document.querySelector('[data-studio-generate]').disabled})"));
    if (recovered.visible && recovered.naturalWidth > 0) break;
    await sleep(100);
  }
  assert.ok(recovered?.visible && recovered.naturalWidth > 0, 'The preview did not recover after the offline-audio failure');
  assert.equal(recovered.disabled, false, 'The render button did not recover after the offline-audio failure');

  console.log(JSON.stringify({
    status: result.status, bytes: result.bytes, download: state.download, ffprobe: probe,
    determinism: { movedPixels, totalPixels, worstDelta },
    designs: { count: designs.length, ids: designs },
    invalidInput, cancel: cancelled.status, noOfflineAudio: noOfflineAudio.status,
  }, null, 2));
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
