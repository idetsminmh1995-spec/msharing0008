# Phase 50 — The full theming API, live (§8)

**Status:** complete. `npm run verify` clean (704/704 tests, 25 of them
new). Opens **Stage 10** (Polish & public API) and closes
`Doc/STATUS.md` §C2.

## 0. The gap this closes, in §8's own words

> **Nothing user-facing may be hardcoded anywhere else in the engine.**

Until this phase that rule was aspirational. `config/` held a full,
typed, merge-tested `EngineConfig` — and `renderFromMusicXml` held its
own private constants that the config could not reach:

```ts
const FONT_FAMILY = 'Bravura';
const INK_COLOR = '#000000';
const BACKGROUND_COLOR = '#ffffff';
const PX_PER_STAFF_SPACE = 20;
const DEFAULT_BEAM_STYLE: BeamStyleOption = 'straight';
const DEFAULT_STAFF_GAP_FALLBACK = 8;
lookupDrumMapEntry(gmNote, DEFAULT_DRUM_MAPPING_TABLE)   // not config.drums.mapping
selectNoteheadGlyphName({ ... })                         // not config.noteheadMapping
// and bar numbers: shouldShowBarNumber + renderBarNumber both existed,
// and nothing ever called them.
```

So `config.colors.ink = '#c00'` type-checked, merged correctly, passed
its own unit tests — and changed nothing on screen. §8 said as much
itself ("the option exists is not the same as the option does
anything"). All of those constants are gone now.

## 1. What was built

### 1.1 `RenderTheme` — one resolution, carried on `RenderCtx`

Every drawing value is resolved **once**, at the top of
`renderFromMusicXml`, into a `RenderTheme`, which then rides on
`RenderCtx` to each of the ~30 functions that draw something.

The alternative — each call site reaching into `config` itself — was
rejected for two reasons: the per-note merges (the drum table,
the notehead overrides) would then happen once per *note* instead of
once per *render*, and every drawing call would grow a three-level
property path where it now reads one short name.

```ts
interface RenderTheme {
  ink; background; musicFont; textFont; sizes;
  beamStyle;                       // config.beam.style
  drumMap;                         // DEFAULT_DRUM_MAPPING_TABLE + config.drums.mapping
  noteheadMapping;                 // config.noteheadMapping
  colorOf(category: ColorCategory): string;
}
```

### 1.2 `ColorCategory` — the real key set for `colors.overrides`

`§8`'s `ColorConfig.overrides` is typed as a plain string-keyed map,
because §4.1 forbids `config/` importing from anything else in the
codebase. So the supported keys are *stated* in the renderer, as an
exported union:

`staff`, `ledger`, `barline`, `brace`, `notehead`, `stem`, `flag`,
`beam`, `rest`, `accidental`, `clef`, `keySignature`, `timeSignature`,
`tie`, `slur`, `tuplet`, `mark`, `dynamic`, `hairpin`, `tempo`,
`barNumber`, `tabNumber`.

Each falls back to `colors.ink`, so an override is strictly additive —
a key a score never draws changes the output not at all (there is a test
for exactly that).

### 1.3 Bar numbers, finally drawn (§13.1)

`shouldShowBarNumber` (Phase 13) and `renderBarNumber` (Phase 13) both
existed and had unit tests; nothing had ever called them from the
renderer. Now `config.barNumbers` drives all four modes (`off`,
`everyBar`, `everyNBars`, `systemStart` — the default), and:

- **only the top part draws them.** A number belongs to the *system*,
  not to a staff, exactly like a tempo mark: a piano score must not
  number every measure twice.
- **they are drawn last**, after the measure's staves and notes, so the
  digits sit on top of anything they overlap.
- **they sit a fixed 1.0sp above the top line**, *not* above the
  measure's content the way Integration M clears a tempo mark. The
  number is at the measure's own left edge — before the
  `MEASURE_HEADER_ALLOWANCE` the notes start after — where no note, stem
  or beam is ever drawn, so there is nothing else to clear. This is why
  turning bar numbers on moves no other element by a single unit (there
  is a test asserting byte-equality after stripping the number).

### 1.4 `fonts` (§8.2)

New section: `musicFont`, `textFont`, `lyricFont`, and `sizes`
(`barNumber`, `lyric`, `dynamic`, `tempo`, `chordSymbol`), all in staff
spaces so a size survives `resize` unchanged. It is the one section with
a nested object, so `resolveConfig` gives `sizes` the same field-by-field
merge the sections themselves get — overriding one size must not drop the
other four.

**What actually consumes a size today:** `barNumber`. Dynamics, tempo
marks and tuplet numbers are drawn from SMuFL *glyphs*, which are
designed at a fixed staff-space size and are not scaled by a font size;
lyrics and chord symbols have geometry modules (`geometry/lyric.ts`,
`geometry/chord-symbol.ts`) but no text renderer yet. Those four are
reserved slots that §8.2 names, and saying so here is better than
implying they do something.

### 1.5 `noteheadMapping.defaultShape` made coherent

Its old default was `'noteheadBlack'` — a **glyph name**, while
`overridesByKey`'s values are **shape families** (`'x'`, `'diamond'`,
...) fed to `shapeGlyphName`. The two disagreed, and a glyph name cannot
work as a default anyway: it would draw every whole note filled. It is
now a shape family (default `'normal'`), `selectNoteheadGlyphName` takes
it as a real input, and the duration still chooses the fill — a
`defaultShape: 'x'` score gets `noteheadXBlack` for its quarters and
`noteheadXHalf` for its half notes.

### 1.6 `drums.mapping` merged for real

