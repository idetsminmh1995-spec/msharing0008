# `src/musescore/` — MuseScore's notation data, re-expressed

MuseScore's notation data, read out of its source at one pinned
revision and re-expressed in this project's own shapes: which line a
drum sits on, which glyph a notehead group draws, which clef a
`<sign>G</sign>` means, how much room a quarter note gets, how thick a
ledger line is.

**It is load-bearing now.** It began as a reference to compare against,
imported by nothing, with the engine keeping its own answers beside it —
and the two disagreed in eighteen places. They do not any more. The
engine's default drum kit IS `drumset.ts`, its spacing law IS
`spacing.ts`, its engraving defaults ARE `style.ts`'s. A number here is
not a second opinion to consult; it is the number the renderer uses,
with a line of MuseScore behind it a reviewer can open.

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

## What the engine takes from it, with no config at all

| Engine default | Comes from |
|---|---|
| `DEFAULT_DRUM_MAPPING_TABLE` — all 61 drums | `drumset.ts` + `adapters.ts` |
| `spacing.law: 'musescore'` — 3.5sp a quarter, ×1.5 a doubling | `spacing.ts` |
| `minNoteDistance` 0.35, `minMeasureWidth` 8.0 | `style.ts` |
| `minStaffDistance` 6.5, `minSystemDistance` 8.5 | `style.ts` |
| A tab staff's lines 1.5 apart | `strings.ts` |
| The rhythm slash, and the Aikin `ti` | `noteheads.ts` |

All of it stays overridable. `spacing.law: 'increment'` puts §14's own
law back; `config.drums.mapping` replaces any drum; every measurement in
`config` is a number a caller may write.

## Using it directly

`adapters.ts` turns MuseScore's own terms into this engine's, for a
caller building a part rather than reading one:

```ts
import { MuseScore } from 'notation-engine';

// Which voice MuseScore files each drum in — what puts the feet on a
// stems-down line.
MuseScore.drumVoicesFromMuseScore();
```

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

## Where this engine and MuseScore disagreed

All five are closed. `test/unit/musescore.test.js` asserts the drum
difference list is EMPTY, so a new one cannot appear unnoticed.

- ~~**Drum table.**~~ The default kit is MuseScore's: 61 drums, every
  one on MuseScore's line wearing MuseScore's head. The toms, the ride
  and the ride bell moved; the side stick, hand clap, open hi-hat,
  china cymbal and cowbell changed head. §13.3 remains right that
  notators vary — which is why the table is still fully overridable —
  but every file this engine is given was written in MuseScore, and
  MusicXML carries a drum as a MIDI number and nothing else.
- ~~**Shape-note `ti`.**~~ `noteShapeTriangleRound*`, which is Aikin's.
  The keystone belongs to the Funk shapes, a different seven-shape
  system.
- ~~**Rhythm slash.**~~ `noteheadSlashHorizontalEnds`.
- ~~**Horizontal spacing.**~~ MuseScore's power law is the default, with
  its segment rule: a segment that a shorter note runs through is priced
  linearly off that note rather than by the law, which is what keeps two
  voices vertically aligned.
- ~~**Tab staves.**~~ Lines 1.5 staff spaces apart.

### One difference that is not one

MuseScore's `staffLineWidth` style default is 0.11 and this engine draws
0.13. Both are right. MuseScore LOADS a font's own `engravingDefaults`
and lets `staffLineThickness` overwrite that style
(`EngravingFont::loadEngravingDefaults`), and Bravura says 0.13. This
engine reads the same font metadata, so with the same font the two
already agree — and changing 0.13 to 0.11 here is what would make them
differ.
