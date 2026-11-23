#!/usr/bin/env node
/**
 * The shared audio contract: how a segment's `AudioBuffer` becomes the
 * sound of the file.
 *
 * Every adapter that carries sound hands the engine one buffer per segment
 * and nothing else, so the rules that join them are the rules every
 * instrument inherits. Three of them are checked here, each one against the
 * decoded output rather than against the code that wrote it:
 *
 *   - timeline: segment two starts where segment one ends, not at zero
 *     and not on top of it
 *   - sample rate: a buffer handed over at 44.1kHz is resampled to the
 *     48kHz master and keeps its pitch
 *   - channels: a stereo segment followed by a mono one stays stereo
 *
 * The third one is the reason this test exists. The join used to take the
 * narrowest segment's channel count, so the mono Thank You clip appended
 * after a stereo voice recording folded the recording down to mono, and
 * the viewer lost a channel they had supplied.
 *
 * Requires chromium, ffmpeg and ffprobe.
 *   node tools/test-audio-contract-browser.mjs
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
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FIXTURE_PATH = '/tools/audio-contract-fixture.html';
const CHROMIUM = process.env.CHROMIUM_BIN || 'chromium';
const profile = await mkdtemp(join(tmpdir(), 'audio-contract-chromium-'));
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

async function waitForFixture(timeoutMs = 15000) {
  const startedAt = Date.now();
  let state;
  while (Date.now() - startedAt < timeoutMs) {
    state = JSON.parse(await evaluate(
      "JSON.stringify({ready:document.readyState,engine:typeof window.VideoEngine,fixture:typeof window.runAudioContractTest})",
    ));
    if (state.fixture === 'function') return;
    await sleep(100);
  }
  throw new Error(`The fixture did not become ready: ${JSON.stringify(state)}`);
}

const probe = async (path) => {
  const { stdout } = await exec('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration',
    '-show_entries', 'stream=codec_name,channels,sample_rate', '-of', 'json', path,
  ]);
  const info = JSON.parse(stdout);
  return {
    seconds: Number(info.format.duration),
    video: info.streams.find((stream) => stream.codec_name === 'vp8'),
    audio: info.streams.find((stream) => stream.codec_name === 'opus'),
  };
};

/** Decodes the file to mono PCM and reports the tone in a window of it. */
async function pitchBetween(path, startSeconds, endSeconds) {
  const decoded = `${path}.wav`;
  await exec('ffmpeg', ['-v', 'error', '-y', '-i', path, '-ac', '1', '-ar', '48000', '-c:a', 'pcm_s16le', decoded]);
  const { stdout } = await exec('python3', ['-c', `
import sys, wave
with wave.open(sys.argv[1]) as handle:
    rate = handle.getframerate()
    frames = handle.readframes(handle.getnframes())
samples = memoryview(frames).cast('h')
start = int(rate * float(sys.argv[2]))
end = min(int(rate * float(sys.argv[3])), len(samples))
crossings = 0
previous = samples[start]
for index in range(start + 1, end):
    current = samples[index]
    if (previous < 0) != (current < 0):
        crossings += 1
    previous = current
print((crossings / 2) * (rate / (end - start)))
`, decoded, String(startSeconds), String(endSeconds)]);
  return Number(stdout.trim());
}

try {
  const httpPort = await findFreePort();
  const debugPort = await findFreePort();
  server = spawn('python3', ['-m', 'http.server', String(httpPort), '--bind', '127.0.0.1'], {
    cwd: ROOT,
    stdio: 'ignore',
  });
  await waitForHttp(`http://127.0.0.1:${httpPort}${FIXTURE_PATH}`, 10000, server);

  browser = spawn(CHROMIUM, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--mute-audio',
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${join(profile, 'profile')}`,
    `http://127.0.0.1:${httpPort}${FIXTURE_PATH}`,
  ], { stdio: 'ignore' });

  const devtoolsResponse = await waitForHttp(`http://127.0.0.1:${debugPort}/json`, 15000, browser);
  const devtools = await devtoolsResponse.json();
  const page = devtools.find((entry) => entry.type === 'page' && entry.url.includes(FIXTURE_PATH));
  assert.ok(page, `Chromium did not expose the fixture page at ${FIXTURE_PATH}`);
  cdp = new Cdp(page.webSocketDebuggerUrl);
  await cdp.call('Runtime.enable');
  await waitForFixture();

  const render = async (name) => {
    const result = await evaluate(`runAudioContractTest(${JSON.stringify(name)})`);
    const path = join(profile, `${name}.${result.container === 'mp4' ? 'mp4' : 'webm'}`);
    await writeFile(path, Buffer.from(result.base64, 'base64'));
    return { ...result, path, probe: await probe(path) };
  };

  // 1. Timeline. Two one-second tones; the second starts at 1s.
  const offset = await render('offset');
  assert.equal(offset.container, 'webm');
  assert.ok(offset.probe.audio, 'the two-segment render has no sound');
  assert.equal(offset.probe.audio.sample_rate, '48000', 'the sound is not mastered at 48kHz');
  assert.ok(Math.abs(offset.probe.seconds - 2) < 0.3,
    `two one-second segments did not make a two-second file: ${offset.probe.seconds}s`);
  // Inside each second, away from the join and the codec padding.
  const first = await pitchBetween(offset.path, 0.2, 0.8);
  const second = await pitchBetween(offset.path, 1.2, 1.8);
  assert.ok(Math.abs(first - 440) < 25, `segment one is not its 440Hz tone: ${first.toFixed(1)}Hz`);
  assert.ok(Math.abs(second - 880) < 30, `segment two is not its 880Hz tone: ${second.toFixed(1)}Hz`);
  // The point of the check: segment two is not also at 440Hz, which is what
  // would happen if both were laid down at zero.
  assert.ok(Math.abs(second - first) > 200,
    `both segments sound like the same tone (${first.toFixed(1)}Hz, ${second.toFixed(1)}Hz), so they were not placed in time`);

  // 2. Sample rate. A 44.1kHz buffer keeps its pitch through the 48kHz master.
  const resample = await render('resample');
  assert.equal(resample.probe.audio.sample_rate, '48000', 'the resampled sound is not at 48kHz');
  const resampled = await pitchBetween(resample.path, 0.2, 0.8);
  assert.ok(Math.abs(resampled - 660) < 25,
    `a 44.1kHz 660Hz tone came out at ${resampled.toFixed(1)}Hz, so it was not resampled correctly`);

  // 3. Channels. Stereo first, mono second: the file stays stereo.
  const channels = await render('channels');
  assert.equal(Number(channels.probe.audio.channels), 2,
    'a stereo segment followed by a mono one was folded down to mono; the widest segment has to decide');

  console.log(JSON.stringify({
    offset: { seconds: offset.probe.seconds, first: Number(first.toFixed(1)), second: Number(second.toFixed(1)) },
    resample: { hz: Number(resampled.toFixed(1)), sampleRate: resample.probe.audio.sample_rate },
    channels: Number(channels.probe.audio.channels),
  }, null, 2));
} finally {
  cdp?.close();
  for (const child of [browser, server]) {
    if (!child || child.exitCode !== null) continue;
    child.kill('SIGTERM');
    await Promise.race([new Promise((resolve) => child.once('exit', resolve)), sleep(1500)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
