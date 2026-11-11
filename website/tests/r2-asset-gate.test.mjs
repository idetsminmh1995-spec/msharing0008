import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = fs.readFileSync(new URL('../assets/asset-loader.js', import.meta.url), 'utf8');

function createLoader() {
  const window = {};
  const context = vm.createContext({
    window,
    URL: { revokeObjectURL() {} },
    performance: { now: () => 0 },
    setTimeout,
    clearTimeout,
    Promise,
    Error,
    TypeError,
    String,
    Number,
    Math,
    Map,
    Object,
    Array,
  });
  vm.runInContext(source, context, { filename: 'asset-loader.js' });
  return window.AssetLoader;
}

test('required R2 assets block VideoEngine until they resolve', () => {
  const loader = createLoader();
  loader.requireAsset('Thank You video (16x9 / guitar)');
  assert.throws(() => loader.assertReady(), /Video export blocked by required assets/);
  loader.resolveRequired('Thank You video (16x9 / guitar)', { source: 'r2' });
  assert.doesNotThrow(() => loader.assertReady());
});

test('a failed required R2 asset remains visible to the final export gate', () => {
  const loader = createLoader();
  loader.requireAsset('guitar photo');
  loader.rejectRequired('guitar photo', new Error('R2 returned HTTP 503'));
  assert.throws(() => loader.assertReady(), /guitar photo: R2 returned HTTP 503/);
  loader.requireAsset('guitar photo');
  assert.throws(() => loader.assertReady(), /guitar photo: not ready/);
});
