# Integration S — MuseScore as the reference, as a data layer

**Not a numbered phase.** The project owner's scores are all exported
from MuseScore — every file in the repo's own test corpus says
`MuseScore Studio 4.7.4` in its `<encoding>` — and the ask was to make
this engine render them the way MuseScore does, by reading MuseScore's
actual source rather than by guessing.

**Status:** complete. `npm run verify` clean (913 tests, 41 of them new).

## 1. The constraint, and what it decided

Four things were asked for and they shape everything below: read the
real MuseScore source rather than remembering it; do not copy its C++;
do not rearrange this engine's own architecture; and do not write down a
mapping that has not been verified.

So this is a **data layer**, `src/musescore/`, and nothing in the
renderer imports it. It is a second, independently-sourced answer to
questions the engine already answers its own way, exposed as
`NotationEngine.MuseScore` — a namespace, not merged into the public
surface, so `MuseScore.MUSESCORE_DRUMSET` can never be mistaken for the
engine's own `DEFAULT_DRUM_MAPPING_TABLE`.

MuseScore was cloned at `9140c5e4b7b5b48357b8d38dfebd0dd979653d21`
(2026-10-02) and every table carries that commit, the file it was read
from and the symbol inside it. `blobUrl()` turns any of them into a link
a reviewer can open.

**Licensing.** MuseScore Studio is GPL-3.0-only. No MuseScore code is in
this project — not a line of C++, not a header. What is recorded is
factual data (the General MIDI percussion map, SMuFL glyph names, clef
definitions, standard tunings, engraving measurements) re-stated in this
project's own structures and prose. MuseScore's own catalogue of
instruments, its translated strings and its sound fonts are cited and
left where they are.

## 2. What was read

- **Clefs** — `dom/clef.cpp`'s `ClefInfo::clefTable[]`, all 37 rows: the
  staff line, the pitch offset, the SMuFL symbol, the staff group, and
  the 14 key-signature accidental lines per clef. Plus the importer's
  own `<sign>/<line>/<clef-octave-change>` ladder.
- **Staff position** — `dom/utils.cpp`'s `absStep`/`relStep`. The whole
  rule is two lines: `absStep = step + (octave + 1) * 7`, then
  `line = pitchOffset(clef) - absStep`, where line 0 is the TOP staff
  line and +1 is half a space down.
- **Noteheads** — `dom/note.cpp`'s `noteHeads[2][…][…]`, the 26 groups a
  MusicXML file or a drumset can reach, each with its whole/half/
  quarter/breve glyph; and `convertNotehead`, MuseScore's own MusicXML
  mapping.
- **Drumset** — `dom/drumset.cpp`'s `initDrumset()`, all 61
  instruments: notehead group, staff line, stem direction and voice;
  names from `types/typesconv.cpp`.
- **Strings and tab** — `instruments.xml`'s `<StringData>` for 21
  fretted instruments, `dom/stringdata.cpp` for the reversed string
  index and the transposition arithmetic, `dom/stafftype.cpp` for the
  staff presets, `string_tunings_presets.json` for 50 named guitar
  tunings.
- **Style** — `style/styledef.cpp`, the engraving measurements that
  decide whether a page looks right even when every note is in the
  right place.
- **Spacing** — `rendering/score/horizontalspacing.cpp`.

## 3. The four things that were actually learnt

Everything above is a table. These four changed what is known:

**MuseScore's spacing is a POWER law.** `durationStretchForTicks` is
`measureSpacing ^ log2(duration / quarter)` with `measureSpacing = 1.5`,
applied to a `DEFAULT_QUARTER_NOTE_SPACE` of 3.5 staff spaces. So a
quarter is 3.5sp, an eighth 2.33, a half 5.25, a whole 7.875. This
engine's §14 ADDS a fixed 1.2sp per doubling instead, so the two agree
at the reference duration and nowhere else — against §14's defaults a
whole note is 4.8sp. This is the single biggest reason a correct score
can still not look like MuseScore's, and `musescore/spacing.ts` is the
drop-in for a caller who wants its look.

