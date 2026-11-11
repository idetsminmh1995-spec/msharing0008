# Phase 4 — Duration/Tick Math

**Status:** complete and verified (`npm run verify` clean, plus 19/19
manual test assertions against known tick values — see §3 below).

## 1. What was written

**File:** `src/core/duration-math.ts` — pure functions operating on Phase
3's `Duration` type. No classes, no state, nothing but arithmetic.

- **`TICKS_PER_QUARTER = 480`** — the engine's own internal tick
  resolution, independent of whatever `<divisions>` value any source
  MusicXML file used. This is the key design decision of this phase: every
  `Duration.ticks` the parser (Phase 36+) produces must be normalized to
  this resolution, so ticks from different parts/files are always directly
  comparable/summable even if their source files used different
  `<divisions>` values (which real-world files do, and which can even
  change mid-piece).
- **`baseTicksForType(type)`** — the tick length of a duration type alone
  (no dots, no tuplet) — e.g. `quarter` → 480, `eighth` → 240.
- **`ticksWithDots(baseTicks, dots)`** — dotted-note expansion:
  `baseTicks * (2 - 2^-dots)`. 1 dot = ×1.5, 2 dots = ×1.75, 3 dots =
  ×1.875.
- **`applyTuplet(ticks, tuplet)`** — scales ticks by
  `normalNotes/actualNotes` (e.g. a standard triplet, 3 actual notes in the
  time of 2 normal ones, multiplies by 2/3). Passing `undefined` is a
  no-op.
- **`ticksForDisplayedDuration(d: Duration)`** — combines all three above
  for a full `Duration` (type + dots + tuplet). This is **independent** of
  `d.ticks` itself (the authoritative source value, per Phase 3's own
  comment on `Duration`) — callers who want to detect a
  displayed-vs-authoritative mismatch (e.g. a note tied across a barline)
  compare this function's result against `d.ticks` themselves; this phase
  doesn't do that reconciliation automatically.
- **`durationTypeAndDotsFromTicks(ticks, maxDots = 3)`** — the inverse, for
  the no-tuplet case: searches duration types longest-to-shortest, 0..3
  dots each, and returns the first exact match (within a small floating-
  point tolerance). Longest-first means it always finds the notation a
  human engraver would actually use (720 ticks → dotted quarter, never a
  "quarter tied to an eighth"). Returns `null` if nothing matches — callers
  should fall back to splitting into tied notes (Phase 26), not force a
  bad approximation.
- **`xmlDivisionsToTicks(xmlDuration, divisions)`** /
  **`ticksToXmlDivisions(ticks, divisions)`** — convert between a raw
  MusicXML `<duration>` value (relative to that file's own `<divisions>`)
  and the engine's normalized ticks, and back (the inverse will matter for
  Phase 49's export).
- **`sumTicks(durations)`** — adds up a list of `Duration.ticks` values,
  e.g. for a chain of tied notes' total sounding length.

## 2. Why TICKS_PER_QUARTER = 480

480 is the common MIDI/DAW convention and divides cleanly down to a 128th
note (480/32 = 15, still exact). Finer values (256th/512th/1024th notes)
fall back to non-integer tick counts rather than choosing a much larger
constant to keep those vanishingly-rare-in-practice cases exact too —
`Duration.ticks` is typed as a plain `number`, not required to be an
integer, so this doesn't cause any type-level problem, just a
philosophical one (deemed acceptable for now; revisit if a real score
using 1024th notes ever needs this).

## 3. How this was verified

Ran `npm run verify` clean, then loaded the built bundle and ran 19
assertions against known values, all passing:
- Base ticks for `quarter` (480), `eighth` (240), `whole` (1920), `16th`
  (120).
- Dotted-note expansion for 0/1/2/3 dots on a quarter note (480/720/840/
  900).
- Triplet ratio (3:2 applied to an eighth note: 240 → 160) and the
  `undefined`-tuplet no-op case.
- `ticksForDisplayedDuration` combining dots and tuplet correctly on full
  `Duration` objects.
- The inverse search: 480→(quarter,0), 720→(quarter,1), 240→(eighth,0),
  and confirmed a nonsense tick value correctly returns `null` rather than
  a wrong guess.
- `xmlDivisionsToTicks`/`ticksToXmlDivisions` round-tripping correctly for
  two different real-world `<divisions>` values (4 and 24), confirming the
  normalization is divisions-independent as intended.
- `sumTicks` on two tied eighth notes correctly totaling one quarter note's
  worth (480).

## 4. How to modify it

- **Change the internal tick resolution** — edit `TICKS_PER_QUARTER`.
  Every other constant in `BASE_TICKS_FOR_TYPE` derives from it
  automatically; nothing else needs to change.
- **Support a coarser/finer dot limit** — `durationTypeAndDotsFromTicks`'s
  `maxDots` parameter already defaults to 3 but accepts any value per call
  site.
- **Tie-chain-specific logic beyond summing** (e.g. validating a chain's
  `tieStart`/`tieStop` flags actually connect properly) — add it as a new
  function here, or defer to Phase 26 (Tie engine) if it needs rendering
  context this file doesn't have.

## 5. How to revert/remove it

Delete `src/core/duration-math.ts` and remove the
`export * from './duration-math.js';` line from `src/core/index.ts`.
Nothing else in the repo references it yet.
