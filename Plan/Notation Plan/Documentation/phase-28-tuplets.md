# Phase 28 — Tuplets

**Status:** geometry and rendering complete and tested (259/259 tests
pass). **Not wired into `renderFromMusicXml`** — same reason as slurs
(Phase 27): parsing `<time-modification>` from real MusicXML is v2
parser scope (`§10.4`), an existing architectural decision from Phase 20.
The tick *math* for tuplets already existed before this phase (Phase 4's
`applyTuplet`, `Duration.tuplet`); this phase is purely the visual
bracket/number.

Fifth consecutive phase where the pattern held: another `§9.X`
specification gap found and fixed before writing any code.

## 0. Another plan gap, found and fixed before implementing

`PLAN.md` had no tuplet visual specification (only the data-model field
and tick math from Phases 3-4). Verified the real conventions before
writing anything:
- **Whether a bracket is even needed** — confirmed against MuseScore's
  own documented "Automatic" default: hide the bracket when every note in
  the group is already beamed (the beam shows the grouping); show it
  when the group has any unbeamed note or a rest.
- **Which side** — confirmed against Dorico's published conventions:
  "generally placed on the stem side of notes" — notably the **opposite**
  relationship from a tie or slur, which sit opposite the stem. Checked
  directly with a test comparing `tupletSide` and `tieSide` for the same
  direction, confirming they disagree rather than assuming it.
- **The number glyphs** — checked `glyphnames.json` before assuming
  anything: `tuplet0`-`tuplet9` are a real, separate SMuFL glyph set from
  `timeSig0`-`timeSig9`, plus a `tupletColon` for ratio notation. Checked
  Bravura's own `engravingDefaults` too: `tupletBracketThickness` =
  0.16sp, a real number rather than a guess.

Added `PLAN.md` `§9.17` with the full spec, sources, and named test cases
before touching any code.

## 1. What was written

**`src/geometry/tuplet.ts`**:
- **`tupletBracketNeeded(allMembersBeamed)`** — the MuseScore-confirmed
  rule: `false` when every member is beamed, `true` otherwise.
- **`tupletSide(stemDirection)`** — same side as the stem (`'up'` ->
  `'above'`, else `'below'`) — the Dorico-confirmed rule, verified by a
  dedicated test to be the opposite of `tieSide`/`slurSide` for the same
  input, not accidentally identical.
- **`tupletDigitGlyphName(digit)`** — the real `tupletN` glyph for a
  single digit 0-9, throwing outside that range rather than guessing a
  multi-digit layout.
- **`computeTupletBracketShape(startX, endX, y, side)`** — endpoints plus
  a chosen hook length (no source gives one universal number, the same
  situation as every other bulge/slope/offset constant chosen throughout
  Phases 24-27).

**`src/render/tuplet.ts`**:
- **`renderTupletBracket`** — a horizontal line with a short perpendicular
  hook at each end pointing back toward the notes (down from an "above"
  bracket, up from a "below" one) — 3 line segments total.
- **`renderTupletNumber`** — draws the digit glyph via Phase 6's
  `svgGlyphText`, the same primitive every other glyph-drawing function
  in this engine uses.

## 2. How this was verified

Ran `npm run verify` clean, 259/259 (12 new tests). Every named case from
`§9.17`: fully-beamed needs no bracket, any unbeamed/rest member needs
one; up->above, down->below; **and a direct comparison against
`tieSide`/`slurSide` for the same directions, confirming the relationship
is genuinely opposite rather than assumed** — the easiest mistake to make
here would have been copying the tie/slur side logic without noticing
tuplets go the other way. Every digit 0-9 resolves to its own real
`tupletN` glyph and is confirmed distinct from the corresponding
`timeSigN` glyph name. The bracket's rendered line count (3: bar + 2
hooks) and each hook's Y-direction (toward the notes) checked directly
against the rendered SVG's own coordinates.

## 3. Known limitations (stated, not silently missing)

- **Not wired into `renderFromMusicXml` at all** — `<time-modification>`
  parsing is `§10.4` (v2) scope, the identical situation as Phase 27's
  slurs.
- **Only single-digit tuplet counts (0-9)** are supported; a
  10-or-more-note tuplet (rare) would need multi-digit layout the same
  way Phase 12's time-signature numerals handle it, not implemented here.
- **Full ratio display (`3:2`) for non-standard ratios is not
  implemented** — only the plain actual-notes count, which is what the
  overwhelming majority of real tuplets use.

## 4. How to modify it

- **Change the hook length** — `HOOK_LENGTH` in `geometry/tuplet.ts`.
- **Wire in real parsing** — once Phase 35/36's v2 parser produces
  `Duration.tuplet` data from real files, thread `tupletBracketNeeded`/
  `tupletSide` through `renderFromMusicXml` using each group's beamed
  status (already computed by Phase 23's `groupBeams`) and resolved stem
  direction (already computed per note).

## 5. How to revert/remove it

Delete `src/geometry/tuplet.ts`, `src/render/tuplet.ts`, and
`test/unit/tuplet.test.js`; remove their `export * from` lines from the
geometry/render barrels. Nothing in `render-from-musicxml.ts` references
tuplets, so no wiring needs to be undone there.
