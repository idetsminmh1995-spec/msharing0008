# Integration Pass D — Tempo marks

**Status:** complete. 468/468 tests pass. A real metronome mark (e.g. "a
dotted quarter note equals 96") now renders above the staff, assembled
entirely from real SMuFL glyphs.

**Not a numbered plan phase** — the fourth and last of this session's
corrective/integration passes, following A (grand staff), B (multi-part +
staff-line counts), and C (tab fret numbers).

## 0. The scoping assumption was wrong again, and checking first showed it

Phase 31's `tempoMarkSide()` was placement-only, its own comment stating
a real tempo mark "needs general multi-glyph/text composition this
engine hasn't built yet." Checking the glyph table before assuming that
was still true -- the same check that turned out to matter for
Integration C's tab digits -- found SMuFL ships a dedicated `metNote*`
family, one glyph per `DurationType` this engine already supports
(whole through 1024th), plus `metAugmentationDot` for dotted values. No
metronome-specific "=" exists, but `timeSigEquals` is a real, genuinely
symmetric equals-sign shape (confirmed via its own bounding box, not
assumed from its name) that other engines commonly reuse here for
exactly this reason.

A tempo mark needs **no text font at all** -- only glyph assembly this
engine already knows how to do, the same technique Phase 28's tuplet
numbers, Phase 41's tab digits, and Integration C's fret numbers all
already use.

## 1. What was built

**`geometry/metronome.ts`** -- `metronomeNoteGlyphName` (a full
`DurationType -> metNote*` table), `metronomeDotGlyphName`,
`metronomeEqualsGlyphName`, `metronomeBpmDigitGlyphNames` (reusing
Integration C's `fingering0-9` digit family, for consistency rather than
a third digit source).

**`render/metronome.ts`** -- `renderMetronomeMark`: note glyph, an
optional dot, "=", then every BPM digit, left to right along one shared
baseline, each glyph advancing by its own real bounding-box width -- the
same measure every other multi-glyph assembly in this codebase uses.

**Parser** (`parse.ts`) -- `<direction><direction-type><metronome>` is
now read: a new `TempoMarkEvent` (partId, measureNumber, tick, beatUnit,
beatUnitDots, perMinute), collected into a new `tempoMarks` side-table on
`ParseResult`, the same shape as `midiInstrumentsByPart`. Recorded at the
measure-local tick where the `<direction>` was encountered -- a direction
is a marking, not a note, and never advances the shared cursor.
`isKnownDurationType` (previously private to `note.ts`) was exported so
`<beat-unit>`'s string could reuse the exact same validation `<type>`
already uses.

**`render-from-musicxml.ts`** -- draws each measure's tempo marks **once**
(above the topmost staff, per `tempoMarkSide()`), never once per staff --
a tempo mark describes the whole system, not one staff of it. Positioned
horizontally the same way notes are, from the mark's own recorded tick
against the measure's real total length.

## 2. A real regression I introduced, and how it was caught

The first version made `<direction>` "handled" the moment it had its own
branch -- but a `<direction>` containing something other than
`<metronome>` (`<words>`, `<dynamics>`, `<wedge>`) produced **no
diagnostic at all**, silently swallowed instead of the previous
`UNKNOWN_ELEMENT` info every such element used to get. An existing test
(built for Integration B/earlier work, using exactly this kind of
`<direction>` as its example) caught this immediately on the first
`npm run verify`.

**Fix:** the `<direction>` branch now tracks whether it recognized
*anything* inside it; if not, it falls back to the identical
`UNKNOWN_ELEMENT` diagnostic every other unhandled element already gets.
Nothing about "this element now has its own branch" is allowed to make
its unsupported content quieter than before.

## 3. How this was verified

`npm run verify` clean, **468/468** (16 new tests + 1 visual snapshot).

Every `DurationType` checked for a real, distinct `metNote*` glyph; the
dot and equals glyphs confirmed real; every digit 0-9 confirmed to reuse
Integration C's exact `fingering*` family (not a coincidentally-similar
one); digits 6-9 specifically (the family's own non-contiguous-codepoint
trap, already known from Integration C, re-checked here since a new
call site is exactly where that mistake could resurface); a 3-digit BPM
returning digits in the right order; negative/fractional BPM throwing.

Parsing checked against a real fixture: a dotted quarter at 96 BPM
producing exactly the right `beatUnit`/`beatUnitDots`/`perMinute`; a
non-metronome `<direction>` still producing `UNKNOWN_ELEMENT`; a
malformed `<metronome>` (missing `<per-minute>`) producing
`UNSUPPORTED_METRONOME` and never throwing.

Rendering checked against the actual glyph coordinates, not just
"something rendered": the mark sits above the staff top (y < 4); every
one of its five components (note, dot, equals, both BPM digits) shares
the exact same baseline y; the dot follows the note; the two digits of
"96" appear in the correct left-to-right order; the equals sign sits
between the note/dot and the digits; and a file with no tempo mark draws
none of these glyphs at all.

## 4. Known limitations (stated, not silently missing)

- **Only `<metronome>` is drawn.** A tempo *word* (`<words>Allegro
  moderato</words>`, common alongside or instead of a metronome number)
  is not -- that genuinely is arbitrary text, unlike a BPM number, and
  still needs the general text-font system Phases 31/32/33 are all
  waiting on.
- **Multiple simultaneous beat units** (e.g. "dotted quarter = quarter"
  metric modulation) are not supported -- only a single beat-unit/BPM
  pair per `<metronome>`.
- **Only one tempo mark's worth of spacing was tuned by eye**
  (`noteToEqualsGap`); it has not been checked against a second real
  tempo mark placed close to it on the same system.
- **No collision avoidance** with other above-staff marks (articulations
  in multi-voice contexts, rehearsal marks once those exist).

## 5. How to modify it

- **Draw tempo words** -- the natural next consumer of whatever general
  text/font system eventually gets built for Phases 31/32/33; would live
  alongside this in the same `<direction>` branch.
- **Metric modulation** -- would need `TempoMarkEvent` to carry a second
  beat-unit/dots pair and `renderMetronomeMark` to draw a second
  note+dot group after the first, with its own equals-and-arrow.

## 6. How to revert

Delete `src/geometry/metronome.ts`, `src/render/metronome.ts`,
`test/unit/tempo-mark.test.js`,
`test/fixtures/musicxml/tempo-mark.musicxml` and its snapshot; remove
their `export * from` lines from the geometry/render barrels; revert
`parse.ts`'s `TempoMarkEvent`/`tempoMarks` additions and the
`<direction>` branch (restoring the plain `UNKNOWN_ELEMENT` case for
every `<direction>`); revert `note.ts`'s `isKnownDurationType` export;
revert `render-from-musicxml.ts`'s tempo-mark drawing block and its
`tempoMarks` destructure.
