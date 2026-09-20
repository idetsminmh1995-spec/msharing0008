#!/usr/bin/env node
/**
 * Phase 54/§22: generates `docs/API.md` from the engine's own emitted
 * TypeScript declarations.
 *
 * Generated, not hand-written, for one reason: a hand-written API
 * reference is wrong the first time someone renames a parameter and does
 * not notice. `npm run docs:check` regenerates and diffs, and is part of
 * `npm run verify`, so the reference cannot drift from the code without
 * a test going red.
 *
 * It reads `.d.ts` rather than the `.ts` source because that is exactly
 * what a consumer sees: the declarations carry the resolved public
 * signature, with everything `private`/unexported already gone.
 *
 * Deliberately NOT TypeDoc or api-extractor: this repo has no runtime
 * dependencies beyond fflate and four dev tools (§2's toolchain), and a
 * ~200-line generator that emits exactly the two sections wanted is a
 * better trade than a dependency that emits a hundred HTML files nobody
 * reads.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'docs', 'API.md');

/**
 * The supported entry points -- what a host app is meant to call, in the
 * order it would call them. Everything else the bundle exports is a
 * building block the engine uses on itself: usable, documented, and not
 * covered by any stability promise.
 */
const ENTRY_POINTS = [
  ['Rendering', ['renderFromMusicXml', 'renderParsedMusicXml', 'parseMusicXml', 'unzipMxl', 'parseMidiFile']],
  ['Configuration', ['resolveConfig', 'DEFAULT_CONFIG']],
  [
    'Playback and cursor',
    ['getEventStream', 'positionToX', 'playheadX', 'xToPosition', 'resolvePosition', 'computeCursorPlacement', 'renderCursor', 'notationEventId', 'elementIdForNoteId'],
  ],
  [
    'Repeats (playback order)',
    ['performanceSecondsToWritten', 'performanceTickToWritten', 'writtenTickToPerformanceTicks', 'buildRepeatPlan'],
  ],
  ['Resize', ['resizePureScale', 'needsReflow', 'extractViewBox', 'computePxPerStaffSpace']],
  ['Export', ['exportSvg', 'exportPng', 'exportPdf', 'rasterizeSvg', 'encodePng', 'encodePdf', 'browserRasterBackend', 'svgToDataUri']],
  ['Debug', ['measureSvgBoxes', 'computeDebugSkylines', 'renderBoundingBoxOverlay', 'renderSkylineOverlay', 'filterDiagnostics']],
];

/** Every `.d.ts` under dist/, as module-relative paths. */
function declarationFiles(dir = DIST, prefix = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...declarationFiles(full, `${prefix}${entry.name}/`));
    else if (entry.name.endsWith('.d.ts')) out.push({ file: full, module: prefix + entry.name.replace(/\.d\.ts$/, '') });
  }
  return out;
}

/** Collapses a doc comment to its first sentence, as one line of prose. */
function summarize(docComment) {
  if (docComment === undefined) return '';
  const text = docComment
    .split('\n')
    .map((line) => line.replace(/^\s*\/?\*+\/?/, '').trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text === '') return '';
  // First sentence: up to a period followed by a space or end, ignoring
  // the periods inside "e.g." and section references like "§9.14".
  const match = /^(.*?[.!?])(\s|$)/.exec(text.replace(/e\.g\./g, 'eg').replace(/i\.e\./g, 'ie').replace(/§(\d+)\.(\d+)/g, '§$1_$2'));
  const sentence = (match ? match[1] : text).replace(/\beg\b/g, 'e.g.').replace(/\bie\b/g, 'i.e.').replace(/§(\d+)_(\d+)/g, '§$1.$2');
  return sentence.length > 300 ? sentence.slice(0, 297) + '...' : sentence;
}

/**
 * Exported declarations in one `.d.ts`, each with its kind, name,
 * signature line and leading doc comment.
 *
 * A regex over declaration files rather than the TypeScript compiler
 * API: `.d.ts` is a deliberately small, regular subset of the language
 * (every export is at the top level, one per statement, already
 * formatted by tsc), which is precisely the case where a parser is more
 * machinery than the job needs.
 */
