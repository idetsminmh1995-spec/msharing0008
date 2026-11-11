# Phase 30 — Articulations and Ornaments

**Status:** geometry and rendering complete and tested (275/275 tests
pass). **Not wired into `renderFromMusicXml`** — same reason as slurs
(Phase 27) and tuplets (Phase 28): `<articulations>`/`<ornaments>` under
`<notations>` is v2 parser scope (`§10.4`), an existing architectural
decision from Phase 20.

Starts Stage 5 (Expression). Seventh consecutive phase where the same
pattern held: real specification gaps found and fixed before writing any
code — and this phase specifically caught **two different placement
rules that look similar but aren't**, which is exactly the kind of
mistake the verify-first discipline exists to prevent.

## 0. Two plan gaps, found and fixed before implementing

`PLAN.md` had no articulation or ornament specification at all. Researched
both separately rather than assuming they'd share one rule:

- **Articulations** (`§9.19`) — Dorico's own published conventions,
  cross-checked against three independent teaching sources with full
  agreement: the default is "notehead side," which resolves to the
  *exact same opposite-of-stem relationship* ties already use (`§9.15`).
  One real, named exception: **marcato is always above**, regardless of
  stem direction, in single-voice writing — every source agreed on this
  specific exception with zero disagreement.
- **Ornaments** (`§9.20`) — genuinely different from articulations, not
  assumed to work the same way just because both are "marks near a
  note": multiple clean sources agree ornaments are placed **above the
  note unconditionally**, no stem dependency at all. One lower-quality
  source claimed a stem-dependent rule for trills specifically, but was
  discounted — it directly contradicted itself within the same passage
  about whether the rule was stem-based or position-based, not a
  reliable citation to build a rule on.

Checked `glyphnames.json` for both before assuming any glyph shape:
articulations have real, separate `...Above`/`...Below` glyph pairs (no
transform needed, unlike Phase 29's brace); ornaments have `ornamentTrill`,
`ornamentMordent`, `ornamentTurn`, `ornamentTurnInverted` — but **no**
separate simple "inverted mordent" glyph exists in this SMuFL build,
confirmed by checking rather than assumed absent.

## 1. What was written

**`src/geometry/articulation.ts`**:
- **`articulationSide(type, stemDirection)`** — reuses the opposite-of-
  stem relationship for four types (accent, staccato, tenuto,
  staccatissimo), with marcato special-cased to always return `'above'`.
- **`articulationGlyphName(type, side)`** — a lookup table over the 5
  types x 2 sides (10 real glyphs total), not a computed transform.

**`src/geometry/ornament.ts`** — **`ornamentGlyphName(type)`** — a plain
lookup with **no side/stem parameter at all**, deliberately, since none
is needed; confirmed by a test asserting the function's own arity is 1,
not just that it happens to work when called with one argument.

**`src/render/mark.ts`** — **`renderMark`**: one shared rendering
function for both articulations and ornaments, since both are simply "one
glyph drawn at one position" — the geometry layer is what differs (which
glyph, which position), not the drawing itself.

## 2. How this was verified

Ran `npm run verify` clean, 275/275 (8 new tests). The four non-marcato
articulation types confirmed to produce the *identical* result as
`tieSide` for both stem directions (not just spot-checked one direction);
marcato confirmed `'above'` for **both** directions explicitly, since the
whole point of the exception is that it doesn't vary; all 10
articulation glyph combinations and all 4 ornament glyphs confirmed to
resolve to real, and mutually distinct, glyph names (via a `Set`, not
just "no error was thrown"); `renderMark` confirmed to draw at the
correct position for both an articulation and an ornament, and to throw
(not silently draw nothing) for an unrecognized glyph name.

## 3. Known limitations (stated, not silently missing)

- **Not wired into `renderFromMusicXml` at all** — `<articulations>`/
  `<ornaments>` parsing is `§10.4` (v2) scope, the same situation as
  Phase 27's slurs and Phase 28's tuplets.
- **The multi-voice articulation exception is not implemented** — real
  convention moves articulations to the *stem* side (not notehead side)
  when multiple voices share a staff, to keep each voice's marks
  unambiguous; this section only covers the single-voice default.
- **Combined articulation marks** (staccato+accent, marcato+tenuto, etc.)
  are not implemented — SMuFL defines several, but this section covers
  only the five plain types.
- **No inverted/lower mordent** — no such simple glyph exists in this
  SMuFL build. **No precomposed compound ornaments** (trill with
  termination, etc.).

## 4. How to modify it

- **Add a combined articulation type** — extend `ArticulationType` and
  `GLYPH_NAMES` in `geometry/articulation.ts` with the real SMuFL
  combined-glyph name (e.g. `articAccentStaccatoAbove`).
- **Wire in real parsing** — once Phase 35/36's v2 parser produces
  articulation/ornament data, thread `articulationSide`/
  `articulationGlyphName`/`ornamentGlyphName` through
  `renderFromMusicXml` using each note's resolved stem direction (already
  computed per note since Phase 26's tie wiring).

## 5. How to revert/remove it

Delete `src/geometry/articulation.ts`, `src/geometry/ornament.ts`,
`src/render/mark.ts`, and `test/unit/articulation-ornament.test.js`;
remove their `export * from` lines from the geometry/render barrels.
Nothing in `render-from-musicxml.ts` references either, so no wiring
needs to be undone there.
