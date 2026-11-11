# Integration Y — seen from across the room

**Not a numbered phase.** The owner drew on a screenshot: a blue line
above the keyboard, arrows at the keys that were lit, and red circles
round a rest, a dotted note and a tie — *"ours is small and not very
visible."*

**Status:** complete. `npm run verify` clean (1009 tests).

Three complaints, and they turned out to have four causes between them,
three of which were defects rather than preferences.

## 1. A tie was drawn at half the thickness it stated

A quadratic Bézier reaches **half** the height of its control point:

    B(0.5) = (P0 + 2·P1 + P2) / 4

and with both endpoints on the baseline that is half of P1. Both
`render/tie.ts` and `render/slur.ts` put their control points at the
height the curve was meant to reach. So every curve in the engine came
out half as thick and half as high as its own numbers said. On the
owner's file a tie stated at Bravura's 0.21 staff spaces thick and
arcing half a space was drawn **0.105 thick and 0.25 high** — a
hairline between two noteheads, invisible at video size.

The shapes' numbers were right. Only the drawing of them was not, and
doubling the control offsets makes the drawn curve land on them.

While there, the arc height stopped being a flat half-space for every
curve. MuseScore shapes a curve from its **span** — a short one's
shoulder rises straight with its length, past two staff spaces it rises
logarithmically, and the rise is capped so a slur across a system is a
curve and not a dome. Those three numbers are MuseScore's own and now
live in `MUSESCORE_STYLE.slur`; the three-quarters that turns a
shoulder into the height a cubic actually reaches is the cubic's own
arithmetic. One floor is this engine's rather than MuseScore's and says
so in the code: a curve never arcs less than twice its own thickness,
because a lens flatter than it is wide reads as a smudge.

## 2. The box reserved room the music never used

A system reserves four staff spaces above its top line and eight below
its bottom one, whatever is drawn there, because the reserve has to be
decided before anything is placed. On the owner's own piano export that
leaves **7.8 of 28.8 staff spaces empty** — and a video strip is a fixed
height, so every reserved space nothing is drawn in is a space the notes
are not drawn at.

`config.layout.fitSystemHeight` existed to trim exactly this, and almost
never could. It worked by PREDICTING how far the notes would reach, and
a prediction that can see notes and nothing else has to decline the
moment a score carries a dynamic, a lyric, a slur, a tuplet bracket, an
articulation or an ornament — each placed by a pass that runs long after
the height is decided. Which is to say it declined on very nearly every
real score, this one included.

It now measures the finished markup. Three things make that safe at the
very end of a render:

- **It moves the box, not the music.** Every y in the output still means
  what it meant, so the page that finds the staff lines in the SVG to
  hang its playhead on them still finds them where they are. Nothing is
  re-laid out and nothing is rendered twice: the box starts lower, via
  the viewBox's own min-y.
- **It grows as readily as it shrinks.** A drum chart's china cymbal and
  its stem reach higher than the four-space reserve and used to be cut
  off at the top of the picture. Measured ink is still ink.
- **It keeps the staff's own lines plus a playhead's overhang** whatever
  the measurement says, so a score whose every note sits inside the
  staff cannot end up with a box too tight for the marker a host draws
  on it (§17.3 leaves that marker to the host; this is the engine
  leaving room for one).

Measuring the output cannot be wrong about what the output contains, so
there is nothing left for it to decline over. The predictive machinery
is gone rather than kept beside it.

Measured on the owner's two piano files: **28.8 staff spaces down to
24.8, and 30.8 down to 29.7.**

## 3. Which made `measureSvgBoxes` load-bearing, and it had two faults

It was written as a debug overlay, where a loose box is a nuisance. As
the input to a fit it decides how big the music is drawn, so both of its
stated approximations were now worth closing.

**`<g transform>` was not applied.** The engine emits exactly one — the
brace, scaled over however many staves it joins — and leaving it
unapplied put the brace's box almost four staff spaces above the top of
the picture. As an overlay that was a puzzle; as the input to a fit it
would have been four spaces of air on every grand staff.

**A curve was measured by its control points.** Which, given §1 above,
meant a tie 0.58 staff spaces deep measured 1.15 deep. A Bézier's
extremes are its endpoints plus wherever its derivative crosses zero —
one candidate per axis for a quadratic, two for a cubic — which is a
closed form, not a sampling. Paths are now exact and say so; a command
the engine does not emit still falls back to the control-point hull and
still declares itself approximate, because a loose box is a nuisance and
a wrong one is a clipped note.

And one that was wrong rather than loose: **plain text was measured from
`y - fontSize` to `y`**, which is too much room above the cap line and
*none at all* under the baseline. A 'g' or a comma hangs below a
baseline. `TEXT_ASCENT_PER_EM`/`TEXT_DESCENT_PER_EM` (0.78/0.22) now sit
beside the width estimates in `geometry/text-metrics.ts`.

## 4. The piano was small because the window was

Not a notation defect at all. The video frame handed the notation a
**fixed 225px** and gave the keyboard whatever survived — so the
keyboard's share of the frame depended on how big the browser window
happened to be: 16.5% of a wide one, under 10% of a narrow one. And
since the exported video is composed from that very box (`rectIn`
measures these same elements), the window that happened to be open
decided the proportions of the file.

The keyboard now takes its share first — 43.5% of the frame, which puts
the keys' top edge at 18.2% of it, the line the owner drew — and the
notation fills what is left. Measured at four preview widths: 18.3% at
every one of them.

## 5. What this left behind

A bug the other work made impossible to miss. In SVG `fill="none"` draws
nothing, which is what a shape carrying only a label is. Canvas has no
such value: assigning an invalid colour to `fillStyle` is silently
ignored and the previous colour stays — so in the EXPORTED video every
note name wore a tile of whatever colour the last key drawn had been.
The preview was right and the file was wrong, which is the worst way
round for a bug to be.

## 6. Still open

The fitted box on the owner's first file keeps about two staff spaces of
air above the music, and it is the metronome mark's own note glyph that
asks for it: Bravura's `metNoteQuarterUp` declares a bounding box
reaching a staff space higher than the glyph's ink does. The number is
the font's own, and over-reserving from it is the safe direction, so it
is recorded here rather than worked around.
