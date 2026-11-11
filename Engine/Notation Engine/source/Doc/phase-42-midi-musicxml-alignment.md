# Phase 42 — MIDI ↔ MusicXML Alignment

**Status:** complete and tested against every requirement `§13.2` itself
names, including all four matching tiers exercised with purpose-built
data plus a real end-to-end fixture pair. 405/405 tests pass. Completes
Stage 7 (MIDI and timing).

## 0. Scope, per §13.1/§13.2's own framing

`§13.1`'s authority rules (what's drawn = MusicXML, tempo = MIDI if
present, drum sound = MIDI note number) are mostly already honored
structurally by how Phases 39-41 were built — MusicXML remains the only
source `render-from-musicxml.ts` draws from, Phase 40's timing engine
consumes MIDI's tempo data, and Phase 41's GM table already uses the MIDI
note number as authoritative for drum sound. This phase's own concrete
job is `§13.2`'s note-**matching** algorithm: given a parsed MusicXML
`Part` and a parsed `MidiFile`'s notes (from a genuinely separate `.mid`
file — the case Phase 41 didn't cover, since that phase's own wiring
only handles a single file's internal `<instrument>` link), produce the
`alignment: Map<coreNoteId, MidiNote>` `§13.2` specifies.

## 1. What was written

**`src/timing/alignment/diagnostic.ts`** — `AlignmentDiagnostic`/
`alignmentDiagnostic`, the same independent-per-module diagnostic shape
every other module in this codebase already uses.

**`src/timing/alignment/flatten.ts`**:
- `CoreNoteRef`/`coreNoteRefKey` — `§13.2`'s own "coreNoteId" is a
  **structural reference** into a `Part` (measure number, voice id, event
  index), not a field added to the core `Note` type — keeping `core/`
  exactly as minimal as `§4.1` wants it. A stable string key (the same
  reasoning behind every other string-keyed lookup in this codebase,
  e.g. Phase 15's `noteheadMappingKey`) makes it usable as a real `Map`
  key.
- `chromaticNoteNumber` — the standard MIDI convention (middle C = 60),
  confirmed directly by test rather than assumed, plus its enharmonic
  and octave-arithmetic properties.
- `flattenPartNotes` — walks every measure of a `Part` in score order,
  computing each note's real **absolute tick** from every earlier
  measure's own resolved time signature (via `MeasureAttributes`, which
  MusicXML already carries per-measure) rather than assuming one
  constant measure length — a time-signature change partway through
  still produces correct absolute ticks for every measure after it. Each
  flattened note's `noteNumber` unifies two cases into one number space:
  a pitched note's real chromatic value, or an unpitched note's already-
  resolved GM number (Phase 35/41) when its `<instrument id>` is known —
  `§13.2` doesn't distinguish "pitch" by instrument type, so one
  matching algorithm can serve both.

**`src/timing/alignment/match.ts`** — `alignNotes`, the four-tier cascade
run in exactly `§13.2`'s own listed order, each tier only considering
what earlier tiers left unmatched, and a MIDI note claimed once is never
claimed again:
1. **Exact tick + pitch match** — the common case.
2. **Tolerance match** — within ±(1/32 note) ticks (60 ticks at this
   engine's 480-per-quarter unit), closest candidate wins when several
   qualify.
3. **Ordinal fallback** — only when the two *remaining* pools (unmatched
   core notes, unclaimed MIDI notes) are exactly the same size — `§13.2`'s
   own stated condition ("if counts match but ticks do not") — aligned by
   index, not tick or pitch.
4. **Unmatched** — a diagnostic for *each* side's leftovers (a distinct
   code for an unmatched core note vs. an unmatched MIDI note), never a
   silent drop.

## 2. How this was verified

Ran `npm run verify` clean, 405/405 (13 new tests). Every test `§13.2`
itself names, each exercised with purpose-built data rather than only
one shared example:
- **Exact match** — same tick, same pitch, tier `'exact'`; also confirmed
  a same-tick-but-different-pitch pair does *not* exact-match (it falls
  through, correctly, to a later tier).
- **Tolerance match** — a MIDI note a few ticks off still matches; one
  just *outside* the tolerance window does not (falling to ordinal
  instead, confirmed rather than assumed); among several same-pitch
  candidates within tolerance, the genuinely *closest* one is chosen.
- **Ordinal fallback** — a constant pickup-measure-style tick offset
  across three notes, with different pitches on both sides too, still
  aligns correctly purely by position, confirmed for every note in the
  set, with zero diagnostics.
- **Unmatched** — mismatched counts with no plausible tick/pitch link
  produce a diagnostic for *every* leftover note on *both* sides (not
  just one), and neither side's data is dropped from the alignment
  process; also confirmed a core note with a genuinely unresolvable note
  number (no pitch info, no GM mapping) can still align via ordinal
  when counts happen to match.
- `chromaticNoteNumber` checked against the standard convention directly
  (middle C = 60), plus its enharmonic-equivalence and
  octave-arithmetic properties.
- `flattenPartNotes`'s absolute-tick computation checked against a real
  2-measure `Part`, confirming the second measure's note is offset by
  the first measure's own real length (not a hardcoded constant).
- **A real end-to-end fixture pair**: the existing
  `simple-single-voice.musicxml` fixture (5 real notes across 2 measures)
  paired with a MIDI file built to describe the *same* music at the
  *same* ticks (via Phase 39's own real MIDI encoder), confirming all 5
  notes align via the exact tier with zero diagnostics — not synthetic
  test data, but two independently-parsed real files landing on the
  correct correspondence.

## 3. Known limitations (stated, not silently missing)

- **Only a single part is aligned at a time** — `flattenPartNotes` takes
  one `Part`; multi-part alignment (matching each MusicXML part against
  its own MIDI track) would need a *separate* track-to-part
  correspondence decided first, itself a real, unaddressed problem (which
  track is which part?) that this phase doesn't attempt to solve.
- **Not wired into `renderFromMusicXml` or anything else** — this phase
  produces the alignment data structure and the functions to build it;
  actually *consuming* an aligned MIDI note's sounding time (e.g., for a
  playback position API, `§17`) is future work.
- **Tolerance tier ties**: when two MIDI candidates are exactly equidistant
  from a core note's tick, the first one encountered wins (JavaScript's
  stable iteration order) — not specified further by `§13.2`, and not
  expected to matter in practice given real quantization differences are
  rarely exactly symmetric.

## 4. How to modify it

- **Multi-part/multi-track alignment** — would need a part<->track
  correspondence strategy (by declared instrument name? by note-count
  similarity? explicit user selection?) before `flattenPartNotes`/
  `alignNotes` could be called once per part/track pair.
- **Wire into a playback position API** — `§17`'s own future scope; the
  natural consumer of `alignNotes`'s output once it exists.

## 5. How to revert/remove it

Delete `src/timing/alignment/` entirely, remove its `export * from` line
from `src/timing/index.ts`, delete `test/unit/alignment.test.js` and
`test/unit/alignment-e2e.test.js`, and revert the `SRC_DIRS`/coverage-scan
changes in `test/unit/diagnostics-hardening.test.js` back to not scanning
`timing/alignment/`.
