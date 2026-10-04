import { readFileSync } from 'node:fs';
import vm from 'node:vm';

/**
 * The BUILT bundle, in a sandbox -- the same thing a page loads.
 *
 * Testing the bundle and not the sources is the house rule across this
 * repo's engines: a test that passes against `src/` and fails against
 * `dist/` is a test that did not test what ships.
 */
export function loadEngine() {
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(
    readFileSync(new URL('../dist/piano-hand-engine.js', import.meta.url), 'utf8'),
    sandbox,
  );
  return sandbox.PianoHandEngine;
}

/** Cross-realm arrays and objects fail deepStrictEqual, so anything compared is copied first. */
export const plain = (value) => JSON.parse(JSON.stringify(value));
