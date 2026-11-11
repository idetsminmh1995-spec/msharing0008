# Phase 24 — Beam Geometry

**Status:** complete (213/213 tests pass). Found and fixed a **real
rendering bug** in this phase's own work before committing: secondary
beams were computed to visually overlap each other — see §2.

## 1. What was written

**`PLAN.md` §9.13** — the specification, researched before implementing
(the same verify-first approach every `§9.X` subsection follows). Its two
most useful findings:

- **No single universal beam-slope rule exists**, and every source
  consulted says so explicitly. Two independent sources gave concrete
  numeric ranges that agree with each other: Dorico's own development blog
  (0.25sp for a second up to 1.5sp for a seventh or larger) and a general
  engraving summary (0.5sp for short beams, 1.25–1.75sp for larger
  intervals). This engine picks **one moderate explicit value, 1.0sp
  maximum total vertical change**, sitting inside that whole cited range
  rather than trying to reproduce any one publisher's exact curve.
- **An independent cross-check of §9.8's stem length.** The same engraving
  summary states unbeamed stems are "always the span of an octave (3.5sp),
  pretty much without exception" — confirming Phase 16's
  `DEFAULT_STEM_LENGTH = 3.5` from a completely different source than the
  one originally used for it.

**`src/geometry/beam-shape.ts`**:
- **`beamDirection(notePositions, middleLineY)`** — reuses Phase 16's
  `chordStemDirection` across the group's positions, on the reasoning that
  a beam group isn't musically different from a chord *for this specific
  decision*, just spread across time rather than simultaneous.
- **`computeBeamShape(positions, xs, direction, style, stemLength)`** —
  the two endpoints:
  - **`flat`**: both ends at the SAME Y — whichever natural (unbeamed,
    3.5sp) stem tip is most extreme in the stem's own direction across the
    whole group, so every stem only ever *extends*, never shortens below
    its natural length.
  - **`straight`**: each end starts at its own note's natural stem tip,
    then the difference between them is clamped to ±`MAX_BEAM_SLOPE`
    (1.0sp), keeping the first endpoint fixed and scaling only the far
    one.
  - **`curved`**: *identical* endpoint geometry to `straight` — the
    difference is purely how `render/beam.ts` draws between those two
    points. No source describes "curved beams" as real engraving practice,
    so it exists as a config-selectable visual variant this engine offers,
    not a convention requiring its own verification.
- **`beamYAtX(shape, x)`** — linear interpolation along the beam, which is
  how each individual note's stem finds where to actually end once the
  group's slope is known (a beamed group's stems all terminate *on* the
  beam by definition, not at their own natural lengths).
- **`numBeamLines(durationType)`** — 1 for eighth up to 8 for 1024th, the
  same count Phase 17's flag glyphs already use, since a beam is visually
  "the flags joined together." Throws for a never-beamed duration.

**`src/render/beam.ts`** — **`renderBeam(shape, options)`** draws every
parallel line, stacking secondaries toward the notehead, and emits a
quadratic-Bézier `<path>` instead of a `<line>` for `curved` style.

**`src/render-from-musicxml.ts`** — beams are now wired end to end: Phase
23's `groupBeams` decides the groups, this phase's shape math positions
them, each grouped note's stem is individually re-drawn to meet the beam
at its own X (via `beamYAtX`), and `needsFlag(type, true)` correctly
suppresses those notes' individual flags. This is the integration Phase 23
deliberately deferred *because* drawing nothing in a flag's place would
have been worse than leaving the flags alone.

**Fixtures:** `beamed-eighths.musicxml`, `mixed-duration-beam.musicxml`.

## 2. A real rendering bug found and fixed

`renderBeam` stacked successive beam lines by `spacing` alone — i.e. it
treated Bravura's `beamSpacing` (0.25sp) as the **centre-to-centre**
distance between parallel beams. It isn't.

The SMuFL specification defines `beamSpacing` as *"the distance between
the inner edge of the primary and outer edge of subsequent secondary
beams"* — the **gap** between two beams, not their centre separation. With
`beamThickness` = 0.5, that makes the correct centre-to-centre step
`thickness + spacing` = **0.75sp**. MuseScore 4's own engraving notes
independently confirm exactly this number: *"the distance from one beam to
the next must be either 0.75sp (regular) or 1sp (wide)."*

Using 0.25 as the centre step would have drawn each secondary beam
**overlapping the primary by half its own thickness** — two 16th-note
beams would have visually merged into one thick smear.

Worse, **the existing test encoded the bug rather than catching it**: it
asserted the second beam sat at `y=-3.25` (0.25 below the primary at
`-3.5`), which is precisely the wrong value. Fixed all three places: the
render code, the plan's description of the metric, and the test — which
now asserts the correct `-2.75`, explicitly asserts the buggy `-3.25` is
**absent**, and adds an independent structural check that the two beam
centres are at least one thickness apart (so the same class of bug can't
return under a different arithmetic mistake).

## 3. How this was verified

`npm run verify` clean, 213/213. All five of §9.13's named test cases
exist, plus seven more:
- `flat` produces zero slope with both ends at the extreme natural tip.
- `straight` with a small interval keeps its natural unclamped slope.
- `straight` with a large interval clamps to exactly 1.0sp — **and** a
  separate test confirms a *downward*-sloping beam clamps in the correct
  (opposite-signed) direction, not just the upward case.
- `curved` has exactly the same endpoints as `straight`.
- Secondary beam centres are 0.75sp apart, with the overlap case
  explicitly asserted absent (see §2).
- `numBeamLines` matches the flag count for every beamable duration and
  throws for non-beamable ones; `computeBeamShape` throws on an empty
  group; `beamYAtX` interpolates linearly; `renderBeam` emits `<line>` for
  straight/flat and `<path>` for curved.

End-to-end against the real `beamed-eighths.musicxml` fixture: 8 eighth
notes in 4/4 produce **0 individual flag glyphs** (all suppressed) and
**4 beam lines** — exactly matching Phase 23's beat-based grouping (four
groups of 2 in 4/4). A visual snapshot of that full render is now part of
the regression suite.

## 4. Known limitations (documented, not gaps)

- **Mixed-duration groups use one uniform beam-line count** for the whole
  group rather than a shorter secondary beam spanning only the
  finer-duration subset. Real sub-beaming is a future refinement.
- **No "white triangle" avoidance** (nudging a slope so it doesn't cut
  awkwardly across staff lines) and **no inner-note slope adjustment** —
  only the first and last notes determine the slope. Both are advanced
  engraving refinements.
- **The 1.0sp slope cap is one chosen value**, not an interval-dependent
  table; refining it is reasonable future work, explicitly noted in §9.13.

## 5. How to modify it

- **Change the slope cap** — `MAX_BEAM_SLOPE` in `beam-shape.ts`.
- **Change the curve amount for `curved` style** — the `bow` constant in
  `render/beam.ts`.
- **Add a fourth beam style** — a new value in `config.beam.style`'s union
  plus one branch in `renderBeam`; the endpoint geometry is shared, which
  is exactly what `PLAN.md` §18.5's extensibility table predicts ("one new
  branch in the beam draw function; geometry is shared").

## 6. How to revert/remove it

Delete `src/geometry/beam-shape.ts`, `src/render/beam.ts`,
`test/unit/beam-shape.test.js`, the two beam fixtures, and the
`render-from-musicxml-beamed.snap` file; remove their `export * from`
lines from the geometry/render barrels; remove the beam wiring from
`src/render-from-musicxml.ts` (reverting grouped notes to individual
flags); and remove the added test case from `test/visual/rendering.test.js`.
