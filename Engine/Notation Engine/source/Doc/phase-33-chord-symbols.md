# Phase 33 — Chord Symbols

**Status:** placement, chord-symbol-specific accidentals, and 5 common
quality glyphs are complete and tested with real glyphs. Root-letter (and
bass-note) rendering is a stated gap, the third phase in a row to hit
the same missing-text-font limitation (see §2). **Not wired into
`renderFromMusicXml`** — `<harmony>` is v2 parser scope (`§10.4`).

296/296 tests pass.

## 0. What was researched before writing anything

**Placement**: confirmed above the staff, centered over the beat, across
seven independent sources with **full agreement and no exception** —
notably unlike lyrics (`§9.22`) or dynamics (`§9.21`), both of which had
a documented vocal/instrumental placement split. Chord symbols don't.

**Glyph availability, checked rather than assumed uniform**: a chord
symbol has four parts, and they turned out to have genuinely different
glyph support:
1. Root letter (A-G) — the same gap `§9.21`/`§9.22` already hit: no
   plain Latin-alphabet glyphs exist in Bravura at all.
2. Root accidental — **real, dedicated glyphs**: `csymAccidentalSharp`/
   `csymAccidentalFlat`/etc., confirmed to be a **separate set** from
   `§9.11`'s ordinary notehead-accidental glyphs (`accidentalSharp` etc.)
   — checked directly rather than assumed the two might be shared.
3. Quality suffix — real glyphs exist for 5 common qualities
   (`csymMinor`, `csymDiminished`, `csymHalfDiminished`, `csymAugmented`,
   `csymMajorSeventh`). Extended qualities (add9, sus4, 13) have none —
   the same root-letter gap, not a new one.
4. Brackets/parens/altered-bass slash — also real glyphs.

So, unlike lyrics (where only the punctuation had real glyphs and the
words themselves didn't), a chord symbol is **partially** buildable from
real glyphs today: everything except the root letter and any bass note.

## 1. What was written

**`src/geometry/chord-symbol.ts`**:
- **`chordSymbolSide()`** — always `'above'`.
- **`chordSymbolAccidentalGlyphName(alter)`** — the 5 real `csym`
  accidental glyphs, throwing outside -2..2.
- **`chordSymbolQualityGlyphName(quality)`** — the 5 real quality
  glyphs (minor/diminished/halfDiminished/augmented/majorSeventh).

No new render function was needed — both glyph lookups go through
Phase 30's existing `renderMark`, the same reuse pattern every phase
since 31 has followed.

## 2. How this was verified

Ran `npm run verify` clean, 296/296 (6 new tests): `chordSymbolSide`
confirmed `'above'`; every alter's `csym` glyph confirmed real; **the
`csym` accidental glyphs confirmed to be genuinely distinct from
`§9.11`'s plain accidental glyphs for every alter value** (not just
"exists," but "isn't accidentally the same name as the other set" —
exactly the kind of confusion checking `glyphnames.json` first was meant
to prevent); the out-of-range throw; all 5 quality glyphs confirmed real
and mutually distinct via a `Set`; a quality glyph confirmed to render
correctly through `renderMark`.

## 3. Known limitations (stated, not silently missing)

- **No root-letter or bass-note rendering** — the same text-font gap
  `§9.21`/`§9.22` already identified, hit for a third time.
- **No extended-quality text** (add9, sus4, 13, etc.) — same gap.
- **No assembly logic** combining root+accidental+quality+bass into one
  positioned symbol — meaningless to build before the root letter itself
  can be drawn.
- **Not wired into `renderFromMusicXml` at all** — `<harmony>` parsing is
  `§10.4` (v2) scope.

## 4. How to modify it

- **Add another quality glyph** if SMuFL defines one this phase missed —
  extend `ChordSymbolQuality` and `QUALITY_GLYPHS`.
- **Wire in real parsing** — once Phase 35/36's v2 parser produces
  `<harmony>` data, and once the general text/font system (needed by
  Phases 31/32 too) exists to draw the root letter, assemble the full
  symbol using these glyphs plus that text system.

## 5. How to revert/remove it

Delete `src/geometry/chord-symbol.ts` and `test/unit/chord-symbol.test.js`;
remove its `export * from` line from the geometry barrel. Nothing in
`render-from-musicxml.ts` references any of this, so no wiring needs to
be undone there.
