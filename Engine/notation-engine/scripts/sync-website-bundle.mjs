import { createHash } from 'node:crypto';
import { copyFile, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = path.resolve(packageDir, '../..');
const sourceBundle = path.join(packageDir, 'dist', 'notation-engine.js');
const sourceMap = `${sourceBundle}.map`;
const publicAssetsDir = path.join(repoDir, 'website', 'assets');
const publicBundle = path.join(publicAssetsDir, 'notation-engine.js');
const publicMap = `${publicBundle}.map`;
const cacheVersion = createHash('sha256').update(await readFile(sourceBundle)).digest('hex').slice(0, 12);

await copyFile(sourceBundle, publicBundle);
await copyFile(sourceMap, publicMap);

async function htmlFilesUnder(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await htmlFilesUnder(entryPath)));
    else if (entry.isFile() && entry.name.endsWith('.html')) result.push(entryPath);
  }
  return result;
}

const referencePattern = /(notation-engine\.js\?v=)[^"'&\s]+/g;
let updatedPages = 0;
let updatedReferences = 0;
for (const root of [path.join(repoDir, 'website'), path.join(repoDir, 'web-preview')]) {
  for (const htmlPath of await htmlFilesUnder(root)) {
    const html = await readFile(htmlPath, 'utf8');
    const count = [...html.matchAll(referencePattern)].length;
    if (count === 0) continue;
    const nextHtml = html.replace(referencePattern, `$1${cacheVersion}`);
    updatedReferences += count;
    if (nextHtml !== html) {
      await writeFile(htmlPath, nextHtml);
      updatedPages += 1;
    }
  }
}

if (updatedReferences === 0) {
  throw new Error('No versioned notation-engine.js HTML references were found to synchronize.');
}

console.log(
  `Published notation engine ${cacheVersion}: website bundle + source map; ` +
    `updated ${updatedReferences} cache key(s) across ${updatedPages} HTML page(s).`,
);
