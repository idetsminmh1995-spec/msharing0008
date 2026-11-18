import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, describe } from 'node:test';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(packageDir, 'src');

/**
 * The engine must own its notation data. This is the guard for Part C of
 * PLAN.md: a third-party notation program's name must not creep back into
 * the engine's own source as a provenance claim.
 *
 * Two things are deliberately NOT failures:
 *
 *  - A **host asset id** in `soundfont/browser.ts`. A SoundFont is a
 *    downloadable instrument set the host serves, and a few of those files
 *    are named after the project that built them. That is the host's
 *    manifest, not the engine's notation data, and the engine only fetches
 *    whichever id the caller asks for. See the comment on that table.
 *  - A **format's own vocabulary**. MusicXML's `<identification>` can name
 *    the program that wrote a file, and a fixture exported by one program
 *    legitimately carries that program's name. That is a cross-software
 *    fact about the input, not engine provenance.
 *
 * Everything else -- a spacing law, a staff distance, a notehead shape
 * attributed to another program -- is what this test exists to catch.
 */
const FORBIDDEN = /musescore/i;

/** The one file allowed to name a host asset id, and only in its asset table. */
const HOST_ASSET_FILE = path.join('soundfont', 'browser.ts');

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(entryPath);
    return entry.isFile() && entry.name.endsWith('.ts') ? [entryPath] : [];
  });
}

describe('the engine owns its notation data (PLAN.md Part C)', () => {
  test('no engine source attributes a default to another notation program', () => {
    const offenders = [];
    for (const file of sourceFiles(SRC)) {
      const relative = path.relative(SRC, file);
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, index) => {
        if (!FORBIDDEN.test(line)) return;
        // The host-asset table is the one allowed mention, and only there.
        if (relative === HOST_ASSET_FILE) return;
        offenders.push(`${relative}:${index + 1}: ${line.trim()}`);
      });
    }
    assert.deepEqual(
      offenders,
      [],
      `engine source must not cite another notation program's provenance:\n${offenders.join('\n')}`,
    );
  });

  test('the only mention left in src/ is the host SoundFont asset table', () => {
    const mentions = [];
    for (const file of sourceFiles(SRC)) {
      const relative = path.relative(SRC, file);
      const text = fs.readFileSync(file, 'utf8');
      if (FORBIDDEN.test(text)) mentions.push(relative);
    }
    assert.deepEqual(mentions, [HOST_ASSET_FILE]);
  });

  test('the host-asset mentions are asset ids and paths, never notation data', () => {
    const text = fs.readFileSync(path.join(SRC, HOST_ASSET_FILE), 'utf8');
    for (const line of text.split('\n')) {
      if (!FORBIDDEN.test(line)) continue;
      // Every remaining mention must be inside a quoted asset id or path,
      // e.g. 'musescore-general-sf3': 'musescore-general/...'.
      assert.match(
        line,
        /['"][^'"]*musescore[^'"]*['"]/i,
        `host-asset mention is not a quoted asset id or path: ${line.trim()}`,
      );
    }
  });
});
