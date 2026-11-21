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
const fontLicense = path.join(packageDir, 'dist', 'fonts', 'LICENSE.md');
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
  await copyFile(fontLicense, path.join(publicAssetsDir, 'fonts', 'LICENSE.md'));
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

// The hand-written app assets carry their own `?v=` key. Nothing regenerated
// it, so an edited file kept a key from whenever it was last typed by hand and
// a returning browser served its cached copy -- the page ran old code against a
// new bundle. Derive each key from the file's own bytes here, so a build always
// re-keys whatever changed.
// `repoDir` is the top-level `Website/` deploy dir; the served pages and the
// hand-written app assets live one level down in `Website/Website/`.
const appAssetsDir = path.join(repoDir, 'Website');
const appAssets = [
  'script.js',
  'soundfonts-config.js',
  'notation-doc.js',
  'notation-entry.js',
  'notation-editor.js',
  'notation-newscore.js',
  'studio-video.js',
  'studio-metronome.js',
  'styles.css',
  'assets/video-engine.js',
  'assets/metronome-engine.js',
];

const appAssetVersions = new Map();
for (const relative of appAssets) {
  try {
    const bytes = await readFile(path.join(appAssetsDir, relative));
    appAssetVersions.set(relative, createHash('sha256').update(bytes).digest('hex').slice(0, 12));
  } catch (error) {
    // A standalone engine checkout has no host app next to it; nothing to key.
    if (error?.code !== 'ENOENT') throw error;
  }
}

function appAssetPattern(relative) {
  return new RegExp(
    `((?:src|href)=")${relative.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\?v=)[^"]*(")`,
    'g',
  );
}

const referencePattern = /(notation-engine\.js\?v=)[^"'&\s]+/g;
const soundReferencePattern = /(sound-engine\.js\?v=)[^"'&\s]+/g;
let updatedPages = 0;
let updatedReferences = 0;
let updatedSoundReferences = 0;
let updatedAppReferences = 0;
for (const root of publicRoots) {
  for (const htmlPath of await htmlFilesUnder(root)) {
    const html = await readFile(htmlPath, 'utf8');
    const count = [...html.matchAll(referencePattern)].length;
    const soundCount = [...html.matchAll(soundReferencePattern)].length;
    let nextHtml = html
      .replace(referencePattern, `$1${cacheVersion}`)
      .replace(soundReferencePattern, `$1${soundCacheVersion}`);
    for (const [relative, version] of appAssetVersions) {
      const pattern = appAssetPattern(relative);
      updatedAppReferences += [...nextHtml.matchAll(pattern)].length;
      nextHtml = nextHtml.replace(pattern, `$1${relative}$2${version}$3`);
    }
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
