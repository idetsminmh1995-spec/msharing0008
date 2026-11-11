# Phase 41 — Drum Mapping Table + GM Defaults

**Status:** complete, tested, and **wired into actual rendering** (not
left as an unwired deliverable) — a percussion note whose `<instrument
id>` resolves to a known GM note number (via Phase 35's parsed
`<midi-instrument>` data) now gets its real notehead shape, staff
position, and stem direction from the GM drum table. 392/392 tests pass.

## 0. Scope, and why the wiring happened in this phase

`§13.3`'s own deliverable is the table itself (`DrumMapEntry`/
`DrumMappingTable`, a default GM table, config overrides, and the
fallback). Full note-*matching* between a separate MIDI file and a
MusicXML file is `§13.1`/`§13.2`'s job — Phase 42, not this one.

But the case where a **single MusicXML file** links its own notes to GM
numbers directly (`<instrument id>` -> `<midi-instrument><midi-unpitched>`,
already parsed by Phase 35) needs no separate MIDI file and no alignment
at all -- the link is already unambiguous within the one file. This is
also exactly the shape of file the project's own drum-video app produces.
Given the table was built and tested, wiring this specific case into
`renderFromMusicXml` was judged worth doing in this phase rather than
deferred, since it's a self-contained, already-available integration, not
one that depends on Phase 42's alignment work.

## 1. What was written

**`src/drums/diagnostic.ts`** — `DrumDiagnostic`/`drumDiagnostic`, the
same independent-per-module diagnostic shape every parser/timing module
in this codebase already uses.

**`src/drums/drum-map.ts`**:
- `DrumMapEntry`/`DrumMappingTable`, matching `§13.3`'s own specified
  shape exactly.
- `DEFAULT_DRUM_MAPPING_TABLE` — every GM note `§13.3` explicitly names
  (bass drum, side stick, snare, toms, hi-hat closed/pedal/open, crashes,
  ride/bell/edge, china, splash, cowbell, tambourine). `staffPosition`
  uses the *exact* numeric scale `staffPositionForPitch` already uses --
  confirmed empirically (bottom line = 0, each half-line-step up = -0.5,
  matching `middleLineY(5) = -2`) before assigning any value, not
  assumed. The relative ordering (low sounds low, cymbals high, feet
  below hands) was checked against several independent drum-notation
  guides, while being explicit that real practice varies -- "notators
  vary to some degree on what instrument each line represents" is a
  direct quote from one such guide -- which is exactly why `§13.3`
  requires every field to be overridable rather than treating this table
  as a single universal truth. Notehead shapes follow the equally
  consistent oval=drum/x=cymbal-or-hi-hat/diamond=bell-type-sound
  convention; stem direction follows hands-up/feet-down.
- `lookupDrumMapEntry` — the `§13.3` fallback: a note outside 35-81, or
  inside that range but simply absent from the table, both resolve to
  the middle line with a plain notehead and a warning, never a dropped
  note. Two distinct codes (`DRUM_NOTE_OUT_OF_RANGE` vs
  `DRUM_NOTE_UNMAPPED`) rather than one, since they're genuinely
  different conditions.
- `mergeDrumMappingTable` — merges `config.drums.mapping` overrides onto
  the default table, entry by entry and field by field.

**`src/config/config.ts`** — new `DrumsConfig`/`drums.mapping` section.
**Caught and fixed a real architectural violation while writing this**:
the first draft imported `DrumMapEntry` from `drums/` directly into
`config.ts`, violating `§4.1`'s explicit rule that `config/` may import
from nothing else in the codebase. Fixed by defining
`DrumMapEntryOverride` structurally within `config.ts` itself (no
cross-import) -- `drums/`'s own `DrumMapEntry` is written to match this
shape, so the two remain freely combinable wherever a caller merges them,
without either module depending on the other. (`drums/` importing *from*
`config/` is fine -- "`config/` is a leaf that anything may read.")

**`src/core/note.ts`** — added `instrumentId?: string` to the core
`Note`/`NoteInit` types, mirroring the exact pattern every other Phase 35
field (`explicitNotehead`, `isGrace`, etc.) already established.
**`src/parser/musicxml/parse.ts`** — threads it through `buildSingle`,
the same one-line pattern as those other fields.

