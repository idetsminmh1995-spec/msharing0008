# Phase 18 — Rests

**Status:** complete and verified (141/141 tests pass, including a visual
snapshot confirming the whole-rest special case and the per-voice offset
that prevents the exact collision bug hit once before Phase 1 existed).

## 1. What was written

**`src/geometry/rest.ts`**:
- **`restGlyphName(durationType)`** — every duration's real SMuFL rest
  glyph, verified against `glyphnames.json` before writing (quarter/half/
  whole use spelled words, everything shorter uses the numeral — the
  same pattern already seen for flags and time-signature digits). A
  `switch` over the closed `DurationType` union, not a `Record` lookup,
  so it stays fully typed with no `noUncheckedIndexedAccess` escape hatch
  (the same choice Phase 10's `stepOffset` made).
- **`multiMeasureRestGlyphName()`** — the `restHBar` glyph, kept separate
  from the per-duration function since a multi-measure rest isn't tied to
  a `DurationType` at all.
- **`defaultRestY(durationType, numLines)`** — §9.10's placement rule:
  quarter-and-shorter center on the middle line; **whole is the one real
  numeric exception**, one staff-space *above* the middle line. Confirmed
  against Bravura's own glyph bounding boxes before writing this (not
  guessed): `restWhole`'s shape sits almost entirely *below* its own
  baseline, so placing that baseline one space above the middle line
  makes it hang from the line above, exactly matching "hangs below the
  4th line." `restHalf`'s shape sits almost entirely *above* its
  baseline, so placing that baseline *at* the middle line makes it sit
  on top — which turns out to be the same numeric position as the plain
  default, so half rest doesn't actually need a separate value, only a
  confirmation that the default already produces the right picture.
- **`restY(durationType, numLines, voiceOffset = 0)`** — wraps
  `defaultRestY` with an optional per-voice offset, specifically so a
  future multi-voice layout (Phase 25, referenced as §13 in the plan) can
  keep two voices' rests apart. This is the exact bug the pre-Phase-1
  drum-video prototype hit once (two voices' rests both defaulting to the
  shared middle line and visually colliding) — now prevented structurally
  by making the offset a parameter here, rather than trusting every
  future call site to remember to separate them by hand.

**`src/render/rest.ts`**:
- **`renderRest(glyphName, options)`** — draws any rest glyph (from either
  function above) via Phase 6's `svgGlyphText`.

## 2. How this was verified

Ran `npm run verify` clean, 141/141:
- Every duration's glyph name is correct, and every one of the 11
  duration glyphs plus `restHBar` was confirmed to actually resolve via
  `getGlyph` (not just spot-checked).
- Quarter/eighth/16th all default to the middle line.
- Half rest's position is confirmed equal to the middle line (the "same
  as default" finding from the bbox analysis, not assumed).
- Whole rest's exception is checked both symbolically
  (`middleLineY(5) - 1`) and against the concrete expected value (`-3`,
  the 4th line of a standard 5-line staff) — and confirmed to generalize
  correctly to a 1-line and a 6-line staff, not just the standard case.
- `restY` with no offset matches `defaultRestY` exactly; with opposite
  offsets for two simultaneous voices, the two results are confirmed
  **not equal** to each other (the actual anti-collision property, not
  just that the offset arithmetic runs).

A visual snapshot renders whole/half/quarter rests plus a same-instant
two-voice quarter-rest pair — inspected the raw output directly: whole
rest at `y=1` (`bottomY 4 + (-3)`), half and quarter both at `y=2`
(`4 + (-2)`, confirming they really do coincide), and the voice-offset
pair at `y=3` and `y=1` respectively — visibly distinct Y values, proving
the offset actually separates them rather than just changing a number
that happens to stay equal.

## 3. How to modify it

- **Change which line the whole-rest hangs from**, or adjust the offset
  magnitude — the single `- 1` in `defaultRestY`; re-verify against
  Bravura's bounding box if the underlying font ever changes.
- **Decide actual per-voice offset values** (e.g. "+1 for the top voice,
  -1 for the bottom") — that decision belongs to Phase 25's multi-voice
  layout, which has the context (how many voices, which is "higher") this
  phase deliberately doesn't have; this phase only provides the
  parameter, not the policy.
- **Multi-measure rest width/count display** — `multiMeasureRestGlyphName`
  only exposes the glyph; scaling the bar's width to a measure count and
  drawing the count number above it is a layout-level concern for
  whichever future phase handles multi-measure rest consolidation, not
  specified further here since the plan doesn't detail it either.

## 4. How to revert/remove it

Delete `src/geometry/rest.ts`, `src/render/rest.ts`,
`test/unit/rest.test.js`, and the `rest-variants.snap` file; remove their
`export * from` lines from `src/geometry/index.ts` and
`src/render/index.ts`; remove the added test case from
`test/visual/rendering.test.js`.
