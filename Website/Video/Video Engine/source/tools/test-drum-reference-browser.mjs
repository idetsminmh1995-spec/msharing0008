#!/usr/bin/env node
/**
 * The Drum video's reference layout (Main Plan §၁၃, §၁၄ — steps V12, V13).
 *
 * The picture the user supplied fixes three things this file measures:
 *
 *   1. The Title band holds three rounded boxes -- TIME, BPM and COUNT --
 *      on the right, and COUNT carries the token the frame is sitting on.
 *   2. The bands are about 20 / 33 / 47 per cent, not the row default.
 *   3. Switching Video Color repaints everything: background, notation ink,
 *      the boxes, the title lines, the count and the accent. A part that
 *      kept a hard-coded colour would leave white text on a white frame.
 *
 * Requires chromium.
 *   node tools/test-drum-reference-browser.mjs
 */
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const exec = promisify(execFile);
const WEBSITE_ROOT = resolve(fileURLToPath(new URL('../../../../Website/', import.meta.url)));
const CHROMIUM = process.env.CHROMIUM_BIN || 'chromium';
const profile = await mkdtemp(join(tmpdir(), 'title-info-chromium-'));
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

async function evaluate(expression) {
  const response = await cdp.call('Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise: true,
  });
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  return response.result.value;
}


const RATIOS = ['16:9', '1:1', '9:16'];

