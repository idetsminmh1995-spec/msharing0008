# Integration V — four eighths to a beam, and a tempo mark you can read

**Not a numbered phase.** Found the way the last four were: the owner
put MuseScore's engraving of a score beside this engine's Live Preview
of the same file and asked what was still missing.

**Status:** complete. `npm run verify` clean (955 tests).

## 1. What the side-by-side showed

Three things, in the order they jump out.

### 1.1 Eight eighth notes in 4/4 were beamed 2+2+2+2

MuseScore beams them **4+4**, and so does every published edition: in a
quarter-beat meter whose bar divides into whole pairs of beats, eighths
are grouped two beats at a time. It is the single most visible
difference between a page of real music and a page of
correct-but-wrong music, because it is on every bar.

`groupBeams` split a run at every beat and left it there. Its only way
out was the `groupTicks` override a caller had to know to pass -- the
engine's own default was the textbook-strict one.

### 1.2 A rising beamed run left its last note almost no stem

`computeBeamShape` took the beam's two endpoints from the FIRST and
LAST notes' natural stem tips, and capped the slope between them. That
says nothing about the notes in BETWEEN, and nothing about how far the
beam ends up from the highest of them. On the fixture's own rising run
of four eighths the last note was left with a 2.83sp stem against a
3.5sp default, and the beam looked like it was sliding off its own
noteheads.

### 1.3 "= 115" had its digits on top of each other

The metronome mark drew its "=" with SMuFL's `timeSigEquals` and each
BPM digit with the `fingering0-9` family, placing them one at a time.
That was wrong twice over:

- **Wrong size.** `fingering1` is about one staff space tall, because a
  fingering digit is meant to sit unobtrusively beside a notehead. Next
  to a full-size `metNoteQuarterUp` it read as a footnote.
- **Wrong spacing.** Bravura's metadata gives a glyph's bounding box and
  never its advance width, and a fingering digit carries a real 0.08sp
  left side bearing a bounding box does not include. Advancing by ink
  width put 0.468sp between the "1" and the "2" of "120" -- where the
  "1" is itself 0.468sp wide. The digits touched.

  The emitted SVG, which is how this was confirmed rather than guessed:

  ```
  <text x="14.62"  …></text>
  <text x="15.088" …></text>
  <text x="15.896" …></text>
  ```

Everything else in the same comparison was checked and found already
right: beam slope, the brace, staff distance, key-signature accidental
positions, the time signature, ledger lines and ties.

## 2. The fixes

### 2.1 `geometry/beam.ts` — split at beats, then join the pairs

The run of beamable notes is split at beats as before, and adjacent
beats are then joined back up where the meter and the note values allow
it. Two small predicates carry the rule:

- `pairsBeats(numerator, denominator)` — true when the beat is a quarter
  AND the bar holds a whole number of pairs of them. 4/4 and 2/4 pair;
  3/4 does not (odd beat count, so 2+2+2 rather than 4+2); 2/2 does not
  (its beat is already four eighths); 6/8 and the compound meters do not
  (their beat is three eighths).
- `beatsPerGroup(numerator, denominator, shortest)` — one beat the
  moment anything shorter than an eighth is in the group. A beat
  carrying sixteenths is beamed on its own, so the beat stays visible to
  whoever is counting.

The decision is taken **per pair of beats**, not per run, so a bar of
four eighths followed by eight sixteenths beams the eighths as one group
of four and the sixteenths a beat at a time. Pairs are counted from the
bar's own start (`first.index % 2 === 0`), so a group can never straddle
the middle of the bar.

`groupTicks` still overrides everything, and now suppresses the pairing
too: a caller who names a group length has already decided, and pairing
its beats back up would be the engine overruling them with the very
convention they overrode.

### 2.2 `geometry/beam-shape.ts` — lift the beam clear of every note

After the slope is capped, the beam is moved until the note NEAREST it
has a full-length stem — which means every other note has more. The
shortest stem under the beam is found by interpolating the beam's own Y
at each note's x; the whole beam is then shifted by the shortfall.

Flat beams already did the equivalent (they take the extreme tip), so
only the slanted branch changed.

### 2.3 The metronome mark is a note glyph plus TEXT

MuseScore sets a metronome mark as ordinary text (its Tempo style: Edwin
Bold, 12pt) with the note as an embedded music symbol. This engine now
does the same:

- `geometry/metronome.ts` keeps `metronomeNoteGlyphName` and
  `metronomeDotGlyphName` and replaces the equals/digit glyph lookups
  with `metronomeTempoText(bpm)` → `"= 120"`.
- `render/metronome.ts` draws the note glyph (and its dot, `DOT_GAP`
  past it so it clears the stem inside the same glyph) from the music
  font, then the whole "= 120" as **one** `<text>` in
  `config.fonts.textFont` at `config.fonts.sizes.tempo`, bold, on the
  same baseline. Spacing the digits is then the font's job, which is the
  only thing that can do it correctly.
