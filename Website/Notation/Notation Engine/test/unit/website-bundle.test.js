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

/**
 * The hand-written app assets are served with a `?v=` key that a browser uses
 * to decide whether its cached copy is still good. A key that does not match
 * the file's bytes pins returning visitors to whatever version was current
 * when the key was last typed, so they run stale JavaScript against the new
 * engine bundle. `scripts/sync-website-bundle.mjs` re-derives the keys on every
 * build; this test fails if a page was left holding a key the bytes do not
 * match, which is what a hand-edited page or a skipped build looks like.
 */
test(
  'every hand-written app asset is referenced by a key derived from its own bytes',
  { skip: hasApp ? false : 'the Website app is not checked out next to the engine' },
  () => {
    const appAssets = [
      'script.js',
      'soundfonts-config.js',
      'notation-entry.js',
      'notation-editor.js',
      'notation-newscore.js',
      'studio-video.js',
      'studio-metronome.js',
      'studio-guitar.js',
      'studio-piano.js',
      'studio-bass.js',
      'studio-violin.js',
      'studio-voice.js',
      'styles.css',
      'assets/writer-engine.js',
      'assets/video-engine.js',
      'assets/metronome-engine.js',
    ];

    const expectedVersions = new Map(
      appAssets.map((relative) => [
        relative,
        createHash('sha256')
          .update(fs.readFileSync(path.join(APP_ROOT, relative)))
          .digest('hex')
          .slice(0, 12),
      ]),
    );

    const pages = htmlFilesUnder(APP_ROOT).map((htmlPath) => ({
      name: path.relative(repoDir, htmlPath),
      html: fs.readFileSync(htmlPath, 'utf8'),
    }));

    for (const [relative, expected] of expectedVersions) {
      const escaped = relative.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(?:src|href)="${escaped}\\?v=([^"]+)"`, 'g');
      for (const page of pages) {
        for (const match of page.html.matchAll(pattern)) {
          assert.equal(
            match[1],
            expected,
            `${page.name} pins ${relative} to ${match[1]}, but the file's own bytes hash to ${expected} -- run the build so the cache key follows the file`,
          );
        }
      }
    }
  },
);

/**
 * The notation bundle's address is written in JavaScript too, not only in a
 * page's `<script src>`. `video-engine.js` loads the engine on demand from a
 * string literal, and nothing re-keyed that literal: the Video preview kept
 * asking for the hash of whichever build was current when the line was typed,
 * so a returning browser could run the video against an older engine than the
 * editor page beside it. The build now re-keys every file that names the
 * bundle; this test fails if one was left holding a stale address.
 */
test(
  'every script that names the notation engine asks for the current bundle',
  { skip: hasApp ? false : 'the Website app is not checked out next to the engine' },
  () => {
    const scriptAssets = [
      path.join(APP_ROOT, 'assets', 'video-engine.js'),
      path.join(repoDir, 'Video', 'Video Engine', 'source', 'website', 'assets', 'video-engine.js'),
    ].filter((scriptPath) => fs.existsSync(scriptPath));

    assert.ok(scriptAssets.length > 0, 'the Video Engine must be checked out to name the bundle');

    let found = 0;
    for (const scriptPath of scriptAssets) {
      const text = fs.readFileSync(scriptPath, 'utf8');
      for (const match of text.matchAll(/notation-engine\.js\?v=([a-f0-9]+)/g)) {
        found += 1;
        assert.equal(
          match[1],
          expectedCacheVersion,
          `${path.relative(repoDir, scriptPath)} loads the notation engine at ${match[1]}, but the bundle hashes to ${expectedCacheVersion} -- run the build so the address follows the bundle`,
        );
      }
    }
    assert.ok(found > 0, 'the Video Engine must load the notation engine by a versioned address');
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
