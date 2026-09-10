import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Loads the built engine bundle (dist/notation-engine.js, an IIFE that
 * assigns to a `NotationEngine` global) into a fresh vm sandbox and
 * returns that global. Tests run against the BUILT output rather than the
 * TypeScript source directly -- this is deliberate: it's the exact same
 * technique used for every manual smoke test since Phase 3, it needs zero
 * TypeScript loader/transpilation setup for the test files themselves
 * (plain Node, `node --test`), and it tests what a real consumer of the
 * engine actually gets (the bundle), not an implementation detail of how
 * the source is organized into modules.
 *
 * A fresh sandbox per call means tests can't accidentally leak state
 * through a shared module cache -- call this once per test file (or once
 * per test, if a test needs to be extra sure of isolation).
 */
export function loadEngine() {
  const bundlePath = path.join(__dirname, '..', '..', 'dist', 'notation-engine.js');
  const code = fs.readFileSync(bundlePath, 'utf8');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.NotationEngine;
}
