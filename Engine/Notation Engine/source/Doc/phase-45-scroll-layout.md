# Phase 45 — Scroll Layout Mode

**Status:** complete and wired into rendering. 525/525 tests pass.
`layout/scroll.ts`'s `computeScrollLayout` now formally implements
`§16.1`, and `render-from-musicxml.ts` calls it directly, replacing an
unnamed inline cumulative-x loop with the same math under a proper,
independently-tested name.

Continues Stage 8 (Real layout), following Phase 43 (spacing) and
Phase 44 (skyline) and their own Integration Passes E/F.

## 0. Scope, per §16.1's own framing

`§16.1`'s entire definition: "One unbroken system, arbitrarily wide.
Measures are laid out left to right at their natural (unjustified)
widths. This is the mode a video/cursor use case wants."

Checking what `render-from-musicxml.ts` already did (before touching
anything) found it was **already exactly this** -- Integration Pass E's
own wiring of Phase 43's spacing produces precisely one long row of
measures at their real, unjustified widths, with `justifySystem`
deliberately unused (per that pass's own stated limitation, since there
was no target width to justify to without page/system breaking). Phase
45's job wasn't to build new layout behavior from scratch, but to give
this existing behavior its own name, its own module, and its own tests
-- separating "what scroll mode does" from "an inline loop that happens
to do it," which matters once `§16.2`'s page mode (Phase 46) exists as a
genuinely different, selectable alternative producing multiple justified
systems instead of one unbroken one.

## 1. What was built

**`layout/scroll.ts`** -- `computeScrollLayout`: given every measure's
own already-computed width (from Phase 43's `computeMeasureLayout`),
places each one left to right starting at x=0, summing to a `totalWidth`
with no artificial cap. Never stretches a width (no justification --
there is no "system width" to justify to when the system is exactly as
wide as its own content makes it) and never limits how many measures it
accepts or how wide the result becomes.

**`render-from-musicxml.ts`** -- the render loop's own inline
`cumulativeX`/`layouts.push(...)` loop (added during Integration Pass E,
computing the same thing without a name) now builds a plain list of
`{ measureNumber, width }` and calls `computeScrollLayout` directly,
using its returned `measures` in place of the old locally-built array.

## 2. How this was verified

Ran `npm run verify` clean, **525/525** (8 new tests). The refactor
itself first: extracting the inline loop into `computeScrollLayout` and
wiring it in produced **zero test or snapshot changes** -- the exact
same 517 tests that passed before this phase still passed afterward,
confirming the extraction changed nothing about the actual output, only
its structure.

New tests cover `§16.1`'s own definition directly: measures placed left
to right, each starting exactly where the previous one ends; every
measure keeping its own given width in score order, never reordered;
`totalWidth` exactly equal to the sum of every measure's width; **no
justification** -- two measures with genuinely different widths (6 vs.
40) both kept exactly as given, never stretched to match each other;
**arbitrarily wide** -- 200 measures producing one single, strictly
increasing row, never wrapped or split; the empty-score and
single-measure edge cases. A final end-to-end test confirms the real
renderer's output for a genuine 2-measure file with different content in
each measure produces two genuinely different measure widths (proving
neither was justified to match the other) in the actual rendered SVG,
not just in the isolated module.

## 3. Known limitations (stated, not silently missing)

- **No selectable "mode" concept yet.** `render-from-musicxml.ts` always
  uses scroll layout; there is no config or option to request page mode
  instead, since page mode (`§16.2`, Phase 46) doesn't exist yet. Once it
  does, choosing between the two becomes a real decision this module
  doesn't yet need to make.
- **No vertical (multi-system) stacking within one render.** Scroll mode
  is explicitly one row; a piece long enough to need multiple visual rows
  on a real page is exactly what page mode is for, not this.

## 4. How to modify it

- **Add page mode alongside it** -- `§16.2`, Phase 46: pack measures into
  systems until the next one would overflow the usable width, justify
  each completed system via Phase 43's `justifySystem`, then pack
  systems onto pages.
- **A mode-selection entry point** -- once page mode exists, something
  needs to choose between `computeScrollLayout` and the future page-mode
  equivalent; `RenderFromMusicXmlOptions` is the natural place, following
  the same reasoning already noted for threading a real `EngineConfig`
  through that function.

## 5. How to revert

Delete `src/layout/scroll.ts`, remove its `export * from` line from
`src/layout/index.ts`, revert `render-from-musicxml.ts`'s
`computeScrollLayout` call back to the inline `cumulativeX` loop, and
delete `test/unit/scroll-layout.test.js`.
