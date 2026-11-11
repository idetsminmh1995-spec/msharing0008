# Integration Pass G — Tempo mark display and positioning fixes

**Status:** complete, in two rounds. 539/539 tests pass. Fixes four
real, user-reported issues with how a metronome tempo mark
("♩ = 120") renders: too little space around the "=" sign, too little
vertical clearance above the staff, a measure not being widened to
actually fit the tempo mark it contains, and (found only after testing
against the user's own real file) the tempo mark using a genuinely
different, inconsistent horizontal-position formula from the notes
themselves.

**Not a numbered plan phase** -- a corrective pass, prompted directly by
the user comparing a screenshot of the engine's actual output against a
reference image of the desired result, then -- after round 1 -- reporting
that the fix produced no visible change and providing their own real
`.musicxml` file.

## 0. Round 1: what was reported, and how it was diagnosed

The user first provided two images without the underlying file: the
engine's current output for a drum groove with a pickup measure and a
tempo mark, and a reference image showing the desired result. The
current fixture's own rendered coordinates were traced directly and
compared against the two images:

- **Equals-sign spacing** -- `renderMetronomeMark`'s `noteToEqualsGap`
  was `0.6`sp on each side of "=", producing a visibly cramped result
  next to the reference image's more generously spaced one.
- **Vertical clearance** -- the tempo mark's `y` was set to
  `topStaffY - 1`, only one staff space above the top line. Checking
  `metNoteQuarterUp`'s own SMuFL bounding box (`bBoxNE=[1.328, 2.752]`)
  showed the glyph's own stem reaches well above its anchor point, so
  one staff space of nominal clearance left far less *visual* clearance
  than the number implies.
- **Measure width not accounting for the tempo mark at all** -- a
  pickup measure holding only a rest gets its width from the notes/rests
  alone; nothing checked whether a tempo mark attached to that same
  measure needed more room than the rest did.

## 1. Round 1 fixes

**`render-from-musicxml.ts`**:
- `noteToEqualsGap` raised from `0.6` to `1.0`.
- The tempo mark's `y` changed from `topStaffY - 1` to `topStaffY - 2.5`.
- `computeMeasureLayout` widened to account for the measure's own tempo
  marks (if any), via a new exported `metronomeMarkWidth` helper (in
  `render/metronome.ts`) computing a tempo mark's full assembled width
  from real glyph bounding boxes.

## 2. Round 2: the user tested the fix against their REAL file and saw no change -- a deeper root cause found

The user provided their actual `.musicxml` file (a MuseScore 4.7.4
export with a genuine pickup measure, a repeat barline, and the tempo
mark attached to **measure 2**, not the pickup) along with a screenshot
confirming the fix produced no visible improvement. Rendering the real
file directly and tracing every glyph's exact x-coordinate (rather than
assuming round 1's fix was sufficient) found **two further, real bugs**
that round 1's own synthetic test fixture happened not to expose:

- **The tempo mark used a genuinely different x-formula from the
  notes.** The tempo mark's own `noteAreaX` was still
  `layout.x + layout.width * 0.25` -- a *fraction of the measure's own
  width* -- left over from before Integration E's own note-positioning
  rework, which uses a fixed `MEASURE_HEADER_ALLOWANCE` instead. As long
  as a measure stayed near its old default width the two formulas
  happened to roughly agree, which is exactly why round 1's own test
  fixture (an ordinary-width measure) never caught this. But round 1's
  own fix (widening a measure to fit its tempo mark) made the
  discrepancy *worse*: as the measure's width grew to fit the mark, the
  fraction-based x grew right along with it, drifting the mark further
  from where the notes actually start -- the two effects visually
  canceling out, producing exactly the "no visible change" the user
  reported. **Fixed** by making the tempo mark use the identical
  `layout.x + MEASURE_HEADER_ALLOWANCE` formula the notes use.
- **`MEASURE_HEADER_ALLOWANCE` itself undershot the real header width.**
  Once the tempo mark used the same formula as the notes, comparing the
  two directly on a measure that draws a *real* clef+time-signature
  header (Integration E's original test fixture, previously untested
  for this specific alignment) revealed the allowance (`4.0`) was too
  small -- the real `cursorX` a clef and a 4/4 time signature actually
  advance to was checked empirically and found to be `6.0`, confirmed
  identically for both a treble clef and a percussion clef. This had
  been invisible for ordinary notes (`Math.max(allowance, cursorX)`
  meant `cursorX` silently won whenever the allowance undershot) but
  became directly visible for the tempo mark, which had no such
  fallback. **Fixed** by raising the constant to `6.0`.

## 3. How this was verified

Ran `npm run verify` clean, **539/539** (2 new tests across the two
rounds; every snapshot affected by both rounds regenerated). Every
snapshot change in **both rounds** was checked with the same
glyph-multiset comparison used throughout this project: round 1 changed
1 snapshot, round 2 changed 11 more (an expected, wide-reaching
consequence of correcting a shared constant every measure's width
computation uses) -- all 11 confirmed to have an **identical** glyph
multiset to their previous versions, confirming every change was purely
a position shift, never a change in what was actually drawn.

A dedicated alignment test (round 2) confirms the fix directly: for the
real `tempo-mark.musicxml` fixture, the tempo mark's own note glyph is
checked to land at the **exact same x** as the measure's first real
note -- not merely nearby, but pixel-identical -- and the same alignment
was confirmed by direct inspection against the user's own real file (the
tempo mark's note glyph and the first hi-hat note both landing at
x=15.0 exactly, on measure 2, where the file's own tempo mark actually
sits).