`mergeDrumMappingTable(config.drums.mapping)` (§13.3, built in Phase 41
and never called) now runs once per render, and `resolveNoteRendering`
looks a GM note up in the merged table. Where a drum entry and a user
override both name the same key, **the user wins**: the drum table's
shape is the engine's own opinion, `config.noteheadMapping.overridesByKey`
is the user's.

## 2. Two real bugs this wiring exposed

**A tab staff could not carry anything above it.** `measureNorthExtent`
called `resolveNoteRendering` unconditionally, which throws for a clef
that doesn't position notes by pitch. `worstCaseStaffExtent` already
carried the matching guard; this one didn't, so the first bar number on
a tab part crashed the render. (A tempo mark on a tab part would have
crashed it too — no fixture had one.) Fixed by returning `0`: Integration
C draws a tab event as a fret number *on* a string line, which never
leaves the staff.

**Grand-staff distance was under-allocated by one staff height.**
`computeStaffDistance` returns a §15.1 *clearance* — from the upper
staff's bottom line down to the lower staff's **top** line — while
`computeSystemLayoutVariableGaps` stacks staves by their **bottom**
lines. The clearance was being handed to the layout as though it were
already a bottom-to-bottom offset. Ordinary scores never noticed (the
floor governed), but the crossing-hands fixture needed 16 units of
clearance and was granted 12. Wiring `config.staves.minStaffDistance` is
what surfaced it; the conversion (`+ lowerStaffHeight`) is now explicit
at the call site.

## 3. Defaults that changed, and why

| Default | Was | Now | Why |
|---|---|---|---|
| `layout.pxPerStaffSpace` | 10 | **20** | The renderer always emitted 20. Stating the real value in the config rather than silently overriding it means wiring the option changes no output. |
| `noteheadMapping.defaultShape` | `'noteheadBlack'` | **`'normal'`** | §1.5 — a shape family, not a glyph name. |
| `staves.minStaffDistance` | 3.5 | **4.0** | §15.1 is "around 3.5 at minimum; generous scores use more". 4.0 (one staff height) is the engine's established grand-staff clearance, so the wiring is exact rather than a visual change. |
| `staves.minSystemDistance` | — | **6.0** | New; §8.2 names it. |
| `barNumbers.display` | `'systemStart'` | *(unchanged)* | But it now *does* something: every score gains a number at each system start. This is the one intentional visual change in this phase. |

## 4. What this phase deliberately does NOT do

**Make `keySignature.style` branch on anything.** `'standard'` is its
only member and there is no second implementation to select between; the
renderer's key-signature path *is* the standard one. When a second style
lands, the branch belongs in `renderKeySignature`, not here. Adding a
no-op read now would look like wiring without being any.

**Scale glyph-drawn text.** See §1.4 — `sizes.dynamic` and `sizes.tempo`
would need `renderMark`/`renderMetronomeMark` to scale a SMuFL glyph,
which is not how SMuFL sizes are meant to work.

**Add a `debug` section.** §8.2 lists it; it is Phase 51's, together
with the overlays it switches on.

## 5. Tests

`test/unit/theming.test.js` (25 tests), grouped by section: ink and
background replacing every occurrence with none left hardcoded;
per-category overrides colouring only their category; an override for an
absent category changing nothing; the music font replacing every glyph's
font with no Bravura left; the text font applying to the bar number and
*not* to glyphs; the bar-number size; all four bar-number display modes;
page mode numbering every system; a grand staff numbering each measure
once; bar numbers moving nothing else; beam style changing the output;
`defaultShape` keeping the duration's own fill; an `overridesByKey` entry
beating the default shape; a drum-mapping override changing position and
notehead; a partial drum override keeping the fields it omits;
`pxPerStaffSpace` scaling pixels and not the viewBox; and the `fonts` and
`staves` sections resolving, merging per field, and never mutating
`DEFAULT_CONFIG`.

The 15 render snapshots each gained exactly one line — the bar number —
with no geometry shifted. `render-from-musicxml-piano-crossing-hands`
also moved, by the staff-height correction in §2.

`test/unit/render-from-musicxml.test.js`'s `glyphCodepoints` helper now
matches only text in the **music font**: a bar number is text, not a
glyph, and the helper's job is to read SMuFL codepoints.

## 6. How to modify

| Want to change | Where |
|---|---|
| Any colour, globally | `config.colors.ink` |
| One element category's colour | `config.colors.overrides[category]` — see `ColorCategory` |
| The music font | `config.fonts.musicFont` (SMuFL with Bravura-compatible metrics — the engine's glyph *metrics* still come from `bravura_metadata.json`) |
| Bar number appearance | `config.barNumbers.display`, `config.fonts.sizes.barNumber`, `config.fonts.textFont`, `colors.overrides.barNumber` |
| How far a bar number sits above the staff | `BAR_NUMBER_GAP` in `render-from-musicxml.ts` |
| Drum notehead/position for a GM note | `config.drums.mapping[midiNote]` |
| The default notehead family | `config.noteheadMapping.defaultShape` |
| Grand-staff clearance | `config.staves.minStaffDistance` |

## 7. How to revert

Delete `test/unit/theming.test.js`; drop `RenderTheme`, `buildTheme`,
`ColorCategory`, the `theme` field on `RenderCtx` and the bar-number
block from `render-from-musicxml.ts`, restoring the six constants listed
in §0; drop `fonts` and `staves.minSystemDistance` from `config.ts` and
`resolveConfig`; drop `defaultShape` from `NoteheadSelectionInput`; and
re-record the snapshots. The two bug fixes in §2 are independent of the
wiring and should be kept.
