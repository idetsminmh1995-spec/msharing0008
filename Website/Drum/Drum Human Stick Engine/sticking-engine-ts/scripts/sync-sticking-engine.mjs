#!/usr/bin/env node
/**
 * Copy the built sticking engine bundle to the static website asset path.
 *
 *   node scripts/sync-sticking-engine.mjs         # copy dist to Website/Website/assets
 *   node scripts/sync-sticking-engine.mjs --check # fail if the deployed copy is stale
 */
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const engineRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(engineRoot, 'dist', 'sticking-engine.js');
const production = resolve(engineRoot, '..', '..', '..', 'Website', 'assets', 'sticking-engine.js');
const checkOnly = process.argv.includes('--check');

if (checkOnly) {
  const [sourceText, productionText] = await Promise.all([
    readFile(source, 'utf8'),
    readFile(production, 'utf8').catch(() => null),
  ]);
  if (productionText !== sourceText) {
    console.error(`Sticking engine website asset is missing or out of sync: ${production}`);
    process.exitCode = 1;
  } else {
    console.log('Sticking engine bundle and website asset are in sync.');
  }
} else {
  await mkdir(dirname(production), { recursive: true });
  await copyFile(source, production);
  console.log(`Copied sticking engine bundle to ${production}`);
}
