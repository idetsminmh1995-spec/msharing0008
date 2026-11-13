import { createHash } from 'node:crypto';
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = path.resolve(packageDir, '..', '..');
const sourceBundle = path.join(packageDir, 'dist', 'notation-engine.js');
const sourceMap = `${sourceBundle}.map`;
const soundBundle = path.join(packageDir, 'dist', 'sound-engine.js');
const soundMap = `${soundBundle}.map`;
const processor = path.join(packageDir, 'node_modules', 'spessasynth_lib', 'dist', 'spessasynth_processor.min.js');
const font = path.join(packageDir, 'dist', 'fonts', 'Bravura.woff2');
const publicRoots = [path.join(repoDir, 'Website')];
const cacheVersion = createHash('sha256').update(await readFile(sourceBundle)).digest('hex').slice(0, 12);
const soundCacheVersion = createHash('sha256').update(await readFile(soundBundle)).digest('hex').slice(0, 12);

for (const publicRoot of publicRoots) {
  const publicAssetsDir = path.join(publicRoot, 'assets');
  await mkdir(path.join(publicAssetsDir, 'fonts'), { recursive: true });
  await copyFile(sourceBundle, path.join(publicAssetsDir, 'notation-engine.js'));
  await copyFile(sourceMap, path.join(publicAssetsDir, 'notation-engine.js.map'));
  await copyFile(soundBundle, path.join(publicAssetsDir, 'sound-engine.js'));
  await copyFile(soundMap, path.join(publicAssetsDir, 'sound-engine.js.map'));
  await copyFile(processor, path.join(publicAssetsDir, 'spessasynth_processor.min.js'));
  await copyFile(font, path.join(publicAssetsDir, 'fonts', 'Bravura.woff2'));
}

async function htmlFilesUnder(directory) {
  const result = [];
  try {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) result.push(...(await htmlFilesUnder(entryPath)));
      else if (entry.isFile() && entry.name.endsWith('.html')) result.push(entryPath);
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  return result;
}

const referencePattern = /(notation-engine\.js\?v=)[^"'&\s]+/g;
const soundReferencePattern = /(sound-engine\.js\?v=)[^"'&\s]+/g;
let updatedPages = 0;
let updatedReferences = 0;
let updatedSoundReferences = 0;
for (const root of [...publicRoots, path.join(repoDir, 'web-preview')]) {
  for (const htmlPath of await htmlFilesUnder(root)) {
    const html = await readFile(htmlPath, 'utf8');
    const count = [...html.matchAll(referencePattern)].length;
    const soundCount = [...html.matchAll(soundReferencePattern)].length;
    if (count === 0 && soundCount === 0) continue;
    const nextHtml = html
      .replace(referencePattern, `$1${cacheVersion}`)
      .replace(soundReferencePattern, `$1${soundCacheVersion}`);
    updatedReferences += count;
    updatedSoundReferences += soundCount;
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
  `Published notation engine ${cacheVersion}: website bundles + maps; ` +
    `published sound engine ${soundCacheVersion}, worklet and Bravura font; ` +
    `updated ${updatedReferences} notation and ${updatedSoundReferences} sound cache key(s) across ${updatedPages} HTML page(s).`,
);
