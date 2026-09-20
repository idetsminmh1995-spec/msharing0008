# Reading any drum notation: noteheads, bar widths, and repeats

**Found by:** the user, trying a second MuseScore drum file
(`Drumnote.musicxml`) on the drum page and getting
*"Could not parse this file — see console for details."*, and, on the
file before it, a playback cursor that stopped dead at a repeat barline
instead of jumping back.

**In their words:** *"it must be able to read ANY drum notation — two-time
repeats, four-time repeats, whatever."* And: *"a bar must have a standard
width, even when there is no note in it."*

**Status:** all four fixed. `npm run verify` clean, 856/856 tests.

---

## 1. Why a whole file refused to open

`Drumnote.musicxml` is a 24-bar percussion exercise. The engine parsed
it — all 24 measures, 84 events, both voices, the `<print new-system>`
breaks, the final barline — and then threw on the way to drawing it:

```
MusicXML notehead value "slashed" is not supported yet.
Supported: normal, x, diamond, triangle, square, slash, circle-x.
```

`musicXmlNoteheadToShape` had a seven-case switch and a `default:` that
threw. The file uses `slashed` (a notehead with a stroke through it) and
`<notehead smufl="noteheadHeavyXHat">other</notehead>` (MusicXML's
escape hatch: "my shape is not in your enumeration, here is its SMuFL
glyph name"). Both are ordinary MusicXML. Both were fatal.

The page's `renderNotation` catches any throw and shows one line, so
**the reader lost the other 341 notes over two noteheads.**

### What the throw was defending

The old comment said it plainly: *"throwing is reserved for values we
don't have real support for at all (better to say so than silently
ignore what the file asked for)."* The instinct is right and §10.7 is
the rule that expresses it — **report, don't silently absorb**. What the
code did instead was *refuse*, which is a different thing. A notation
file is INPUT, not a program.

### What it does now

- `SHAPE_GLYPHS` covers **every `<notehead>` value MusicXML 4.0
  defines** — 27 of them — each verified against `glyphnames.json`
  before it was written down. That includes the traps:
  - MusicXML's **`cross` is the PLUS shape**; its `x` is the other one.
    Getting these two the wrong way round is the classic mistake here.
  - MusicXML's **"left triangle" points right** when drawn — the name
    describes its vertical left edge, SMuFL names it from the apex
    (`noteheadTriangleRight…`).
  - **`none` is not "draw nothing"**: it is SMuFL's zero-ink
    `noteheadNull`, which keeps the stem, beam and spacing anchored
    exactly where the file put them.
  - The **seven Aikin shape notes** (`do re mi fa so la ti`, plus
    `fa up`) live under SMuFL's `noteShape*` names, which come in
    White/Black only — so a whole note uses the white one, which is what
    the shape-note tradition does anyway.
- A `<notehead>`'s **`smufl` attribute outranks the value it sits on**,
  and is used as a glyph name directly with no duration variant: the
  file named one exact glyph, and substituting a different fill for it
  would be overriding the file rather than reading it.
- Anything unrecognized — an unknown value, or a `smufl` name no font
  has — reports **`UNKNOWN_NOTEHEAD`** and falls through to the ordinary
  head.
- `shapeGlyphName` still throws, but only for a **config** value
  (`noteheadMapping.overridesByKey`, `defaultShape`), where an unknown
  shape is a mistake in the host application and should be loud.

One shape is honestly approximate: SMuFL has no **`rectangle`**
notehead, so it draws as a square. Recorded in §19's limitations rather
than pretended to be exact.

## 2. A bar needs a standard width

The user's second point, with a screenshot: bars of three quarter notes
came out visibly narrower than their neighbours of four, and the bar
holding one whole rest came out barely wider than the rest itself.

§14's proportional spacing is not wrong here — it answers *"how far
apart are these notes"*, and it answers it correctly. It simply has no
opinion about a bar with almost nothing in it, and the previous floor
(`MEASURE_WIDTH * 0.3` = 7.2 staff spaces) was low enough to let the
difference show.

`config.spacing.minMeasureWidth` (default **12.0**) is now the note
area's own floor, scaled by the measure's notated length against a whole
note and clamped to [0.35, 2] of it. On the user's file every bar is now
12.5 wide where they ranged 8.3 to 13.7.

Two deliberate choices inside it:

- **The clamp at both ends.** A one-beat pickup must not collapse to a
  quarter of a bar; a twenty-beat "measure" — which real files write,
  for a cadenza or an unmetered passage — must not reserve a screenful
  of blank staff.
- **A measure with NO events gets the same width as a sparse one.** A
  reader should not be able to tell "nothing written here" from "one
  whole rest written here" by the bar's width. This replaced a separate
  `MEASURE_WIDTH` (24) constant for the empty case, which made an empty
  bar twice the width of its neighbours.

The default was picked from this engine's own output, not invented: a
plain 4/4 bar of four quarter notes lays out at 10.2 of note area, so 12
lifts the sparse bars to match the ordinary ones without stretching the
ordinary ones.

## 3. The cursor that stopped at a repeat

### What §17.2 used to say

