#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../website/assets/outro-video.js', import.meta.url), 'utf8');

class FakeVideo {
  constructor() {
    this.listeners = new Map();
    this.videoWidth = 1920;
    this.videoHeight = 1080;
    this.videoWidth = 1920;
    this.duration = 6;
    this.readyState = 4;
    this.currentTime = 0;
    this.paused = true;
  }
  addEventListener(name, fn) {
    const list = this.listeners.get(name) || [];
    list.push(fn);
    this.listeners.set(name, list);
  }
  removeEventListener(name, fn) {
    const list = this.listeners.get(name) || [];
    this.listeners.set(name, list.filter((item) => item !== fn));
  }
  emit(name) {
    for (const fn of [...(this.listeners.get(name) || [])]) fn();
  }
  set src(value) {
    this._src = value;
    queueMicrotask(() => this.emit('loadedmetadata'));
  }
  get src() { return this._src; }
  pause() { this.paused = true; }
  load() {}
  removeAttribute(name) { if (name === 'src') this._src = ''; }
}

function makeResponse({ status = 200, bytes = Uint8Array.from([0, 1, 2, 3]), stream = false, contentType = 'video/mp4' } = {}) {
  const headers = new Map([
    ['content-type', contentType],
    ['content-length', String(bytes.byteLength)],
  ]);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get(name) { return headers.get(name.toLowerCase()) || null; } },
    async arrayBuffer() { return bytes.slice().buffer; },
    ...(stream ? {
      body: {
        getReader() {
          let done = false;
          return {
            async read() {
              if (done) return { done: true, value: undefined };
              done = true;
              return { done: false, value: bytes };
            },
            async cancel() {},
            releaseLock() {},
          };
        },
      },
    } : {}),
  };
}

function makeContext(fetch, { createVideo = true, videoEngine = null } = {}) {
  return {
    console,
    setTimeout,
    clearTimeout,
    queueMicrotask,
    AbortController,
    Blob,
    Uint8Array,
    Math,
    URL: { createObjectURL() { return `blob:test-${Math.random()}`; }, revokeObjectURL() {} },
    document: { createElement() {
      if (!createVideo) throw new Error('video should not be created');
      return new FakeVideo();
    } },
    window: videoEngine ? { VideoEngine: videoEngine } : {},
    fetch,
  };
}

function loadApi(fetch, options) {
  const context = makeContext(fetch, options);
  vm.runInNewContext(source, context, { filename: 'outro-video.js' });
  return context.window.OutroVideo;
}

// An unavailable outro is optional by default and must not block the main take.
{
  const calls = [];
  const videoEngine = {
    requireAsset: (...args) => calls.push(['require', ...args]),
    resolveRequired: (...args) => calls.push(['resolve', ...args]),
    rejectRequired: (...args) => calls.push(['reject', ...args]),
  };
  const api = loadApi(async () => makeResponse({ status: 404 }), {
    createVideo: false,
    videoEngine,
  });
  const result = await api.loadOutro('https://optional.test', {
    aspect: 'optional-test', kind: 'drum', retries: 0, retryDelayMs: 0, jitterMs: 0,
  });
  assert.equal(result, null);
  assert.deepEqual(calls, [], 'optional missing outro must not alter the required-assets gate');
}

// Workflows may explicitly require an outro and retain the fail-closed behavior.
{
  const calls = [];
  const videoEngine = {
    requireAsset: (...args) => calls.push(['require', ...args]),
    resolveRequired: (...args) => calls.push(['resolve', ...args]),
    rejectRequired: (...args) => calls.push(['reject', ...args]),
  };
  const api = loadApi(async () => makeResponse({ status: 404 }), {
    createVideo: false,
    videoEngine,
  });
  const result = await api.loadOutro('https://required.test', {
    aspect: 'required-test', kind: 'drum', required: true,
    retries: 0, retryDelayMs: 0, jitterMs: 0,
  });
  assert.equal(result, null);
  assert.equal(calls[0][0], 'require');
  assert.equal(calls.at(-1)[0], 'reject');
}