**`src/render-from-musicxml.ts`** — the actual wiring:
- `RenderCtx` gained `midiInstrumentsByPart`, the current part's own GM
  map (from Phase 35's `ParseResult.midiInstrumentsByPart`).
- `renderNoteheadPart`: for an unpitched note with a resolvable GM
  number, `lookupDrumMapEntry`'s `staffPosition` is used **instead of**
  `staffPositionForPitch`'s result, and its `noteheadShape` is fed into
  `selectNoteheadGlyphName` via the *existing* `overridesByKey` mechanism
  Phase 15 already built for exactly this purpose -- no new
  glyph-selection logic needed, just a real caller finally using the
  slot that was reserved for it.
- `renderNoteOrRest`: the drum table's own stem-direction convention is
  threaded in as a priority tier **between** an explicit file `<stem>`
  (which still wins if present -- a specific per-note override from the
  file author) and ordinary automatic placement.
- Explicit `<notehead>` continues to win over the GM-derived shape,
  preserving `§9.7`'s existing priority order -- confirmed directly by a
  test, not assumed to still hold.

## 2. How this was verified

Ran `npm run verify` clean, 392/392 (17 new tests + 1 visual snapshot).
- Every `§13.3`-named GM note has a real table entry with a valid
  staff position and a notehead shape Phase 15 actually recognizes
  (cross-checked against `shapeGlyphName`, not just "is a string").
- Stem-direction and notehead-shape conventions checked against
  specific, named entries (kick/pedal-hi-hat down, snare/crash up;
  hi-hat/crash/cymbals `x`, drums `normal`, ride-bell/cowbell `diamond`).
- `lookupDrumMapEntry`'s two distinct fallback codes each checked with
  their own case (an in-range-but-absent note vs. a genuinely
  out-of-range one, including both below 35 and above 81).
- Config overrides: a partial override replacing only the named field
  while keeping the rest of that entry's defaults; adding a wholly new
  GM note not in the default table at all; the no-overrides-at-all case;
  and confirming one note's override never leaks into another's entry.
- **End to end**: built a real fixture with three GM-linked percussion
  notes (snare, kick, closed hi-hat) and no explicit `<notehead>`,
  confirmed each renders with the *correct* glyph, the *correct*
  computed Y position (matching the table's `staffPosition` added to the
  measure baseline, not the file's own display-step/octave), and the
  *correct* stem direction (kick down, others up) -- checked against the
  actual rendered SVG coordinates, not just that some function returned
  the right value in isolation.
- **A real fixture-authoring mistake caught along the way**: the first
  draft of the end-to-end fixture used `<midi-unpitched>` values
  assuming no offset, producing the *wrong* GM notes once rendered -- a
  direct demonstration that Phase 35's already-tested 1-based->0-based
  correction was firing correctly; the fixture's own expected values were
  wrong, not the parser. Fixed by using the correct `<midi-unpitched>`
  values (GM note + 1) to land on the intended snare/kick/hi-hat.
- Confirmed the priority order is preserved: the Phase 35 `v2-elements`
  fixture's GM-linked hi-hat note, which *also* has an explicit
  `<notehead>x</notehead>`, still renders with that explicit override's
  shape -- its Y position legitimately changed to the GM table's own
  position (a real, intended improvement now that GM is authoritative
  for percussion position per `§13.1`), and the saved snapshot was
  updated to reflect this correct, deliberate change.

## 3. Known limitations (stated, not silently missing)

- **Grace notes are not wired** -- the grace-note rendering branch in
  `renderNoteOrRest` computes its own position directly via
  `staffPositionForPitch` and doesn't consult the GM drum table. Rare in
  percussion writing; a real gap, not silently pretended otherwise.
- **`config.drums.mapping` overrides aren't consulted by
  `renderFromMusicXml` yet** -- that function currently accepts only
  `domParser` as an option, no `EngineConfig` at all (consistent with
  Stage 8's own framing that this whole naive-layout render path "exists
  to be thrown away"). The default table alone is wired; a config
  override would need `renderFromMusicXml` to accept a config parameter
  first.
- **§13.1's alignment (a separate `.mid` file, not `<instrument
  id>`) is Phase 42's job entirely**, not attempted here.

## 4. How to modify it

- **Wire grace notes too** -- thread the same `gmNote`/`drumEntry` lookup
  into the grace-note branch of `renderNoteOrRest`, mirroring
  `renderNoteheadPart`'s logic.
- **Accept a config parameter in `renderFromMusicXml`** -- the natural
  place to finally consult `config.drums.mapping` (and every other
  currently-unconsulted config section) would be adding an `EngineConfig`
  parameter to its options and threading `resolveConfig(...)` through,
  though that's arguably Stage 8's job given the "naive layout, thrown
  away later" framing.
- **Add more GM notes to the default table** -- `DEFAULT_DRUM_MAPPING_TABLE`
  in `drums/drum-map.ts` is the only place to add or adjust an entry.

## 5. How to revert/remove it

Delete `src/drums/` entirely; revert `config.ts`'s `DrumsConfig`/
`DrumMapEntryOverride` addition and its `EngineConfig`/`DEFAULT_CONFIG`/
`resolveConfig` wiring; revert `core/note.ts`'s `instrumentId` field and
`parse.ts`'s threading of it; revert `render-from-musicxml.ts`'s
`RenderCtx.midiInstrumentsByPart` field and the `gmNote`/`drumEntry`
logic in `renderNoteheadPart`/`renderNoteOrRest`; remove its `export *
from` line from `src/index.ts`; delete `test/unit/drum-mapping.test.js`,
`test/unit/gm-drum-wiring.test.js`, `test/fixtures/musicxml/
gm-drum-mapping.musicxml`, and its saved snapshot; revert the
`SRC_DIRS`/coverage-scan changes in `test/unit/diagnostics-hardening.test.js`
back to not scanning `drums/`.
