# VexFlow source + custom build (this project)

This folder now contains VexFlow's **actual TypeScript source** (from
[github.com/vexflow/vexflow](https://github.com/vexflow/vexflow), commit
`721504c7646c5c4a5d05ed1f414cb592b58efce5`, version 5.1.0 -- the exact
commit the previously-checked-in `build/cjs/vexflow.js` was already built
from), not just the pre-built bundle.

## Editing notation appearance

To change things like notehead shapes, staff-line spacing, stem
length/width, beaming, or note-to-note spacing, edit the relevant file
under `src/`:

| Want to change | File |
| --- | --- |
| Notehead glyph/shape | `src/notehead.ts`, `src/glyphs.ts` |
| Which staff line/space a note sits on | `src/stavenote.ts` (rendering logic) -- actual note-to-line mapping for this app is in `MIDI_NOTE_TO_VEX_KEY` in `web-preview/canvas-preview.html` |
| Staff line count/spacing | `src/stave.ts`, or `VF.STAVE_LINE_DISTANCE` at runtime |
| Stem length/width | `src/stem.ts`, or `VF.STEM_HEIGHT`/`VF.STEM_WIDTH` at runtime |
| Beaming (8th/16th note beams) | `src/beam.ts` |
| Horizontal note spacing | `src/formatter.ts` |

## Rebuilding after an edit

VexFlow's own official build (`grunt build:cjs`, using webpack + Terser)
did not reliably emit its production bundles in this sandboxed
environment -- it compiled everything correctly but silently skipped
writing `vexflow.js`/`vexflow-bravura.js`/`vexflow-core.js` to disk, even
with every webpack cache cleared. Rather than depend on that, this folder
has its own small, direct build script using
[esbuild](https://esbuild.github.io/):

```
npm install          # first time only -- installs esbuild (small) into node_modules/
node build-simple.mjs         # rebuilds build/cjs/vexflow.js (the one this app actually loads)
node build-simple.mjs --all   # also rebuilds vexflow-core.js and vexflow-bravura.js
```

This has been verified to produce a fully working, drop-in-equivalent
bundle: same public API (`VexFlow.Renderer`, `.Stave`, `.StaveNote`,
`.Voice`, `.Formatter`, etc.), correct `VexFlow.BUILD.VERSION` (5.1.0),
and correct rendering behavior (staves, chords, notehead shapes, tempo
markings, bounding boxes) exercised with the exact same API calls
`web-preview/canvas-preview.html` makes.

After rebuilding, commit the changed file(s) under `build/cjs/` -- GitHub
Pages only serves static files, it can't run this build step itself, so
the built output has to be committed like any other asset.

`node_modules/` here is gitignored -- never commit it (it's ~360MB of
VexFlow's own official build tooling, most of which this simpler pipeline
doesn't even use).