// 404/403 are not retried for the same candidate, and failed results are short-lived cached.
{
  let requests = 0;
  const api = loadApi(async () => { requests += 1; return makeResponse({ status: 404 }); }, { createVideo: false });
  const first = await api.loadOutro('https://worker.test', { aspect: '404-test', kind: 'drum', style: 'black', retries: 2, retryDelayMs: 0, jitterMs: 0 });
  assert.equal(first, null);
  assert.equal(api.lastFailure().kind, 'not-found');
  assert.equal(api.lastFailure().status, 404);
  assert.equal(requests, api.outroKeys({ aspect: '404-test', kind: 'drum', style: 'black' }).length, '404 should advance through each unique candidate without same-key retry');
  const afterFirst = requests;
  await api.loadOutro('https://worker.test', { aspect: '404-test', kind: 'drum', style: 'black' });
  assert.equal(requests, afterFirst, 'failure cache should prevent immediate duplicate requests');
}

// 403 also advances without retrying the same candidate.
{
  const urls = [];
  const api = loadApi(async (url) => { urls.push(url); return makeResponse({ status: 403 }); }, { createVideo: false });
  await api.loadOutro('https://worker.test', { aspect: '403-test', kind: 'drum', style: 'black', retries: 2, retryDelayMs: 0, jitterMs: 0 });
  assert.equal(urls.length, api.outroKeys({ aspect: '403-test', kind: 'drum', style: 'black' }).length);
  assert.equal(api.lastFailure().kind, 'forbidden');
}

// 500 is retried twice, then a successful response is accepted.
{
  let calls = 0;
  const api = loadApi(async () => {
    calls += 1;
    return calls < 3 ? makeResponse({ status: 500 }) : makeResponse();
  });
  const result = await api.loadOutro('https://retry.test', { aspect: 'retry-test', kind: 'drum', style: 'black', retryDelayMs: 0, jitterMs: 0 });
  assert.equal(result.source, 'r2');
  assert.equal(result.attempts, 3);
  assert.equal(result.reason, null);
  assert.equal(result.bytes, 4);
  assert.equal(calls, 3);
}

// Network errors are retried and progress is reported for a streamed response.
{
  let calls = 0;
  const progress = [];
  const api = loadApi(async () => {
    calls += 1;
    if (calls === 1) throw new Error('connection reset');
    return makeResponse({ stream: true, bytes: Uint8Array.from([4, 5, 6, 7, 8]) });
  });
  const result = await api.loadOutro('https://network.test', {
    aspect: 'network-test', kind: 'drum', style: 'black', retryDelayMs: 0, jitterMs: 0,
    onProgress: (event) => progress.push(event),
  });
  assert.equal(result.source, 'r2');
  assert.equal(result.attempts, 2);
  assert.equal(result.bytes, 5);
  assert.ok(progress.some((event) => event.loaded === 5));
}

// Piano/paino aliases are both included in the candidate list.
{
  const keys = loadApi(async () => makeResponse({ status: 404 }), { createVideo: false }).outroKeys({ aspect: 'alias-test', kind: 'piano', style: 'black' });
  assert.equal(keys[0], 'Thank Video/alias-test/piano/alias-test Black Piano.mp4');
  assert.equal(keys[2], 'Thank Video/alias-test/paino/alias-test Black Paino.mp4');
}

// A stalled first byte is classified as timeout and does not hang the loader.
{
  const api = loadApi(async () => ({
    ok: true,
    status: 200,
    headers: { get(name) { return name === 'content-length' ? '4' : 'video/mp4'; } },
    body: { getReader() { return { read() { return new Promise(() => {}); }, async cancel() {}, releaseLock() {} }; } },
  }));
  const started = Date.now();
  const result = await api.loadOutro('https://timeout.test', {
    aspect: 'timeout-test', kind: 'drum', style: 'black', retries: 0,
    firstByteTimeoutMs: 5, stallTimeoutMs: 5, totalTimeoutMs: 50, jitterMs: 0,
  });
  assert.equal(result, null);
  assert.equal(api.lastFailure().kind, 'timeout');
  assert.ok(Date.now() - started < 1000);
}

console.log('outro-video S1 tests passed');
