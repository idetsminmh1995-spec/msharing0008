# Phase 27 — Slurs

**Status:** geometry and rendering complete and tested (247/247 tests
pass). **Not wired into `renderFromMusicXml`** — parsing `<slur>` from
real MusicXML is explicitly v2 parser scope (`§10.4`), an existing
architectural decision from Phase 20, not something this phase should
pull forward the way percussion `<unpitched>` parsing was pulled forward
during the A+B+C work (that was justified because it was blocking the
user's actual reported need; nothing here is).

Same pattern as the three prior phases: another `§9.X` specification gap
found and fixed before writing any code.

## 0. Another plan gap, found and fixed before implementing

`PLAN.md` had no slur specification at all. Verified the actual rule
against two independent sources with zero disagreement before writing
anything: Wikipedia's "Slur (music)" ("placed over the notes if the stems
point downward, and under them if the stems point upwards") and Dorico's
own published engraving-conventions page, which explicitly resolves the
mixed-direction case Wikipedia's phrasing leaves ambiguous: "unless all
of the notes under the slur are up-stem, in which case it curves
downwards... if a slur applies to a mixture of up-stem and down-stem
notes, it is placed above." Checked Bravura's own `engravingDefaults`
too: `slurEndpointThickness`/`slurMidpointThickness` are `0.1`/`0.22`,
confirmed numerically identical to `tie*Thickness` rather than assumed
so. Added `PLAN.md` `§9.16` with the full spec, sources, and named test
cases before touching any code.

## 1. What was written

**`src/geometry/slur.ts`**:
- **`slurSide(stemDirections)`** — the whole-span rule: every direction
  `'up'` -> `'below'`; anything else (all down, or a mix) -> `'above'`.
  This is a genuinely different *shape* of rule from a tie's per-note
  flip (`§9.15`) — a slur commits to one side for its entire length, the
  same way a beam commits to one shared direction for its whole group
  (`§9.13`), just via a different test ("are they all up?" rather than
  "which is furthest from the middle line?"). Throws on an empty span
  rather than guessing a side for nothing.
- **`computeSlurShape(startX, endX, y, side)`** — structurally identical
  to Phase 26's `TieShape` (both render via the same tapered-lens Bézier
  primitive), kept as its own type/function because a slur and a tie
  remain different musical concepts even where the geometry coincides.
  Unlike a tie (always exactly 2 same-pitch notes close together), a
  slur's `startX`/`endX` can span an arbitrary distance across many notes
  of different pitches — confirmed by a test spanning 100 units, not just
  the small tie-like distances.

**`src/render/slur.ts`** — **`renderSlur`** is the identical drawing
technique as `renderTie` (two quadratic Béziers sharing the same two
endpoints, tapering from `bulgeHeight ∓ midpointThickness/2`) — kept as a
separate function rather than shared code, the same "different concept,
coincidentally same geometry" reasoning as the type above.

## 2. How this was verified

Ran `npm run verify` clean, 247/247 (10 new tests). Every named case from
`§9.16`: all-up -> below, all-down -> above, a genuine mix -> above
(proving the tie-break, not just the two pure cases), a single-note span
still resolves correctly (the all-up check applies trivially), and the
empty-span throw. Plus the shape/render tests mirroring Phase 26's own
verification style: the rendered path's actual control-point Y values
checked directly for the correct sign on both sides, and a wide span
(100 units) confirming this isn't silently limited to tie-like short
distances.

## 3. Known limitations (stated, not silently missing)

- **Not wired into `renderFromMusicXml` at all.** `<slur>` parsing is
  `§10.4` (v2) scope from Phase 20's own architecture — this phase
  supplies the geometry so that wiring, whenever the v2 parser lands, is
  a straightforward integration rather than a from-scratch design
  exercise.
- **Intermediate notes under the slur are not checked for clearance.**
  The curve only anchors to the span's first and last note; a real
  engraving refinement would ensure the arc visually clears every note in
  between, matching the same scope Phase 24's beam-curve style already
  accepted.

## 4. How to modify it

- **Change the bulge height** — `SLUR_BULGE_HEIGHT` in `geometry/slur.ts`.
- **Wire in real parsing** — once Phase 35/36's v2 parser produces slur
  start/stop data, thread it through `renderFromMusicXml` the same way
  Phase 26 threads tie data, using `slurSide` on the resolved directions
  of every note in the span.

## 5. How to revert/remove it

Delete `src/geometry/slur.ts`, `src/render/slur.ts`, and
`test/unit/slur.test.js`; remove their `export * from` lines from the
geometry/render barrels. Nothing in `render-from-musicxml.ts` references
slurs, so no wiring needs to be undone there.
