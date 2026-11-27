#!/usr/bin/env node
/**
 * Copy the Writer Engine to the static website asset path.
 *
 *   node tools/sync-writer-engine.mjs         # copy src to Website/Website/assets
 *   node tools/sync-writer-engine.mjs --check # fail if the deployed copy is stale
 *
 * The engine is plain JavaScript with no build step, so the copy is the
 * source itself. The `?v=` key on the page is derived from those same bytes
 * by `Notation Engine/scripts/sync-website-bundle.mjs`, which runs on every
 * notation engine build.
 */
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const engineRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(engineRoot, 'src', 'index.js');
const production = resolve(engineRoot, '..', '..', 'Website', 'assets', 'writer-engine.js');
const checkOnly = process.argv.includes('--check');

if (checkOnly) {
  const [sourceText, productionText] = await Promise.all([
    readFile(source, 'utf8'),
    readFile(production, 'utf8').catch(() => null),
  ]);
  if (productionText !== sourceText) {
    console.error(`Writer Engine website asset is missing or out of sync: ${production}`);
    process.exitCode = 1;
  } else {
    console.log('Writer Engine source and website asset are in sync.');
  }
} else {
  await mkdir(dirname(production), { recursive: true });
  await copyFile(source, production);
  console.log(`Copied Writer Engine to ${production}`);
}
