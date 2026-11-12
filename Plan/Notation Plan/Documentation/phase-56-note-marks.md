# Phase 56 — The marks that change what a note IS (§9.24–§9.26)

**Status:** complete. `npm run verify` clean (1,121/1,121 tests: 18 new unit
tests and one new visual snapshot).

## 1. The question this phase answered

The owner's question was not "which features are missing" but the sharper one:
*can this engine be trusted with the notes of any drum, piano or guitar
MusicXML file?*

That question has two halves, and only one of them was already answered:

- **Where a note goes** — pitch, staff position, ledger lines, accidentals,
  voice collision, drum mapping. Long since built, and audited against real
  files more than once.
- **What a note MEANS** — whether it is rolled, sustained, touched rather
  than stopped, or repeated rapidly. This half was missing, and a missing
  mark is not cosmetic: a tremolo read as a plain half note is a wrong
  rhythm, and a harmonic read as an ordinary note is a wrong technique.

So the audit's conclusion was not "add features 5, 12 and 19". It was that a
whole CLASS of element was being parsed away — everything under
`<notations>` that is neither a slur, a tuplet, an articulation, an ornament
nor a fermata.

## 2. What was actually missing (the audit)

Checked against the parser, not against the plan's own summary (which had
gone stale in two places — it still listed the fermata as undrawn, and the
fermata has been drawn since Integration H):

| Element | Before | Now |
|---|---|---|
| `<tremolo>` | not parsed | **§9.24** parsed, clamped, drawn on the stem |
| `<harmonic>` | not parsed | **§9.26** parsed, drawn with a diamond head |
| `<arpeggiate>` | not parsed | **§9.25** parsed, drawn as a squiggle, spacing reserved |
| `<non-arpeggiate>` | not parsed | **§9.25** parsed, drawn as a bracket |
| `<fermata>` | parsed and drawn (plan stale) | unchanged |
| `<slide>`/`<glissando>` | parsed, **not drawn** | still not drawn — §5 |
| `<cue>` | not parsed | still not drawn — §5 |
| `<octave-shift>` (8va) | not parsed | still not drawn — §5 |
| `<pedal>` | not parsed | still not drawn — §5 |
| `<transpose>` | not parsed | still not parsed — §5 |

Three of these were closed because they are the ones that change what a note
*is* for the three instrument families named: a drum roll (§9.24), a rolled
piano chord (§9.25), a guitar harmonic (§9.26). The rest are named in §5
rather than quietly left out.

## 3. Tremolo (§9.24)

`<tremolo type="single|start|stop">N</tremolo>` — the ELEMENT's text is the
stroke count (not an attribute), and the count is the whole message: one
stroke is eighth-note speed, two sixteenths, three thirty-seconds.

Bravura ships `tremolo1`-`tremolo3` and nothing above, while MusicXML allows
0-8. A five-stroke roll is therefore drawn with three and **says so**
(`TREMOLO_STROKES_CLAMPED`), rather than silently drawing a mark the reader
would count wrong. A zero-stroke tremolo is not a mark at all and is dropped
without noise.

The mark is centred on the **stem's midpoint**, which is why `render/stem.ts`
now exposes `stemGeometry`: the placement must agree with the stem about
where the stem is, and recomputing the anchor arithmetic at the call site is
exactly how a mark ends up a fraction of a space off the line it is meant to
sit on.

Not drawn on **beamed** notes. A measured roll written as beamed sixteenths
already shows its rhythm in the beam, and the strokes would collide with it;
the glyph is drawn on the stem of an unbeamed note or chord, which is how a
roll is actually written (a half note with three strokes). Stated, not
hidden.

## 4. Arpeggio (§9.25)

One mark for the whole chord, never one per member — a rolled chord is rolled
once. `<arpeggiate direction>` gives the lean; absent means up, which is both
MusicXML's default and the convention.

Drawn as a **path**, not as a scaled `arpeggiato` glyph, for the same reason
`computeBraceShape` is: that glyph is a fixed 5.5-space squiggle and a chord
is anywhere from 2 to 10 spaces tall. A transform would stretch the stroke
weight along with the height — a two-note chord fat, a six-note chord thin.
A path is the same weight at every height.

`<non-arpeggiate>` draws the bracket that says the opposite, with its hooks
pointing away from the noteheads. Both marks are the same size and in the
same place, because they are two answers to the same question.

