# Integration R — the notes were packed at the start of every bar

**Not a numbered phase.** Reported by the project owner against the
violin video frame, with the gap circled: "Music note တွေက အရမ်းသေးနေတယ်။
နောက်တစ်ခုက အနီရောင်နဲ့ပြထားတယ်" — and the same thing was visible on the
drum, piano and guitar frames, because it was never a page defect at all.

**Status:** complete. `npm run verify` clean (872 tests).

## 1. What was wrong

`computeMeasureLayout` does §14's proportional spacing honestly: the
attacks come back at 0, 2.4, 4.8, 7.2 staff spaces for four quarter
notes, with the measure's own natural width the last of those plus a
notehead and a trailing margin.

Then the measure gets WIDER, twice over, and neither widening told the
positions:

- `minWidth = headerWidth + minMeasureWidth * durationScale` — the floor
  that stops a sparse bar being a sliver (§14's own `minMeasureWidth`,
  12 staff spaces for a 4/4 bar). For most real content this floor is
  bigger than the content's natural width, so it is the one that decides
  the bar's width.
- `justifySystem`, in page mode, stretches a system's measures again so
  the system reaches the right margin.

So a 4/4 bar 18 staff spaces wide drew its four quarter notes at 6, 8.4,
10.8 and 13.2 and then left 3.6 spaces of empty staff before the barline.
Every bar in the piece did it, which is why the circled passage read as
music that stops in the middle of each bar.

It also made the notes look small for no reason: a frame showing bars
two-thirds full is showing a third less music per line than it paid for,
so the page width has to be raised to fit the phrase, and raising the
page width is what shrinks the notes.

## 2. The fix

`computeMeasureLayout` now also reports `idealSpan`: how far §14 wants it
to be from the first attack to the BARLINE. That is the last attack's
position plus the space that attack's own duration earns after it
(`computeEventSpace`), floored — as §14.2 floors every other gap — at the
attack's rendered width plus `minNoteDistance`, so the last notehead can
never end up against the barline however short its written duration is.

`renderParsedMusicXml` then does one pass over `measureLayoutsByNumber`,
after `applyHeaderWidths` has resolved the real header widths and after
page placement is known, and scales every position in the measure by
`(width - headerWidth) / idealSpan` — skipping any measure that is not
actually wider than §14 asked for. §14's PROPORTIONS survive exactly
(a quarter still gets twice an eighth's space); only the scale changes,
which is what an engraver does to a bar that must fill more room than its
content needs.

Including the last attack's own trailing space in `idealSpan` is what
makes the stretch even. Stretching only as far as the last attack would
fling it towards the barline: a bar of a half note and a half rest came
out with the rest three-quarters of the way across instead of halfway.

It is done ONCE, by rewriting the shared layout map, rather than at each
place that asks for a tick's x. `computePlaybackData` is handed that same
map, so the playback cursor reads the stretched positions too — a stretch
applied only where notes are DRAWN would leave the playhead pointing at
where they used to be, which is exactly what an earlier draw-time version
of this fix did and what the cursor tests caught.

### `svgNumber`

A side effect of a ratio is long decimals, and the engine had no
coordinate formatter at all — it interpolated raw JS numbers, so a
position of 12.8571 was written as `12.857099999999999`. (It already did
this in places: `5.720000000000001` for a barline, `-0.6680000000000001`
for a stem.) `svgNumber` in `render/svg-primitives.ts` rounds every
emitted coordinate to four decimal places — a ten-thousandth of a staff
space, far finer than anything can draw it — and every primitive plus the
four path builders (beam, slur, tie, debug overlay) now goes through it.

## 3. What actually changed on real content

Measure 1 of `simple-single-voice.musicxml` (four quarters, 4/4, bar 18
spaces wide): notes were at 6, 8.4, 10.8, 13.2 with 4.8 spaces of nothing
before the barline; they are now at 6, 9, 12, 15 — four equal gaps of 3,
and 3 again to the barline.

Measure 2 (a half note and a half rest): the rest was at 27.5 in a bar
running 18 → 30.5; it is now at 24.5, dividing the bar in half, which is
where a reader expects beat 3.

## 4. Tests

- `test/unit/spacing-wiring.test.js` — the first test now asserts the
  PROPERTY rather than four hardcoded x-values: four equal durations get
  four equal gaps, and the last note is one more gap short of the
  barline. A second new test asserts the half-note/half-rest bar divides
  in half.
- `test/unit/render-from-musicxml.test.js` — the staff-position test now
  asserts the four y-values and leaves x to the spacing tests, which is
  what it was always about.
- `test/unit/gm-drum-wiring.test.js` — the kick and hi-hat tests read
  the notehead's x off the markup instead of hardcoding it, so they keep
  testing shape, position and stem direction.
- `test/unit/header-width.test.js` — the cursor/notehead agreement
  tolerance is now `MARKUP_PRECISION` (5e-5) rather than 1e-9: the drawn
  x in the markup is rounded by `svgNumber`, so that is the finest
  agreement that can be asserted against it.
- 19 visual snapshots re-baselined. Thirteen moved because the notes
  moved; the other six only lost float noise (`5.720000000000001` →
  `5.72`).

## 5. How to revert

Drop `idealSpan` from `computeMeasureLayout`'s return and from
`measureLayoutsByNumber`'s value type, and delete the stretch loop that
follows `noteAreaXOf` in `renderParsedMusicXml`. `svgNumber` is
independent and can stay; to drop it too, revert
`render/svg-primitives.ts` to interpolating the raw numbers and remove
its use in `render/{beam,slur,tie,debug-overlay}.ts`. Re-baseline the
snapshots and restore the four tests above from git history.
