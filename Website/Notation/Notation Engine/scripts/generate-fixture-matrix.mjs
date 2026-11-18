#!/usr/bin/env node
/**
 * Generates `Notation/Notation Plan/Documentation/MusicXML-Fixture-Matrix.md`
 * from the fixture corpus under `test/fixtures/`.
 *
 * PLAN.md Part D asks for two things that both rot the moment they are
 * maintained by hand:
 *
 *   1. a matrix of which behavior each fixture exercises (partwise/timewise,
 *      MXL, changing attributes/divisions, voices/chords/rests, unpitched
 *      percussion, lyrics/directions/harmony), and
 *   2. each fixture's provenance -- which authoring program wrote it, where
 *      the file itself says so.
 *
 * So the matrix is generated, not written, for the same reason the API
 * reference is (`scripts/generate-api-docs.mjs`): a hand-kept table is
 * wrong the first time a fixture is added or a comment changes, and nobody
 * notices. `npm run fixtures:check` regenerates and diffs, and is part of
 * `npm run verify`, so the matrix cannot drift from the corpus.
 *
 * The behaviors are read from the XML itself, not from a comment: an
 * `<attributes>` that is not the first child of a measure IS a mid-measure
 * change, a second distinct `<divisions>` value IS a mid-piece change. That
 * keeps the detection honest -- a fixture cannot claim a behavior it does
 * not contain, and a new fixture is classified without anyone editing a
 * table.
 *
 * Provenance is read from the file's own `<identification><encoding>
 * <software>`, which is the format's own vocabulary (the same fact
 * `own-provenance.test.js` treats as a cross-software input fact, not an
 * engine claim). A file with no `<software>` is hand-authored or reduced in
 * this repo, and the matrix says exactly that rather than guessing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = path.join(ROOT, 'test', 'fixtures');
const OUT = path.resolve(ROOT, '../../Notation/Notation Plan/Documentation/MusicXML-Fixture-Matrix.md');

/**
 * The behaviors Part D names, in a fixed order, each with a label and a
 * predicate over the raw XML. The order is the report's column order, so a
 * reordered list is a diff -- which is the point.
 */
const BEHAVIORS = [
  ['partwise', 'partwise', (xml) => /<score-partwise\b/.test(xml)],
  ['timewise', 'timewise', (xml) => /<score-timewise\b/.test(xml)],
  ['mxl', 'MXL (zipped)', (xml, file) => file.endsWith('.mxl')],
  ['changing-attributes', 'changing attributes', (xml) => {
    const measures = [...xml.matchAll(/<measure\b[^>]*>([\s\S]*?)<\/measure>/g)].map((m) => m[1]);
    let attributesCount = 0;
    for (const body of measures) {
      if (!body.includes('<attributes')) continue;
      attributesCount++;
      // Anything before <attributes> in the measure body means it did not
      // open the measure -- i.e. it appeared mid-measure.
      if (body.slice(0, body.indexOf('<attributes')).trim() !== '') return true;
    }
    return attributesCount > 1;
  }],
  ['changing-divisions', 'changing divisions', (xml) => {
    const values = [...xml.matchAll(/<divisions>\s*([^<]+?)\s*<\/divisions>/g)].map((m) => m[1]);
    return new Set(values).size > 1;
  }],
  ['voices', 'voices', (xml) => new Set([...xml.matchAll(/<voice>\s*([^<]+?)\s*<\/voice>/g)].map((m) => m[1])).size > 1],
  ['chords', 'chords', (xml) => /<chord\s*\/>/.test(xml)],
  ['rests', 'rests', (xml) => /<rest\b/.test(xml)],
  ['unpitched-percussion', 'unpitched percussion', (xml) => /<unpitched\b/.test(xml) || /<sign>\s*percussion\b/.test(xml)],
  ['lyrics', 'lyrics', (xml) => /<lyric\b/.test(xml)],
  ['directions', 'directions', (xml) => /<direction\b/.test(xml)],
  ['harmony', 'harmony', (xml) => /<harmony\b/.test(xml)],
];

/** Every fixture file, by directory, sorted for a stable diff. */
function fixtureFiles() {
  const out = [];
  for (const dir of ['musicxml', 'cross-software', 'mxl']) {
    const full = path.join(FIXTURES, dir);
    if (!fs.existsSync(full)) continue;
    for (const name of fs.readdirSync(full).sort()) {
      if (/\.(musicxml|mxl)$/.test(name)) out.push({ dir, name, rel: `${dir}/${name}` });
    }
  }
  return out;
}

/** The `<software>` the file itself records, or null when it records none. */
function exporterOf(xml) {
  const match = /<software>\s*([^<]+?)\s*<\/software>/.exec(xml);
  return match === null ? null : match[1];
}

