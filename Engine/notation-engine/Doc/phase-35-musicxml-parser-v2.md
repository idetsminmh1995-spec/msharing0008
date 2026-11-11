# Phase 35 — MusicXML Parser v2 (Tier 1)

**Status:** the six highest-value v2 elements — `<midi-instrument>`,
`<notehead>`, `<grace>`, `<time-modification>`, `<stem>`, `<accidental>`
— are parsed, threaded through the core data model, and wired end to end
into `renderFromMusicXml`. 312/312 tests pass. The remaining `§10.4`
elements (Tier 2/3: `<notations>` sub-elements, `<direction>`
sub-elements, `<lyric>`, `<harmony>`, `<print>`, `<sound tempo>`) are
explicitly **not** covered here — see §5.

Found and fixed **two real bugs** during this phase's own fixture-driven
verification, before either shipped — see §2 and §3.

## 0. Scoping this deliberately as "Tier 1," not all of §10.4

`§10.4`'s full v2 element list is large (12+ distinct element
categories). Rather than attempt all of it in one pass at reduced rigor,
this phase prioritized the elements that are both (a) the most directly
useful to the project's actual driving use case (the drum-video app's
percussion notation) and (b) already fully supported by existing
geometry/rendering from Phases 15/16/19/28/34 — meaning parsing these six
elements immediately activates real, already-tested rendering behavior
rather than adding inert data. Each was chosen deliberately:

- `<midi-instrument>` (with `<midi-unpitched>`) is exactly what the A+B+C
  work's own `Doc/STATUS.md` §F1/§F2 items were waiting on for correct
  drum notehead shapes.
