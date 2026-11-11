# Phase 17 — Flags

**Status:** complete and verified (131/131 tests pass, including a visual
snapshot confirming a beamed note draws NO flag at all).

## 1. What was written

**`src/geometry/flag.ts`**:
- **`FLAG_SUFFIX`** — every duration that has a flag (eighth and shorter),
  mapped to its real SMuFL glyph suffix. Verified against `glyphnames.json`
  first: all of `flag8thUp/Down` through `flag1024thUp/Down` exist,
  confirming eighth-through-1024th is the complete real range (nothing
  shorter needed). Every suffix matches its `DurationType` string exactly
  except `'eighth'`, whose glyph suffix is the numeral `'8th'`.
- **`needsFlag(durationType, isBeamed)`** — §9.9's rule in one function:
  `false` whenever `isBeamed` is true, regardless of duration; otherwise
  `true` only for eighth-or-shorter.
- **`flagGlyphName(durationType, direction)`** — the direction-aware glyph
  name. Throws for a duration that never has a flag (quarter/half/whole)
  — callers are expected to check `needsFlag()` first; this function
  doesn't quietly no-op for a request that shouldn't have been made.

**`src/render/flag.ts`**:
- **`renderFlag(durationType, options)`** — draws the flag at the given
  `(x, y)`, meant to be exactly the stem's own X and its FREE end Y
  (Phase 16's `renderStem` computes `endY` already; this phase doesn't
  recompute it, just reuses it) — a flag sits directly on the stem's tip,
  not offset from it.

## 2. How this was verified

Ran `npm run verify` clean, 131/131:
- Every duration eighth-through-1024th needs a flag when unbeamed; every
  duration quarter-and-longer never does, unbeamed or not.
- A beamed note needs no flag regardless of duration — checked
  specifically for eighth, 16th, and 1024th, not just one case.
- `flagGlyphName` produces the exact real glyph name for several
  duration/direction combinations, and **every** duration×direction
  combination (16 total) was confirmed to resolve via `getGlyph` — not
  just spot-checked.
- `flagGlyphName` throws for quarter and whole.

A visual snapshot renders three eighth notes on one staff: one high
(automatic down stem) with its flag, one low (automatic up stem) with
its flag, and a third **identical** high note marked `isBeamed: true` —
inspected the raw output directly and confirmed exactly 2 flag glyphs
exist (`flag8thDown` at the first note, `flag8thUp` at the second), with
**no** flag glyph at all following the third notehead, proving the
beam-suppression rule actually suppresses rendering, not just the
decision function.

## 3. How to modify it

- **Extend the flag range** (unlikely to be needed — 1024th is already
  far beyond any real repertoire) — add the new duration to
  `FLAG_SUFFIX` once SMuFL/Bravura defines a glyph for it.
- **Beam geometry itself** (drawing the beam that replaces these flags
  for grouped notes) is Phase 24's job, not this one's — this phase only
  knows "don't draw a flag here," not how to draw what replaces it.

## 4. How to revert/remove it

Delete `src/geometry/flag.ts`, `src/render/flag.ts`,
`test/unit/flag.test.js`, and the `flag-variants.snap` file; remove their
`export * from` lines from `src/geometry/index.ts` and
`src/render/index.ts`; remove the added test case from
`test/visual/rendering.test.js`.
