#!/usr/bin/env node
/**
 * Real-browser Video Engine smoke test.
 *
 * Requires chromium, ffprobe, and Python 3. No npm browser dependency is needed:
 * the runner speaks the small subset of Chrome DevTools Protocol it needs.
 *
 *   node tools/test-video-engine-browser.mjs
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
const FIXTURE_PATH = '/tools/browser-video-engine-fixture.html';
const CHROMIUM = process.env.CHROMIUM_BIN || 'chromium';
const profile = await mkdtemp(join(tmpdir(), 'video-engine-chromium-'));
const output = join(profile, 'browser-output.mp4');
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
      throw new Error(`Local HTTP server exited with code ${child.exitCode}${lastError ? `: ${lastError.message}` : ''}`);
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

async function waitForFixtureFunction(connection, timeoutMs = 15000) {
  const startedAt = Date.now();
  let state;
  while (Date.now() - startedAt < timeoutMs) {
    const evaluation = await connection.call('Runtime.evaluate', {
      expression: 'JSON.stringify({ url: location.href, ready: document.readyState, engine: typeof window.VideoEngine, fixture: typeof window.runVideoEngineBrowserTest })',
      returnByValue: true,
    });
    if (evaluation.exceptionDetails) throw new Error(JSON.stringify(evaluation.exceptionDetails));
    state = JSON.parse(evaluation.result.value);
    if (state.fixture === 'function') return;
    await sleep(100);
  }
  throw new Error(`Browser fixture did not become ready: ${JSON.stringify(state)}`);
}

try {
  const httpPort = await findFreePort();
  const debugPort = await findFreePort();
  server = spawn('python3', ['-m', 'http.server', String(httpPort), '--bind', '127.0.0.1'], {
    cwd: ROOT,
    stdio: 'ignore',
  });
  server.once('error', (error) => {
    if (!server.exitCode) console.error(`Could not start the fixture HTTP server: ${error.message}`);
  });
  await waitForHttp(`http://127.0.0.1:${httpPort}${FIXTURE_PATH}`, 10000, server);

  browser = spawn(CHROMIUM, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--mute-audio',
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${join(profile, 'profile')}`,
    `http://127.0.0.1:${httpPort}${FIXTURE_PATH}`,
  ], { stdio: 'ignore' });
  browser.once('error', (error) => {
    if (!browser.exitCode) console.error(`Could not start Chromium (${CHROMIUM}): ${error.message}`);
  });

  const devtoolsResponse = await waitForHttp(`http://127.0.0.1:${debugPort}/json`, 15000, browser);
  const devtools = await devtoolsResponse.json();
  const page = devtools.find((entry) => entry.type === 'page' && entry.url.includes(FIXTURE_PATH));
  assert.ok(page, `Chromium did not expose the fixture page at ${FIXTURE_PATH}`);
  cdp = new Cdp(page.webSocketDebuggerUrl);
  await cdp.call('Page.enable');
  await cdp.call('Runtime.enable');
  await waitForFixtureFunction(cdp);

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
  await writeFile(output, Buffer.from(result.base64, 'base64'));
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
  console.log(JSON.stringify({ ...result, base64: undefined, ffprobe: probe }, null, 2));
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
