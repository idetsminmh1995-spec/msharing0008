import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURES = path.join(packageDir, 'test', 'fixtures');

/** Every fixture file the corpus ships. */
function fixtureFiles() {
  const out = [];
  for (const dir of ['musicxml', 'cross-software', 'mxl']) {
    const full = path.join(FIXTURES, dir);
    if (!fs.existsSync(full)) continue;
    for (const name of fs.readdirSync(full)) {
      if (/\.(musicxml|mxl)$/.test(name)) out.push(name);
    }
  }
  return out;
}

/** Every test/helper file's source, once, for the reference check. */
function testSources() {
  const out = [];
  for (const dir of ['unit', 'visual', 'perf', 'helpers']) {
    const full = path.join(packageDir, 'test', dir);
    if (!fs.existsSync(full)) continue;
    for (const file of fs.readdirSync(full)) {
      if (file.endsWith('.js')) out.push(fs.readFileSync(path.join(full, file), 'utf8'));
    }
  }
  return out;
}

/**
 * The fixture matrix (`Documentation/MusicXML-Fixture-Matrix.md`) is generated
 * and `fixtures:check` keeps it honest about WHAT each fixture contains. This
 * guard covers the other half of Part D's "keep it maintained": a fixture
 * nothing reads is dead weight that will silently stop being exercised.
 */
describe('the fixture corpus stays maintained (PLAN.md Part D)', () => {
  const sources = testSources();

  test('every fixture is referenced by at least one test', () => {
    const orphans = fixtureFiles().filter((name) => !sources.some((src) => src.includes(name)));
    assert.deepEqual(
      orphans,
      [],
      `these fixtures are not referenced by any test -- add a test or delete them:\n${orphans.join('\n')}`,
    );
  });
});
