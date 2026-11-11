# Phase 12 — Time Signature Engine

**Status:** complete and verified (77/77 tests pass, including a visual
snapshot confirming digit-by-digit spacing and numerator/denominator
centering with real, unequal glyph widths).

## 1. What was written

**`src/geometry/time-signature.ts`**:
- **`TimeSignature`** — `{ numerator, denominator, numeratorDisplay?,
  symbol? }`. `numerator`/`denominator` are always the real numeric
  meaning (used for beat-duration math elsewhere); `numeratorDisplay` is
  an optional override string for additive/irregular meters (e.g. "3+2+2"
  displayed instead of "7", while `numerator` stays `7` for math).
  `symbol` is `'common'` (draws the C glyph) or `'cut'` (cut-C glyph)
  instead of plain digits.
- **`timeSignature(numerator, denominator, options?)`** — validates at
  construction: numerator must be a positive integer; denominator must be
  a positive power of 2 (1,2,4,8,16,32,64...); `symbol: 'common'` is only
  accepted for exactly 4/4, `symbol: 'cut'` only for exactly 2/2 --
  catching a nonsensical "common-time symbol representing 7/8" at
  construction rather than silently drawing something wrong.
- **`numeratorText(sig)`** / **`denominatorText(sig)`** — the actual
  strings to render (`numeratorDisplay` if given, else the plain number;
  denominator display is never overridden -- additive notation only ever
  applies to the numerator in real notation).

**`src/geometry/time-signature.ts` (measurement)**:
- **`textWidth(text)`** — total width (staff-space units) of a display
  string, using each character's REAL glyph bounding-box width from Phase
  5's `getGlyph` (digits are NOT uniform width in Bravura -- "1" is
  1.176 units, "0"/"4" are 1.72 -- so this couldn't be a fixed per-
  character constant). Alongside it: `charAdvance(ch)`,
  `glyphForTimeSigChar(ch)`, `glyphNameForTimeSigChar(ch)`.

  *(These four originally lived in `src/render/time-signature.ts`. They were
  moved here during the v2 plan audit: they are pure measurement with no SVG
  output, which `PLAN.md` §5's "geometry computes, render draws" rule puts in
  `geometry/`. The renderer now calls them instead of duplicating the
  bounding-box arithmetic. `textWidth`'s public export name is unchanged, the
  rendered output is byte-identical, and all 89 tests still pass.)*

**`src/render/time-signature.ts`**:
- **`renderTimeSignature(sig, options)`** — for a plain numeric signature:
  draws the numerator centered on the staff's upper half (y=-3) and
  denominator on the lower half (y=-1), each character positioned
  immediately after the previous one's real width (not a fixed
  monospace step), AND the narrower of the two strings horizontally
  centered relative to the wider one (e.g. a single-digit denominator "8"
  centered under a 5-character numerator "3+2+2"). For `'common'`/`'cut'`,
  draws the single symbol glyph vertically centered on the whole staff
  (y=-2, the middle line) instead.

## 2. Design notes

- **Digit widths come from real glyph data, not assumption.** Checked
  Bravura's actual bounding boxes for `timeSig0`-`timeSig9` before writing
  the spacing logic: they range from 1.176 (the narrow "1") to 1.72 (the
  wider "0"/"4") staff-space units wide. A naive fixed-width assumption
  would have made multi-digit numerators (e.g. "12") look uneven or
  overlap slightly.
- **Additive-meter "+" uses `timeSigPlus`** (confirmed to exist in the
  real SMuFL glyph table alongside `timeSigPlusSmall`, which is meant for
  "+"-separated *numerators specifically* per its own SMuFL description --
  `textWidth`/`renderDigitString` route any `+` character through
  `timeSigPlus` for now; switching to `timeSigPlusSmall` specifically
  for numerator context is a reasonable future refinement, not required
  for correctness).
- **No separate "irregular meter" type** — an irregular/additive meter is
  just a plain `TimeSignature` with a `numeratorDisplay` override; nothing
  else in the engine needs to know or care that it's "irregular" (the
  actual `numerator`/`denominator` used for beat-duration math is
  identical to any other time signature).

## 3. How this was verified

`npm run verify` passes clean, 77/77. Specifically:
- Construction validation: rejects non-positive/non-integer numerators,
  non-power-of-2 denominators, and a `symbol` that doesn't match its
  required numerator/denominator -- each as its own test, plus a
  positive test confirming every common power-of-2 denominator (1
  through 64) is accepted.
- `numeratorText`/`denominatorText` confirmed to return the override vs.
  the plain number correctly, and confirmed the real numeric `numerator`
  field (7) stays intact even when the *displayed* text is "3+2+2".
- `textWidth('10') > textWidth('7')` confirmed multi-character strings
  are measured correctly (not just per-glyph in isolation).
- A visual snapshot (`time-signature-variants`) renders `common` symbol
  4/4, plain 7/8, and additive "3+2+2"/8 on three staves -- inspected the
  raw output directly and confirmed: the `timeSigCommon` glyph
  (`U+E08A`) appears for the first; `timeSig7`/`timeSig8` (`U+E087`/
  `U+E088`) for the second; and for the third, the numerator draws as the
  exact digit/plus sequence `3 + 2 + 2` (`U+E083`, `U+E08C`, `U+E082`,
  `U+E08C`, `U+E082`) at increasing X positions matching each glyph's real
  width, with the denominator "8" horizontally centered under that whole
  wider string (not left-aligned).

## 4. How to modify it

- **Use `timeSigPlusSmall` for additive numerators specifically** — swap
  the glyph name in `glyphNameForChar`'s `'+'` case; no other change
  needed.
- **Support a compound-time dotted-note beat indicator** (e.g. some
  editions show a dotted quarter icon instead of "6/8") — would be a new
  `symbol` variant alongside `'common'`/`'cut'`, with its own glyph and
  vertical-centering rule.
- **Change numerator/denominator vertical centering** — the two hardcoded
  offsets (`staffBottomY - 3` and `staffBottomY - 1`) in
  `renderTimeSignature`; both are standard/uncontroversial (unlike Phase
  11's per-clef key-signature positions, time signature placement doesn't
  vary by clef).

## 5. How to revert/remove it

Delete `src/geometry/time-signature.ts`, `src/render/time-signature.ts`,
`test/unit/time-signature.test.js`, and the
`time-signature-variants.snap` file; remove their `export * from` lines
from `src/geometry/index.ts` and `src/render/index.ts`; remove the added
test case from `test/visual/rendering.test.js`.