> Repeat handling: when playback passes a repeat-end barline and jumps
> back, the host supplies the *musical* tick it jumped to; the engine
> does not simulate playback order itself.

That is a defensible boundary — for a D.S., a coda, or a manual seek,
none of which the file describes in a form the engine can resolve. It
was the wrong boundary for an **ordinary repeat sign**, which is written
in the file, in a form that is completely unambiguous. The visible
result was the bug the user reported: on a 32-bar drum chart whose bars
2–32 repeat, the marker walked to the repeat barline and stopped.

The arithmetic was visible in the earlier round too, and I wrote it down
as a limitation rather than a bug: *"the uploaded Drum Lesson 5.mp3 is
2:26 where 32 measures at ♩=120 is 1:04, so this file does not match."*
It matched perfectly. The recording takes the repeat. **1:04 was the
written length and 2:23 is the played length** — the engine was
measuring the wrong one.

### `playback/repeats.ts`

The written score is unfolded into the order it is actually played:

```
1 2 3 … 32 2(2) 3(2) … 32(2)      ← Drum Lesson 5, 63 entries, 143.1 s
```

Each entry carries its measure number, its tick and second offsets in
**performance** time, and the **written** tick it plays — so
`performanceSecondsToWritten(plan, tempoMap, seconds)` turns a moment of
audio into the written tick sounding then, which is exactly what
`playheadX`/`positionToX` already take. Nothing in the layout or
position API had to learn about repeats at all.

It resolves:

- repeat begin/end barlines, read from **both sides** of each shared
  boundary (a repeat-begin is normally written as `location="left"` on
  the measure it opens — reading only one side puts it a whole measure
  out of place, the same trap Integration Q hit when *drawing* them);
- **`times="4"`** and friends, with MusicXML's default of 2 when the
  attribute is absent;
- a repeat-end with **no matching repeat-begin**, which goes back to the
  top of the score, as the convention says;
- **nested** repeats — an inner 2× repeat plays twice on *every* outer
  pass, which needs the inner counter forgotten each time the outer one
  re-enters. The classic bug is the inner repeat playing only on the
  first outer pass;
- **voltas**, including one serving several passes (`number="1, 2, 3"`)
  and an ending block with no explicit close.

A structure that cannot terminate — two backward repeats and no forward
one is enough — reports **`REPEAT_RUNAWAY`** and falls back to playing
straight through. An unfolder that trusts its input will happily build
an array until the process dies.

### The tempo map is read, not re-derived

Each entry's duration in seconds comes from the **written** tempo map at
that measure's own written position. A repeated section crossing a tempo
change takes a different amount of real time on each pass only if the
tempo map says so — and re-deriving a per-pass tempo curve would be a
second source of truth that could drift from the first.

### What the host does

`website/video-create/drum/index.html` is four lines different: where it
used to call `secondsToTick`, it now goes through
`performanceSecondsToWritten` when the render carries a performance
timeline. §17.3's boundary is unchanged — the engine says *where* the
music is, the host still draws the marker and scrolls to it.

Verified in headless Chromium against the real page and the real file:
at 130 s the marker is on measure 26, pass 2, at x=528.5; at 70 s it is
on measure 31, pass 1, at x=638.1. It goes backwards on the page exactly
where the repeat barline is.

## 4. Two things the repeats turned up in the drawing

Neither was reported; both were found by rendering a fixture that
exercises the new parsing and looking at it.

### A repeat-begin on measure 1 was never drawn

Only the *previous* measure ever drew a boundary (at its own right
edge), and measure 1 has no previous measure. `openingBarlineWidth` had
reserved room for it from the start — so a repeat from the top of the
chart, which is about as ordinary as a repeat gets, was **blank space
where the sign should be**.

Two rules now, and they are the same rule from both sides: a measure
draws its own left edge when nothing before it could have — the first
measure of the score, or a measure that **starts a system**. And a
measure stops drawing its successor's left declaration when that
successor starts a system, because a repeat-begin drawn at the end of a
line points the reader back at something that is on the next line.

### The clef was drawn on top of the repeat dots

`cursorX` started at `layout.x + 0.5` — the bare leading pad — while
`headerWidths` reserved `0.5 + openingBarlineWidth`. So the header was
the right size and its contents started too far left: on measure 1 of
the volta fixture, the dots of the repeat-begin landed **inside the
percussion clef**. Both now go through one `openingBarlineAllowance`,
maximised across parts so a repeat declared on one staff does not
misalign the clefs of the others.

## 5. Voltas and `×4` on the page

A repeat structure the engine can play is also one the reader has to be
able to see, so `geometry/volta.ts` + `render/volta.ts` draw:

- the **bracket**: a horizontal line over the ending's measures, a
  down-hook at each *real* end, and a `"1."` / `"1, 2, 3."` label. A
  `discontinue` ending gets no closing hook, which is how an ending that
  simply runs on is written. A volta crossing a system break becomes one
  bracket per system, hooked and labelled only at its own ends — a
  continuation repeating "1." would read as a second, different ending;
