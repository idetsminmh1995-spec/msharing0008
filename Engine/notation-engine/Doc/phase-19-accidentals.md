# Phase 19 — Accidentals

**Status:** complete and verified (159/159 tests pass, including a visual
snapshot whose 3-column chord stacking was hand-checked against the
formula for every glyph, column, and X position).

This is the last phase of Stage 2 — **Phase 20 begins Stage 3, the first
vertical slice** (a real `.musicxml` file rendering end to end).

## 1. What was written

**`src/geometry/accidental-state.ts`** — the draw-or-not decision, kept
deliberately separate from glyph selection/placement since §9.11 calls it
out as "a *musical* decision, not a rendering one":
- **`AccidentalState`** — `{ keySignatureAlterForStep, measureOverrides }`,
  immutable; every function below returns a *new* state rather than
  mutating one, matching this engine's style throughout.
- **`createAccidentalState(fifths)`** — builds the key signature's
  implied per-step alter by **reusing Phase 11's `sharpsForCount`/
  `flatsForCount`** rather than re-deriving the circle-of-fifths order a
  second time.
- **`resetMeasure(state)`** — clears in-measure overrides at a barline;
  the key signature itself carries over unchanged.
- **`evaluateAccidental(state, step, octave, alter, hasExplicitAccidental?)`**
  — the actual decision: an accidental is needed when `alter` differs
  from what's implied by an earlier note THIS measure at the same
  step+octave, or (if none) the key signature. `hasExplicitAccidental`
  is the MusicXML courtesy-accidental case: forces `shouldDraw: true`
  regardless of musical necessity, without changing what gets tracked
  going forward (the note's real `alter` is tracked either way).

**`src/geometry/accidental.ts`** — glyph selection and chord stacking:
- **`accidentalGlyphName(alter)`** — the 5 real SMuFL glyphs
  (double-flat through double-sharp), verified against `glyphnames.json`
  first. Throws outside that range.
- **`assignAccidentalColumns(positions)`** — §9.11's stacking algorithm
  exactly: sort by pitch descending, place each in the leftmost column
  that doesn't collide (within 2.5sp) with anything already there, open
  a new column otherwise. Returns results in the **caller's original
  order**, not sorted order, so a caller can zip the result straight
  back against their own note list.
- **`accidentalX(noteX, accidentalWidth, column)`** — §9.11's horizontal
  rule: 0.16sp gap left of the notehead, each column stepping one more
  accidental-width further left. **Caught and fixed a real design error
  before it shipped** — see §2.

**`src/render/accidental.ts`** — **`renderAccidental`** draws via Phase
6's `svgGlyphText`.

## 2. A design error caught before implementation finished

The first draft of `accidentalX` subtracted a `noteheadWidth` parameter,
reasoning (wrongly) that the notehead's drawing origin might be its
*center* or *right* edge. Before writing the render call sites, this was
checked against `noteheadBlack`'s own Bravura bounding box
(`bBoxSW.x = 0.0`) and cross-referenced against Phase 16's stem-anchor
math (`stemUpSE`'s anchor `x=1.18` lands exactly at the notehead's *right*
edge when added to the drawing-origin `noteX`) — both confirm this
engine's established convention: **`noteX` is always the glyph's LEFT
edge**, the same as every other glyph drawn so far. An accidental
approaching from the notehead's own left edge should not also subtract
the notehead's width; doing so would have placed every accidental a full
notehead-width too far left. Fixed before any test was written against
the wrong version, by removing the `noteheadWidth` parameter entirely.

## 3. How this was verified

Ran `npm run verify` clean, 159/159. Specifically:
- **State machine**: C major (no key-implied alters) correctly draws
  nothing for natural C, something for C#; D major correctly draws
  nothing for a key-matching F#, something for a key-contradicting F
  natural; an accidental correctly carries for the rest of the measure at
  the same step+octave but NOT to a different octave of the same step;
  `resetMeasure` correctly clears an in-measure-only accidental while
  correctly preserving the key signature's own implied alters (tested as
  two separate cases, since a naive test could pass on either alone
  without proving both properties); an explicit accidental forces a draw
  even when musically unnecessary.
- **Glyph selection**: all 5 real glyphs, all 5 confirmed to resolve via
  `getGlyph`, and the out-of-range throw.
- **Stacking**: wide-apart accidentals share column 0; close ones split
  columns; three mutually-close accidentals need three separate columns
  (not just "more than one"); result order matches input order even when
  the input isn't already pitch-sorted; a lone accidental gets column 0.
- **Placement**: the exact gap+width arithmetic for column 0, and the
  exact one-more-width step from column 0 to column 1.

A visual snapshot renders two real cases: an F5 in D major with a
**natural** accidental (contradicting the key, confirmed via the state
machine rather than drawn unconditionally) at the correctly-computed X;
and a 3-note chord (C♭5, B4, A♯4) whose accidentals are all mutually
within 2.5sp of each other, forcing all 3 into separate columns —
inspected the raw output directly and confirmed every one of the 3
accidentals' glyph (flat/natural/sharp, matching each note's actual
alter), column (0/1/2), and X position matches the formula to the exact
decimal.

## 4. How to modify it

- **Microtonal accidentals** (alter values outside -2..2) — `Duration`'s
  sibling, `Pitch.alter`, already documents this as a future extension
  (Phase 3's comment); `accidentalGlyphName` would need new `case`s for
  whatever SMuFL microtonal glyphs get chosen, and the state machine's
  comparison logic (`alter !== impliedAlter`) already works for any
  numeric alter without change.
- **Column spacing** — `accidentalX`'s `GAP` constant and the
  width-per-column step; both isolated in one function.
- **Cross-voice accidental sharing** (whether voice 2's accidental state
  should be shared with or independent from voice 1's, within the same
  measure) — not decided here; §9.11 doesn't specify it and this phase's
  `AccidentalState` is deliberately silent on which voice it belongs to,
  leaving that decision to whichever future phase assembles a full
  measure's rendering.

## 5. How to revert/remove it

Delete `src/geometry/accidental-state.ts`, `src/geometry/accidental.ts`,
`src/render/accidental.ts`, `test/unit/accidental.test.js`, and the
`accidental-variants.snap` file; remove their `export * from` lines from
`src/geometry/index.ts` and `src/render/index.ts`; remove the added test
case from `test/visual/rendering.test.js`.
