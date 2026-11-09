#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../website/assets/asset-loader.js', import.meta.url), 'utf8');
let objectId = 0;
let active = 0;
let maxActive = 0;
const fetchCalls = new Map();
const context = {
  console,
  performance,
  setTimeout,
  clearTimeout,
  AbortController,
  URL: {
    createObjectURL: () => `blob:test-${++objectId}`,
    revokeObjectURL: () => {},
  },
  Blob,
  window: {},
  fetch: async (url) => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    const base = url.split('?')[0];
    const attempt = Number(url.match(/[?&]assetAttempt=(\d+)/)?.[1] || 0);
    fetchCalls.set(base, (fetchCalls.get(base) || 0) + 1);
    await new Promise((resolve) => setTimeout(resolve, 2));
    active -= 1;
    if (base.endsWith('/missing')) return { ok: false, status: 404, blob: async () => new Blob() };
    if (base.endsWith('/flaky') && attempt < 3) return { ok: false, status: 500, blob: async () => new Blob() };
    return { ok: true, status: 200, blob: async () => new Blob(['x'], { type: 'image/png' }) };
  },
};
vm.runInNewContext(source, context, { filename: 'asset-loader.js' });
const loader = context.window.AssetLoader;
assert.equal(loader.MAX_CONCURRENCY, 6);

const image = () => ({ naturalWidth: 100, naturalHeight: 100, complete: true, removeAttribute() {}, async decode() {} });
await assert.rejects(() => loader.loadImage('https://worker.test/missing', image(), 'R38.png'), /HTTP 404/);
assert.equal(fetchCalls.get('https://worker.test/missing'), 1, '404 must not retry');

await loader.loadImage('https://worker.test/flaky', image(), 'Drum Bg.png');
assert.equal(fetchCalls.get('https://worker.test/flaky'), 4, '500 must retry three times');

await Promise.all(Array.from({ length: 18 }, (_, i) => loader.loadImage(`https://worker.test/ok-${i}`, image(), `hit-${i}.png`)));
assert.ok(maxActive <= 6, `concurrency exceeded six: ${maxActive}`);
assert.equal(loader.getRecords().length >= 20, true);
console.log('asset-loader tests passed', JSON.stringify({ maxActive, records: loader.getRecords().length }));
