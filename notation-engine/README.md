# Notation Engine (alphaTab)

Full source + pre-built browser bundle of [alphaTab](https://github.com/CoderLine/alphaTab)
(pulled directly from the official GitHub repo, `main` branch) — used to
render music notation (from MusicXML/MEI) inside the Drum MIDI → Video app.

This is the COMPLETE alphaTab JS/TS package source (not just a dist build),
so custom modifications can be made directly here and rebuilt, per request.
Removed: `node_modules/` (reinstall via npm) and `test-data/` (large audio
fixtures used only by alphaTab's own internal test suite — irrelevant here
and ~53MB, not worth keeping).

## Layout

```
notation-engine/
  alphatab/            -- the actual JS/TS package (github.com/CoderLine/alphaTab, packages/alphatab)
    src/                -- TypeScript source -- edit this for custom changes
    dist/               -- pre-built browser bundle (what the app actually loads)
      alphaTab.min.js    -- UMD bundle, loaded via <script>
      alphaTab.min.mjs   -- ESM bundle
      font/               -- Bravura music notation font (required for rendering)
      soundfont/          -- alphaTab's own soundfont (NOT used by this app --
                             we use our own audio pipeline instead)
    test/               -- alphaTab's own unit tests (kept for reference; not run here)
    package.json, tsconfig.json, vite.config.ts, etc. -- build config
  transpiler/           -- sibling build-tool package alphaTab's build depends on
```

The app loads `notation-engine/alphatab/dist/alphaTab.min.js` directly from
this repo via jsdelivr's GitHub file serving
(`cdn.jsdelivr.net/gh/idetsminmh1995-spec/msharing0008@main/notation-engine/alphatab/dist/...`),
so rebuilding and pushing a new `dist/` here is all that's needed to update
what the live app uses -- no other changes required.

## Rebuilding after making changes

From a full clone of this project (needs `notation-engine/alphatab` +
`notation-engine/transpiler` + a root `package.json` declaring both as npm
workspaces -- or just re-clone the official repo fresh, apply your changes,
and rebuild there):

```bash
npm install                                   # installs the whole workspace
npm run build --workspace=packages/alphatab   # builds packages/alphatab/dist/
```

Note: the build's version-stamping step shells out to `git rev-parse HEAD`,
so the source tree needs to be a real git repo (even an empty one) for the
build to succeed -- if working from a plain folder (not a git clone), run
`git init && git add -A && git commit -m "x" --allow-empty` first.

After building, copy the new `dist/` here (replacing the old one), commit,
and push.
