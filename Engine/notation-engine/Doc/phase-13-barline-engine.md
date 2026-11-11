# Phase 13 — Barline & Measure Engine

**Status:** complete and verified (89/89 tests pass, including a visual
snapshot rendering all 7 barline types plus a bar number, with stroke
counts cross-checked against the raw output).

## 1. What was written

**`src/geometry/barline.ts`**:
- **`BarlineType`** — `'single' | 'double' | 'final' | 'repeatBegin' |
  'repeatEnd' | 'repeatBoth' | 'dashed'` — every type PLAN.md Phase 13
  named.
- **`BarlineStroke`** — a discriminated union of the three things a
  barline is built from: a plain `'line'` (x offset + thickness), a
  `'dashedLine'` (adds dash/gap lengths), or a `'dots'` pair (a repeat
  barline's two dots, positioned as one unit).
- **`computeBarlineGeometry(type, metrics)`** — builds the exact stroke
  sequence for any `BarlineType`, entirely from real Bravura engraving
  metrics (see below) rather than guessed pixel values:
  - `single`: one thin line.
  - `double`: two thin lines, `separation` apart.
  - `final`: thin then thick, `separation` apart.
  - `repeatBegin`: thick, thin, **then** dots -- the dots point forward
    into the section that's about to repeat.
  - `repeatEnd`: dots **first**, then thin, then thick -- the dots point
    back at the section that just played.
  - `repeatBoth`: `repeatEnd`'s shape immediately followed by
    `repeatBegin`'s shape (dots-thin-thick-thick-thin-dots), symmetric.
  - `dashed`: one line using Bravura's own `dashedBarlineDashLength`/
    `GapLength` rather than an arbitrary dash pattern.
- **`shouldShowBarNumber(measureNumber, config, isSystemStart)`** — the
  decision logic for Phase 7's `BarNumberConfig` (`'off'`/`'everyBar'`/
  `'everyNBars'`/`'systemStart'`), re-exporting Phase 7's own
  `BarNumberDisplay` type rather than redeclaring it (avoids a duplicate-
  type conflict in the engine's public API). `isSystemStart` is supplied
  by the caller -- deciding whether a given measure starts a new system/
  line is the layout engine's job (Phase 41/42, not yet built), not this
  function's; this is purely "given that fact, should a number show."

**`src/render/barline.ts`**:
- **`renderBarline(geometry, options)`** — draws every stroke: `'line'`/
  `'dashedLine'` via Phase 6's `svgLine` (a dashed line just adds the
  `stroke-dasharray` SVG attribute -- no change to Phase 6 needed), and
  `'dots'` as two `repeatDot` glyphs (Phase 5) at the standard 2nd/3rd
  staff spaces, straddling the middle line.
- **`renderBarNumber(measureNumber, options)`** — draws the number as
  **plain text** (Phase 6's `svgText`, not `svgGlyphText`) -- a measure
  number is ordinary digits in a regular text font, not a SMuFL glyph,
  unlike a time signature's numerals. Position (how far above the staff)
  and font (family/size/color) are all parameters, matching Phase 13's
  "position and font style configurable" requirement.

## 2. Where the numbers came from

Every thickness/spacing value (`thinBarlineThickness`, `thickBarlineThickness`,
`barlineSeparation`, `repeatBarlineDotSeparation` [used as the general
`separation` between adjacent strokes], `dashedBarlineDashLength`/
`GapLength`) is a **real Bravura engraving default**, checked directly
against `bravura_metadata.json` before writing this phase -- none of
these are invented pixel values. The repeat dot's own width (0.4 staff
spaces) comes from Phase 5's real `getGlyph('repeatDot').bBox`.

## 3. How this was verified

`npm run verify` passes clean, 89/89. Specifically:
- Each barline type's stroke count, order, and thickness sequence is a
  direct assertion (`repeatBegin` is thick→thin→dots; `repeatEnd` is
  dots→thin→thick; `repeatBoth` is dots-thin-thick-thick-thin-dots).
- All 4 `shouldShowBarNumber` display modes tested, including the
  `everyNBars` arithmetic (shows at measure 1, N+1, 2N+1...).
- A visual snapshot renders all 7 barline types side by side on one
  staff plus a bar number, and the raw output's `<line>` count (19) and
  Bravura-glyph count (8) were checked against hand-computed expectations
  (5 staff lines + 1+2+2+2+2+4+1 = 14 barline lines = 19 total; 2+2+4 = 8
  repeat dots across the three repeat-barline types) -- both matched
  exactly.

## 4. How to modify it

- **Change the dot vertical position** — `REPEAT_DOT_UPPER_Y`/
  `REPEAT_DOT_LOWER_Y` constants in `render/barline.ts` (currently the
  standard 2nd/3rd staff spaces, straddling the middle line).
- **Add a new barline type** — add it to the `BarlineType` union and a
  new `case` in `computeBarlineGeometry`'s switch; the renderer needs no
  change as long as the new type is built from the existing
  `line`/`dashedLine`/`dots` stroke kinds.
- **Bar-number position/font** — every knob (`offsetAboveStaff`,
  `fontFamily`, `fontSize`, `color`) is already a parameter to
  `renderBarNumber`; Phase 48's theming API will eventually source these
  from `EngineConfig` instead of a caller passing them by hand each time.

## 5. How to revert/remove it

Delete `src/geometry/barline.ts`, `src/render/barline.ts`,
`test/unit/barline.test.js`, and the `barline-all-types.snap` file;
remove their `export * from` lines from `src/geometry/index.ts` and
`src/render/index.ts`; remove the added test case from
`test/visual/rendering.test.js`.
