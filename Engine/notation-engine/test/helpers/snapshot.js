import fs from 'node:fs';
import path from 'node:path';

/**
 * Compares `actual` (a string -- typically rendered SVG markup) against a
 * saved golden file at `<snapshotDir>/<name>.snap`. Throws with a diff-
 * friendly message on mismatch.
 *
 * If the snapshot doesn't exist yet, OR the UPDATE_SNAPSHOTS=1 env var is
 * set, writes/overwrites the golden file and passes -- the standard
 * snapshot-testing convention: `UPDATE_SNAPSHOTS=1 npm test` to
 * intentionally accept a new rendering, plain `npm test` to catch
 * unintentional ones.
 */
export function matchSnapshot(name, actual, snapshotDir) {
  const file = path.join(snapshotDir, `${name}.snap`);
  const shouldWrite = process.env.UPDATE_SNAPSHOTS === '1' || !fs.existsSync(file);
  if (shouldWrite) {
    fs.mkdirSync(snapshotDir, { recursive: true });
    fs.writeFileSync(file, actual, 'utf8');
    return;
  }
  const expected = fs.readFileSync(file, 'utf8');
  if (expected !== actual) {
    throw new Error(
      `Snapshot mismatch for "${name}" (${file}).\n` +
        `Run with UPDATE_SNAPSHOTS=1 to accept this change if it's intentional.\n\n` +
        `--- expected ---\n${expected}\n--- actual ---\n${actual}\n`,
    );
  }
}
