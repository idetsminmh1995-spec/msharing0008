import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = fs.readFileSync(new URL('../assets/voice-samples.js', import.meta.url), 'utf8');

function createLoader(fetchImpl) {
  const window = {};
  vm.runInNewContext(source, { window, fetch: fetchImpl, AbortController, setTimeout, clearTimeout, Promise });
  return window.VoiceSamples;
}

function reply(status, bytes = 'clip') {
  return {
    ok: status >= 200 && status < 300,
    status,
    arrayBuffer: async () => Uint8Array.from(Buffer.from(bytes)).buffer,
  };
}

test('falls back to another filename convention when a later voice file differs from the first', async () => {
  const requested = [];
  const loader = createLoader(async (address) => {
    requested.push(address);
    if (address.endsWith('/M1.wav')) return reply(200, 'first');
    if (address.endsWith('/2.wave')) return reply(200, 'second');
    if (address.endsWith('/3.wave')) return reply(200, 'third');
    return reply(404);
  });

  const first = await loader.load('https://assets.test', 'measure', 1);
  const second = await loader.load('https://assets.test', 'measure', 2);
  const third = await loader.load('https://assets.test', 'measure', 3);
  assert.ok(first && first.byteLength > 0);
  assert.ok(second && second.byteLength > 0);
  assert.ok(third && third.byteLength > 0);
  assert.ok(requested.some((url) => url.endsWith('/M2.wav')));
  assert.ok(requested.some((url) => url.endsWith('/2.wave')));
  assert.ok(requested.some((url) => url.endsWith('/3.wave')));
});

test('applies a request timeout to every shared-asset fetch', async () => {
  const loader = createLoader((_address, options) =>
    new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }),
  );
  const result = await loader.load('https://assets.test', 'count', 1);
  assert.equal(result, null);
});
