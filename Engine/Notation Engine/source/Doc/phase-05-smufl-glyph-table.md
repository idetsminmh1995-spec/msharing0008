# Phase 5 — SMuFL Glyph Table

**Status:** complete and verified against real data (not placeholders —
`npm run verify` clean, plus a manual smoke test against the actual SMuFL
spec and Bravura font metadata, both downloaded fresh — see §3).

## 1. What was written

**Data files** (`src/glyphs/data/`, real files downloaded from their
canonical sources, not hand-written):
- **`glyphnames.json`** (302 KB, 2,940 entries) — from the SMuFL spec
  itself: `https://raw.githubusercontent.com/w3c/smufl/gh-pages/metadata/
  glyphnames.json`. Font-independent: every standard glyph name → its
  Unicode Private Use Area codepoint + description.
- **`bravura_metadata.json`** (1.07 MB) — from the Bravura font repo, tag
  `bravura-1.380`: `https://raw.githubusercontent.com/steinbergmedia/
  bravura/bravura-1.380/redist/bravura_metadata.json`. Font-SPECIFIC:
  engraving-default metrics (stem/beam/staff-line thickness, etc.), plus
  per-glyph bounding boxes (3,262 of them) and stem/beam anchor points
  (590 glyphs that have them, mostly noteheads).
  ⚠️ Finding the right URL took some digging — `github.com/steinberg/
  bravura` (no "media") 404s; the real org is `steinbergmedia`, and the
  `redist/` files aren't on the `master` branch's current HEAD in a way
  `raw.githubusercontent.com` could serve directly for some reason(**) —
  fetching via the release tag `bravura-1.380` (or its commit hash) worked.
  (**Not fully root-caused; if this breaks again, try the latest release
  tag from `https://github.com/steinbergmedia/bravura/releases` instead of
  guessing branch names.)
- **`SOURCES.md`** — attribution for both files (Bravura is SIL OFL 1.1
  licensed; the SMuFL spec's glyphnames.json is part of the W3C spec repo).

**`glyph-table.ts`** — the actual loader/API, all pure functions reading
from the two JSON files above (imported as real ES module JSON imports,
`import x from './data/....json' with { type: 'json' }`, which required
adding `"resolveJsonModule": true` to `tsconfig.json`):
- **`getGlyph(name)`** → `GlyphInfo | undefined` — the one function Phase
  5's plan asked for by name. Combines the font-independent codepoint/
  description from `glyphnames.json` with Bravura's bBox/anchors (if that
  glyph has them) from `bravura_metadata.json`. Also resolves `char`, the
  actual usable JS string character for that codepoint, so callers never
  need to do the `String.fromCodePoint` parsing themselves.
- **`getEngravingDefault(key)`** / **`getEngravingDefaults()`** — Bravura's
  recommended metrics (`stemThickness`, `beamThickness`,
  `staffLineThickness`, etc.), in staff-space units.
- **`codepointToChar(codepoint)`** — converts a `"U+E0A4"`-style string
  into the real character; exposed separately since other phases may need
  to convert a raw codepoint without a full glyph lookup.
- **`getFontInfo()`** — `{ name, version }` (currently `"Bravura"`,
  `"1.38"`) for diagnostics/attribution.

Both JSON files are typed as `unknown` and then asserted to a **hand-
written, deliberately loose** interface (`SmuflGlyphNameEntry`,
`BravuraMetadataFile`) rather than letting `resolveJsonModule` infer an
exact literal type from all 2,940/3,262 entries — see §4 for why.

## 2. Design notes

- **Font-independent vs font-specific data are two separate files on
  purpose.** `getGlyph()` merges them at lookup time rather than the data
  being pre-merged, so swapping in a different SMuFL font later (per Phase
  50's plugin/extension points) means adding one new metadata file and
  changing which one `glyph-table.ts` reads from `bravura_metadata.json`'s
  slot — the SMuFL glyph *names* stay exactly the same either way, since
  those are the whole point of the SMuFL standard.
- **Missing glyphs/metrics return `undefined`, never throw.** A glyph name
  typo, or a glyph that genuinely has no anchors (most don't), is a normal
  outcome other phases need to handle gracefully (e.g. render without a
  stem-anchor offset), not an exceptional one.

## 3. How this was verified

Ran `npm run verify` clean (typecheck took ~3.4s despite the large JSON
files — no meaningful slowdown), then loaded the built bundle and checked
it against known real SMuFL/Bravura facts:
- `getFontInfo()` → `{ name: "Bravura", version: 1.38 }`, matching the tag
  fetched.
- `getGlyph('gClef')` → codepoint `U+E050` (the correct, spec-defined G
  clef codepoint) with a real bounding box.
- `getGlyph('noteheadBlack')` → codepoint `U+E0A4` plus 8 real anchor
  points (`stemUpSE`, `stemDownNW`, etc.) — the exact anchors a later
  Phase 19 (stem engine) will need to attach a stem to the correct spot on
  the notehead.
- `getGlyph('noteheadXBlack')` → codepoint `U+E0A9` — directly relevant to
  the drum project's hi-hat notation from earlier sessions.
- `getGlyph('thisIsNotARealGlyphName')` → `undefined`, confirmed no throw.
- `getEngravingDefault('stemThickness')` → `0.12`, `'beamThickness'` →
  `0.5`, `'staffLineThickness'` → `0.13` — all match Bravura's published
  defaults. A nonexistent key correctly returns `undefined`.
- `codepointToChar('U+E050')` round-trips to the exact same character
  `getGlyph('gClef').char` returned.

## 4. How to modify it

- **Update to a newer Bravura release** — replace
  `src/glyphs/data/bravura_metadata.json` with the new version's file (same
  URL pattern, different release tag) and update `SOURCES.md`'s tag
  reference. `getFontInfo()` will automatically reflect the new version
  string; no code changes needed unless Bravura renamed/removed a key this
  module reads.
- **Support a second/alternate font** — add its metadata JSON alongside
  Bravura's, add a `fontId` parameter to `getGlyph()`/`getEngravingDefault()`
  (defaulting to Bravura for backward compatibility), and switch which
  metadata object each function reads based on it.
- **Widen the typed interfaces** — `SmuflGlyphNameEntry` and
  `BravuraMetadataFile` only declare the fields this module actually uses.
  If a later phase needs another field from either JSON file (e.g.
  `optionalGlyphs` or `sets` from Bravura's metadata, currently untyped),
  add it to the relevant interface rather than reaching into the raw JSON
  with a fresh `as unknown as` cast elsewhere.

### Why the loose hand-written types instead of `resolveJsonModule`'s inferred ones

`resolveJsonModule: true` lets TypeScript import the JSON directly, but by
default it also infers an exact literal type from the file's entire
contents — for a 2,940-entry file, that's a ~3,000-property object type,
which is unnecessary type-checking weight for data we only ever access via
computed string keys (`glyphnames[name]`) anyway, where the inferred exact
type provides no real benefit over a plain index signature. Casting once
at the top of the file (`as unknown as Readonly<Record<string,
SmuflGlyphNameEntry>>`) keeps that inference cost off the compiler and
gives every other function in the file a clean, purpose-built type to work
with instead of the raw JSON shape.

## 5. How to revert/remove it

Delete `src/glyphs/` entirely (the two data files, `SOURCES.md`,
`glyph-table.ts`, `index.ts`), remove the
`export * from './glyphs/index.js';` line from `src/index.ts`, and revert
the `"resolveJsonModule": true` addition in `tsconfig.json` (Phase 2's
version didn't have it). Nothing outside `src/glyphs/` and `src/index.ts`
references any of this yet.