- the **`×4`** over a repeat played more than twice. Never over a plain
  2× repeat: a repeat sign already means "play it twice" to every
  reader, and labelling that is noise. A `times="4"` is information the
  reader cannot get any other way, and leaving it undrawn is how a chart
  silently loses two thirds of its length.

Both sit **above** the bar-number band rather than below it, which is
the reverse of the usual engraving order. Bar numbers are drawn at a
measure's own left edge, which is exactly where a volta starts, so the
two would collide on precisely the measures a volta cares about. Stated
as limitation 17 rather than left as a surprise: the correct fix is to
move the bar number above the bracket, which is a bar-number change.

A score with no volta and no `×N` reserves none of this extra headroom,
which is what keeps every existing fixture byte-identical.

## 6. A transparent render, for the video frame

The drum page's Live Preview is a preview of a **video frame**, and two
things in it were page chrome rather than video:

- **The scrollbar.** The notation strip still scrolls — the playback
  cursor drives `scrollLeft` to keep itself in view — it just no longer
  draws a bar and two arrows. Nothing in the exported video has a
  scrollbar in it.
- **The white strip behind the music.** With Video Style set to Black,
  the notation is now drawn in **white, directly on the video's own
  frame**.

**Video Style is a property of the whole frame**, not of the notation
strip. The first attempt painted only the strip white, which banded a
white stripe across an otherwise black frame and read as a page element
sitting ON a video rather than as part of one. So the strip is never
painted at all now, in either style, and the frame carries the scheme:
near-black frame + white notation + white titles, or white frame +
near-black notation + dark titles (with the stat-box label in the brand
red, since its tan is for a dark backdrop).

The notation also sits higher in the frame, and the brand mark sits on
the same centreline as the TIME/BPM/COUNT boxes it shares a row with.
Most of that came from the logo FILE rather than from the layout: its
artwork stops at row 333 of 400 (measured, not guessed), so a plain
80px-tall `<img>` carried ~13px of empty space under it, which pushed
the notation down AND put the mark's visual centre below the stat
boxes. A `-13px` bottom margin pulls the box tight around the ink;
`.video-top`'s `align-items:center` then puts the two on one line, and
those pixels go to the music. With the smaller paddings the notation
starts 19px higher than it did.

`colors.background` gained one rule for this: **`'none'` (or
`'transparent'`) draws no background rectangle at all** — not a
rectangle that happens to be see-through. That distinction is the whole
point. A `fill="none"` rect would still be an element in the document,
still hit-testable, and a rasteriser that treats a missing fill as the
default would still flood an exported PNG with opaque white. The page
now passes `background: 'none'` in **both** styles and supplies the
backdrop itself (the video frame for black, a white strip for white),
which is the same §17.3 split the cursor already follows: the engine
says what the notation IS, the host says where it goes.

One thing genuinely breaks on a transparent background, and it says so
rather than going quiet: Integration C masks the staff line behind a
**tab fret number** by painting the page's background colour over it.
There is no such colour here, so the line runs through the digits.
`TAB_MASK_ON_TRANSPARENT_BACKGROUND` is reported once per render (not
once per fret — a 200-note tab part would bury every other diagnostic),
and it is §19's limitation 16. A drum chart has no tab staff, so this
costs the case that prompted the change nothing.

## 7. How to revert

| Change | Where |
|---|---|
| Full notehead table + non-throwing lookup | `src/geometry/notehead.ts`, `UNKNOWN_NOTEHEAD` in `src/parser/musicxml/note.ts`, `explicitNoteheadSmufl` through `core/note.ts` → `parse.ts` → `render-from-musicxml.ts` |
| Minimum measure width | `config.spacing.minMeasureWidth`; `durationScale`/`minWidth` in `computeMeasureLayout` |
| Repeat unfolding | `src/playback/repeats.ts`, `repeatMeasures` on `ComputePlaybackDataInput`, `performance`/`repeatDiagnostics` on `PlaybackData`, `repeatMeasureSpecs()` in the renderer |
| `times`/`<ending>` parsing | `MeasureAttributes` in `src/parser/musicxml/parse.ts` |
| Voltas and `×N` | `src/geometry/volta.ts`, `src/render/volta.ts`, the volta block in `render-from-musicxml.ts`, `VOLTA_*` constants |
| Opening barline drawn / clef clearance | the `isSystemStart` barline block and `openingBarlineAllowance` in `render-from-musicxml.ts` |
| Host wiring | the `performance` branch in `updateCursor`, `website/video-create/drum/index.html` |
| Transparent background | `hasBackground()` in `src/render/svg-primitives.ts`, its two call sites (`createSvgDocument`, `renderTabNumber`), `TAB_MASK_ON_TRANSPARENT_BACKGROUND` |
| Video Style / no scrollbar | `.video-notation` CSS + the `.video-frame.style-white` rules, `notationConfig()`/`applyVideoStyle()` in the drum page |
| The notation sitting higher | `.video-top`/`.video-notation` padding and `.video-logo-mark`'s negative bottom margin in the drum page |

**Do not revert any of it without a reason.** Each one is a case where
the engine disagreed with what the file actually said — and the first
one is a case where it refused the file outright.
