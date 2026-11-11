# Phase 32 — Lyrics

**Status:** placement, hyphen/elision punctuation, and the extender line
are complete and tested with real geometry and rendering. Actual
syllable text (the words themselves) is a stated gap, the same class as
Phase 31's tempo/rehearsal marks (see §2). **Not wired into
`renderFromMusicXml`** — `<lyric>` is v2 parser scope (`§10.4`).

290/290 tests pass.

## 0. What was researched before writing anything, and a pleasant surprise

Confirmed placement (below the staff, universally) against Noteflight's
own published lyric-writing conventions. Went in expecting the
punctuation (hyphens between syllables, extender lines for melismas)
would need the same "no glyph, draw it as geometry" treatment Phase 31's
hairpins needed — but checking `glyphnames.json` first (rather than
assuming) turned up a genuine, useful difference: `lyricsHyphenBaseline`
and `lyricsElision` are **real, drawable SMuFL glyphs**. Only the
extender line (which must span an arbitrary musical distance, the same
situation as a hairpin) is drawn geometry, using Bravura's real
`lyricLineThickness` (0.16sp).

The one real, larger gap: checked `glyphnames.json` for Latin alphabet
letters and confirmed **none exist** — Bravura is purely a music-symbol
font. Rendering actual syllable words needs a real text font plus
character-advance-width metrics, neither of which this engine has.
`config.fonts` already reserved `textFont`/`lyricFont` fields back in
Phase 7, anticipating exactly this need — this phase is the first to
actually reach it, not the first to discover it.

## 1. What was written

**`src/geometry/lyric.ts`**:
- **`lyricSide()`** — always `'below'`.
- **`lyricHyphenGlyphName()`** / **`lyricElisionGlyphName()`** — the two
  real punctuation glyphs.
- **`computeHyphenX(syllableAEndX, syllableBStartX)`** — the simple
  midpoint, matching the real convention ("the hyphen will be centered
  between the syllables").
- **`computeExtenderLine(startX, endX, y)`** — the melisma line's
  endpoints.

**`src/render/lyric.ts`** — **`renderExtenderLine`** draws the line using
the real `lyricLineThickness`. The hyphen and elision glyphs need no new
rendering function at all — they go through Phase 30's existing
`renderMark`, the same reuse Phase 31's dynamics already demonstrated.

## 2. How this was verified

Ran `npm run verify` clean, 290/290 (6 new tests): `lyricSide` confirmed
`'below'`; both punctuation glyphs confirmed real and mutually distinct;
a hyphen confirmed to render correctly via the shared `renderMark`;
`computeHyphenX` checked against two different concrete pairs, not just
one; `computeExtenderLine`'s endpoints and `renderExtenderLine`'s actual
rendered coordinates/thickness checked directly.

## 3. Known limitations (stated, not silently missing)

- **No actual syllable text rendering** — the words themselves need a
  general text font and character-metrics system this engine doesn't
  have, the identical class of gap `§9.21` already identified for tempo/
  rehearsal marks.
- **No multi-verse stacking** — real notation software supports several
  lyric rows per staff; out of scope until syllable text itself exists
  to stack in the first place.
- **Not wired into `renderFromMusicXml` at all** — `<lyric>` parsing is
  `§10.4` (v2) scope.

## 4. How to modify it

- **Add elision-width variants** — SMuFL also defines
  `lyricsElisionNarrow`/`lyricsElisionWide`; extend
  `lyricElisionGlyphName` to pick based on available horizontal space
  once that's computed elsewhere.
- **Build the general text/font infrastructure** — the real prerequisite
  for actual syllable rendering; would serve Phase 31's tempo/rehearsal
  marks and Phase 33's chord symbols too, so it's worth building once as
  shared infrastructure rather than three times.

## 5. How to revert/remove it

Delete `src/geometry/lyric.ts`, `src/render/lyric.ts`, and
`test/unit/lyric.test.js`; remove their `export * from` lines from the
geometry/render barrels. Nothing in `render-from-musicxml.ts` references
any of this, so no wiring needs to be undone there.