- `config.fonts.sizes.tempo` moves from an invented 1.8sp to **2.4sp**:
  MuseScore's Tempo style is 12pt and its default spatium is 1.75mm, so
  12pt is 2.42 staff spaces.
- `TEMPO_MARK_HEIGHT` moves from 2.0 to **2.8**. The tallest metNote
  glyph this engine can draw (`metNote8thUp`) reaches 2.784sp above the
  shared baseline, so 2.0 was clipping the mark's own stem on a score
  whose notes sat high — measured on the owner's own piano file, where
  the mark's ink now ends 0.048sp inside the viewBox instead of 0.75sp
  outside it.

### 2.4 `geometry/text-metrics.ts` — one honest estimate, shared

A measure holding a tempo mark has to be made wide enough for it, which
means knowing how wide "= 120" will be. There is no font to ask: the
text font is whatever the host loaded, and the engine emits an SVG
string with no canvas and no layout engine.

So `estimateTextWidth(text, fontSize)` is an estimate, and it is used
only where an estimate is the right answer — RESERVING room. Nothing is
positioned from it; the text run is one element, spaced by the real font
at display time, which is what makes a wrong estimate cost a little
empty space rather than a collision.

Its per-character widths are the widest advance measured across the
sans-serif faces a host falls back to — Arial, Helvetica, Liberation
Sans and DejaVu Sans, at weights 400 and 700 — read with the browser's
own `measureText` at 100px. DejaVu Sans Bold is the widest (digits
0.696em against Arial's 0.556em), so the table is generous for most
fonts and short for none of the ones checked.

`debug/measure.ts` had its own `TEXT_ADVANCE_RATIO = 0.62` for exactly
this problem; it now calls the shared estimate, so there is one such
number in the engine rather than two.

## 3. How it was checked

A headless Chromium harness renders the real built bundle over a local
server with Bravura actually loaded, because the SVG a `vm` sandbox
produces proves the markup and nothing about what it looks like. Every
fix above was looked at as a picture before it was called done, and then
confirmed on the real `website/video-create/piano/` page with the
owner's own file.

In the suite:

- `test/unit/beam.test.js` — 4/4's 4+4, 3/4's 2+2+2, 6/8's threes, a
  group of four eighths followed by sixteenths beamed a beat at a time,
  and `groupTicks` still overriding everything.
- `test/unit/beam-shape.test.js` — the shortest stem under a slanted
  beam is never below the natural length.
- `test/unit/tempo-mark.test.js` — the BPM is one text element in the
  text font at the tempo size, no `fingering` glyph appears anywhere in
  the output, and the per-digit glyph route is gone from the API
  entirely. Plus the measured-in-a-browser numbers the width estimate
  has to cover.
- Three visual snapshots re-recorded, all three because the grouping or
  the mark genuinely changed: `beamed`, `two-voice-drum`, `tempo-mark`.
- Two `musescore.test.js` tests and one `header-width.test.js` test were
  reading absolute y values that only held while the staff happened to
  sit where it did. They read the staff's real position out of the
  drawing now, and round through the same four decimals `svgNumber`
  writes — otherwise `8.8 + -2` fails against a drawn `6.8` over binary
  floating point rather than over a note being in the wrong place.

## 4. Known, not fixed

With `layout.fitSystemHeight` off (the default), a drum chart's hi-hat
beam is clipped by 0.25sp at the top of the picture: the default reserve
above the staff is a flat 4sp, which is exactly one stem plus one beam,
and a hi-hat sits half a space ABOVE the top line. It predates this work
— the committed snapshot has the beam at y=0 too — and the drum page,
the only page that renders drum charts, sets `fitSystemHeight: true`,
which measures the real content and avoids it.

Fixing it properly means knowing each note's real stem DIRECTION when
the headroom is computed, including the direction a beam group forces on
its members. The cheap over-estimate already used for tempo-mark
clearance ("assume every note has an up stem and a beam") would pad the
top of every score that has a high note with a down stem, which is most
piano music. That is a design decision of its own and is left for one.

## 5. How to revert

- Beam grouping: delete `pairsBeats`/`beatsPerGroup`/`shorterOf`/
  `beamLevels` and restore `groupBeams`'s single-pass split at `unit`.
- Beam lift: delete the `shortest`/`lift` block in `computeBeamShape`
  and return `slanted` unshifted.
- Metronome: restore `metronomeEqualsGlyphName`/
  `metronomeBpmDigitGlyphNames` and the per-glyph loop in
  `renderMetronomeMark`; put `sizes.tempo` back to 1.8 and
  `TEMPO_MARK_HEIGHT` back to 2.0.
- `geometry/text-metrics.ts` is then unreferenced except by
  `debug/measure.ts`, which can take its `TEXT_ADVANCE_RATIO` back.