function parseDeclarations(source) {
  const items = [];
  const lines = source.split('\n');
  let doc;
  let docBuffer = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*\/\*\*/.test(line)) {
      docBuffer = [line];
      if (/\*\//.test(line)) {
        doc = docBuffer.join('\n');
        docBuffer = null;
      }
      continue;
    }
    if (docBuffer !== null) {
      docBuffer.push(line);
      if (/\*\//.test(line)) {
        doc = docBuffer.join('\n');
        docBuffer = null;
      }
      continue;
    }

    const match = /^export (declare )?(function|const|class|interface|type|enum) ([A-Za-z0-9_$]+)/.exec(line);
    if (match === null) {
      if (line.trim() !== '') doc = undefined;
      continue;
    }

    // The full signature: this line plus continuations until the
    // statement's own terminator, which tsc always puts at column 0.
    let signature = line.trimEnd();
    if (!/[;{]$/.test(signature)) {
      for (let j = i + 1; j < lines.length; j++) {
        signature += '\n' + lines[j].trimEnd();
        if (/^[});]/.test(lines[j]) || /[;{]$/.test(lines[j].trimEnd())) break;
      }
    }
    items.push({
      kind: match[2] === 'const' ? 'const' : match[2],
      name: match[3],
      signature: signature.replace(/^export declare /, 'export ').split('\n')[0].replace(/\s*\{$/, ''),
      summary: summarize(doc),
    });
    doc = undefined;
  }
  return items;
}

function main() {
  if (!fs.existsSync(DIST)) {
    console.error('No dist/ -- run `npm run declarations` first.');
    process.exit(1);
  }

  const byModule = new Map();
  const byName = new Map();
  for (const { file, module } of declarationFiles()) {
    if (module === 'index' || module.endsWith('/index')) continue; // pure re-exports
    const items = parseDeclarations(fs.readFileSync(file, 'utf8'));
    if (items.length === 0) continue;
    byModule.set(module, items);
    for (const item of items) if (!byName.has(item.name)) byName.set(item.name, { ...item, module });
  }

  const out = [];
  out.push('# API reference');
  out.push('');
  out.push('<!-- GENERATED by scripts/generate-api-docs.mjs from the emitted .d.ts files.');
  out.push('     Do not edit by hand: `npm run docs:check` fails if this drifts from the code. -->');
  out.push('');
  out.push(
    'Everything below is reachable from the bundle\'s single `NotationEngine` global ' +
      '(or from `import ... from "notation-engine"`).',
  );
  out.push('');

  out.push('## Supported entry points');
  out.push('');
  out.push(
    'These are what a host application is meant to call. Everything in ' +
      '[the full index](#full-index) below is a building block the engine uses on itself: ' +
      'exported, usable and documented, but not covered by any stability promise.',
  );
  out.push('');
  const listed = new Set();
  for (const [group, names] of ENTRY_POINTS) {
    out.push(`### ${group}`);
    out.push('');
    for (const name of names) {
      const item = byName.get(name);
      if (item === undefined) {
        throw new Error(
          `Entry point "${name}" is listed in scripts/generate-api-docs.mjs but is not exported. ` +
            'Either it was renamed or removed -- fix the list or restore the export.',
        );
      }
      listed.add(name);
      out.push(`#### \`${name}\``);
      out.push('');
      out.push('```ts');
      out.push(item.signature);
      out.push('```');
      out.push('');
      if (item.summary !== '') {
        out.push(item.summary);
        out.push('');
      }
      out.push(`*(\`src/${item.module}.ts\`)*`);
      out.push('');
    }
  }

  out.push('## Full index');
  out.push('');
  out.push(`${byName.size} exported symbols, by module.`);
  out.push('');
  for (const [module, items] of [...byModule.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    out.push(`### \`src/${module}.ts\``);
    out.push('');
    out.push('| | Name | Summary |');
    out.push('|---|---|---|');
    for (const item of items) {
      const mark = listed.has(item.name) ? '**API**' : item.kind;
      const summary = item.summary.replace(/\|/g, '\\|');
      out.push(`| ${mark} | \`${item.name}\` | ${summary} |`);
    }
    out.push('');
  }

  const generated = out.join('\n') + '\n';

  // `--check` compares instead of writing. It deliberately does NOT ask
  // git whether the file is modified: that conflates "stale" (the code
  // moved and nobody regenerated) with "not committed yet" (the normal
  // state mid-change), and would make `npm run verify` fail on every
  // legitimate docs update until it was committed.
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (current !== generated) {
      console.error(
        'docs/API.md is out of date -- run `npm run docs` and commit the result.',
      );
      process.exit(1);
    }
    console.log(`docs/API.md is up to date (${byName.size} symbols).`);
    return;
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, generated);
  console.log(`docs/API.md: ${byName.size} symbols across ${byModule.size} modules.`);
}

main();
