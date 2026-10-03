# `src/musescore/` — MuseScore's notation data, re-expressed

A **data layer**, not an engine. Nothing in here draws anything and
nothing in the renderer imports it. It answers, in this project's own
shapes, the questions MuseScore answers in its source: which line a
drum sits on, which glyph a notehead group draws, which clef a
`<sign>G</sign>` means, how much room a quarter note gets, how thick a
ledger line is.

It exists because the scores this project renders are **exported from
MuseScore** (every one of the owner's files says `MuseScore Studio
4.7.4` in its `<encoding>`), and MusicXML carries almost none of this:
a drum note is a MIDI number and nothing else, so two programs reading
the same file draw two different charts unless they agree on the table
behind it.

## Where it came from

Everything is read from one pinned revision — see `provenance.ts` —
and every table names the MuseScore file and symbol it came from:

| This file | MuseScore source |
|---|---|
| `clefs.ts` | `src/engraving/dom/clef.cpp` → `ClefInfo::clefTable[]`, and the importer's own `<clef>` branch ladder |
| `staff-position.ts` | `src/engraving/dom/utils.cpp` → `absStep` / `relStep`; `rendering/score/chordlayout.cpp` for ledger lines |
| `noteheads.ts` | `src/engraving/dom/note.cpp` → `noteHeads[2][…][…]`; `importmusicxmlpass2.cpp` → `convertNotehead` |
| `drumset.ts` | `src/engraving/dom/drumset.cpp` → `Drumset::initDrumset()`; names from `types/typesconv.cpp` |
| `strings.ts` | `share/instruments/instruments.xml` → `<StringData>`; `dom/stringdata.cpp`; `dom/stafftype.cpp`; `string_tunings_presets.json` |
| `style.ts` | `src/engraving/style/styledef.cpp`; beam spacing from `rendering/score/beamtremololayout.cpp` |
| `spacing.ts` | `src/engraving/rendering/score/horizontalspacing.cpp` |

No MuseScore code is copied here — not a line of C++. What is recorded
is factual data (the GM percussion map, SMuFL glyph names, standard
tunings, engraving measurements) re-stated in this project's own
structures. MuseScore is GPL-3.0-only; its instrument catalogue,
translated strings and sound fonts are deliberately **not** reproduced.

## The three conventions that are easy to get backwards

1. **Staff lines.** MuseScore counts from the **top**: line 0 is the top
   staff line, +1 is half a space **downward**. This engine counts from
   the bottom, up is negative. `staffPositionFromLine` is the only place
   that conversion is written.
2. **String numbers.** MuseScore's string 0 is the **highest** string —
   the top line of a tab staff. This project's finger engines number
   from the lowest. `stringIndexFromLowest` says so.
3. **MusicXML's `cross` is the PLUS (+); its `x` is the X.** Reading
   them the other way round turns every hi-hat into a plus sign and the
   file gives no hint anything is wrong.

And one that is not a convention but a real distinction: an **electric
guitar does not transpose** — its octave is carried by an 8vb treble
clef — while an **electric bass does** (`transposeChromatic -12`). So a
guitar's string pitches are the ones it sounds and a bass's are not.
`writtenPitchFor` is that one line, and it is the difference between a
bass fingering that is right and one that is an octave out.

## Using it

Opt-in, through `adapters.ts`. Nothing changes for a caller that does
not ask:

```ts
import { MuseScore } from 'notation-engine';

renderFromMusicXml(xml, {
  config: { drums: { mapping: MuseScore.drumMappingFromMuseScore() } },
});
```

`museScoreEventSpace(ticks, ticksPerQuarter)` is MuseScore's spacing law
(3.5 staff spaces for a quarter note, ×1.5 per doubling) for a caller
that wants its horizontal look rather than §14's.

## Adding the owner's own MuseScore

A MuseScore that has been customised — a drum palette edited in the
app, a custom drumset file — puts instruments on other lines, and the
exported MusicXML says nothing about it.

**Do not edit the tables.** They are a faithful record of what MuseScore
ships, and that is their value. A difference goes in an override:

```ts
MuseScore.drumMappingFromMuseScore({
  name: "the owner's kit",
  drums: [{ pitch: 38, line: 5, evidence: 'screenshot 2026-10-03, bar 5' }],
});
```

`evidence` is required. An override with nothing behind it is the guess
this whole layer exists to avoid.

## Where this engine and MuseScore disagree today

Found by `test/unit/musescore.test.js`, which asserts the list exactly
so a new difference cannot appear unnoticed:

- **Drum table.** Kick, snare, both hi-hats and the crash agree. Toms
  are consistently half a space apart between the two tables, the ride
  and ride bell sit a half space lower in MuseScore, and five
  instruments wear a different head (side stick, electric snare, open
  hi-hat, china, tambourine, cowbell). §13.3 is explicit that real drum
  practice varies, so these are differences rather than bugs — but they
  are differences a MuseScore export will show.
- **Shape-note `ti`.** This engine draws `noteShapeKeystone*`; MuseScore
  draws `noteShapeTriangleRound*` for Aikin ti and keeps the keystone
  for the Funk shapes.
- **Rhythm slash.** This engine's filled slash is
  `noteheadSlashVerticalEnds`; MuseScore's is
  `noteheadSlashHorizontalEnds`.
- **Horizontal spacing.** §14 adds a fixed increment per doubling;
  MuseScore multiplies by 1.5. They agree at the reference duration and
  nowhere else — a whole note is 7.9 spaces to MuseScore and 4.8 to §14.
- **Tab staves.** MuseScore draws six lines a space and a half apart;
  this engine draws five, evenly.
