# Phase 55 — The text layer: lyrics, chord symbols, rehearsal marks, `<words>` (§19.10)

**Status:** complete. `npm run verify` clean (1,102/1,102 tests, 28 new + 1 new
visual snapshot).

This phase closes **§19 limitation 10**, the plan's own summary of which was
exactly right: *"one gap, hit in four places, not four separate gaps."* The
four places are §9.22's lyric syllables, §9.23's chord-symbol root letters,
§9.21's rehearsal marks and `<words>` directions — all parsed and preserved
since Phase 35, none of them drawn, because **Bravura is a music-symbol font
with no Latin alphabet at all** and the engine had no way to draw ordinary
text.

## 1. Why this was one gap and not four

Three of the four marks are *mostly* SMuFL already, which is why they looked
close to done:

- A chord symbol is a root letter plus real `csym*` glyphs (`csymMinor`,
  `csymMajorSeventh`, `csymDiminished`, `csymAccidentalSharp`,
  `csymAlteredBassSlash`, …). Only the letter was missing.
- A lyric is a word plus `lyricsHyphenBaseline` and `lyricsElision`. Only the
  word was missing.
- A rehearsal mark is a frame plus a letter. Only the letter was missing.

So the fix is not four features. It is **one small text system** — a text
primitive, a width estimate, and three assemblers that use them — after which
each of the four becomes a short, obvious piece of wiring. That is why they
landed together rather than as four phases that would each have re-solved the
same problem.

## 2. What was built

### 2.1 `render/text.ts` — the primitive that was missing

`svgText` existed and was used for bar numbers and tempo numbers, but every
call site spelled out its own font-family/font-size/fill and none could say
"centered" or "italic". `renderText` is that one place: font, size, colour,
`text-anchor`, italic, bold. It computes nothing — §4.1's rule that `render/`
turns geometry into SVG and never decides a position is intact.

`renderTextScaledGlyph` is its companion, and exists because of a real trap:
`svgGlyphText` draws at **one em = 4 staff spaces**, which is right for a
notehead and wrong for a chord-symbol quality mark or a lyric hyphen. SMuFL
designs `csym*` and `lyrics*` to sit *beside ordinary text at the text's own
size*. Drawing `csymDiminished` at 4 staff spaces would make its circle 1.9
staff spaces across — taller than the gap between two staff lines, next to a
1.8-space letter.

### 2.2 `geometry/text-metrics.ts` — an estimate, and why an estimate is honest

The engine cannot measure text: it has no canvas, and the host's font is the
host's. `estimateTextWidth` uses per-character class widths (narrow `iljt`,
wide `mMW`, capitals, digits, punctuation) scaled by the font size, and
deliberately **over**-estimates, because the only thing the number is used for
is *reserving room*. Over-reserving is invisible; under-reserving overlaps.

Nothing is ever positioned *from* a measurement — only room is reserved with
it — so a wrong estimate cannot put a glyph in the wrong place. It can only
make a gap slightly generous. That is the difference between an estimate that
is honest and one that is a bug waiting to happen.

### 2.3 Chord symbols (§9.23)

`chordSymbolLayout(harmony, fontSize)` returns an ordered list of parts —
`text` (the root letter, the bass letter, a `<kind text="…">` suffix) and
`glyph` (`csym*` names) — plus a total width. `renderChordSymbol` draws them
left to right from a given left edge.

Coverage: the root letter with its accidental, the common qualities
(`major`, `minor`, `dominant`, `diminished`, `augmented`, `half-diminished`,
`major-seventh`, `minor-seventh`, `diminished-seventh`, `suspended-*`, …),
and a slash bass. A `<kind text="m7b5">` wins outright over the engine's own
spelling, because the file is stating the engraver's intent.

An **unknown `<kind>`** draws nothing and reports `UNSUPPORTED_CHORD_KIND`
rather than guessing a spelling. Guessing "C something" is worse than
"C" being absent, and the diagnostic names the kind so the reader knows why.

### 2.4 Lyrics (§9.22)

`layoutLyricRow(boxes, options)` turns one verse's syllables into a list of
items: each syllable centred on its note, a hyphen centred between two
syllables of the same word, an elision between two syllables sharing a note,
and a melisma extender line. `renderLyricRow` draws them at a baseline.

Three details that were decisions, not accidents:

- **The hyphen is raised 0.32 × the text size.** Bravura's only lyric hyphen is
  `lyricsHyphenBaseline`, whose own bounding box straddles the baseline
  (+0.14 to −0.136 staff spaces). Drawn where SMuFL puts it, it reads as an
  underscore under the word — visible in this phase's first render. Raising it
  to roughly half the x-height is what MuseScore and Finale do with the same
  glyph, and it is the difference between "Hal_le_lu" and "Hal-le-lu".
- **The elision is left where SMuFL puts it**, below the baseline: that is
  what an elision is — a slur joining two syllables under one note.
- **An extender stops short of the barline.** A line that touches the barline
  reads as a barline. It ends at the measure's own last ink instead.

