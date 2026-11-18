import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repoDir = path.resolve(packageDir, '..', '..');
const builtBundle = fs.readFileSync(path.join(packageDir, 'dist', 'notation-engine.js'));
const expectedCacheVersion = createHash('sha256').update(builtBundle).digest('hex').slice(0, 12);

/**
 * The engine ships standalone: it has no build-time knowledge of the host
 * app and must run from `dist/` on its own. This test is the integration
 * check for the one host that lives in this repo -- it verifies the app's
 * copy is the current build and that its cache-busting keys match. It
 * SKIPS when the app is not checked out next to the engine (a standalone
 * engine checkout), rather than failing on a path that was never there.
 */
const APP_ROOT = path.join(repoDir, 'Website');
const APP_BUNDLE = path.join(APP_ROOT, 'assets', 'notation-engine.js');
const hasApp = fs.existsSync(APP_BUNDLE);

function htmlFilesUnder(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return htmlFilesUnder(entryPath);
    return entry.isFile() && entry.name.endsWith('.html') ? [entryPath] : [];
  });
}

test(
  'the web app serves the current notation engine with a content-addressed cache key',
  { skip: hasApp ? false : 'the Website app is not checked out next to the engine' },
  () => {
    assert.deepEqual(
      fs.readFileSync(APP_BUNDLE),
      builtBundle,
      'Website/assets bundle must match the current build',
    );

    const versionedReferences = htmlFilesUnder(APP_ROOT).flatMap((htmlPath) => {
      const html = fs.readFileSync(htmlPath, 'utf8');
      return [...html.matchAll(/notation-engine\.js\?v=([a-f0-9]+)/g)].map((match) => ({
        file: path.relative(repoDir, htmlPath),
        version: match[1],
      }));
    });

    assert.ok(
      versionedReferences.length > 0,
      'at least one web app page must load the notation engine',
    );
    for (const reference of versionedReferences) {
      assert.equal(
        reference.version,
        expectedCacheVersion,
        `${reference.file} must use the current bundle hash to defeat stale browser caches`,
      );
    }
  },
);

test(
  'the served Bravura font ships with its OFL license next to it',
  { skip: hasApp ? false : 'the Website app is not checked out next to the engine' },
  () => {
    const engineFontLicense = fs.readFileSync(path.join(packageDir, 'dist', 'fonts', 'LICENSE.md'));
    const servedFontDir = path.join(APP_ROOT, 'assets', 'fonts');
    const servedFontLicense = path.join(servedFontDir, 'LICENSE.md');

    assert.ok(
      fs.existsSync(path.join(servedFontDir, 'Bravura.woff2')),
      'the served fonts directory must contain the Bravura font',
    );
    assert.ok(
      fs.existsSync(servedFontLicense),
      'the OFL requires the license be distributed with the font -- the served fonts directory must carry it too',
    );
    assert.deepEqual(
      fs.readFileSync(servedFontLicense),
      engineFontLicense,
      'the served license must be the same file the engine ships, not a stale copy',
    );
  },
);
