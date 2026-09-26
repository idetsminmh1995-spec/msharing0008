# Guitar Engine

The neck under the music on the Guitar video page: six strings, the
frets, and a mark where the music is being played — one colour per
finger, and a slide that travels rather than jumps.

TypeScript in, SVG out. It knows nothing about scores, files or pages:
notes arrive as a string, a fret and a finger, in seconds.

```bash
npm run build     # -> dist/guitar-engine.js  (global: GuitarEngine)
npm run verify    # typecheck + lint + format + tests
```

The built bundle is copied to `website/assets/guitar-engine.js`, which
is what the page loads — GitHub Pages has no build step, so the file
has to be in the repo.

## A note is a PLACE, not a pitch

The same pitch is playable in five places on a guitar, and which one
the player uses is the whole point of the picture. So a note here is a
string and a fret:

```js
{ string: 3, fret: 5, startSeconds: 2, endSeconds: 2.5, finger: 1 }
```

Nothing is inferred from pitch. Where a score writes no tab position,
this engine draws nothing rather than guessing a shape — an invented
fingering shown confidently is worse than an empty neck.

## The four fingers, in colours that do not move

`finger` is numbered as a score numbers them: **1 index, 2 middle,
3 ring, 4 little**, and **0 an open string** — played, but by no
finger, so it has its own colour rather than borrowing one.

The four colours are **fixed**, not pickable:

```
1 index   #FF725F red     2 middle  #6EB2FF blue
3 ring    #3FE489 green   4 little  #FF7DE4 pink
```

Their whole job is to be learnt once. A viewer who has seen the hand
knows what red means for the rest of the video, and for the next video
too; four colours anyone can re-pick is four colours nobody can learn.

They are read off the page's own drawing of the hand, to the hex: the
legend is what teaches the code, so a mark a shade off the fingertip
it is naming is a mark that has to be worked out rather than
recognised.

`undefined` is a fifth case and a real one: nobody has decided yet.
It is drawn in `colors.unassigned`, never in a finger's colour, so a
video never says "little finger" about a note no one has answered.

Which finger plays which note is NOT decided here. A score that writes
a fingering has already answered it; the rest is the Human Finger
Engine's question, and this engine draws whatever it is told.

`renderHand()` draws the little hand that says which colour is which:
the fretting hand seen from the back, fingers up. A legend of four
coloured squares is a legend of four coloured squares; a hand says it
without words.

It is rectangles, because rectangles are what both renderers can
paint — so when the caller has a real drawing, `handImage` takes its
place in the band above the neck:

```js
{ handLegend: true, handImage: handPicture('assets/guitar/hand-fingers.webp') }
```

The engine still decides where it goes and how big, because that is
the part that has to agree with the neck beside it; the file keeps its
own shape and is never allowed to grow across the frame. With no
file, the rectangles are still there, so a lost asset costs the
artwork rather than the legend.

## Slides

A slide is one finger travelling along a string while the note sounds,
so the mark it draws is not at a fret but between two of them, moving:

```js
{ string: 2, fret: 5, slideToFret: 9, startSeconds: 0, endSeconds: 1 }
```

`positionsAt` reports a FRACTIONAL fret while it travels — half way
through the note, half way along the neck — and `markShapes` draws the
road behind it so the movement reads in a still frame as well as in
motion. A slide to the fret it is already on is not a slide.

## One description, two renderers

`stageShapes(options)` returns the whole frame as rectangles and
circles in paint order. `renderGuitarStage` writes them as SVG for the
page; the video renderer paints the same list onto a canvas, because
rasterising an SVG thirty times a second costs more than the rest of
the frame together. Two hand-written drawings would drift, and the
first anyone would know of it is a published video that does not match
the preview.

## A guitar, not a fretboard

The picture reads as an instrument: a headstock with a tuning peg per
string at one end, the fretted neck, and the body at the other —
a soundhole and its rosette on an **acoustic**, a scratchplate and
three single coils on an **electric**, pearl blocks and two humbuckers
on a **singleCut**, a plain rosewood board with nothing at all in it
on a **classical**, with the wood changing to match. That is what
`instrument` picks, and the strings run the whole length as they do on
the real thing.