An `<extend/>` syllable followed by another syllable extends to *that*
syllable's left edge; the last one in a measure runs to the measure's ink
limit.

### 2.5 Rehearsal marks and `<words>` (§9.21)

`computeRehearsalMarkBox` gives a frame sized from the text plus padding;
`renderRehearsalMark` draws the frame and the centred letter.
`renderWords` draws an italic `<words>` direction.

The enclosure is always a **square**. MusicXML's `<rehearsal enclosure=…>`
is not parsed by this engine, and a square is what both MuseScore and Finale
draw when no enclosure is stated. A file asking for a circle gets a square
frame; that is stated, not hidden.

## 3. The part that was not a drawing problem: where the room comes from

Drawing four new things is easy. Drawing them without printing them on top of
the next system is the actual work, and it is why the phase touched layout.

Everything is computed **before** layout, from one source of truth:

- `textNeedsByMeasure` — which measures carry chord symbols, rehearsal marks,
  `<words>`.
- `lyricVersesFor(part, staff)` — which verse numbers each staff uses, i.e.
  how many rows it needs.

Then each reservation is the *same function* the drawing pass uses
(`northTextRows`, `lyricBandHeight`), so the two cannot disagree:

| Space | What reserves it |
|---|---|
| Lyric rows under a staff | `southTextBand`, added to that staff's own southward skyline before `computeStaffDistance` |
| Text above a part's staff 1 | `northTextBandFor`, added to the gap *after* the part above it |
| Text above the topmost staff | the same band, in the system's above-staff padding |
| Lyric rows under the last staff | `Math.max(0, band − existing 4-space tail)` added to the system height |

`computeSystemLayoutVariableGaps` gained an optional `partGapForPart`, so the
gap between two parts can hold **two** text layers at once — the lyrics under
the part above and the chord symbols above the part below — which one shared
number cannot do.

### The bug this design caught immediately

The first version added the lyric band to a staff's skyline *unconditionally*,
including when it was zero. `addToSkyline` takes the **more extreme** of two y
values, and for a `'north'` skyline the more extreme is the **smaller** one —
so adding a zero-height segment to a staff with a tall north extent collapsed
that extent to zero and *shrank* the gap. Three grand-staff tests failed,
which is exactly what they are for. `withTextBand` now returns the skyline
untouched when the band is zero.

### The bug the screenshot caught

The first working version placed chord symbols above *each measure's* content
extent, so they stepped up and down from bar to bar with the melody — correct
in the sense that nothing ever collided, and wrong in the sense that no
engraver has ever set a chord chart that way. `partNorthExtent` now takes the
part's worst case **once**, and the whole text stack sits on one line for the
whole part, moving only if some bar's content would otherwise collide with it.

## 4. What is still not drawn, and why

Stated rather than discovered later:

- **Multi-verse alignment across systems is per measure.** Two verses are two
  rows on every measure that has text in that verse; a verse that skips a
  measure simply has no row there, which is right — but a verse that skips
  only *some* syllables will not leave a gap for them.
- **No hyphen across a barline.** A word hyphenated over a system or bar break
  draws no hyphen. The syllables are still drawn.
- **`<words>` and rehearsal marks always go above staff 1**, whatever `staff`
  the direction names. Chord symbols have no staff at all in this engine's
  parse.
- **No collision avoidance between text and dynamics.** A dynamic below the
  staff and a lyric row below the staff are placed from the same staff edge
  and are not aware of each other. §9.21's own note calls this out as real
  convention that is out of scope.
- **Widths are estimates**, per §2.2. Centred text is centred on the estimate.
- **`<rehearsal enclosure>` is ignored** (§2.5).
- **`<direction-type><words>` font attributes are not parsed**, so `<words>`
  is always italic at the tempo size.

## 5. Tests

`test/unit/text-layer.test.js` (28 tests) covers the primitive, the width
estimate, all four assemblers, and end-to-end rendering of
`test/fixtures/musicxml/text-layer.musicxml` — a hand-written lead sheet with
two verses, hyphenation, a melisma, an elision, four chord symbols (including
a slash bass and a sharp root), a rehearsal mark and a `<words>` direction.
Each construct appears exactly once, so a failure names one thing.

`test/visual/rendering.test.js` gains one snapshot for that fixture, and the
render was inspected in Chromium — which is how the hyphen-at-the-baseline
problem in §2.4 was found. Markup tests were green while it looked wrong.

## 6. How to revert

Delete `src/render/text.ts`, `src/render/chord-symbol.ts`,
`src/render/expression-mark.ts`, `src/geometry/chord-symbol.ts`'s assembly
half, `src/geometry/lyric.ts`'s row half and `src/geometry/text-metrics.ts`;
drop the `text` section from `config.ts` and the four new `ColorCategory`
members; remove the three blocks in `render-from-musicxml.ts` that consult
`textNeedsByMeasure` / `lyricVersesFor` (the drawing block, the lyric block in
the staff loop, and the reservations in the layout section). The
`partGapForPart` parameter on `computeSystemLayoutVariableGaps` is additive
and can stay.
