import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Loads the built bundle into a fresh vm sandbox and returns its global,
 * the same way `notation-engine`'s own tests do -- tests run against the
 * BUILT output, which is what the drum page actually loads, not against
 * an implementation detail of how the source is split into modules.
 *
 * NOTE for anyone writing assertions here: values that come back from the
 * sandbox live in a DIFFERENT REALM, so `assert.deepEqual` fails on
 * structurally identical arrays and objects. Spread or JSON round-trip
 * them into this realm first. That has cost this project real time twice.
 */
export function loadEngine() {
  const bundlePath = path.join(__dirname, '..', '..', 'dist', 'sticking-engine.js');
  const code = fs.readFileSync(bundlePath, 'utf8');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.StickingEngine;
}