How many FRETS there are is not part of that, because it is not part
of the drawing: a classical stops at 19, a dreadnought around 20, an
electric at 22 and a modern extended-range at 24. The caller says so
with `lastFret`, and the Guitar page treats it as a fact about the
instrument rather than a setting — picking the guitar picks the fret
count with it.

## The right hand: a plectrum, or fingers

`picking: 'pick' | 'fingers'` decides how a stroke is written, and
they are two different notations because they are two different
things to watch. A plectrum strikes the strings together, so it is
ONE mark over all of them: the square bracket down, the V up, which
every guitarist has read above a stave since they started. Fingers
pluck the strings one at a time, so each gets the letter of the
finger that takes it — **a** on the first string, **m** on the
second, **i** on the third and **p**, the thumb, on everything below.
The letters sit on a dark plaque, because a letter alone is lost
against a rosette.

The fret numbers are ruled under the board in a faint ink, there to be
glanced at rather than read. When the neck is drawn too small to carry
all of them, the ones a player actually looks for are kept — the
inlaid frets and every third — rather than crushing twenty-two
numbers into the space.

## Or a photograph, measured

The drawn guitar is shapes and gradients, and it looks like what it
is. When a picture of a REAL instrument is wanted instead, hand over a
photograph:

```js
{ photo: guitarPhoto('assets/guitar/acoustic-cutaway.webp') }
```

and the drawn instrument is not drawn at all — no wood, no frets, no
strings, no body. Everything about the PLAYING still is: the hand
legend, the fret numbers, the marks and the picking strokes, on top of
the picture.

A picture on its own would be useless here, because a mark has to land
on the fifth fret of the second string and only the file knows where
that is. So a photograph arrives MEASURED (`photo.ts`): the x of every
fret wire and the y of the outer strings at both ends of the board, in
the file's own pixels. Scale and shift those with the picture and
every mark lands where it belongs.

The pictures the page draws are **studio renders**, which is how the
photoreal plugins do it: model an instrument, light it, render it once
at high resolution, blit the picture. `tools/render_fretboard.py`
builds each board out of the real measurements of the instrument — the
17.817 rule, the nut width, the string gauges — lights it, and prints
the calibration on its way out, so `ACOUSTIC_BOARD` and its three
siblings are exact by construction rather than read off an image with
a ruler. `ACOUSTIC_CUTAWAY` is the other kind: a photograph of a whole
guitar, measured the hard way.

Two things follow from it being a photograph. The frets it shows are
the frets there are, so `firstFret`/`lastFret` stop applying; and the
spacing is the real one, so the numbers thin out where they crowd
rather than printing over each other.

The picture is scaled to the WIDTH of the frame and hung by its
strings. It is bigger than the frame on purpose: a photographed guitar
is framed by whoever took it, and cropping it to a box would throw
that framing away, so the body runs off the top and the bottom the way
the neck runs off the side. A canvas painting the shape list must cut
it to the stage, as the SVG's viewBox does.

That cut is a hard line straight across a guitar, so give the engine
the colour behind the stage and it fades the picture into it instead:

```js
{ photo: guitarPhoto('assets/guitar/acoustic-natural.webp'), fadeTo: '#17110E' }
```

A picture framed with air around it can say which PART of itself to
show: `span: [left, right]` in the file's own pixels fills the
frame's width with that stretch, setting the scale and the offset
together, and `drop` hangs it lower down the stage as a share of the
stage's height. Both live with the measurements rather than with the
caller, because how a picture wants to be framed is a fact about that
picture.

A band goes over each edge the picture is actually cut at — opaque
there, gone before it reaches the board — and the hand, the marks and
the fret numbers are drawn on top of it at full strength. An edge the
picture ends at by itself gets nothing: a band over an outline is fog
over the guitar, not a cut hidden. Without `fadeTo` nothing is faded,
because a guessed colour would draw a band of the WRONG colour across
the frame.

## The drawn neck is a diagram, not a photograph

Frets are evenly spaced rather than following the real 17.817 rule:
this is drawn to be read, and even spacing keeps the high frets wide
enough to hold a mark. Strings thicken from the first to the last,
because that is how a player tells them apart at a glance. Inlays sit
at 3, 5, 7, 9, doubled at the twelfth, under the strings as they are
in the wood.

## Tests

`npm test` runs against the BUILT bundle in a bare sandbox — the same
file the browser loads, so a test cannot pass against code the page
will not run.
