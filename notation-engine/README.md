# Notation Engine (alphaTab)

Pre-built browser bundle of [alphaTab](https://github.com/coderline/alphaTab) —
used to render music notation (from MusicXML/MEI) inside the Drum MIDI →
Video app. This is built from the user's own copy of the alphaTab source
(develop branch), not the public npm/CDN release, so custom modifications
can be made here and rebuilt.

## What's in here

```
alphatab/dist/
  alphaTab.min.js    -- UMD browser bundle (load this via <script>)
  alphaTab.min.mjs   -- ESM bundle (alternative import style)
  alphaTab.d.ts       -- TypeScript type definitions (reference only)
  font/               -- Bravura music notation font (required for rendering)
```

The built-in soundfont was intentionally left out — this app uses its own
audio pipeline (user-uploaded audio, with GM soundfont synthesis as a
fallback), not alphaTab's playback engine.

## How this was built

From the full alphaTab monorepo source (`alphaTab-develop.zip`):

```bash
cd alphaTab-develop
npm install                                  # installs the whole monorepo
npm run build --workspace=packages/alphatab  # builds packages/alphatab/dist/
```

Note: the build's version-stamping script shells out to `git rev-parse
HEAD`, so the source tree needs to be a git repo (even an empty one) for
the build to succeed — run `git init && git add -A && git commit -m "x" --allow-empty`
first if building from a plain zip extraction rather than a git clone.

## Making custom changes

1. Edit the TypeScript source under `packages/alphatab/src/` in the full
   alphaTab source tree.
2. Re-run the build command above.
3. Copy the new `dist/alphaTab.min.js` (+ `.min.mjs`, `font/` if changed)
   into this folder, replacing the old ones.
4. Commit and push — the app loads this file directly from this repo via
   jsdelivr's GitHub file serving, so no other changes are needed for the
   new build to go live.
