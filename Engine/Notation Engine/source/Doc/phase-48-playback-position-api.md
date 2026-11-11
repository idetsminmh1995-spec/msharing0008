# Phase 48 — Playback Position API + Event Stream

**Status:** complete. `npm run verify` clean (670/670 tests). Completes
Stage 9's first half (`PLAN.md` §17.1); Phase 49 (§17.2's cursor, the
other half of Stage 9) is deliberately not part of this pass.

## 0. Scope, per §17's own framing

> The engine has **no** knowledge of audio, video, or animation.

Phase 48 builds exactly what §17.1 lists and nothing a host app would
instead supply itself: `positionToX`, `xToPosition`, `getEventStream`,
and the `PlaybackPosition`/`NotationEvent` shapes. `renderFromMusicXml`
now returns a fourth field, `playback`, alongside `svg`/`diagnostics` --
a `PlaybackData` value that every function in the new `playback/` module
is a pure function *of* (see §2 for why that shape, not the closures the
spec's own pseudocode suggests).

**Explicitly not this phase:**
- **§17.2 (Cursor, both sync modes) -- Phase 49.** `positionToX` already
  returns everything a cursor renderer needs (`x`, `systemIndex`,
  `pageIndex`); drawing the actual marker, and the `notationMoves`
  translation math, is the next pass.
- **SVG-side note ids.** `NotationEvent.noteIds` are stable, deterministic
  strings (see §3), but the rendered `<text>` elements for noteheads
  carry no matching `id` attribute today -- correlating an event to its
  on-screen glyph is left to a host's own indexing for now. Adding ids to
  every rendered element is its own change (touches every visual
  snapshot in the suite) and wasn't asked for by §17.1's own text.
- **`midiNotes`.** Populated only once a host runs Phase 42's MIDI<->MusicXML
  alignment and threads the result back in. `renderFromMusicXml` parses
  no MIDI file, so its own event stream never sets this field -- present
  in the type, always `undefined` from this code path.

## 1. What was built

**`src/playback/`** (new module; `src/cursor/`'s own README said to build
this work here, and to delete that placeholder once this module existed
-- done, see §5):

- **`event-stream.ts`** -- `NotationEvent`, `buildEventStream(score,
  globalTickOffsetByMeasure, tempoMap)`, `getEventStream(playback)`.
- **`position.ts`** -- `PlaybackPosition`, `PlaybackData` (and its two
  component shapes, `PlaybackMeasureLayout`/`PlaybackMeasurePlacement`),
  `resolvePosition`, `positionToX`, `xToPosition`.
- **`compute.ts`** -- `computePlaybackData`, the one orchestrating
  function `renderFromMusicXml` calls to assemble a `PlaybackData` from
  its own already-computed layout.
- **`index.ts`** -- re-exports all three, matching every other module's
  own convention.

**`render-from-musicxml.ts`**:
- `RenderFromMusicXmlResult` gained `playback: PlaybackData`.
- `MeasurePlacement` (private) gained `pageIndex` -- page mode's own
  render loop already knew which page each system was on but never kept
  it; scroll mode's is always 0.
- A new `timeSignatureByMeasure` map, built in the SAME loop that already
  resolves "which part's time signature wins for this measure" for
  `measureTicksByNumber` (longest-ticks wins) -- captures that winning
  part's own numerator/denominator too, so `§17.2`'s beat math uses the
  identical source of truth as the tick-length math already did.
- One call to `computePlaybackData` right before the final `return`,
  passing it `measureNumbersInOrder`, `measureTicksByNumber`,
  `timeSignatureByMeasure`, `tempoMarks`, `measureLayoutsByNumber`,
  `placementByMeasureNumber` and `MEASURE_HEADER_ALLOWANCE` -- every one
  of these **already existed** in the function; nothing new was computed
  independently of what produced the SVG itself.

## 2. Design decisions, and why they diverge from the spec's own pseudocode

**Pure functions over closures.** §17.1 writes `positionToX(tick)` and
`getEventStream()` as if the engine handed back bound methods with no
visible arguments. This codebase's own established shape, used
uniformly across `geometry/` (e.g. `computeBeamShape(positions, xs,
direction, style, stemLength)`), is explicit data in, explicit data
out -- so instead, `renderFromMusicXml` returns the *data*
(`playback: PlaybackData`), and `positionToX(playback, tick)` /
`xToPosition(playback, x, systemIndex)` / `getEventStream(playback)` are
free functions over it. This is directly unit-testable without going
through a full render for every case, and matches how every other
"what the engine provides" section in `PLAN.md` has already been
reinterpreted into this codebase's own pure-function style rather than
implemented as literal pseudocode.

**Not `timing/measure-position.ts`'s `MeasureMap`.** That module is
built for reconstructing measure boundaries from a *sparse* list of
time-signature change points, rounding elapsed time to the nearest whole
measure at each change (its own documented design). `computePlaybackData`
already has every measure's own *exact* length from the same layout pass
that rendered it -- indexing that directly, via a plain running-sum map
(`globalTickOffsetByMeasure`) and a binary search, is both simpler and
exact, with nothing to round. The `MusicalPosition` *type* is still
reused from `timing/measure-position.ts` (no reason to declare a second,
identical shape) -- only its search machinery is replaced.

**"Floor", not "nearest", for a tick between two events.** A rendered
note's own x is correct for its whole sounding duration, from its own
onset up to (not including) the next event -- so `positionToX` of a tick
mid-note returns that note's x, not something interpolated toward the
next one. This is the standard "the cursor sits on the currently-sounding
note" behavior, not smooth sub-note gliding (Phase 49's `notationMoves`
mode can still animate smoothly between successive calls to `positionToX`
if a host wants that -- the position data itself doesn't preclude it).

**Note-id scheme.** `${partId}#m${measureNumber}#v${voiceId}#e${eventIndexInVoice}`,
with `#n${noteIndexInChord}` appended for a chord member. Deterministic
and stable for identical input (§4.4's determinism rule, applied to a
new kind of output) -- not a randomly generated id, so re-rendering the
same file always produces the same ids and a host can safely persist
one (e.g. "the note the user last clicked").

## 3. What actually changed on real content

Nothing rendered changed: `playback` is purely additive to
`RenderFromMusicXmlResult`, and every one of its inputs was already
being computed for the SVG. Confirmed by the full existing suite -- all
660 pre-existing tests, including every visual snapshot -- passing
**byte-identically**, with zero snapshot updates needed.

## 4. Tests

New: `test/unit/playback.test.js`, against real fixtures already in the
suite (`simple-single-voice`, `chord`, `tempo-mark`, `beamed-eighths`),
covering every item §17.1's own "Tests" line names:
- event stream sorted and complete (total `noteIds` across every event
  equals the fixture's own real note count, counted independently)
- a chord's several noteIds are distinct; a rest produces no event, but
  still advances the tick cursor for whatever follows it
- noteIds are deterministic across two independent renders of one file
- an event's `seconds` matches §12's tempo map exactly, worked out by
  hand for `tempo-mark.musicxml` ("dotted quarter = 96" = 144
  quarter-notes/minute)
- `resolvePosition`'s tick/seconds/position agree with the event they're
  resolved from
- `positionToX`/`xToPosition` round-trip at every real event's own tick
- `positionToX` is strictly monotonic in tick within one system
- a mid-note tick resolves to the note currently sounding (floor)
- `xToPosition` on an out-of-range x clamps rather than throwing

## 5. Cleanup

Deleted `src/cursor/` (a Phase-1 placeholder whose own README said:
"Build that work in `src/playback/`, not here. This folder and its
README can be deleted once `playback/` exists.") -- confirmed unreferenced
by `npx tsc --noEmit` after removal.

## 6. How to modify

| Want to change | Where |
|---|---|
| The note-id format | `noteIdsForEvent` in `event-stream.ts` |
| Floor vs. some other within-note x policy | `floorEntry` in `position.ts` |
| Which part's time signature wins on disagreement | the `timeSignatureByMeasure`/`measureTicksByNumber` loop in `render-from-musicxml.ts` (currently: longest ticks wins, same as before this phase) |
| Add `midiNotes` once Phase 42 alignment is available | thread the alignment result into `buildEventStream` (or a new variant of it) rather than `renderFromMusicXml` itself, which has no MIDI file to align against |

## 7. How to revert

Remove `src/playback/`, the `computePlaybackData` import and both call
sites (the empty-score early return and the final return) in
`render-from-musicxml.ts`, `playback` from `RenderFromMusicXmlResult`,
`pageIndex` from `MeasurePlacement` and its two set-sites, the
`timeSignatureByMeasure` map, and `export * from './playback/index.js'`
from `src/index.ts`. Remove `test/unit/playback.test.js`. Restore
`src/cursor/README.md` if the placeholder is wanted back.
