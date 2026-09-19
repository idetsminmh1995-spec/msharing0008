# Phase 35 (completion) — MusicXML parser v2, Tier 2/3

**Status:** complete. `npm run verify` passes clean (646 tests).

Phase 35 originally landed **Tier 1** of `PLAN.md` §10.4 (`<midi-instrument>`,
`<notehead>`, `<grace>`, `<time-modification>`, `<stem>`, `<accidental>`) and
recorded the rest as a stated gap. This pass closes it: every element §10.4
names is now parsed. It also closes **`STATUS.md` §C3** (additive meters) and
the `<beam>` half of **§10.8**'s cross-software divergence list.

Parsing is the whole of this document. What the renderer then *draws* with
the new data is Integration passes H–L, each with its own record.

## 1. What was written

### `src/core/note.ts` — where notations live

`Note` gained `articulations`, `ornaments`, `hasFermata`, `slurStarts`,
`slurStops`, `tupletStart`, `tupletStop`, `beams`, `lyrics`; `Rest` gained
`hasFermata` (a rest can carry one exactly as a note can).

`ArticulationType` and `OrnamentType` are **declared here**, in the layer that
owns the `Note` they attach to, and re-exported by `geometry/articulation.ts`
and `geometry/ornament.ts`. One declaration, not two that drift — the same
arrangement `geometry/flag.ts` already has with `DurationType`, and the reason
`export *` from both layers in `index.ts` stays unambiguous.

Every field is **omitted when empty**, never set to `[]` or `false`. A note
from a file with no notations therefore produces a byte-identical object to
the one it produced before this pass, which is what keeps every pre-existing
snapshot and deep-equality test valid. There is a test asserting exactly this.

### `src/parser/musicxml/notations.ts` (new)

Everything that hangs off a single `<note>`:

- `parseNotations` — `<slur>`, `<tuplet>`, `<fermata>`, `<articulations>`,
  `<ornaments>`. `<tied>` and `<technical>` are deliberately **not** read here;
  `parseNoteElement` already owns both, and reading them twice is how two
  copies eventually disagree.
- `parseBeamHints` — `<beam number="N">`.
- `parseLyrics` — `<lyric>`, joining several `<text>` children (an elision)
  rather than keeping only the first.

Two mappings are tables, not casts, because MusicXML and engraving convention
genuinely use different names for the same mark: `strong-accent` → `marcato`,
and (in `direction.ts`) `diminuendo` → `decrescendo`.

`inverted-mordent` is **deliberately absent** from the ornament table. §9.20
records that no simple inverted-mordent glyph exists in this SMuFL build, so
mapping it onto the plain `mordent` glyph would draw a different ornament than
the file asked for. It reports `UNSUPPORTED_ORNAMENT` instead.
`<accidental-mark>` modifies an ornament rather than being one, so it is
skipped without a diagnostic.

### `src/parser/musicxml/direction.ts` (new)

`<direction>`'s own sub-elements: `<dynamics>`, `<wedge>`, `<words>`,
`<rehearsal>`, plus `<sound tempo>`. `<metronome>` stays where Integration D
put it (in `parse.ts`, feeding `tempoMarks`).

Per §4.1 the parser depends on `core/` only, so `ParsedDynamicLevel` and
`ParsedWedgeType` are declared **structurally** here rather than imported from
`geometry/` — the same explicitly-documented arrangement `config/config.ts`
uses for `DrumMapEntryOverride`. They are written to match
`geometry/dynamic.ts` and `geometry/hairpin.ts` exactly, so a renderer passes
one straight to the other with no cast.

`<words>` and `<rehearsal>` text is **preserved but not drawn** — §9.21's
text-font gap is real and unchanged. §10.7's no-silent-loss rule is why the
text is carried at all.

### `src/parser/musicxml/harmony.ts` (new)

`<harmony>`, kept **raw and un-reduced**. This is the important decision in
the file: collapsing e.g. `minor-seventh` onto §9.23's `minor` quality glyph
would draw "Cm" for a file that says "Cm7" — a silent musical error. §9.23
already states that assembling a chord symbol is "meaningless to build before
the root letter itself can be drawn", so the parser preserves and stops.

### `src/parser/musicxml/parse.ts`

