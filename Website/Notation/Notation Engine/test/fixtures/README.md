# test/fixtures

Sample MusicXML files used across the test suite -- piano, guitar, drum,
orchestral, and vocal/lyrics scores, plus real exports from multiple
different authoring programs, which are the evidence for cross-software
compatibility (see `../Notation Plan/PLAN.md` Part D).

`musicxml/` holds the single-file fixtures, `mxl/` the compressed archives,
and `cross-software/` the per-exporter provenance corpus.

The generated matrix of which behavior each fixture exercises, and which
program wrote it, is
[`../Notation Plan/Documentation/MusicXML-Fixture-Matrix.md`](../Notation%20Plan/Documentation/MusicXML-Fixture-Matrix.md).
It is produced by `scripts/generate-fixture-matrix.mjs` (`npm run fixtures`)
and `npm run verify` fails if it drifts, so adding a fixture and running
`npm run fixtures` is all it takes to keep it current.
