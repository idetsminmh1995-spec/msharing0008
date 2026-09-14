# Integration Pass G — Tempo mark display and positioning fixes

**Status:** complete. 538/538 tests pass. Fixes three real, user-reported
issues with how a metronome tempo mark ("♩ = 120") renders: too little
space around the "=" sign, too little vertical clearance above the
staff, and (most substantively) a measure narrow enough to hold only a
pickup rest not being widened to actually fit the tempo mark it
contains, letting the mark visually overrun the barline that follows.

**Not a numbered plan phase** -- a corrective pass, prompted directly by
the user comparing a screenshot of the engine's actual output against a
reference image of the desired result.

## 0. What was reported, and how it was diagnosed

The user provided two images: the engine's current output for a drum
groove with a pickup measure and a tempo mark, and a reference image
showing the desired result. Rather than guess at the difference, the
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
  than the number implies -- matching the cramped, near-overlapping
  appearance in the reported screenshot.
- **Measure width not accounting for the tempo mark at all** -- the more
  substantive issue. A pickup measure holding only a rest gets its width
  from the notes/rests alone (Integration E's own `computeMeasureLayout`
  logic); nothing checked whether a tempo mark attached to that same
  measure needed more room than the rest did. A narrow pickup measure
  with a tempo mark wider than the rest's own minimal width let the mark
  visually extend past the measure's own right edge, overlapping the
  barline and the start of the next measure's content -- exactly the
  cramped appearance in the reported screenshot.

## 1. What was fixed

**`render-from-musicxml.ts`**:
- `noteToEqualsGap` raised from `0.6` to `1.0`.
- The tempo mark's `y` changed from `topStaffY - 1` to `topStaffY - 2.5`,
  giving real, visually generous clearance above the staff rather than
  the bare minimum.
- `computeMeasureLayout` now takes the measure's own tempo marks (if
  any) and ensures the measure's computed width is **at least** wide
  enough to hold the widest one, via a new exported
  `metronomeMarkWidth` helper (in `render/metronome.ts`) that computes a
  tempo mark's full assembled width (note + optional dot + gap + equals
  + gap + every BPM digit) from real glyph bounding boxes -- the same
  measure every other multi-glyph width calculation in this codebase
  already uses.

**`render/metronome.ts`** -- new exported `metronomeMarkWidth`, reusing
the module's own existing `glyphWidth` helper rather than duplicating
its bounding-box logic.

## 2. How this was verified

Ran `npm run verify` clean, **538/538** (1 new test; 1 snapshot
regenerated). The snapshot change was checked with the same
glyph-multiset comparison used throughout this project: the regenerated
`render-from-musicxml-tempo-mark.snap` has an **identical** glyph
multiset to its previous version, confirming the change is purely a
position/spacing shift, not a content change.

A new end-to-end test confirms the actual fix directly: for the real
`tempo-mark.musicxml` fixture, the measure's own barline is checked to
land clearly past every one of the tempo mark's own glyph positions --
not merely "somewhere after them," but past the rightmost glyph's own
position plus a loose margin -- confirming the measure was genuinely
widened to contain the mark rather than merely happening not to overlap
in this one instance.

## 3. Known limitations (stated, not silently missing)

- **This fix is verified against a synthetic fixture, not the user's
  own real file.** The user's reported images came from their own
  drum-groove score (pickup measure + repeat barline + a beamed hi-hat
  pattern), which wasn't provided as a `.musicxml` file. The diagnosis
  and fix were made by tracing the *existing* code's own math against
  general SMuFL bounding-box facts and the two images, not by
  reproducing the user's exact file byte-for-byte.
- **A second, separate issue is visible in the same reported
  screenshot** (the hi-hat beam grouping in pairs of 2 rather than one
  continuous beam per 4 eighth notes) but was explicitly **not**
  addressed in this pass -- the user asked to fix tempo display and
  position first, as an isolated first step, before moving on to
  anything else.

## 4. How to modify it

- **Tune the constants further** -- `noteToEqualsGap` (now `1.0`) and
  the vertical offset (`topStaffY - 2.5`) are still hardcoded literals
  in `render-from-musicxml.ts`, not yet exposed via `config.spacing` or
  a new config section; if the user's own real file still looks off
  after this fix, these are the two numbers to adjust next.

## 5. How to revert

Revert `render-from-musicxml.ts`'s `noteToEqualsGap`/`y` changes back to
`0.6`/`topStaffY - 1`; revert `computeMeasureLayout`'s
`measureTempoMarks` parameter and `tempoMarkMinWidth` logic; revert its
call site's tempo-mark filtering; remove `metronomeMarkWidth` from
`render/metronome.ts`; delete the new test in `tempo-mark.test.js`; and
regenerate the tempo-mark snapshot again.
