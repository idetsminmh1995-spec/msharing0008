import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, describe } from 'node:test';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(packageDir, 'src');

/**
 * The engine must own its notation data AND its asset vocabulary. This is
 * the guard for Part C of PLAN.md: a third-party notation program's name
 * must not appear in the engine's own source at all.
 *
 * The one thing that is deliberately NOT a failure is a **format's own
 * vocabulary**: MusicXML's `<identification>` can name the program that
 * wrote a file, and a fixture exported by one program legitimately carries
 * that program's name. That is a cross-software fact about the input, not
 * engine provenance -- and it lives under `test/fixtures/`, never in
 * `src/`.
 *
 * Part J removed the last allowance this test used to carry: the host
 * SoundFont asset table once named third-party files (`musescore-general-*`)
 * because that was where the host's assets happened to live. Those assets
 * are now addressed by this project's own ids (`ms-core-sf3`, ...), so no
 * `src/` file needs the name any more, and this test asserts it is gone.
 */
const FORBIDDEN = /musescore/i;

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
        offenders.push(`${relative}:${index + 1}: ${line.trim()}`);
      });
    }
    assert.deepEqual(
      offenders,
      [],
      `engine source must not cite another notation program's provenance:\n${offenders.join('\n')}`,
    );
  });

  test('the host SoundFont asset table names only this project own asset ids', () => {
    const text = fs.readFileSync(path.join(SRC, 'soundfont', 'browser.ts'), 'utf8');
    // Every asset id in the fallback table is a bare kebab-case id; none
    // names a third-party file.
    for (const match of text.matchAll(/'([a-z0-9-]+)':\s*'/g)) {
      assert.doesNotMatch(match[1], FORBIDDEN, `asset id cites another program: ${match[1]}`);
    }
  });
});
