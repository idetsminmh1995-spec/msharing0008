# Phase 34 — Grace Notes

**Status:** complete and tested with real, precomposed glyphs (300/300
tests pass). **Not wired into `renderFromMusicXml`** — `<grace/>` is v2
parser scope (`§10.4`). Completes Stage 5 (Phases 30-34).

## 0. A pleasant surprise, checked rather than assumed

Three consecutive phases (31, 32, 33) all hit the same missing-text-font
gap. Went into this phase half-expecting a fourth — but checked
`glyphnames.json` before assuming, and it turned out **not** to apply
here: Bravura provides **precomposed, direction-aware glyphs for the
entire grace-note figure** — `graceNoteAcciaccaturaStemUp`/`...StemDown`
and `graceNoteAppoggiaturaStemUp`/`...StemDown`, each already a
correctly-scaled small notehead+stem+flag(+slash) combination. This
phase doesn't need to assemble a grace note from a scaled-down full-size
notehead the way that might first seem necessary, and doesn't need any
general text/font system at all. Worth stating plainly rather than
silently pattern-matching "Stage 5 phase -> probably hits the text-font
gap too" without checking.

Confirmed the acciaccatura/appoggiatura distinction (slash = short/
crushed, no slash = longer/expressive) across five independent sources
with full agreement: Wikipedia's "Grace note", MasterClass, StudyBass,
MuseScore's own handbook, and a dedicated music-dictionary entry. Also
confirmed stem direction reuses `§9.8`'s existing rule directly — one
source states plainly "their stems follow the same direction rules as
regular notes" — so no new direction logic was written; this phase only
selects a glyph for whichever direction the caller already resolved via
Phase 16's existing functions.

## 1. What was written

**`src/geometry/grace-note.ts`** — **`graceNoteGlyphName(kind,
direction)`**: a lookup over 2 kinds x 2 directions (4 real glyphs),
selecting the correct precomposed figure. No new render function was
needed — it goes through Phase 30's existing `renderMark`, the same
reuse pattern every phase since 31 has followed.

## 2. How this was verified

Ran `npm run verify` clean, 300/300 (4 new tests): all 4 combinations
confirmed real and mutually distinct via a `Set`; acciaccatura and
appoggiatura confirmed to **never** resolve to the same glyph for a
given direction (the slash distinction is real, not accidentally
collapsed); the same kind confirmed to resolve to a **different** glyph
per direction (genuinely direction-aware, not one glyph reused
regardless); rendering confirmed correct via `renderMark`.

## 3. Known limitations (stated, not silently missing)

- **Only a single, unbeamed grace note is covered.** A group of several
  grace notes beamed together (common in practice, e.g. a turn figure)
  is out of scope — the same kind of scope boundary Phase 24's beam
  engine already has for chords.
- **No independent notehead-shape mapping (`§9.7`) for grace notes** —
  the precomposed glyph's notehead shape is fixed by the font design,
  not swappable the way an ordinary note's is via
  `selectNoteheadGlyphName`.
- **Not wired into `renderFromMusicXml` at all** — `<grace/>` parsing is
  `§10.4` (v2) scope.

## 4. How to modify it

- **Support beamed grace-note groups** — would need its own geometry
  (likely reusing Phase 23/24's beam grouping/shape machinery at grace
  scale) rather than the single-glyph approach this phase uses.
- **Wire in real parsing** — once Phase 35/36's v2 parser produces
  `<grace/>` data (including its `slash="yes"/"no"` attribute mapping
  directly to `kind`), thread `graceNoteGlyphName` through
  `renderFromMusicXml` using the main note's resolved stem direction
  logic for the grace note's own pitch.

## 5. How to revert/remove it

Delete `src/geometry/grace-note.ts` and `test/unit/grace-note.test.js`;
remove its `export * from` line from the geometry barrel. Nothing in
`render-from-musicxml.ts` references any of this, so no wiring needs to
be undone there.
