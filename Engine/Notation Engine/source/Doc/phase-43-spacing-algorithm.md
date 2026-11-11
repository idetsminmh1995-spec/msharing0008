# Phase 43 — Horizontal Spacing Algorithm

**Status:** the full `§14` algorithm is built and tested against every
requirement `§14` itself names. 486/486 tests pass at the time this
phase was built. **Wired into `renderFromMusicXml` by Integration Pass
E** — see `Doc/integration-e-spacing-wiring.md` for the wiring itself,
the real bug it found and fixed (chord events silently excluded from
spacing), and its own stated limitations (approximate note widths, no
justification without Phase 46's page breaking).

Starts Stage 8 (Real layout), replacing Phase 21's deliberately naive,
fixed-width measure layout — whose own docstring already said plainly
"Phase 21 exists to be thrown away; do not over-build it."

## 0. Scope, per §14's own framing

`§14`'s responsibility: decide the x-position of every event in a
measure, and the measure's total width. Pure math — produces numbers,
not SVG, and (per `§4.1`'s own dependency table) takes no dependency on
`render/` or `geometry/`.

## 1. What was built

**`config/config.ts`** — new `SpacingConfig` section:
`spacingIncrement` (1.2sp) and `shortestDurationSpace` (2.0) are `§14`'s
own published constants — LilyPond's, used as this engine's defaults
since they're the product of decades of real engraving practice, not
invented here. `minNoteDistance` (0.5sp) is a reasonable default chosen
the same way every other small-gap constant in this codebase already
was (Integration C's tab mask padding, Phase 24's beam bulge, etc.) —
real, but not itself derived from one universal source, and fully
overridable for exactly that reason. `justify` (true) matches `§14.3`'s
own default behavior.

**`layout/spacing-diagnostic.ts`** — `SpacingDiagnostic`/
`spacingDiagnostic`, the same independent-per-module diagnostic shape
every other module in this codebase already uses.

**`layout/spacing.ts`**:
- `computeReferenceDuration` — `§14.1`'s own rule: "the most frequently
  occurring shortest duration per measure, **not** the globally
  shortest note." Implemented as grouping by exact tick length, ranking
  by frequency, and breaking a genuine frequency tie toward the shorter
  duration — "shortest" is the tie-break qualifier, not a separate
  ranking axis. Falls back to one quarter note for an empty measure,
  since a reference of `0` would make every later ratio undefined.
- `computeEventSpace` — the duration-proportional space a note gets,
  confirmed against `§14`'s own worked example (8th -> 2.4sp,
  quarter -> 3.6sp, half -> 4.8sp): doubling the duration adds exactly
  one `spacingIncrement`, a **logarithmic** relationship for durations
  at or above the reference. Durations *shorter* than the reference
  instead scale **linearly** by their own ratio -- `§14.1` states this as
  a genuinely separate rule for that case, not the same log curve run
  backward, and the implementation keeps that distinction rather than
  smoothing it into one formula.
- `computeProportionalPositions` -- `§14.1` alone: the running sum of
  every earlier event's own space.
- `applyMinimumDistance` -- `§14.2`'s second pass: for each adjacent
  pair, enforces a real minimum gap (the left element's own full
  rendered width plus `minNoteDistance`). Where the minimum wins, every
  position from that point on is pushed forward -- a **cascading** push,
  not a local fix, since fixing only the first affected gap would leave
  the next one too small again.
- `justifySystem` -- `§14.3`'s stretch-to-width pass: added space is
  distributed proportionally to each gap's own natural size ("each
  spring's flexibility"), so an already-wide gap absorbs proportionally
  more of the stretch than a narrow one. Deliberately has **no opinion**
  on *when* to skip stretching (`§14.3`'s "the final system is not
  stretched" is a policy for whichever caller groups events into
  systems -- `§16`, not yet built -- to apply); this function is a pure
  stretch-to-width operation, and `config.justify === false` disables it
  outright.
- `checkMeasureOverflow` -- `§14`'s own stated error condition: a measure
  wider than the available width even after the minimum-distance pass.
  Returns a warning and **never modifies the positions** -- the overflow
  is allowed to stand, with breaking the system earlier left to `§16`.

## 2. How this was verified

Ran `npm run verify` clean, **486/486** (18 new tests). Every test
`§14` itself names:
- **Reference-duration selection given a mixed-rhythm measure with one
  stray 32nd** -- confirmed the 32nd does *not* become the reference
  despite being the shortest note present; a genuine frequency tie
  confirmed to break toward the shorter duration specifically (not
  arbitrarily); an empty measure confirmed to fall back to one quarter
  note rather than a nonsensical `0`.
- **Ratio assertions** -- the quarter-vs-8th case checked against the
  *exact* numeric values `§14` itself worked out (2.4sp and 3.6sp, not
  just "quarter > eighth"), plus the half-note case (4.8sp, two
  increments) and a shorter-than-reference duration's linear scaling.
- **The minimum-distance pass kicking in for a wide chord** -- a
  deliberately oversized `renderedWidth` confirmed to push the following
  position past what proportional spacing alone would give, checked
  against the exact expected value (width + `minNoteDistance`); a
  narrow event confirmed to trigger *no* push at all; and a 3-event case
  confirming the push genuinely **cascades** (every gap checked, not
  just the first).
- **Justification summing exactly to the target width** -- checked to the
  literal target value, not merely "wider than before"; a wider gap
  confirmed to absorb proportionally more stretch than a narrow one
  (numerically, not just directionally); `justify: false` confirmed to
  disable stretching entirely; and a target narrower than the natural
  width confirmed to never compress anything.
- The overflow diagnostic confirmed both for the fitting case (no
  diagnostic) and the genuinely-overflowing case (a warning with the
  right code, never a throw).

Also extended Phase 38's dynamic diagnostic-coverage checker to scan
`layout/` too -- no gaps found.

## 3. Update: now wired (Integration Pass E)

The reasoning below explains why wiring was deliberately deferred when
this phase was first built. It has since been done — see
`Doc/integration-e-spacing-wiring.md`. In the end the "genuinely
different rendering architecture" concern was resolved with a lighter
touch than expected: rather than a full two-pass render with exact
glyph widths known ahead of drawing, a single pre-pass per measure
estimates each event's width well enough for `§14.2`'s minimum-distance
pass, computes the real position map once, and the existing single-pass
draw loop looks positions up from it. The original concern about
rushing this (Integration D's own regression is cited below) proved
well-founded in a smaller way: wiring this in surfaced a real bug (chord
events excluded from the position map), caught by testing before it
shipped.

Original reasoning, kept for the record:

Wiring this properly would require a genuinely different rendering
architecture than the one every phase since Phase 21 has built on: every
event's own `renderedWidth` (notehead + accidentals + dots + any
horizontally-extending articulation) must be known **before** spacing
can be computed, meaning a real two-pass render -- measure first, draw
second -- rather than the current single-pass "compute position and draw
in the same step" loop. That is a genuinely larger integration than any
single Integration Pass (A-D) attempted, and rushing it risks the same
class of regression Integration D's own `<direction>` branch already
demonstrated once this session. Building the algorithm fully and
correctly first, the same way Phase 29's grand-staff geometry was built
before Integration A wired it deliberately, is the safer order.

## 4. How to modify it

- **Wire it in** -- the real next step: give `render-from-musicxml.ts` a
  first pass that computes each event's `renderedWidth` from its already
  -selected notehead/accidental/dot/articulation glyphs (most of this
  width math already exists piecemeal across `glyphWidthOf` and similar
  helpers scattered through the file), then replace `naiveMeasureLayout`
  with `computeReferenceDuration` -> `computeProportionalPositions` ->
  `applyMinimumDistance` -> (optionally) `justifySystem`.
- **Tune the constants** -- `config.spacing.*`; all four fields are
  overridable per `§14`'s own design intent.

## 5. How to revert

Delete `src/layout/spacing.ts` and `src/layout/spacing-diagnostic.ts`,
remove their `export * from` lines from `src/layout/index.ts`, revert
`config.ts`'s `SpacingConfig`/`EngineConfig`/`DEFAULT_CONFIG`/
`resolveConfig` additions, delete `test/unit/spacing.test.js`, and
revert the `SRC_DIRS`/coverage-scan changes in
`test/unit/diagnostics-hardening.test.js` back to not scanning
`layout/`.