Three new side-tables on `ParseResult`, for the same reason `tempoMarks`
already is one (these attach to a POSITION, not a note, and Phase 3's core
`Score` deliberately has nowhere to put them):

| Field | What |
|---|---|
| `directions` | every `<direction>` with recognized content, at its measure-local tick, with staff and placement |
| `harmonies` | every `<harmony>`, at its tick |
| `prints` | every `<print>` asking for a system or page break (§16.2 consumes this directly) |

`<sound tempo>` becomes a quarter-note `TempoMarkEvent`. A `<direction>`
carrying **both** `<metronome>` and `<sound tempo>` (MuseScore routinely emits
both) produces exactly **one** mark — the notated one, which carries a real
beat unit. There is a test for this; without it every such file would get two
tempo marks at one tick.

### `src/parser/musicxml/attributes.ts` — additive meters (`STATUS.md` §C3)

**A real bug, not just a missing feature.** `<beats>3+2+2</beats>` was read
with `intOf`, i.e. `Number.parseInt`, which stops dead at the `+` and returns
**3**. Every 7/8 file written the common way parsed as 3/8 — a silently wrong
time signature, wrong beat structure for beaming, and a spurious
`MEASURE_OVERRUN` warning on every measure.

Now both forms are handled (one `<beats>` holding `"3+2+2"`, or several
`<beats>`/`<beat-type>` pairs): the terms are summed for `timeNumerator`, and
the written form is kept separately as `timeNumeratorDisplay` for drawing.
Phase 12 could already render `numeratorDisplay`; nothing read it from a file
until now. An ordinary meter leaves the field absent, so existing snapshots
are untouched, and a later ordinary `<time>` clears a previous additive
display.

### `src/geometry/beam.ts` — explicit `<beam>` hints (§10.8)

`hasExplicitBeams` and `groupBeamsFromHints`. §10.8 names "beams given
explicitly via `<beam>` vs. left for the renderer to infer" as a real
cross-software divergence, and a file that states its own beaming is the
authority on it. `renderFromMusicXml` now uses the hints whenever any note in
a voice carries a level-1 one, and falls back to Phase 23's time-signature
inference only when none does.

Level 1 is read because level 1 decides GROUPING; levels 2+ only add secondary
beams within a group, and §9.13 already takes its line count from the group's
durations. Malformed hints never throw: a `continue`/`end` with no open group
opens one, and a group of fewer than two events is dropped exactly as
`groupBeams` drops it.

## 2. How to modify it

| Want to change | Where |
|---|---|
| Which articulations/ornaments are recognized | `ARTICULATION_BY_ELEMENT` / `ORNAMENT_BY_ELEMENT` in `notations.ts`. Adding one needs a matching glyph in `geometry/articulation.ts`/`ornament.ts` first, or it will draw nothing |
| Which dynamics are recognized | `DYNAMIC_ELEMENTS` in `direction.ts`, and `GLYPH_NAMES` in `geometry/dynamic.ts` |
| Whether `<sound tempo>` can override a `<metronome>` | the `producedTempoMark` guard in `parse.ts`'s `<direction>` branch |
| Whether a `<print>` with only layout hints stays silent | the `ignoredPrintChildren` diagnostic in the same file |
| Which `<beam>` level decides grouping | the `b.number === 1` filter in `render-from-musicxml.ts` |

## 3. How to revert it

Deleting `notations.ts`, `direction.ts` and `harmony.ts` requires removing:
their imports and call sites in `note.ts`/`parse.ts`; the `notations`/`beams`/
`lyrics` fields on `ParsedNoteEvent`; the `directions`/`harmonies`/`prints`
fields on `ParseResult` (and their two early-return sites); the new `Note`/
`Rest` fields; the re-exports in `geometry/articulation.ts` and
`geometry/ornament.ts` (restore their local type declarations); and
`parser/musicxml/index.ts`'s type exports.

Integration passes H–L all consume this data, so revert those first or they
stop compiling. The additive-meter fix and the `<beam>` hints are independent
and can be reverted on their own.

Tests: `test/unit/musicxml-parser-v2-tier23.test.js`, the new
`explicit <beam> hints` block in `test/unit/beam.test.js`, and the additive
meter case in `test/unit/bugfixes-phase47-review.test.js`.
