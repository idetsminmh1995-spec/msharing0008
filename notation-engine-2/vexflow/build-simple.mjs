#!/usr/bin/env node
// Lean, self-contained rebuild script for the VexFlow bundle this project
// actually uses (build/cjs/vexflow.js), using esbuild instead of VexFlow's
// own Grunt+webpack pipeline.
//
// Why this exists: VexFlow's official `grunt build:cjs` task (webpack +
// Terser) compiles the production entries successfully (visible in its own
// module graph output) but never writes build/cjs/vexflow.js /
// vexflow-bravura.js / vexflow-core.js to disk in this environment -- even
// after clearing every webpack cache directory, the asset-emit step is
// silently skipped for those three entries specifically (the *debug*
// entries emit correctly). Rather than keep fighting that pipeline's
// caching quirks, this script does the same job directly and
// transparently: bundle an entry file with esbuild, substitute the
// version-string placeholders (mirroring Gruntfile.js's string-replace-loader
// rule for src/version.ts), and write the result to build/cjs/.
//
// Usage:
//   node build-simple.mjs             # builds vexflow.js (the one this app loads)
//   node build-simple.mjs --all       # also builds vexflow-core.js and vexflow-bravura.js
//
// After editing any file under src/ (e.g. src/notehead.ts, src/stavenote.ts,
// src/stave.ts, src/stem.ts, src/beam.ts, src/formatter.ts), re-run this
// script to regenerate build/cjs/vexflow.js, then commit + push that file
// (it's a plain build output like the rest of build/cjs/, not something
// GitHub Pages can build itself).

import * as esbuild from 'esbuild';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BASE_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(BASE_DIR, 'build', 'cjs');

const pkg = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'package.json'), 'utf8'));
const VERSION = pkg.version;
let GIT_COMMIT_ID = 'unknown';
try {
  GIT_COMMIT_ID = execSync('git rev-parse HEAD', { cwd: BASE_DIR }).toString().trim();
} catch (e) {
  // not fatal -- just informational, matches how version_info.js uses this
}
const DATE = new Date().toISOString();

// Mirrors Gruntfile.js's `test: /version\.ts$/` string-replace-loader rule --
// substitutes the placeholders in src/version.ts with real build info,
// entirely in memory (never touches the file on disk).
const versionPlugin = {
  name: 'version-replace',
  setup(build) {
    build.onLoad({ filter: /src[\\/]version\.ts$/ }, async (args) => {
      let contents = await fs.promises.readFile(args.path, 'utf8');
      contents = contents
        .replace('__VF_VERSION__', VERSION)
        .replace('__VF_GIT_COMMIT_ID__', GIT_COMMIT_ID)
        .replace('__VF_BUILD_DATE__', DATE);
      return { contents, loader: 'ts' };
    });
  },
};

const banner =
  `/* VexFlow ${VERSION}   ${DATE}   ${GIT_COMMIT_ID}\n` +
  ` * Copyright (c) 2023-present VexFlow contributors (see https://github.com/vexflow/vexflow/blob/main/AUTHORS.md). */\n`;

async function buildEntry(entryName) {
  const entryFile = path.join(BASE_DIR, 'entry', entryName + '.ts');
  const outFile = path.join(OUT_DIR, entryName + '.js');
  await esbuild.build({
    entryPoints: [entryFile],
    outfile: outFile,
    bundle: true,
    minify: true,
    format: 'iife',
    globalName: 'VexFlow_ExportTarget', // reassigned below via footer, to match VexFlow's own `export default` -> `window.VexFlow` convention
    banner: { js: banner },
    footer: { js: 'var VexFlow = VexFlow_ExportTarget.default || VexFlow_ExportTarget;\nvar Vex = { Flow: VexFlow };\nif (typeof window !== "undefined") { window.VexFlow = VexFlow; window.Vex = Vex; }' },
    plugins: [versionPlugin],
    target: ['es2018'],
    logLevel: 'info',
  });
  console.log(`Built ${path.relative(BASE_DIR, outFile)}`);
}

const targets = process.argv.includes('--all')
  ? ['vexflow', 'vexflow-core', 'vexflow-bravura']
  : ['vexflow'];

for (const t of targets) {
  await buildEntry(t);
}
