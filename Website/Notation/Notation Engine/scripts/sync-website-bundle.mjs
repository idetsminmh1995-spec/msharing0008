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
  'notation-entry.js',
  'notation-editor.js',
  'notation-newscore.js',
  'studio-video.js',
  'studio-metronome.js',
  'studio-guitar.js',
  'studio-piano.js',
  'studio-bass.js',
  'studio-violin.js',
  'studio-voice.js',
  'styles.css',
  'assets/writer-engine.js',
  'assets/video-engine.js',
  'assets/metronome-engine.js',
];

const referencePattern = /(notation-engine\.js\?v=)[^"'&\s]+/g;
const soundReferencePattern = /(sound-engine\.js\?v=)[^"'&\s]+/g;

// Rewrite every key to the current one, counting only the references whose key
// value actually changed, so the build log reports what a build moved rather
// than what it merely touched.
function rekey(html, pattern, render) {
  let updated = 0;
  let found = 0;
  const next = html.replace(pattern, (match, ...groups) => {
    found += 1;
    const replacement = render(...groups);
    if (match !== replacement) updated += 1;
    return replacement;
  });
  return { next, updated, found };
}

/**
 * The engine's own scripts are named in JavaScript as well as in HTML: the
 * Video Engine loads the notation bundle on demand, so its address lives in a
 * string literal. Re-keying only the pages left that literal pinned to the
 * hash of whichever build was current when it was typed, and a returning
 * browser then ran the video against an older engine than the editor beside
 * it. Every file that names the bundle is re-keyed here, not just the pages.
 */
const scriptAssets = [
  path.join(repoDir, 'Website', 'assets', 'video-engine.js'),
  path.join(repoDir, 'Video', 'Video Engine', 'source', 'website', 'assets', 'video-engine.js'),
];
let updatedScriptReferences = 0;

for (const scriptPath of scriptAssets) {
  let text;
  try {
    text = await readFile(scriptPath, 'utf8');
  } catch (error) {
    // A standalone engine checkout has no host app next to it; nothing to key.
    if (error?.code === 'ENOENT') continue;
    throw error;
  }
  const notation = rekey(text, referencePattern, (prefix) => `${prefix}${cacheVersion}`);
  const sound = rekey(notation.next, soundReferencePattern, (prefix) => `${prefix}${soundCacheVersion}`);
  updatedScriptReferences += notation.updated + sound.updated;
  if (sound.next !== text) await writeFile(scriptPath, sound.next);
}

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


let updatedPages = 0;
let foundReferences = 0;
let updatedReferences = 0;
let updatedSoundReferences = 0;
let updatedAppReferences = 0;


for (const root of publicRoots) {
  for (const htmlPath of await htmlFilesUnder(root)) {
    const html = await readFile(htmlPath, 'utf8');
    let nextHtml = html;

    const notation = rekey(nextHtml, referencePattern, (prefix) => `${prefix}${cacheVersion}`);
    nextHtml = notation.next;
    foundReferences += notation.found;
    updatedReferences += notation.updated;

    const sound = rekey(nextHtml, soundReferencePattern, (prefix) => `${prefix}${soundCacheVersion}`);
    nextHtml = sound.next;
    updatedSoundReferences += sound.updated;

    for (const [relative, version] of appAssetVersions) {
      const app = rekey(
        nextHtml,
        appAssetPattern(relative),
        (prefix, separator, quote) => `${prefix}${relative}${separator}${version}${quote}`,
      );
      nextHtml = app.next;
      updatedAppReferences += app.updated;
    }

    if (nextHtml !== html) {
      await writeFile(htmlPath, nextHtml);
      updatedPages += 1;
    }
  }
}

if (foundReferences === 0) {
  throw new Error('No versioned notation-engine.js HTML references were found to synchronize.');
}

console.log(
  `Published notation engine ${cacheVersion}: website bundles + maps; ` +
    `published sound engine ${soundCacheVersion}, worklet and Bravura font; ` +
    `updated ${updatedReferences} notation, ${updatedSoundReferences} sound and ` +
    `${updatedAppReferences} app cache key(s) across ${updatedPages} HTML page(s) ` +
    `and ${updatedScriptReferences} engine address(es) in script assets.`,
);