try {
  const httpPort = await findFreePort();
  const debugPort = await findFreePort();
  server = spawn('python3', ['-m', 'http.server', String(httpPort), '--bind', '127.0.0.1'], {
    cwd: WEBSITE_ROOT, stdio: 'ignore',
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
  while (Date.now() - startedAt < 15000) {
    ready = await evaluate('Boolean(window.VideoEngine && window.VideoEngine.drawTitlePart)');
    if (ready) break;
    await sleep(100);
  }
  assert.ok(ready, 'VideoEngine did not finish loading');

  // --- 1. The bands are the reference picture's proportions ---------------
  const shares = JSON.parse(await evaluate(`(() => {
    const out = {};
    for (const ratio of ${JSON.stringify(RATIOS)}) {
      const size = VideoEngine.sizeFor(ratio);
      const layout = VideoEngine.layoutFor('drums', { width: size.width, height: size.height });
      const pad = layout.pad;
      const usable = size.height - pad * 2;
      out[ratio] = Object.fromEntries(Object.entries(layout.rects).map(([name, rect]) => [name, rect.height / usable]));
    }
    return JSON.stringify(out);
  })()`));
  for (const ratio of RATIOS) {
    const band = shares[ratio];
    assert.ok(Math.abs(band.title - 0.2) < 0.03 || ratio !== '16:9',
      `The ${ratio} title band is not the reference picture's ~20%: ${band.title.toFixed(3)}`);
    assert.ok(band.instrument > band.notation && band.notation > band.title,
      `The ${ratio} bands are not title < notation < instrument: ${JSON.stringify(band)}`);
    // The kit is the subject of the reference picture, so it must be the
    // largest band in every ratio rather than a strip under the sheet.
    assert.ok(band.instrument > 0.4, `The ${ratio} kit band is only ${(band.instrument * 100).toFixed(0)}% of the frame`);
  }
  assert.ok(Math.abs(shares['16:9'].notation - 0.33) < 0.03,
    `The 16:9 notation band is not the reference picture's ~33%: ${shares['16:9'].notation.toFixed(3)}`);
  assert.ok(Math.abs(shares['16:9'].instrument - 0.47) < 0.03,
    `The 16:9 kit band is not the reference picture's ~47%: ${shares['16:9'].instrument.toFixed(3)}`);

  // --- 2. TIME / BPM / COUNT boxes, with COUNT following the beat ---------
  const boxes = JSON.parse(await evaluate(`(() => {
    const meta = { beats: 4, beatType: 4, bpm: 120 };
    const size = VideoEngine.sizeFor('16:9');
    const rect = VideoEngine.layoutFor('drums', { width: size.width, height: size.height }).rects.title;
    const draw = (at, countDisplay) => {
      const canvas = document.createElement('canvas');
      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const texts = [];
      const fillText = ctx.fillText.bind(ctx);
      ctx.fillText = (text, x, y, maxWidth) => {
        texts.push({ text, x, y, width: ctx.measureText(text).width });
        return fillText(text, x, y, ...(maxWidth === undefined ? [] : [maxWidth]));
      };
      VideoEngine.drawTitlePart(ctx, { x: 0, y: 0, width: rect.width, height: rect.height }, at,
        meta, VideoEngine.paletteFor('white'), {
          infoBoxes: true, titleOne: 'DRUM PERFORMANCE', titleTwo: 'Exercise - 10',
          countEnabled: true, countDisplay,
        });
      return { texts, rect: { width: rect.width, height: rect.height } };
    };
    return JSON.stringify({
      beats: draw(0.1, 'beats'),
      second: draw(0.6, 'beats'),
      eighths: draw(0.3, 'eighths'),
    });
  })()`));

  const labelOf = (state, label) => state.texts.find((entry) => entry.text === label);
  for (const label of ['TIME', 'BPM', 'COUNT']) {
    assert.ok(labelOf(boxes.beats, label), `The Title band drew no ${label} box`);
  }
  assert.equal(labelOf(boxes.beats, '4/4')?.text, '4/4', 'The TIME box does not print the metre');
  assert.equal(labelOf(boxes.beats, '120')?.text, '120', 'The BPM box does not print the tempo');
  // The COUNT box is the one that moves: the same frame at two times shows
  // two different tokens, which a static readout could not do.
  const countAt = (state) => state.texts.filter((entry) => /^\d+$|^&$|^e$|^a$/.test(entry.text))
    .map((entry) => entry.text);
  assert.notDeepEqual(countAt(boxes.beats), countAt(boxes.second),
    `The COUNT box did not change between beats: ${JSON.stringify(countAt(boxes.beats))}`);
  assert.ok(countAt(boxes.eighths).includes('&'),
    `The eighth-note count did not print an "&" token: ${JSON.stringify(countAt(boxes.eighths))}`);

  // The three boxes sit on the right of the band, in order, and none of
  // them runs past the frame.
  const boxesRight = ['TIME', 'BPM', 'COUNT'].map((label) => labelOf(boxes.beats, label));
  for (const box of boxesRight) {
    assert.ok(box.x > boxes.beats.rect.width * 0.5,
      `An info box is not on the right of the band: ${JSON.stringify(box)}`);
    assert.ok(box.x + box.width <= boxes.beats.rect.width + 1,
      `An info box runs off the band: ${JSON.stringify(box)}`);
  }
  assert.ok(boxesRight[0].x < boxesRight[1].x && boxesRight[1].x < boxesRight[2].x,
    'The info boxes are not in the TIME, BPM, COUNT order the picture shows');
  // The Title lines stop before the boxes rather than running underneath.
  const titleOne = boxes.beats.texts.find((entry) => entry.text === 'DRUM PERFORMANCE');
  assert.ok(titleOne.x + titleOne.width <= boxesRight[0].x,
    `Title 1 runs under the info boxes: ${titleOne.x + titleOne.width} > ${boxesRight[0].x}`);

  // --- 3. Video Color repaints everything (§၁၄) --------------------------
  const theme = JSON.parse(await evaluate(`(() => {
    const size = { width: 1280, height: 720 };
    const meta = { beats: 4, beatType: 4, bpm: 120 };
    const logo = document.createElement('canvas');
    logo.width = 120; logo.height = 60;
    logo.getContext('2d').fillRect(0, 0, 120, 60);
    const out = {};
    for (const color of ['white', 'black']) {
      const palette = VideoEngine.paletteFor(color);
      const canvas = document.createElement('canvas');
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = palette.background;
      ctx.fillRect(0, 0, size.width, size.height);
      const rect = VideoEngine.layoutFor('drums', size).rects.title;
      // No title colours are named, so the band has to pick its own from
      // the theme -- that is the §၁၄ path a page takes by default.
      VideoEngine.drawTitlePart(ctx, rect, 0.1, meta, palette, {
        infoBoxes: true, titleOne: 'DRUM PERFORMANCE', titleTwo: 'Exercise - 10',
        countEnabled: true, countDisplay: 'beats', logoImage: logo,
      });
      const { data } = ctx.getImageData(0, 0, size.width, size.height);
      const at = (x, y) => {
        const offset = (y * size.width + x) * 4;
        return [data[offset], data[offset + 1], data[offset + 2]];
      };
      const lum = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;
      const background = lum(at(2, 2));
      let far = 0;
      let farSum = 0;
      for (let offset = 0; offset < data.length; offset += 4) {
        const value = lum([data[offset], data[offset + 1], data[offset + 2]]);
        if (Math.abs(value - background) > 60) { far += 1; farSum += value; }
      }
      out[color] = {
        palette,
        background: Math.round(background),
        inkPixels: far,
        inkMean: far > 0 ? Math.round(farSum / far) : null,
        // The notation sheet's own colours, so a colour switch cannot leave
        // a white card on a black frame.
        notation: { ink: palette.notationInk, background: palette.notationBackground },
      };
    }
    return JSON.stringify(out);
  })()`));

  assert.ok(theme.white.background > 200, `The White frame's background is not light: ${theme.white.background}`);
  assert.ok(theme.black.background < 60, `The Black frame's background is not dark: ${theme.black.background}`);
  // Ink has to contrast with its own background in both themes. White ink on
  // a white frame is the failure §၁၄ names, and it reads as "no ink here".
  assert.ok(theme.white.inkPixels > 500 && theme.white.inkMean < theme.white.background - 40,
    `The White frame's ink does not read against its background: ${JSON.stringify(theme.white)}`);
  assert.ok(theme.black.inkPixels > 500 && theme.black.inkMean > theme.black.background + 40,
    `The Black frame's ink does not read against its background: ${JSON.stringify(theme.black)}`);
  assert.notEqual(theme.white.notation.ink, theme.white.notation.background,
    'The notation sheet and its ink are the same colour in White');
  assert.notEqual(theme.black.notation.ink, theme.black.notation.background,
    'The notation sheet and its ink are the same colour in Black');
  assert.ok(theme.white.notation.background !== theme.black.notation.background,
    'The notation sheet keeps one colour across both themes');

  // --- 4. The live page follows the switch ------------------------------
  const previewProbe = `(() => {
    const canvas = document.querySelector('[data-video-preview]');
    if (!canvas || !canvas.width) return JSON.stringify({ missing: true });
    const ctx = canvas.getContext('2d');
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const at = (x, y) => { const o = (y * canvas.width + x) * 4; return [data[o], data[o + 1], data[o + 2]]; };
    const lum = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;
    const background = lum(at(1, 1));
    let far = 0; let farSum = 0;
    for (let o = 0; o < data.length; o += 4) {
      const value = lum([data[o], data[o + 1], data[o + 2]]);
      if (Math.abs(value - background) > 60) { far += 1; farSum += value; }
    }
    return JSON.stringify({ background: Math.round(background), ink: far, inkMean: far ? Math.round(farSum / far) : null });
  })()`;

  // The preview keeps the previous frame on the canvas until the rebuild
  // lands, so the wait is for the background to actually cross over. Waiting
  // for "some ink" would pass on the stale frame and then read the wrong
  // theme.
  const setColor = async (color) => {
    await evaluate(`(() => { const el = document.querySelector('[data-video-color]'); el.value = '${color}'; el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    const changedAt = Date.now();
    const reached = (probe) => !probe.missing && probe.ink > 200
      && (color === 'white' ? probe.background > 200 : probe.background < 60);
    let probe = null;
    while (Date.now() - changedAt < 20000) {
      probe = JSON.parse(await evaluate(previewProbe));
      if (reached(probe)) break;
      await sleep(150);
    }
    return probe;
  };

  const whitePreview = await setColor('white');
  assert.ok(whitePreview && !whitePreview.missing, 'The live preview canvas was not found');
  assert.ok(whitePreview.background > 200, `The White preview did not turn light: ${JSON.stringify(whitePreview)}`);
  assert.ok(whitePreview.inkMean < whitePreview.background - 30,
    `The White preview's ink does not read against its background: ${JSON.stringify(whitePreview)}`);

  const blackPreview = await setColor('black');
  assert.ok(blackPreview.background < 60, `The Black preview did not turn dark: ${JSON.stringify(blackPreview)}`);
  assert.ok(blackPreview.inkMean > blackPreview.background + 30,
    `The Black preview's ink does not read against its background: ${JSON.stringify(blackPreview)}`);

  console.log(JSON.stringify({
    shares, boxes: {
      labels: boxes.beats.texts.map((entry) => entry.text),
      countBeats: countAt(boxes.beats), countSecondBeat: countAt(boxes.second),
      countEighths: countAt(boxes.eighths),
    }, theme, preview: { white: whitePreview, black: blackPreview },
  }, null, 2));
  console.log('Drum reference layout passed for the bands, the info boxes and both Video Colors.');
} finally {
  cdp?.close();
  browser?.kill();
  server?.kill();
  await exec('rm', ['-rf', profile]).catch(() => {});
}
