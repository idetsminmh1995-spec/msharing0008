#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const pages = ['drum', 'guitar', 'bass-guitar', 'piano', 'violin', 'metronome'];
for (const page of pages) {
  const file = join('website', 'video-create', page, 'index.html');
  const source = await readFile(file, 'utf8');
  assert.match(source, /id: 'outro', label: 'Thank You ending', required: true/, `${page} must make the ending required`);
  assert.match(source, /OutroVideo\.resolve\(API_BASE/, `${page} must use source-locked resolver`);
  assert.doesNotMatch(source, /OutroVideo\.loadOutro\(API_BASE/, `${page} must not bypass resolver`);
  assert.doesNotMatch(source, /continue without it/, `${page} must not advertise silent no-outro success`);
}
console.log(`outro rollout policy passed for ${pages.length} pages`);
