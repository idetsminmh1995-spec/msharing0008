#!/usr/bin/env node
/**
 * Stamps every `assets/*.js` reference in the site's pages with a short
 * hash of the file it points at.
 *
 * GitHub Pages serves the bundles with `Cache-Control: max-age=600`, so
 * after a push a browser keeps running the OLD engine for up to ten
 * minutes -- long enough for a change to look like it simply did not
 * work. The filename cannot carry the hash (the pages are hand-written
 * and there is no build step on Pages), but the query string can: a
 * bundle that changed gets a URL that changed, so the browser fetches
 * it, and a bundle that did not keeps its URL and stays cached.
 *
 * Run it after copying a `dist/` bundle into `website/assets/`:
 *
 *     node tools/stamp-assets.mjs            # rewrite the pages
 *     node tools/stamp-assets.mjs --check    # fail if any are stale
 *
 * `--check` is what a CI step would run: it writes nothing and exits
 * non-zero if a page still points at an old hash.
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'website');
const CHECK = process.argv.includes('--check');

/** Every `.html` under `website/`, in a stable order. */
function pages(dir) {
  const found = [];
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) found.push(...pages(path));
    else if (entry.endsWith('.html')) found.push(path);
  }
  return found;
}

/** Eight hex characters of the file's content -- enough to never collide here. */
const hashes = new Map();
function hashOf(path) {
  const cached = hashes.get(path);
  if (cached !== undefined) return cached;
  const hash = createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 8);
  hashes.set(path, hash);
  return hash;
}

// `src="../../assets/metronome-engine.js"`, with or without a stamp
// already on it. The path group stops before the `?` so re-running the
// script replaces the old stamp instead of appending to it.
const REFERENCE = /(<script\s[^>]*src=")([^"?]*assets\/[^"?/]+\.js)(\?v=[^"]*)?(")/g;

const stale = [];
let rewritten = 0;

for (const page of pages(SITE)) {
  const before = readFileSync(page, 'utf8');
  const after = before.replace(REFERENCE, (whole, head, path, oldStamp, tail) => {
    const asset = resolve(dirname(page), path);
    if (!asset.startsWith(SITE)) return whole; // nothing outside the site
    let hash;
    try {
      hash = hashOf(asset);
    } catch {
      console.warn(`! ${page.slice(ROOT.length + 1)} points at a missing ${path}`);
      return whole;
    }
    const stamp = `?v=${hash}`;
    if (stamp !== oldStamp) stale.push(`${page.slice(ROOT.length + 1)} -> ${path}${stamp}`);
    return head + path + stamp + tail;
  });
  if (after === before) continue;
  rewritten += 1;
  if (!CHECK) writeFileSync(page, after);
}

if (CHECK) {
  if (stale.length === 0) {
    console.log('every page points at the bundle it was built against.');
    process.exit(0);
  }
  console.error('these pages are pointing at a stale bundle:');
  for (const line of stale) console.error(`  ${line}`);
  console.error('\nrun: node tools/stamp-assets.mjs');
  process.exit(1);
}

console.log(
  stale.length === 0
    ? 'nothing to stamp -- every page is already current.'
    : `stamped ${stale.length} reference${stale.length === 1 ? '' : 's'} across ${rewritten} page${rewritten === 1 ? '' : 's'}:\n` +
        stale.map((line) => `  ${line}`).join('\n'),
);
