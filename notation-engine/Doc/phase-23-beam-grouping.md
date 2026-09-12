# Phase 23 — Beam Grouping

**Status:** complete and verified (200/200 tests pass, including every
named test case from the newly-written §9.12 spec). This phase itself
required writing that spec first — see the companion commit **before**
this one and §0 below.

## 0. A real plan gap found and fixed before writing any code

Unlike every other `§9` subsection (staff through accidentals), beams had
**no detailed specification anywhere** in `PLAN.md` — `§9.9`'s own text
referenced "beam group (§12)," but `§12` is the Musical Timing Engine, an
unrelated module. A dangling, wrong cross-reference, not a real pointer
to missing detail.

Researched the actual grouping convention against multiple independent
sources (Wikipedia's "Beam (music)," MyMusicTheory, Musicnotes, an
OpenLearn music-theory unit — all agreeing, not just one source) before
writing anything, then added `PLAN.md` `§9.12` (this phase) and `§9.13`
(Phase 24, reserved) with the full rule, sources, and named test cases —
matching the same rigor every other `§9.X` subsection already had. Fixed
`§9.9`'s dangling reference to point at `§9.12`.

## 1. What was written

**`src/geometry/beam.ts`**:
- **`beamBeatTicks(numerator, denominator)`** — the tick length of one
  "beat" for grouping purposes, per `§9.12`'s verified rule:
  - **Compound meter** (denominator 8, numerator divisible by 3, and
    greater than 3 — 6/8, 9/8, 12/8): the beat is a dotted quarter (3
    eighth-notes' worth), confirmed **not** to misfire for 3/8 (numerator
    must be `> 3`, so 3/8 correctly falls through to the simple-meter
    formula instead).
  - **Every other meter**: one note of the denominator's own value (a
    quarter in 4/4, a half in 2/2, an eighth in a simple x/8 meter).
- **`groupBeams(events, startTicks, numerator, denominator, groupTicks?)`**
  — the actual grouping: walks events in order, breaking the current run
  whenever a rest or a non-beamable (quarter-or-longer) duration is hit,
  or whenever the accumulated tick position crosses into a new beat/unit.
  `groupTicks` overrides the computed beat length entirely — passing a
  full quarter-note's worth (960 ticks, i.e. **2** quarters, spanning 4
  eighth notes) in 4/4 produces the common real-world "groups of 4 eighth
  notes" convention instead of the textbook-strict groups of 2. A
  solitary beamable note (nothing else in its run) never appears in the
  output at all — `§9.9`'s individual flag already covers that case, so
  this phase doesn't need to represent "not beamed" as anything.
- **`beamedEventIndices(groups)`** — flattens every group's indices into
  one set, for a future caller (Phase 24's integration into
  `renderFromMusicXml`) to know which events should call `needsFlag(type,
  true)` instead of `false`.

**Deliberately not wired into `renderFromMusicXml` yet.** Phase 21's
integration still calls `needsFlag(type, false)` unconditionally.
Suppressing flags for grouped notes without also drawing the beam that
should replace them (Phase 24's job) would leave those notes with
*neither* a flag *nor* a beam — a worse visual result than today's
"every eighth note gets its own flag." The two land together once Phase
24 exists.

## 2. A real test bug caught by the test itself (not a code bug)

One test's assertion initially expected 8 eighth notes with a
`groupTicks` override to produce "two groups of 4," but the override
value passed was `480` (one quarter note — the *same* as the default
simple-meter beat length), which correctly produces four groups of 2,
identical to the no-override case. The code was right; the test's
override value was wrong (should have been `960`, two quarters' worth =
4 eighth notes). Fixed the test, not the code, after confirming by hand
which one was actually mistaken.

## 3. How this was verified

Ran `npm run verify` clean, 200/200. Every named test case from `§9.12`:
- 8 plain eighth notes in 4/4, no override → 4 groups of 2 (strict
  beat-based default).
- The same 8 notes with a 4-eighth-note-equivalent override → 2 groups of
  4 (the common real-world convention).
- 6/8 with 6 eighth notes → 2 groups of 3 (compound-meter beat).
- 3/8 confirmed **not** compound (numerator must exceed 3) — still uses
  the plain eighth beat, not a dotted-quarter one.
- A rest in the middle of a beat's worth of eighths → breaks into two
  groups, never merged across the rest.
- A single eligible note surrounded by rests → produces no group at all.
- Quarter notes and longer are never grouped, even with an explicit
  override (the override only changes the unit size, not which durations
  are eligible in the first place).
- `beamedEventIndices` collects every index across all groups correctly.

## 4. Known limitation (documented, not a gap)

Irregular/additive meters (5/8 as 2+3, MusicXML's `<beats>3+2+2</beats>`
from Phase 12) fall back to plain simple-meter beat math on the numeric
total, which produces a plausible but not necessarily idiomatic grouping
for such meters — real additive-meter-aware grouping is future work,
noted in `§9.12` itself, not silently assumed to already work.

## 5. How to modify it

- **Change the compound-meter detection rule** — the single `isCompound`
  condition in `beamBeatTicks`.
- **Support beaming across a rest** (a real but debated house-style
  choice) — would change `groupBeams`' rest-handling branch; currently a
  rest always flushes/breaks the run.
- **Wire this into `renderFromMusicXml`** — Phase 24's job, once beam
  geometry exists to draw what replaces the suppressed flags.

## 6. How to revert/remove it

Delete `src/geometry/beam.ts`, remove its `export * from` line from
`src/geometry/index.ts`, and delete `test/unit/beam.test.js`. The
`§9.12`/`§9.13` plan sections can stay regardless — they're a
specification fix independent of whether this specific implementation
exists.