- `<notehead>`, `<grace>`, `<time-modification>`, `<stem>`, `<accidental>`
  each activate a specific piece of already-built, already-tested
  rendering (Phase 15's notehead override tier, Phase 34's grace glyphs,
  Phase 4's tuplet ratio math, Phase 16's explicit-direction tier, Phase
  19's courtesy-accidental tier) that had no real MusicXML data feeding
  it until now.

## 1. What was written

**`src/parser/musicxml/instrument.ts`** (new) —
**`parseMidiInstrumentMap(scorePartEl)`**: parses a `<score-part>`'s
`<midi-instrument>` children into a map from `<midi-instrument
id="...">` to its GM percussion note number, applying `§10.5`'s
documented off-by-one (MusicXML's `<midi-unpitched>` is 1-based, GM is
0-based) — confirmed via a test, not just implemented and assumed
correct.

**`src/parser/musicxml/note.ts`** — `ParsedNoteEvent` gained six new
fields: `explicitNotehead`, `isGrace`/`graceSlash`,
`tupletActualNotes`/`tupletNormalNotes`, `explicitStemDirection`,
`hasExplicitAccidental`. All parsed as direct children of `<note>`,
independent of whether the note is pitched/unpitched/a rest.

**`src/core/note.ts`** — the core `Note`/`NoteInit` types gained the same
six fields (mirrored, not duplicated logic), following the *exact*
precedent already set by `tieStart`/`tieStop`: small, well-precedented
per-note optional fields, not a larger data-model change.

**`src/parser/musicxml/parse.ts`**:
- `ParseResult` gained `midiInstrumentsByPart`, a new side-table (the
  same shape as `attributes`) rather than adding a `gmNote` field to the
  core `Note`/`Pitch` types — this is exactly the kind of "extra fact a
  renderer might want, that Phase 3 deliberately keeps out of the
  musical data model" `MeasureAttributes` already exists for. Phase 41's
  own GM-note-to-notehead-shape default table is what will actually
  consume this map; this phase only makes it available.
- `buildDuration` now populates `Duration.tuplet` from the parsed ratio
  when present, confirmed (by reading Phase 4's own `duration-math.ts`
  comments first) that `Duration.ticks` already reflects the
  tuplet-adjusted value directly from MusicXML's `<duration>` — so the
  ratio is attached for *display* purposes only, never used to
  re-derive ticks a second time.

**`src/render-from-musicxml.ts`** wires all six through:
- `selectNoteheadGlyphName` now receives `explicitNotehead` when present.
- `evaluateAccidental` now receives `hasExplicitAccidental`.
- `resolveStemDirection` now receives `explicitDirection` from
  `explicitStemDirection`, for both ordinary notes and grace notes.
- A new grace-note branch in `renderNoteOrRest`, checked **before** the
  ordinary note/beam-group branching, draws the note as one precomposed
  Phase 34 glyph (`graceNoteGlyphName`) rather than assembling a
  notehead+stem+flag the ordinary way — including its own accidental
  handling (a grace note's pitch can still need one).

## 2. A real bug caught immediately by the fixture: grace notes and MISSING_DURATION

The first draft's fixture produced spurious `MISSING_DURATION` warnings
for its two grace notes. A `<grace/>` note legitimately has **no**
`<duration>` at all by MusicXML's own design — it borrows time from the
adjacent main note rather than occupying any of its own — so treating an
absent `<duration>` as an error was wrong specifically for this case.
Worse, the fallback behavior (assume one quarter note's worth of ticks)
would have given each grace note real rhythmic weight, incorrectly
advancing the shared tick cursor as if they were ordinary notes — which
also caused a spurious `MEASURE_OVERRUN` warning on the same fixture
(two extra quarter notes' worth of phantom ticks pushed the voice's
total over the time signature's capacity).

**Fix:** check `<grace/>` presence *before* duration parsing; if
present, set `ticks = 0` directly and skip the `MISSING_DURATION`
diagnostic entirely, rather than falling into the generic missing-
duration path. Confirmed after the fix: the same fixture produces **zero**
diagnostics, and the real (non-grace) notes' ticks sum to exactly 1920
(one full 4/4 measure) — 480 (quarter) + 960 (3 triplet eighths, "3 in
the time of 2" = exactly 2 real eighths' worth) + 480 (quarter).

## 3. A second real bug: grace notes swept into an unrelated beam group

Even after the ticks fix, the two grace notes still didn't render as
their own distinct glyphs — inspecting the raw SVG output showed 5
identical plain `noteheadBlack` glyphs where 2 grace notes + 3 triplet
notes should have produced 2 grace glyphs + 3 ordinary noteheads. Phase
23's `groupBeams` had no concept of grace notes at all, and correctly
(by its own rules) saw two consecutive `eighth`-duration, non-rest events
immediately followed by three more — forming one 5-note beam group that
swallowed the grace notes into `renderBeamGroup`'s ordinary rendering
path, which has no grace-note awareness and never reaches the new
grace-note branch in `renderNoteOrRest` at all.

**Fix, in two layers**: (1) the `beamableEvents` mapping passed to
`groupBeams` now treats a grace note the same as a rest for grouping
purposes (`isRest: event.kind !== 'note' || event.isGrace === true`),
excluding it from beam consideration entirely; (2) as defense in depth,
the per-event render branch now checks `isGrace` *before* checking
`beamedIndices`, so a grace note is routed to its own rendering path
unconditionally even if some future change reopened the upstream gap.
Confirmed after the fix: the rendered SVG shows the two grace notes as
their own distinct, correctly-chosen glyphs
(`graceNoteAcciaccaturaStemDown` for the slashed one,
`graceNoteAppoggiaturaStemDown` for the unslashed one) immediately before
the (now correctly 3-note) triplet group.

## 4. How this was verified

Ran `npm run verify` clean, 312/312 (12 new tests + 1 visual snapshot).
Every Tier 1 element checked both at the **parse level** (the right
field lands on the right `ParsedNoteEvent`/`Note`) and, separately, at
the **rendered-output level** (the actual glyph/coordinate that
results), using one real, deliberately dense fixture
(`v2-elements.musicxml`) rather than one fixture per element:
- `midi-instrument` → GM 42 confirmed from
  `<midi-unpitched>43</midi-unpitched>` (the off-by-one correction, not
  just presence).
- `explicitNotehead` → `'x'` captured on the parsed Note, and confirmed to
  actually render as `noteheadXBlack` (`U+E0A9`) in the output SVG.
- Grace notes → zero ticks, no spurious diagnostic, the slash/no-slash
  distinction captured correctly per note, and confirmed to render as the
  correct distinct precomposed glyphs rather than being silently absorbed
  into a neighboring beam group.
- `time-modification` → the exact `{actualNotes: 3, normalNotes: 2}`
  ratio landing on all 3 real tuplet notes' `Duration.tuplet`.
- Explicit `<stem>` → captured on the Note, and confirmed via the
  rendered stem coordinates that **all 3** tuplet notes actually rendered
  with a down stem, not just that the field was set.
- Explicit `<accidental>` → confirmed the courtesy natural sign actually
  renders even though the note's own pitch already matched what the
  (default C-major) key implies — the one case that specifically proves
  the override is doing something, not merely present.

## 5. Known scope boundaries — explicitly NOT this phase

Per `§10.4`, still unparsed (Tier 2/3, real remaining work, not silently
forgotten):
- **`<notations>` sub-elements** — `<tied>` (redundant with the
  already-parsed `<tie>` but not cross-checked), `<slur>`,
  `<tuplet>` (the bracket start/stop *display* hint, separate from
  `<time-modification>`'s ratio — this is specifically why Phase 28's
  tuplet bracket/number is **not** drawn yet even though the ratio data
  now exists), `<articulations>`, `<ornaments>`, `<fermata>` (not even
  specified anywhere yet — a genuine gap Phase 30 didn't cover either).
- **`<direction>` sub-elements** — `<dynamics>`, `<wedge>`,
  `<metronome>`, `<words>`, `<rehearsal>` (would wire Phase 31).
- **`<lyric>`** (would wire Phase 32's punctuation; syllable text itself
  remains blocked on the missing text-font system regardless).
- **`<harmony>`** (would wire Phase 33's accidental/quality glyphs; root
  letter remains blocked on the same text-font gap).
- **`<print>`**, **`<sound tempo>`** — layout/timing hints, lower
  priority given Stage 8/Phase 40 own the real layout/timing work.
- **`<beam>`** — explicit beam hints from the file. Currently
  `groupBeams` always computes its own grouping automatically; a real
  file's explicit beam data should arguably take priority when present,
  which is not yet implemented.

## 6. How to modify it

- **Add a Tier 2 element** — follow the same pattern as this phase: add
  a field to `ParsedNoteEvent`, mirror it onto `Note`/`NoteInit` if it's
  genuinely per-note, parse it in `note.ts`, thread it through
  `parse.ts`'s `buildSingle`, then wire it into
  `render-from-musicxml.ts` using whichever existing geometry function
  it activates.
- **Consume `midiInstrumentsByPart` for real notehead-shape mapping** —
  Phase 41's job: build the GM-note-to-notehead-shape default table and
  feed it into `selectNoteheadGlyphName`'s `overridesByKey` using
  `noteheadMappingKey`'s existing GM-note-keyed format.

## 7. How to revert/remove it

Delete `src/parser/musicxml/instrument.ts` and
`test/unit/musicxml-parser-v2.test.js`; revert `note.ts`'s six new
fields, `core/note.ts`'s matching six fields, `parse.ts`'s
`midiInstrumentsByPart`/tuplet-ratio wiring, and
`render-from-musicxml.ts`'s six wiring points (including the grace-note
branch and the two beam-grouping bug fixes, which would need their own
re-verification if grace notes are ever reintroduced without this
phase's fixes); delete the `v2-elements.musicxml` fixture and its
snapshot; remove the added test case from `test/visual/rendering.test.js`.
