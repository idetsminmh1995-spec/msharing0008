#!/usr/bin/env node
/**
 * Real-browser Video Engine smoke test.
 *
 * Requires chromium and ffprobe. No npm browser dependency is needed: the
 * runner speaks the small subset of Chrome DevTools Protocol it needs.
 *
 *   node tools/test-video-engine-browser.mjs
 */
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const ROOT = resolve(new URL('..', import.meta.url).pathname);
const PORT = 9229;
const profile = await mkdtemp(join(tmpdir(), 'video-engine-chromium-'));
const output = join(profile, 'browser-output.mp4');
const outroOutput = join(profile, 'browser-outro-output.mp4');
const lastPixelOutput = join(profile, 'outro-last-frame.rgb');
const server = spawn('python3', ['-m', 'http.server', '8765', '--bind', '127.0.0.1'], {
  cwd: ROOT,
  stdio: 'ignore',
});
const browser = spawn('chromium', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--mute-audio',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(profile, 'profile')}`,
  'http://127.0.0.1:8765/tools/browser-video-engine-fixture.html',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitForJson(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch {}
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${url}`);
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

try {
  const devtools = await waitForJson(`http://127.0.0.1:${PORT}/json`);
  const page = devtools.find((entry) => entry.type === 'page');
  assert.ok(page, 'Chromium did not expose a page target');
  const cdp = new Cdp(page.webSocketDebuggerUrl);
  await cdp.call('Page.enable');
  await sleep(1000);
  const evaluation = await cdp.call('Runtime.evaluate', {
    expression: 'runVideoEngineBrowserTest()',
    awaitPromise: true,
    returnByValue: true,
  });
  if (evaluation.exceptionDetails) {
    throw new Error(JSON.stringify(evaluation.exceptionDetails));
  }
  const result = evaluation.result.value;
  assert.equal(result.container, 'mp4');
  assert.equal(result.path, 'webcodecs');
  assert.equal(result.frames, 30);
  assert.equal(result.streamApiPresent, true);
  assert.ok(result.bytes > 1000, 'browser output is unexpectedly small');
  assert.equal(result.outro.source, 'builtin');
  assert.equal(result.outro.frames, 120);
  assert.ok(Math.abs(result.outro.seconds - 4) < 0.1, 'built-in ending should follow a one-second take for three seconds');
  assert.ok(result.outro.bytes > 1000, 'encoded outro output is unexpectedly small');
  await writeFile(output, Buffer.from(result.base64, 'base64'));
  await writeFile(outroOutput, Buffer.from(result.outro.base64, 'base64'));
  const { stdout } = await exec('ffprobe', [
    '-v', 'error', '-show_entries', 'format=format_name,duration',
    '-show_entries', 'stream=codec_name,width,height,nb_frames', '-of', 'json', output,
  ]);
  const probe = JSON.parse(stdout);
  assert.ok(probe.format.format_name.split(',').includes('mp4'));
  assert.ok(Math.abs(Number(probe.format.duration) - 1) < 0.1, 'duration is not approximately one second');
  assert.equal(probe.streams[0].codec_name, 'h264');
  assert.equal(probe.streams[0].width, 320);
  assert.equal(probe.streams[0].height, 180);
  const { stdout: outroProbeOutput } = await exec('ffprobe', [
    '-v', 'error', '-show_entries', 'format=format_name,duration',
    '-show_entries', 'stream=codec_name,width,height,nb_frames', '-of', 'json', outroOutput,
  ]);
  const outroProbe = JSON.parse(outroProbeOutput);
  assert.ok(outroProbe.format.format_name.split(',').includes('mp4'));
  assert.ok(Math.abs(Number(outroProbe.format.duration) - 4) < 0.1, 'outro export duration should include the full ending');
  assert.equal(Number(outroProbe.streams[0].nb_frames), 120);
  await exec('ffmpeg', [
    '-v', 'error', '-i', outroOutput,
    '-vf', 'select=eq(n\\,119),crop=2:2:0:0,format=rgb24',
    '-fps_mode', 'passthrough', '-frames:v', '1', '-f', 'rawvideo', lastPixelOutput,
  ]);
  const lastPixel = [...await readFile(lastPixelOutput)];
  assert.equal(lastPixel.length, 12, 'should extract the last encoded frame corner');
  const expectedRgb = [251, 250, 248];
  const cornerRgb = lastPixel.slice(0, 3);
  assert.ok(cornerRgb.every((value, index) => Math.abs(value - expectedRgb[index]) <= 18), `last encoded frame corner ${cornerRgb} is not the white built-in ending`);
  console.log(JSON.stringify({ ...result, base64: undefined, outro: { source: result.outro.source, seconds: result.outro.seconds, frames: result.outro.frames, bytes: result.outro.bytes, finalFrameCornerRgb: cornerRgb, expectedBackgroundRgb: expectedRgb }, ffprobe: probe, outroFfprobe: outroProbe }, null, 2));
} finally {
  browser.kill('SIGTERM');
  server.kill('SIGTERM');
  await sleep(500);
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