### The part that was not a drawing problem

The first working version drew the marks correctly and put them in the wrong
place: an arpeggio on the first chord of a bar landed **on the time
signature**, and a non-arpeggio bracket on a chord just after a barline
reached back **across the barline into the previous measure**.

The cause is that the spacing pass only reserves *leading* space
(`SpacingEvent.leadingByStaff`) for attacks after the first — the first
attack sits at the measure's own note-area origin, where the space to its
left belongs to the header. Two fixes, both in the spacing pass rather than
in the drawing code:

- an arpeggio'd attack now adds `ARPEGGIO_LEADING_WIDTH` to its own leading,
  so the previous notehead is pushed clear;
- if the **first** attack of a measure carries one, every position in that
  measure shifts right by the same amount and the measure grows by it, which
  is exactly "the header is wider now" — nothing is taken from the notes.

### The bug the second look found

With the mark in the right place, the bracket still read as a bare vertical
stroke. Its hooks are HORIZONTAL, and both of them happened to land exactly
on staff lines — so each hook merged with the line it sat on and vanished.
A hook is now nudged a quarter-space into the space between lines whenever it
falls within 0.15 of one. It is the same class of bug as the lyric hyphen in
Phase 55: markup that is correct in every coordinate and wrong on the page,
found only by looking at a picture.

`ARPEGGIO_LEADING_WIDTH` is 2.5 spaces: the widest notehead (1.2) plus the
mark's gap (0.6) plus the bracket's own hook (0.8), which is the widest of
the two marks. Sizing it to the squiggle alone left the hook 0.08 spaces
across the barline — visible, and found by measuring the emitted SVG rather
than by looking at a picture.

## 5. What is still not drawn, and why

- **`<slide>`/`<glissando>`** — parsed since Integration C (`slideStart`/
  `slideStop`), still not drawn. A slide is a line between two noteheads that
  may be in different measures or systems, so it needs the same cross-event
  bookkeeping a tie has, not a per-note glyph.
- **`<cue>`** — a cue note is drawn at roughly 60% size, and the engine's
  notehead/stem primitives have no scale factor. Adding one would touch every
  stem anchor calculation; it is a phase of its own, not a flag.
- **`<octave-shift>` (8va/8vb)** — the notes themselves are already correct
  (an 8va bracket does not move the written pitches), so what is missing is
  the bracket and the reader's warning, not the notes.
- **`<pedal>`** — a direction, not a note mark; it belongs with the
  below-staff direction work (§9.21), not here.
- **`<transpose>`** — affects the SOUNDING pitch of a transposing instrument,
  which is playback data, not notation. Rendering is unaffected: a Bb trumpet
  part is written in C and drawn in C.

## 6. Tests

`test/unit/note-marks.test.js` (18 tests) covers the glyph tables, the
clamping and its diagnostic, the stem-centred placement, the diamond choice
by duration, the file's-own-`<notehead>` precedence, the squiggle's lean and
its single-mark-per-chord rule, and the leading reservation (asserted against
the emitted barline, which is the assertion that would have caught the bug in
§4).

`test/visual/rendering.test.js` gains one snapshot over
`test/fixtures/musicxml/note-marks.musicxml`, a three-part hand-written score
in which each construct appears exactly once: a rolled piano chord, a
non-rolled piano chord, a guitar harmonic, three guitar tremolos (including
the clamped five-stroke one) and a drum roll written as a half note.

The render was inspected in Chromium at each step. That is how the
time-signature collision in §4 was found: the markup was right and the
picture was wrong.

## 7. How to revert

Delete `src/geometry/tremolo.ts`, `src/geometry/arpeggio.ts`,
`src/render/tremolo.ts`, `src/render/arpeggio.ts`, the two `export *` lines in
each `index.ts`, and `harmonicNoteheadGlyphName` from
`src/geometry/notehead.ts`; drop the five fields from `Note`/`NoteInit` and
the five cases from `parseNotations`; remove the three drawing blocks in
`render-from-musicxml.ts` (single-note tremolo, chord tremolo, arpeggio) and
the two spacing hooks (`ARPEGGIO_LEADING_WIDTH`, `carriesArpeggioMark`).
`stemGeometry` is a pure extraction and can stay.