**A guitar does not transpose; a bass does.** `instruments.xml` gives
the electric guitar no `<transposeChromatic>` at all — its octave is
carried by an 8vb treble clef — while the electric bass has `-12`.
MuseScore's `StringData` therefore stores the guitar's strings at the
pitches they sound (40..64) and the bass's an octave above what it
sounds (40 for a string that sounds 28). `StringData::fret()` reconciles
them by adding `-transpose` before subtracting the string. This is
exactly the octave problem the bass finger engine deals with, now with a
source behind it.

**MuseScore numbers strings from the highest one.**
`m_stringTable[strings - string - 1]`: string 0 is the top line of a tab
staff, the thin E. This project's finger engines number from the lowest.

**Two of this engine's glyph choices differ from MuseScore's**, and
neither was known before: the Aikin shape-note `ti` (this engine draws
`noteShapeKeystone*`, MuseScore `noteShapeTriangleRound*`, keeping the
keystone for the Funk shapes) and the filled rhythm slash
(`noteheadSlashVerticalEnds` here, `noteheadSlashHorizontalEnds` there).

## 4. What was confirmed rather than changed

The engine's own clef geometry agrees with MuseScore's **exactly**:
`staffPositionForPitch` and `museScoreStaffPosition` return the same
number for all seven steps across nine octaves under five clefs, by two
completely different derivations. That is a test, not a claim.

Integration N's drum-position corrections are confirmed too: snare on
line 3, closed hi-hat on line -1 and kick on line 7 are exactly where
MuseScore puts them. The corrections made then from one real file's
encoding were right.

## 5. Where the two still disagree

Written down rather than discovered later — `musescore.test.js` asserts
the list exactly, so a new difference in either table fails the suite:

| | this engine | MuseScore |
|---|---|---|
| Toms (41,43,45,47,48,50) | half a space higher | |
| Ride, ride bell (51,53) | half a space higher | |
| Acoustic bass drum (35) | line 7, stem down | line 8, stem up, voice 1 |
| Pedal hi-hat (44) | above the staff, stem down | line 9, stem up, voice 1 |
| Side stick (37) | x | slashed |
| Electric snare (40) | normal | slash |
| Open hi-hat (46) | x | circle-x |
| Tambourine (54) | x, high | diamond, line 6 |
| Cowbell (56) | diamond | inverted triangle |
| Tab staff | 5 lines, evenly spaced | 6 lines, 1.5sp apart |

§13.3 is explicit that real drum practice varies and that this engine's
table is a defensible default rather than a universal truth, so these
are differences rather than bugs — but they are differences a MuseScore
export will show, and the owner can now switch the whole kit over with
one config line.

## 6. Extending it

A MuseScore that has been customised in the app exports MusicXML that
says nothing about it. The tables are therefore never edited to match
one person's MuseScore: a difference goes into `overrides.ts`, which
requires an `evidence` string naming the screenshot, the `.drm` file or
the bar it came from. An override with nothing behind it is the guess
this layer exists to avoid.

## 7. Tests

`test/unit/musescore.test.js`, 41 tests in seven groups: provenance
(every table names its source, the revision is a commit), clefs and
staff position (including the exact agreement with this engine's own
geometry), noteheads (including the cross/plus trap), drumset (including
the full difference list above), strings and tab (including the
guitar-does-not-transpose distinction), spacing and style, and the whole
chain end to end.

Two new fixtures, both real MuseScore 4.7.4 exports trimmed to four
measures with their page furniture removed:
`musescore-drum-lesson.musicxml` and `musescore-grand-staff.musicxml`.
The end-to-end tests render them, check every pitched note lands where
MuseScore would put it, and check every notehead the drum chart draws is
one MuseScore's own drumset would put exactly there.

## 8. How to revert

Delete `src/musescore/`, the `export * as MuseScore` line in
`src/index.ts`, `test/unit/musescore.test.js` and the two fixtures.
Nothing else imports any of it.
