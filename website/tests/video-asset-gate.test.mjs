import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../assets/video-asset-gate.js', import.meta.url), 'utf8');
const calls = [];
const engineAssets = new Map();
const engine = {
  requireAsset: (id) => { calls.push(['require', id]); engineAssets.set(id, 'pending'); },
  resolveRequired: (id, detail) => { calls.push(['resolve', id, detail]); engineAssets.set(id, 'ok'); },
  rejectRequired: (id, error) => { calls.push(['reject', id, error.message]); engineAssets.set(id, 'failed'); },
  assertAssetsReady: () => {
    calls.push(['assert']);
    const blocked = [...engineAssets].filter(([, status]) => status !== 'ok');
    if (blocked.length) throw new Error(`VideoEngine blocked: ${blocked.map(([id]) => id).join(', ')}`);
  },
};
const context = { window: { VideoEngine: engine }, performance, console };
vm.runInNewContext(source, context, { filename: 'video-asset-gate.js' });
const gate = context.window.VideoAssetGate.create({
  page: 'piano',
  groups: [
    { id: 'audio', label: 'Source audio', required: true },
    { id: 'notation', label: 'Notation', required: true },
    { id: 'outro', label: 'Thank You video', required: false },
  ],
});

gate.start();
assert.equal(gate.snapshot().status, 'checking');
gate.set('audio', 'ok', 'decoded', { bytes: 123 });
gate.set('notation', 'ok', 'rasterized');
gate.set('outro', 'failed', 'not found');
assert.equal(gate.assertReady(), true, 'optional missing media must not block a route');
const ready = gate.snapshot();
assert.equal(ready.status, 'ready-warning');
assert.equal(ready.required.length, 2);
assert.equal(ready.optional[0].status, 'failed');
assert.equal(calls.filter(([name]) => name === 'resolve').length, 2);
assert.equal(calls.some(([name, id]) => name === 'reject' && id === 'outro'), false);
assert.equal(engineAssets.get('audio'), 'ok');
assert.equal(engineAssets.get('notation'), 'ok');

const blocked = context.window.VideoAssetGate.create({
  page: 'drum',
  groups: [{ id: 'kit', label: 'Kit background', required: true }],
});
blocked.start();
assert.throws(() => blocked.assertReady(), /Asset gate blocked export/);
blocked.set('kit', 'failed', 'HTTP 404');
assert.throws(() => blocked.assertReady(), /Kit background: HTTP 404/);
assert.equal(calls.some(([name, id]) => name === 'reject' && id === 'kit'), true);
assert.equal(engineAssets.get('kit'), 'failed');

console.log('video-asset-gate tests passed');
