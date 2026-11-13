#!/usr/bin/env node
/**
 * Copy the Video Engine source-of-truth to the static website asset path.
 *
 *   node tools/sync-video-engine.mjs       # copy source to Website/Website/assets
 *   node tools/sync-video-engine.mjs --check # fail if the production copy is stale
 */
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(sourceRoot, 'website', 'assets', 'video-engine.js');
const production = resolve(sourceRoot, '..', '..', '..', 'Website', 'assets', 'video-engine.js');
const checkOnly = process.argv.includes('--check');

if (checkOnly) {
  const [sourceText, productionText] = await Promise.all([
    readFile(source, 'utf8'),
    readFile(production, 'utf8').catch(() => null),
  ]);
  if (productionText !== sourceText) {
    console.error(`Video Engine production asset is missing or out of sync: ${production}`);
    process.exitCode = 1;
  } else {
    console.log('Video Engine source and production asset are in sync.');
  }
} else {
  await mkdir(dirname(production), { recursive: true });
  await copyFile(source, production);
  console.log(`Copied Video Engine source to ${production}`);
}
