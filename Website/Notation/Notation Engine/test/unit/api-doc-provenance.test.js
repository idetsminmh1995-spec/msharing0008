import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(packageDir, 'src');
const API_DOC = path.resolve(packageDir, '../../Notation/Notation Plan/Documentation/API.md');

/**
 * Part C deleted `src/musescore/`, but `tsc --emitDeclarationOnly` never
 * removes the declarations for a source file that has since gone, and
 * `dist/` is gitignored, so a long-lived checkout kept `dist/musescore/*.d.ts`.
 * The API-doc generator reads `dist/`, so those stale declarations leaked
 * MuseScore modules into `Documentation/API.md`.
 *
 * The generator now skips a module with no `src/` counterpart. This test is
 * the belt to that suspenders: the shipped API reference must only document
 * modules the engine actually has. (Comments inside real modules may cite a
 * published engraving convention by name -- that is attribution, not engine
 * provenance, and `own-provenance.test.js` governs it.)
 */
describe('the shipped API reference only documents real modules (PLAN.md Part C)', () => {
  test('every documented module has a source file under src/', () => {
    const text = fs.readFileSync(API_DOC, 'utf8');
    const modules = [...text.matchAll(/^### `src\/(.+?)\.ts`$/gm)].map((m) => m[1]);
    assert.ok(modules.length > 0, 'the API reference should document at least one module');
    const ghosts = modules.filter(
      (module) => !fs.existsSync(path.join(SRC, `${module}.ts`)) && !fs.existsSync(path.join(SRC, module)),
    );
    assert.deepEqual(
      ghosts,
      [],
      `API.md documents modules with no src/ file (stale build output?):\n${ghosts.join('\n')}`,
    );
  });
});
