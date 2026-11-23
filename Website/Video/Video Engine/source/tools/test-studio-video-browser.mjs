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
    const { stdout } = await exec('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', path]);
    return { seconds: Number(JSON.parse(stdout).format.duration), href: state.href };
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

  console.log(JSON.stringify({ status: result.status, bytes: result.bytes, extension, ffprobe: probe, notation: firstInk, slowScoreSeconds: slow.seconds, twoVoiceSeconds: twoVoice.seconds, repeatSeconds: repeated.seconds, twoPartSeconds: twoPart.seconds }, null, 2));
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
