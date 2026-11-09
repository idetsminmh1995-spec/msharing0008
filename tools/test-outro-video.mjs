#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../website/assets/outro-video.js', import.meta.url), 'utf8');
let requests = 0;
const context = {
  console,
  setTimeout,
  clearTimeout,
  AbortController,
  Blob,
  URL: { createObjectURL() { return 'blob:test'; }, revokeObjectURL() {} },
  document: { createElement() { throw new Error('video should not be created for 404'); } },
  window: {},
  fetch: async () => { requests += 1; return { ok: false, status: 404 }; },
};
vm.runInNewContext(source, context, { filename: 'outro-video.js' });
const api = context.window.OutroVideo;
const first = await api.loadOutro('https://worker.test', { aspect: '16x9', kind: 'drum', style: 'black' });
assert.equal(first, null);
assert.equal(api.lastFailure().kind, 'not-found');
assert.equal(api.lastFailure().status, 404);
const afterFirst = requests;
const second = await api.loadOutro('https://worker.test', { aspect: '16x9', kind: 'drum', style: 'black' });
assert.equal(second, null);
assert.equal(requests, afterFirst, 'short-lived 404 failure cache did not prevent immediate duplicate requests');
console.log('outro-video tests passed', JSON.stringify({ requests, failure: api.lastFailure() }));
