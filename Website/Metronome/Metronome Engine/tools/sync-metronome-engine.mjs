#!/usr/bin/env node
/**
 * Copy the built Metronome Engine bundle to the static website asset path.
 *
 *   node tools/sync-metronome-engine.mjs         # copy dist to Website/Website/assets
 *   node tools/sync-metronome-engine.mjs --check # fail if the deployed copy is stale
 */
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const engineRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(engineRoot, 'dist', 'metronome-engine.js');
const production = resolve(engineRoot, '..', '..', 'Website', 'assets', 'metronome-engine.js');
const checkOnly = process.argv.includes('--check');

if (checkOnly) {
  const [sourceText, productionText] = await Promise.all([
    readFile(source, 'utf8'),
    readFile(production, 'utf8').catch(() => null),
  ]);
  if (productionText !== sourceText) {
    console.error(`Metronome Engine website asset is missing or out of sync: ${production}`);
    process.exitCode = 1;
  } else {
    console.log('Metronome Engine bundle and website asset are in sync.');
  }
} else {
  await mkdir(dirname(production), { recursive: true });
  await copyFile(source, production);
  console.log(`Copied Metronome Engine bundle to ${production}`);
}
