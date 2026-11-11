# Phase 16 — Stems

**Status:** complete and verified (124/124 tests pass, including a visual
snapshot whose 4 stems were hand-checked against the formula line by line).
Caught and fixed the same `-0` bug Phase 9 already found once, in a new
function this time.

## 1. What was written

**`src/geometry/stem.ts`**:
- **`middleLineY(numLines)`** — the middle line's Y for any staff line
  count (e.g. −2 for standard 5-line).
- **`automaticStemDirection(position, middleLineY)`** — §9.8's rule: above
  the middle line (more negative Y) → down; on or below → up.
- **`chordStemDirection(positions, middleLineY)`** — for multiple
  simultaneous notes sharing one stem, the direction is decided by
  whichever note is **furthest** from the middle line, not the first,
  last, or an average.
- **`resolveStemDirection(input)`** — the full 3-tier priority chain:
  1. `forcedDirection` (config/parser per-voice forced direction — what
     makes the drum hand/foot split work: hands always up, feet always
     down, regardless of actual pitch);
  2. `explicitDirection` (an XML `<stem>` element for this note);
  3. automatic, via `chordStemDirection`.
- **`computeStemLength(notePosition, middleLineY)`** — default `3.5`sp,
  extended so the stem's far end reaches at least the middle line for a
  note far outside the staff, with an explicit (currently redundant, kept
  for a future shortening phase) floor at `2.5`.

**`src/render/stem.ts`**:
- **`renderStem(options)`** — attaches at the notehead's **real** Bravura
  anchor (`stemUpSE` for up, `stemDownNW` for down — not a bounding-box
  corner), flipping the anchor's Y-up font-design-space sign to this
  engine's Y-down convention, the same flip Phase 6/9's original demo
  already established. Throws if the given notehead glyph has no such
  anchor (most SMuFL glyphs don't have anchors at all; noteheads
  generally do).

## 2. A real bug caught again — same shape as Phase 9's

`middleLineY(1)` computed `-(1-1)/2`, which is `-(0)/2` — JavaScript's
**−0**, not a clean `0`. This is the exact same class of bug Phase 9's
`computeStaffGeometry` hit (unary negation of zero), now appearing in a
brand-new function that happened to have the same `-(n-1)` shape. Fixed
the same way: `0 - (numLines - 1) / 2` instead of `-(numLines - 1) / 2`.
Caught immediately by the test suite (`middleLineY(1)` expected `0`, got
`-0`), not discovered later — Phase 8's harness doing its job a second
time on an unrelated module.

## 3. How this was verified

Ran `npm run verify` clean, 124/124. The plan's own four named tests:
- **Direction for a note above/below/on the middle line** — top line
  (above) → down; bottom line (below) → up; exactly on the middle line →
  up (the "on" case explicitly called out in §9.8's wording).
- **Forced direction overriding automatic** — confirmed forced direction
  wins even when an explicit XML direction is *also* present and
  disagrees, proving the priority order, not just that forced direction
  works in isolation.
- **Anchor-derived x matching the glyph metadata** — verified directly
  against the rendered snapshot's raw coordinates (see below), not just
  that a plausible-looking number came out.
- **A chord's direction decided by its outermost note** — specifically
  with the outermost note listed *second* in the input array, to prove
  the function doesn't just pick the first or last entry.

A visual snapshot renders 4 stems and every one was hand-verified against
the formula: a top-line note (automatic down, length 3.5, attached at
`stemDownNW`'s real `[0,-0.168]` offset), a bottom-line note (automatic
up, `stemUpSE`'s `[1.18,0.168]`), and a forced-direction pair at the
*same* staff position (−1) with opposite directions — confirming the
drum hand/foot use case works even when both notes would otherwise get
the same automatic direction.

## 4. How to modify it

- **Chord stems spanning multiple noteheads** (the stem line itself
  running from the nearest to the farthest notehead in a chord, not just
  one notehead) — not implemented; `computeStemLength`/`renderStem`
  assume a single notehead. Extending to real multi-notehead chords is
  natural work for Phase 25 (multi-voice/chord layout), which will have
  the actual chord-formatting context this phase doesn't.
- **A future stem-shortening rule** (e.g. beam-slant adjustment in Phase
  24) — clamp its result with `Math.max(result, MIN_STEM_LENGTH)`-style
  logic against this file's existing 2.5 floor, don't introduce a second
  floor value elsewhere.

## 5. How to revert/remove it

Delete `src/geometry/stem.ts`, `src/render/stem.ts`,
`test/unit/stem.test.js`, and the `stem-direction-variants.snap` file;
remove their `export * from` lines from `src/geometry/index.ts` and
`src/render/index.ts`; remove the added test case from
`test/visual/rendering.test.js`.
