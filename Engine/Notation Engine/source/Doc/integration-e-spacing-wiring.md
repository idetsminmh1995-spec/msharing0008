# Integration Pass E — Wiring Phase 43 (spacing) + Phase 44 (skyline) into rendering

**Status:** complete. 510/510 tests pass. `renderFromMusicXml` now uses
real, content-driven horizontal spacing for every measure, replacing
Phase 21's fixed-width layout entirely. Phase 44's skyline is not yet
consumed (see §5) — this pass wires the spacing half of the two
algorithms Phase 43/44 built.

**Not a numbered plan phase** — a wiring/integration pass, following
the same pattern as Integration Passes A-D: the underlying algorithm
(Phase 43) was already built and thoroughly tested; this pass connects
it to the actual renderer.

## 0. What changed

Every measure's width, and the x-position of every note/chord/rest
within it, now comes from `layout/spacing.ts`'s real algorithm
(`computeReferenceDuration` -> `computeProportionalPositions` ->
`applyMinimumDistance`) instead of Phase 21's `naiveMeasureLayout` and
the old `noteAreaX + (tick/totalTicks) * noteAreaWidth` interpolation
that treated every measure as the same fixed width regardless of
content.

**`computeMeasureLayout`** (new, in `render-from-musicxml.ts`): given one
measure, flattens every voice's events into a single shared timeline
(one set of unique attack ticks across every voice), computes the
`§14`-style spacing over that timeline, and returns the measure's real
width plus a `tick -> x` position map. Built once per measure, **across
every staff of the part combined** -- not staff by staff -- which is
what keeps a grand staff's bass note aligned under the treble note it
sounds with (confirmed directly, see §2).

A rough per-event width estimate feeds `§14.2`'s minimum-distance pass:
a base notehead width, plus a fixed allowance if the note (or any member
of a chord) has a non-zero `alter` or an explicit accidental. This is a
stated approximation (§4) rather than a full replication of the
notehead/accidental glyph-selection pipeline purely for measurement.

## 1. A real bug found and fixed while wiring this in

The first version of `computeMeasureLayout` only recognized
`event.kind === 'note'`. **Chord events were silently excluded** from
the position map entirely -- a chord's own tick never got an entry, so
both the chord itself and whatever note came right after it fell back
to an inconsistent secondary formula, producing overlapping or
colliding positions. Caught immediately by rendering the existing
`chord.musicxml` fixture and checking the actual output rather than
assuming the wiring was correct: the chord and the following half note
both rendered at the exact same x.

**Fixed** by handling `'chord'` (checking every member note for an
accidental) and `'rest'` (which still needs a real, consistent position
to be drawn at, even though it has no accidental to account for)
alongside `'note'`. Re-checked against the same fixture: chord at x=6,
the rest that follows it at x=8.4, the half note after that at x=10.8 --
three genuinely distinct, non-colliding positions.

## 2. How this was verified

Ran `npm run verify` clean, **510/510**. The strongest evidence this
didn't silently break anything: every snapshot that changed was
compared glyph-by-glyph against its previous version using a script
that extracts the exact multiset of rendered SMuFL glyphs from each --
**all 10 changed snapshot files came back with an identical glyph
multiset**, confirming every change was purely a position shift, with
nothing added, removed, or substituted.

Every test that had hardcoded the *old* fixed-width coordinates was
updated to the new, real values (checked by rendering and reading the
actual output, not guessed) -- covering drum-table wiring, the tuplet
stem-direction end-to-end test, and the tied-note anchor-position test.
The tuplet test was also made more robust in the process: it used to
pin to 3 specific hardcoded x-values, which is inherently fragile
against any future spacing-constant tuning; it now checks the
underlying property (at least 3 notes with a genuine down stem) instead.

Five new tests specifically for this wiring: the 4-equal-quarter-notes
spacing case checked against `§14`'s own exact numbers (2.4sp apart,
matching Phase 43's own worked example); two measures of the same file
with different content getting genuinely different widths (unlike
Phase 21's identical-regardless-of-content measures); **cross-staff
alignment**, confirming a grand staff's bass-clef notes land at the
*exact* same x as the treble-clef notes sharing their tick, at both the
first and last attack point of the measure; and the chord/rest fix
itself, confirmed both for the chord's 3 notes sharing one x and for the
rest occupying its own distinct position between the chord and the
following note.

## 3. What this fixes for the actual app

Every rendered file now has real, proportional note spacing instead of
notes being stretched or squeezed to fill a fixed-width box regardless
of what's actually there -- the visual difference `§14`'s whole
algorithm exists to produce is now visible in the actual output, not
just in Phase 43's own isolated tests.

## 4. Known limitations (stated, not silently missing)

- **Note width estimation is approximate.** `ESTIMATED_NOTEHEAD_WIDTH`/
  `ESTIMATED_ACCIDENTAL_ALLOWANCE` are reasonable stand-ins, not a real
  measurement of the actual selected glyph (notehead shape, dot count,
  explicit articulations). Accurate widths would need sharing the
  accidental-*display* decision (not just the pitch's own `alter`)
  between a measurement pass and the render pass, which duplicates
  state this pass chose not to duplicate.
- **A fixed header allowance, not a real one.** Every measure reserves
  `MEASURE_HEADER_ALLOWANCE` (4sp) for a possible clef/key/time-signature
  header, whether or not that specific measure actually draws one --
  simpler and safer than computing the real header width per measure,
  at the cost of some wasted blank space on ordinary measures.
- **`justifySystem` is not used.** There is no real "target width to
  justify to" without `§16`'s system/page breaking (Phase 46, not yet
  built) -- every measure is simply as wide as its own content needs,
  unstretched, matching real engraving's natural (pre-justification)
  width.
- **Tempo marks still use the old proportional-offset positioning**,
  not the new per-tick map -- a tempo mark is placed once per measure
  and didn't need per-note precision, so it was left alone rather than
  widened in scope beyond what this pass needed.
- **Phase 44's skyline is not consumed here.** This pass wires spacing
  (horizontal); wiring the skyline (vertical collision avoidance for
  dynamics, lyrics, articulations, and inter-staff distance) into the
  same render loop is separate, future work.

## 5. How to modify it

- **Wire in Phase 44's skyline** -- thread a running `Skyline` per staff
  side through the render loop wherever an above/below-staff mark is
  currently placed at a fixed offset.
- **Real header-width computation** -- replace
  `MEASURE_HEADER_ALLOWANCE` with the actual clef/key/time-signature
  width for measures that draw one, 0 for those that don't.
- **Accurate note widths** -- share the accidental-display decision
  between a measurement pass and the render pass instead of
  approximating from the pitch's own `alter` alone.

## 6. How to revert

Revert `render-from-musicxml.ts`'s `computeMeasureLayout` function, the
`measureLayoutsByNumber` pre-pass replacing `naiveMeasureLayout`, and
both `noteAreaX`/`eventXs` call sites (pitched-note and tab branches)
back to the old tick-fraction formula. Revert the test changes in
`gm-drum-wiring.test.js`, `musicxml-parser-v2.test.js`, and
`render-from-musicxml.test.js` back to their old hardcoded coordinates,
delete `test/unit/spacing-wiring.test.js`, and regenerate every visual
snapshot again.