/** Every test file that names this fixture, as repo-relative paths. */
function testsUsing(name) {
  const found = [];
  for (const dir of ['unit', 'visual', 'perf', 'helpers']) {
    const full = path.join(ROOT, 'test', dir);
    if (!fs.existsSync(full)) continue;
    for (const file of fs.readdirSync(full)) {
      if (!file.endsWith('.js')) continue;
      const source = fs.readFileSync(path.join(full, file), 'utf8');
      if (source.includes(name)) found.push(`test/${dir}/${file}`);
    }
  }
  return found.sort();
}

function build() {
  const rows = fixtureFiles().map(({ dir, name, rel }) => {
    // `.mxl` is a zip; its inner score text is not readable as a string, so
    // its behaviors come from the container name alone. The MXL-specific
    // behavior column already marks it, and the archive's contents are
    // asserted by `mxl-timewise.test.js` rather than sniffed here.
    const xml = name.endsWith('.mxl') ? '' : fs.readFileSync(path.join(FIXTURES, rel), 'utf8');
    return {
      dir,
      name,
      rel,
      exporter: name.endsWith('.mxl') ? null : exporterOf(xml),
      behaviors: BEHAVIORS.filter(([, , test]) => test(xml, name)).map(([key]) => key),
      tests: testsUsing(name),
    };
  });
  return rows;
}

function main() {
  const rows = build();
  const label = new Map(BEHAVIORS.map(([key, text]) => [key, text]));

  const out = [];
  out.push('# MusicXML fixture matrix');
  out.push('');
  out.push('<!-- GENERATED by scripts/generate-fixture-matrix.mjs from test/fixtures/.');
  out.push('     Do not edit by hand: `npm run fixtures:check` fails if this drifts. -->');
  out.push('');
  out.push(
    'Which behavior each fixture exercises, and which program wrote it. ' +
      'The behaviors are read from the XML (an `<attributes>` that does not open its measure ' +
      'IS a mid-measure change), so a fixture cannot claim a behavior it does not contain. ' +
      'Provenance is the file\'s own `<software>`; a fixture with none was authored or reduced ' +
      'in this repo.',
  );
  out.push('');

  out.push('## Behavior coverage');
  out.push('');
  out.push('| Behavior | Fixtures |');
  out.push('| --- | --- |');
  for (const [key, text] of BEHAVIORS) {
    const names = rows.filter((r) => r.behaviors.includes(key)).map((r) => `\`${r.name}\``);
    out.push(`| ${text} | ${names.length === 0 ? '**none**' : names.join(', ')} |`);
  }
  out.push('');

  const exporters = new Map();
  for (const r of rows) {
    const key = r.exporter === null ? '_hand-authored in this repo_' : r.exporter;
    exporters.set(key, (exporters.get(key) ?? 0) + 1);
  }
  out.push('## Provenance summary');
  out.push('');
  out.push('| Provenance | Fixtures |');
  out.push('| --- | --- |');
  for (const [key, count] of [...exporters.entries()].sort((a, b) => b[1] - a[1])) {
    out.push(`| ${key} | ${count} |`);
  }
  out.push('');
  out.push(
    'A note on the cross-software corpus: the `cross-software/` fixtures are hand-authored ' +
      'reconstructions of divergences documented in real exporter output (a `<tied>`-only tie, ' +
      'mid-measure `<attributes>`, per-part `<divisions>`), not files exported by those programs. ' +
      'The only real third-party export in the corpus today is MuseScore, so the matrix above is ' +
      'the honest count: one real exporter, several documented divergences modeled by hand. ' +
      'Widening real-exporter coverage means adding files from other programs, at which point ' +
      'this table updates itself.',
  );
  out.push('');

  out.push('## Fixtures');
  out.push('');
  out.push('| Fixture | Format | Provenance | Behaviors | Used by |');
  out.push('| --- | --- | --- | --- | --- |');
  for (const r of rows) {
    const format = r.dir === 'mxl' ? 'MXL' : r.behaviors.includes('timewise') ? 'timewise' : 'partwise';
    const provenance = r.exporter === null ? '_hand-authored in this repo_' : r.exporter;
    const behaviors = r.behaviors.filter((b) => b !== 'partwise' && b !== 'timewise').map((b) => label.get(b)).join(', ') || '--';
    const used = r.tests.length === 0 ? '**none**' : r.tests.map((t) => `\`${t}\``).join(', ');
    out.push(`| \`${r.rel}\` | ${format} | ${provenance} | ${behaviors} | ${used} |`);
  }
  out.push('');

  const generated = out.join('\n') + '\n';

  if (process.argv.includes('--check')) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (current !== generated) {
      console.error(
        'Notation/Notation Plan/Documentation/MusicXML-Fixture-Matrix.md is out of date -- ' +
          'run `npm run fixtures` and commit the result.',
      );
      process.exit(1);
    }
    console.log(
      `Notation/Notation Plan/Documentation/MusicXML-Fixture-Matrix.md is up to date (${rows.length} fixtures).`,
    );
    return;
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, generated);
  console.log(`Notation/Notation Plan/Documentation/MusicXML-Fixture-Matrix.md: ${rows.length} fixtures.`);
}

main();
