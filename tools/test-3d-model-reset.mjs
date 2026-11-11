#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const retiredModels = [
  'website/assets/hand/hand_model.glb',
  'website/assets/hand/hands_pair.glb',
  'website/assets/hand/hands_pair_source.blend',
];

for (const relativePath of retiredModels) {
  assert.equal(existsSync(resolve(root, relativePath)), false, `${relativePath} must be removed from the current tree`);
}

const pianoPage = readFileSync(resolve(root, 'website/video-create/piano/index.html'), 'utf8');
assert.doesNotMatch(pianoPage, /piano-hand-3d\.js/, 'Piano page must not load the retired renderer');
assert.match(pianoPage, /<option value="hands" disabled>/, 'Hands mode must remain visibly unavailable during the rebuild');
assert.match(pianoPage, /function pianoDesign\(\)\s*\{\s*return 'falling-notes';\s*\}/, 'saved settings must safely fall back to Falling Notes');

const handDemo = readFileSync(resolve(root, 'website/hand-demo/index.html'), 'utf8');
assert.doesNotMatch(handDemo, /GLTFLoader|hand_model\.glb/, 'Retired demo must not request the removed model');
assert.match(handDemo, /being rebuilt/i, 'Retired demo must explain why it is unavailable');

console.log('3D model reset checks passed');
