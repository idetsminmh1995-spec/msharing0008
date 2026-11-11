# Integration Pass F — Wiring Phase 44's skyline into grand-staff distance

**Status:** complete. 517/517 tests pass. `renderFromMusicXml` now
computes the real, content-aware distance between a grand staff's two
staves using `§15`'s skyline, replacing the fixed default gap Phase 29
used everywhere.

**Not a numbered plan phase** — a wiring/integration pass, continuing
directly from Integration Pass E (which wired Phase 43's spacing).
Follows the user's own request to finish Phase 44's remaining work.

## 0. What changed, and why this specific piece first

Phase 44 built the full `§15` skyline algorithm but wired none of it in.
Surveying what the renderer actually draws above/below a staff today
found there isn't much yet -- dynamics, lyrics, and chord symbols are
still geometry-only from Phases 30-33, never wired into
`render-from-musicxml.ts`. The one concrete, high-value, already-real
use of the skyline machinery is **grand-staff distance**: Phase
29/Integration A's own docstring already named this exact gap as "fixed
defaults, not content-aware -- `§15`'s skyline... is what would make
this respect actual content extents." That's the piece this pass wires.

## 1. What was built

**`layout/system.ts`** -- new `computeSystemLayoutVariableGaps`, additive
alongside the existing `computeSystemLayout` (left completely
untouched, so every existing caller -- including its own tests -- is
unaffected). Takes a callback supplying the gap for each specific staff
pair within a part, instead of one gap applied everywhere. Verified
directly that a uniform callback reproduces `computeSystemLayout`'s own
output exactly, and that widening one specific pair's gap leaves every
other gap at its own default.

**`worstCaseStaffExtent`** (new, in `render-from-musicxml.ts`): for a
given staff, scans every note (including chord members, and unpitched
notes' own display position) across the whole part and returns the
single highest or lowest position reached, expressed as a non-negative
extent away from that staff's own edge -- exactly the shape a `Skyline`
segment needs. Uses only the first measure's clef for that staff, a
stated approximation for the rare case of a mid-piece clef change on
one staff of a grand staff.

**`staffDistanceForPair`** (new): builds a one-segment skyline from each
staff's own worst-case extent and calls Phase 44's `computeStaffDistance`
to get the real required gap for that specific pair, replacing a flat
constant with the actual `§15` formula (`upperExtent + lowerExtent`,
floored at the configured default).

## 2. A wrong turn corrected: distinguishing "staff gap" from "visual blank space"

While checking the first rendered result, an 8-unit expected gap
appeared as 4 in the output -- initially treated as a bug. It wasn't:
`staffGap` in this codebase's own convention is the distance between two
staves' **bottom-line reference points**, not the blank space between
them (which is `staffGap - staffHeight`, since the staff itself occupies
some of that span). Confirmed by tracing the actual computed extents
(both genuinely `0` for that fixture) and checking
`computeStaffDistance`'s own return value directly in isolation (`8`,
correct) before concluding the *renderer's* output was in fact right
and the *test expectation* had been wrong. A second, unrelated bug (a
duplicated variable declaration, left over from an earlier edit that
didn't fully apply) was caught by the build itself and fixed.

## 3. How this was verified

Ran `npm run verify` clean, **517/517** (3 new `system.test.js` tests +
3 new end-to-end tests + 1 visual snapshot). Built a dedicated fixture
(`piano-crossing-hands.musicxml`) with genuinely extreme content -- treble
playing C2 (8 units below its own staff) and bass playing C6 (8 units
above its own staff) -- chosen by first computing the real
`staffPositionForPitch` values needed to exceed the 8-unit default gap,
not guessed. Confirmed against the fixture's own real rendered
coordinates, not synthetic skylines:
- **Ordinary content** (the existing `piano-grand-staff.musicxml`) keeps
  the exact 8-unit default -- nothing in that file reaches far enough to
  need more.
- **The crossing-hands fixture genuinely grows the gap to 16** -- the
  exact value `computeStaffDistance`'s own formula predicts (8 + 8),
  checked to that precise number, not just "grew."
- A single-staff file is completely unaffected (no staff pair exists to
  query at all).

## 4. Known limitations (stated, not silently missing)

- **Only within-part (grand-staff) gaps are content-aware.** Between
  different parts (a piano part followed by a separate vocal part,
  say), the gap is still Phase 29's flat `DEFAULT_PART_GAP` -- extending
  this to inter-part distance is the same idea, not yet done.
- **Worst-case, not per-x-position.** A single segment spanning the
  whole part's width is used, rather than tracking exactly where along
  the staff the extreme note falls -- correct and safe (never
  under-estimates), but doesn't let the gap narrow again for the parts
  of a system where the content isn't actually extreme.
- **Stems/beams aren't added on top of a note's own position.** A very
  tall stem could, in principle, reach slightly further than a bare
  notehead position accounts for -- the same class of approximation
  Integration E's note-width estimate already accepted for horizontal
  spacing.
- **Dynamics, lyrics, articulations, chord symbols, and tempo marks
  still don't consult the skyline at all** -- they either aren't wired
  into rendering yet (Phases 30-33) or (tempo marks, Integration D) use
  their own fixed placement. This pass covers exactly the one piece
  named in §0, not the skyline's full intended scope.

## 5. How to modify it

- **Inter-part gaps** -- the same `computeStaffDistance` call, applied to
  the last staff of one part and the first staff of the next, instead
  of only within a part.
- **Wire in the remaining above/below-staff element types** once they're
  drawn at all -- each would call `placeElement` against a running
  per-staff `Skyline`, threaded through the render loop across a whole
  system rather than recomputed from scratch per pair as this pass does.

## 6. How to revert

Revert `render-from-musicxml.ts`'s `worstCaseStaffExtent`/
`staffDistanceForPair` and the `computeSystemLayoutVariableGaps` call
(restoring the plain `computeSystemLayout(partStaffCounts)`); revert its
skyline-related imports. Revert `layout/system.ts`'s
`computeSystemLayoutVariableGaps` addition. Delete
`test/unit/skyline-wiring.test.js`,
`test/fixtures/musicxml/piano-crossing-hands.musicxml`, and its
snapshot; revert the 3 added tests in `system.test.js`.