## 4. Known limitations (stated, not silently missing)

- **`MEASURE_HEADER_ALLOWANCE` is still one fixed constant**, now `6.0`
  rather than `4.0` -- a real, empirically-checked value for the
  clef+4/4-time-signature case actually tested, not a value proven
  correct for every possible clef/key/time-signature combination. A
  wider key signature (many sharps/flats) could in principle still need
  more than this.
- **This fix is now verified against the user's own real file**
  (`Drum_Lesson_5.musicxml`, a MuseScore export with a genuine pickup
  measure and mid-piece tempo changes), closing the gap round 1 left --
  but only the FIRST tempo mark in that file was checked directly; the
  file has several more (at measures 6, 11, 16, 21) that were not
  individually re-verified, though they use the identical code path.
- **A second, separate issue remains visible in the same file** (hi-hat
  beam grouping in pairs of 2 rather than one continuous beam per 4
  eighth notes) but remains explicitly out of scope for this pass, per
  the user's own request to fix tempo display and position first, in
  isolation.

## 5. How to modify it

- **Tune further** -- `noteToEqualsGap` (`1.0`), the vertical offset
  (`topStaffY - 2.5`), and `MEASURE_HEADER_ALLOWANCE` (`6.0`) are still
  hardcoded literals in `render-from-musicxml.ts`, not yet exposed via
  config.
- **Compute the real header width per measure** instead of one fixed
  allowance -- would need duplicating the isFirstMeasure/clefChanged/
  keyChanged/timeChanged logic that currently only runs inside the
  note-rendering pass, ahead of where the width is currently computed.

## 6. How to revert

Round 1: revert `noteToEqualsGap`/`y` back to `0.6`/`topStaffY - 1`;
revert `computeMeasureLayout`'s `measureTempoMarks` parameter and
`tempoMarkMinWidth` logic; remove `metronomeMarkWidth` from
`render/metronome.ts`. Round 2: revert the tempo mark's `noteAreaX` back
to `layout.x + layout.width * 0.25`; revert `MEASURE_HEADER_ALLOWANCE`
back to `4.0`. Delete both new tests in `tempo-mark.test.js`, and
regenerate every affected snapshot again.

