# Phase 40 — Musical Timing Engine

**Status:** complete and tested against every requirement `§12.3` itself
names, including the required long-song drift test. 374/374 tests pass.

## 0. Scope, per §12's own framing

`§12`'s own responsibility statement: convert between the three time
domains that must stay consistent — ticks (musical), seconds (wall
clock), and measure+beat (human-readable position). This is explicitly
the module that "makes long-song synchronisation correct," and its own
anti-drift design rationale (`§12.2`) is the central thing this phase
had to get right, not merely implement functionally.

## 1. What was written

**`src/timing/diagnostic.ts`** — `TimingDiagnostic`/`timingDiagnostic`,
the same "recover with a diagnostic, never throw" shape `§10.7`
established and Phase 39 already extended to MIDI, kept as its own
independent type for the same reason Phase 39's `MidiDiagnostic` is —
timing/ consumes data from both parsers but has no reason to depend on
either one's diagnostic-reporting shape specifically.

**`src/timing/tempo-map.ts`** — `TempoSegment`/`TempoMap`/
`buildTempoMap`. This is where `§12.2`'s anti-drift design actually
lives: `startSeconds` is precomputed **cumulatively, once**, when the
map is built, using exactly the formula `§12.2` specifies — never
re-derived later by stepping note by note and accumulating elapsed time,
which is the approach that accumulates floating-point error proportional
to song length. Handles the stated error conditions: an empty tempo
event list produces a single 120 BPM segment (reusing `§11.1`'s own
documented MIDI default, `500,000` µs/quarter) with an `EMPTY_TEMPO_MAP`
warning; a tempo list that doesn't start at tick 0 gets an *implicit*
120 BPM segment prepended, deliberately with **no** warning (a file only
declaring tempo once it changes is normal, not malformed — a warning
there would be noise, not signal).

**`src/timing/tick-seconds.ts`** — `tickToSeconds`/`secondsToTick`, each
exactly `§12.2`'s own two-step recipe: binary search to find the
containing segment, then one subtraction and one multiply. `§12.3`'s
boundary rule ("clamps to the boundary segment rather than extrapolating
wildly") is implemented as clamping the *search* — a query before the
first segment or beyond the last still lands on a real segment, whose
own rate then applies via the ordinary formula, rather than an arbitrary
floor/ceiling value.

**`src/timing/measure-position.ts`** — `MusicalPosition`/
`TimeSignatureSegment`/`MeasureMap`/`buildMeasureMap`/`tickToPosition`/
`positionToTick`. Deliberately mirrors `TempoMap`'s own sparse-segment,
binary-search design rather than enumerating every individual measure's
boundary (which would be wasteful for a long piece with few
time-signature changes) — each segment just remembers which measure
number begins its own span, and the measure/beat within that span is a
plain division. `beat` is 1-based and fractional exactly as `§12.3`
specifies (beat 2.5 in 4/4 is "the and of 2").

## 2. How this was verified

Ran `npm run verify` clean, 374/374 (13 new tests). Every test
requirement `§12.3` itself explicitly names, and nothing less:
- **Constant-tempo round-trip at many ticks** — 7 different tick values,
  each confirmed to round-trip through `tickToSeconds`/`secondsToTick`
  back to itself within floating-point epsilon; plus two values checked
  against **hand-computed** results (120 BPM: exactly 0.5s per quarter
  note), not just internal consistency.
- **A 3-tempo-change map verified against hand-computed second values**
  — worked out by hand (0.5s + 2.0s + 0.25s = 2.75s across three tempo
  segments) and checked against both the map's own precomputed
  `startSeconds` fields and the final `tickToSeconds` result.
- **The required long-song drift test** — a 10-minute piece at 120 BPM
  (576,000 ticks total), converting tick->seconds->tick->seconds at
  10,000 points across the whole piece, asserting the max round-trip
  error stays under 1ms. It does, by a wide margin, precisely because of
  `§12.2`'s precompute-once design — the last point in a 10-minute piece
  is no less accurate than the first.
- **Boundary clamping** — a negative tick and a tick far beyond the
  final segment both resolve without error, the latter checked against
  the correct hand-computed value using that final segment's own rate.
- Measure/beat position: a constant 4/4 map's measure numbers and
  fractional beats (including "beat 2.5"); an exact positionToTick
  inverse check; a time-signature change mid-piece correctly shifting
  the measure numbering from that point on; and 6/8 compound time's beat
  length computed correctly from its denominator.

Also extended Phase 38/39's own dynamic diagnostic-code-coverage check
to scan `timing/` too (a third independent diagnostic function,
`timingDiagnostic`, alongside MusicXML's `diagnostic` and MIDI's
`midiDiagnostic`) — it found no gaps this time, confirming the one
timing diagnostic code (`EMPTY_TEMPO_MAP`) was already properly asserted.

## 3. Known limitations (stated, not silently missing)

- **A time signature change mid-measure in a real file** (unusual, but
  not impossible in a malformed file) is rounded to the nearest whole
  measure boundary by `buildMeasureMap` rather than producing a
  fractional measure — stated rather than silently wrong, since real
  files essentially never do this deliberately.
- **Not wired into anything yet** — produces `TempoMap`/`MeasureMap` and
  the conversion functions, but nothing downstream (Phase 41's drum
  mapping, Phase 42's MIDI<->MusicXML alignment) consumes them yet,
  matching how Phase 39's `MidiFile` output was left for this phase (and
  the next ones) to actually use.

## 4. How to modify it

- **Feed real tempo/time-signature data in** — Phase 39's
  `MidiFile.tempoEvents`/`timeSignatureEvents` are already shaped
  compatibly with `buildTempoMap`/`buildMeasureMap`'s own input types
  (same field names); MusicXML's `<sound tempo>`/`<metronome>` (Tier
  2/3, per Phase 35's own stated scope) would need a small adapter to
  produce the same shape once parsed.
- **Wire into Phase 41/42** — the drum mapping and alignment phases are
  the natural next consumers of `tickToSeconds`/`tickToPosition`.

## 5. How to revert/remove it

Delete `src/timing/` entirely, remove its `export * from` line from
`src/index.ts`, delete `test/unit/timing.test.js`, and revert the
`SRC_DIRS`/coverage-scan changes in
`test/unit/diagnostics-hardening.test.js` back to scanning only
`parser/musicxml/` and `parser/midi/`.
