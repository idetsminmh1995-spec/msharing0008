# `src/notation-defaults/` — the engine's own notation data

The data the renderer needs: which glyph draws a clef, which line a drum
sits on, how much room a quarter note gets, the open strings of a guitar.
Every value here is either a public fact or one of this project's own
house decisions, and the source of each is named beside it.

## The rule this folder keeps

- A **fact** — a General MIDI key number, a SMuFL glyph name, a standard
  tuning, the reference pitch a clef pins to a line — is stated once, with
  the public specification it comes from (`sources.ts`).
- A **house choice** — how thick our staff line is, how much room a
  quarter note gets — is stated once, as our decision, with the reasoning
  beside it.

Nothing here is copied from another notation program's source, and nothing
here carries another program's licence. Where a value is settled practice
that no single spec pins down (where a snare sits on a drum staff), it is
marked `convention` rather than `standard`, and the convention is named.

## What is here

| File | What it holds | Source |
|---|---|---|
| `sources.ts` | the public specifications this folder reads from | — |
| `clefs.ts` | every clef: glyph line, pitch offset, SMuFL glyph, key-signature lines | SMuFL, MusicXML |
| `staff-position.ts` | pitch → staff line, and the one top-down/bottom-up conversion | MusicXML |
| `noteheads.ts` | notehead groups and the MusicXML `<notehead>` mapping | SMuFL, MusicXML |
| `drum-kit.ts` | the standard 61-key GM drum kit, its lines and noteheads | General MIDI 1, drum notation |
| `strings.ts` | fretted-instrument strings, fret arithmetic, staff-type presets | standard tunings |
| `engraving-style.ts` | line/stem/beam/slur thicknesses and the house measurements | SMuFL engravingDefaults, house |
| `spacing-law.ts` | the duration-to-width law, and the multi-voice segment rule | house |
| `adapters.ts` | the data as the engine's own `config.drums.mapping` shape | — |

## The three conventions that are easy to get backwards

1. **Staff lines.** `line` here counts from the **top**: 0 is the top
   staff line, +1 is half a space **downward**. This engine draws from the
   bottom, up is negative. `staffPositionFromLine` is the only place that
   conversion is written.
2. **String numbers.** String 1 is the **highest** string — the top line
   of a tab staff. The finger engines index from the lowest;
   `stringIndexFromLowest` says so.
3. **MusicXML's `cross` is the PLUS (+); its `x` is the X.** Reading them
   the other way round turns every hi-hat into a plus sign and the file
   gives no hint anything is wrong.

And one that is not a convention but a real distinction: an **electric
guitar does not transpose** — its octave is carried by an 8vb treble
clef — while an **electric bass does** (`transposeChromatic -12`). So a
guitar's string pitches are the ones it sounds and a bass's are not.
`writtenPitchFor` is that one line, and it is the difference between a
bass fingering that is right and one that is an octave out.

## What the engine takes from it, with no config at all

| Engine default | Comes from |
|---|---|
| `DEFAULT_DRUM_MAPPING_TABLE` — all 61 drums | `drum-kit.ts` |
| `spacing.law: 'power'` — 3.5sp a quarter, ×1.5 a doubling | `spacing-law.ts` |
| `minNoteDistance` 0.35, `minMeasureWidth` 8.0 | `engraving-style.ts` |
| `minStaffDistance` 6.5, `minSystemDistance` 8.5 | `engraving-style.ts` |
| A tab staff's lines 1.5 apart | `strings.ts` |
| Note/ledger/slur/dot distances | `engraving-style.ts` |

All of it stays overridable through `EngineConfig`; a value here is the
answer to "what if the caller says nothing".

## Adding a kit of your own

The standard kit is a default, and a customised kit may not be using it: a
drum palette edited in an app, or a custom drumset file, moves instruments
to other lines and gives them other heads, and the exported MusicXML
carries the MIDI keys without a word about any of it.

**Do not edit the table.** A difference goes in an override:

```ts
import { drumMapping } from './notation-defaults/index.js';

drumMapping({
  name: "the owner's kit",
  drums: [{ pitch: 38, line: 5, evidence: 'screenshot 2026-10-03, bar 5' }],
});
```

`evidence` is required. An override with nothing behind it is the guess
this whole layer exists to avoid.
