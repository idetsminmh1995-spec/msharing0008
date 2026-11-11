import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repoDir = path.resolve(packageDir, '../..');
const builtBundle = fs.readFileSync(path.join(packageDir, 'dist', 'notation-engine.js'));
const productionBundle = fs.readFileSync(path.join(repoDir, 'website', 'assets', 'notation-engine.js'));
const expectedCacheVersion = createHash('sha256').update(builtBundle).digest('hex').slice(0, 12);

function htmlFilesUnder(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return htmlFilesUnder(entryPath);
    return entry.isFile() && entry.name.endsWith('.html') ? [entryPath] : [];
  });
}

test('production video app serves the current notation engine with a content-addressed cache key', () => {
  assert.deepEqual(productionBundle, builtBundle, 'website/assets bundle must match the current build');

  const versionedReferences = [
    ...[path.join(repoDir, 'website'), path.join(repoDir, 'web-preview')]
      .flatMap(htmlFilesUnder)
      .flatMap((htmlPath) => {
        const html = fs.readFileSync(htmlPath, 'utf8');
        return [...html.matchAll(/notation-engine\.js\?v=([a-f0-9]+)/g)].map((match) => ({
          file: path.relative(repoDir, htmlPath),
          version: match[1],
        }));
      }),
  ];

  assert.ok(versionedReferences.length > 0, 'at least one video page must load the notation engine');
  for (const reference of versionedReferences) {
    assert.equal(
      reference.version,
      expectedCacheVersion,
      `${reference.file} must use the current bundle hash to defeat stale browser caches`,
    );
  }
});
