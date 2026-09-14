# Phase 44 — Skyline Collision Avoidance

**Status:** the full `§15` algorithm is built and tested against every
requirement `§15` itself names. 505/505 tests pass. **Not wired into
rendering** — same reasoning as Phase 43: this is the algorithm, and
wiring it into `renderFromMusicXml` is a larger, separately-scoped
integration.

Continues Stage 8 (Real layout), following Phase 43's spacing algorithm.

## 0. A note on how this phase started

This phase's core implementation (`layout/skyline.ts`,
`layout/skyline-placement.ts`) was found already written but uncommitted
and untested at the start of this pass — leftover work from an earlier,
interrupted session. Rather than discard well-reasoned existing code and
redo it from scratch, it was reviewed, exported, and then verified with
real tests written against `§15`'s own test list. That verification
surfaced a genuine bug in the inherited `computeStaffDistance` (§2
below) — exactly the value of writing the tests before assuming
inherited code is correct.

## 1. Scope, per §15's own framing

`§15`'s responsibility: prevent overlaps VERTICALLY, between a staff's
own contents and everything placed above/below it (dynamics, lyrics,
chord symbols, articulations, tempo marks, bar numbers), and between
adjacent staves in a system. `§15.3` explicitly excludes horizontal
collision (accidental stacking, multi-voice notehead offsetting) —
those are other modules' jobs. `§15`'s own stated error conditions:
**none** — "worst case the skyline pushes an element further than
looks ideal," so unlike every other module built this session, no new
diagnostic type was needed here.

## 2. What was built (and one bug fixed)

**`layout/skyline.ts`** — `Skyline`/`SkylineSegment`/`emptySkyline`:
each skyline belongs to one `side` (`'north'` or `'south'`), storing
segments as absolute-frame `y` values matching this engine's own
established convention (confirmed empirically in Integration A: smaller/
more-negative `y` is higher up, and that holds across a whole system of
stacked staves, not just within one). `addToSkyline` merges a new
shape's bounding segment in via a sweep over every critical x-boundary,
correctly splitting an existing segment when the new shape only
partially overlaps it, keeping the "more extreme" value per side.
`minDistance` — the smallest gap between two skylines already expressed
in the *same* coordinate frame (two marks placed above the *same*
staff, say).

**`layout/skyline-placement.ts`** — `placeElement`: `§15.1`'s
placement procedure, steps 2–4 (step 1, computing an element's own
default offset for its type, is the caller's job — it depends on the
element category in a way this generic function shouldn't know about).
`alignedGroupY` — `§15.2`'s alignment groups: after independently
placing every member, the whole group takes the single most-extreme
member's own position.

**A real bug found and fixed**: `computeStaffDistance` originally called
`minDistance` directly on `upperSouth` and `lowerNorth`. Working through
a concrete numeric example while writing its test showed this cannot be
correct — `upperSouth`'s and `lowerNorth`'s `y` values are each
expressed relative to *their own* staff (a distance below upper's
bottom line; a distance above lower's top line), and the actual
distance *between* those two staves is exactly the unknown quantity
this function exists to compute. Calling `minDistance` on them as
though they already shared one frame makes the result depend on an
arbitrary, meaningless choice of reference point -- verified directly:
under the original formula, the required test case ("distance growing
when the upper staff has low-hanging content") could never pass, since
the result could never exceed the configured floor no matter how much
content either skyline had.

**Fixed** by giving `computeStaffDistance` its own calculation,
independent of `minDistance`: at every x where both skylines have
content, the two staves must be at least `upperSouth's own downward
reach + lowerNorth's own upward reach` apart to avoid overlap there; the
required distance is the **maximum** of that sum across every such x
(the single tightest point governs, since staff distance is one shared
number for the whole system). Both functions' docstrings now say
explicitly which coordinate convention each expects, and why they
differ, so a future caller doesn't repeat the same mistake.

## 3. How this was verified

Ran `npm run verify` clean, **505/505** (19 new tests). Every case
`§15` itself names:
- **Two elements at the same x -> the second is pushed clear** — checked
  against the exact expected pushed position (previous position minus
  padding), not just "somewhere further out."
- **Non-overlapping x-ranges -> no push** — confirmed a disjoint
  placement gets its own unmodified default position.
- **A lyric line staying aligned when one syllable needed extra room** --
  a real 3-syllable scenario where a pre-existing obstacle forces the
  middle syllable alone to be pushed, then confirmed the whole group's
  shared position is that syllable's own (most extreme) value, checked
  against the exact expected pushed y.
- **Staff distance growing when the upper staff has low-hanging
  content** — checked both the "small content, floor wins" case and
  the "large content, computed distance wins" case against their exact
  numeric results (2 vs. 7, not just "grew").
- Additional coverage beyond the stated list: `addToSkyline`'s
  partial-overlap splitting; both north's and south's own "more
  extreme" direction; `minDistance`'s smallest-gap-among-several
  behavior; the tightest-x-position governing staff distance even when
  other x-positions need less; and `alignedGroupY` throwing rather than
  returning a meaningless value for an empty group.

## 4. Known limitation: not wired into rendering

Same reasoning as Phase 43: wiring the skyline into
`render-from-musicxml.ts` would mean tracking a running skyline per
staff across the whole render pass (dynamics, articulations, lyrics,
tempo marks, and inter-staff distance all need to consult and update
it), which only makes sense once Phase 43's own spacing is wired in
first — the two naturally belong to the same larger integration effort.

## 5. How to modify it

- **Wire it in** — once Phase 43's spacing is wired, thread a running
  `Skyline` per staff side through the render loop, calling
  `placeElement` wherever an above/below-staff mark is currently placed
  at a hardcoded offset, and `computeStaffDistance` wherever staff
  vertical positions are currently computed from `config.staves` alone.
- **Tune the floor** — `config.staves.minStaffDistance`.

## 6. How to revert

Delete `src/layout/skyline.ts` and `src/layout/skyline-placement.ts`,
remove their `export * from` lines from `src/layout/index.ts`, revert
`config.ts`'s `StavesConfig`/`EngineConfig`/`DEFAULT_CONFIG`/
`resolveConfig` additions, and delete `test/unit/skyline.test.js`.
