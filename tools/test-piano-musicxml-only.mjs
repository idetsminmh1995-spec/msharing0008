#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const pagePath = path.join(root, 'website/video-create/piano/index.html');
const html = fs.readFileSync(pagePath, 'utf8');

assert.match(html, /id="upload-musicxml"[^>]*accept="\.xml,\.musicxml,\.mxl"/);
assert.match(html, /id="upload-audio"[^>]*accept="audio\/\*"/);
assert.doesNotMatch(html, /id="upload-midi"/);
assert.doesNotMatch(html, /parseMidiFile/);
assert.doesNotMatch(html, /accept="\.mid,\.midi"/);
assert.match(html, /const ready = Boolean\(audioPlayer\.src && notationPlayback\)/);
assert.match(html, /Upload a MusicXML\/MXL score first/);
assert.match(html, /notationPlayback\) \{/);
assert.match(html, /MusicXML is the only score input for this page/);

// Check the actual inline page script parses as JavaScript. The importmap is
// JSON and the external scripts are validated by their own checks.
const inline = html.match(/<script>\s*([\s\S]*?)<\/script>/);
assert.ok(inline, 'Piano page inline script not found');
const temp = path.join('/tmp', `piano-inline-${process.pid}.js`);
fs.writeFileSync(temp, inline[1]);
try {
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(process.execPath, ['--check', temp], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
} finally {
  fs.rmSync(temp, { force: true });
}

console.log('Piano MusicXML-only flow: PASS');
