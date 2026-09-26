# The pictures the Guitar video frame draws

## The hand

`hand-fingers.webp` — the four-colour hand in the corner of the frame,
and the same drawing in the card beside the controls. It is the
LEGEND: a viewer who has seen it knows what each colour means for the
rest of the video.

Its fingertip colours are the engine's finger colours, to the hex
(`FINGER_COLORS` in `guitar-engine/src/colors.ts`) — index `#FF725F`,
middle `#6EB2FF`, ring `#3FE489`, little `#FF7DE4`. **Changing a
fingertip in this file means changing that constant with it**, or the
video will name a colour the neck never shows. Its size is recorded as
`HAND_PICTURE` in `guitar-engine/src/hand.ts`, so the frame can lay it
out before the browser has finished loading it; replacing the file
with one of a different size means changing those two numbers.

Trimmed to the ink, transparent background, drawn with the thumb to
the left and the fingers up.

## The guitars

Four drawings, all the owner's own, all SVG. There are no photographs
and no renders here any more, and the engine no longer draws an
instrument of its own either: an SVG stays sharp at any frame size, a
photograph does not, and a vector file can be measured to the tenth of
a pixel.

`acoustic-drawn.svg` — a dreadnought. **Acoustic Guitar**, the nut and
twenty frets. Their upload, renamed, with the viewBox tightened to the
guitar's own bounding box (see below) and `width`/`height` added.

`classical-drawn.svg` — a classical, the nut and nineteen frets. Built
from `Classic Guitar.svg` beside it, which is the upright original:
this one is turned a quarter turn counter-clockwise so it lies the way
the others do, and its two middle strings are nudged 1.7 units at the
nut onto the even spacing the engine's model assumes.

`electric-drawn.svg` — a single-cut electric, a Telecaster shape, the
nut and twenty-two frets. Their upload exactly as it came, renamed,
with `width`/`height` added.

`strat-drawn.svg` — a double-cut electric, a Stratocaster shape, the
nut and twenty-two frets. Built from `Electric Guitar 1.svg` beside
it, which is the upright original: this one is turned a quarter turn
counter-clockwise with its bounding box turned with it.

**There is nothing else to draw a guitar with.** The engine used to
build an instrument out of shapes and gradients — wood, binding,
tuners, a soundhole or a pair of humbuckers — and that is gone, with
the studio renderer that made the fallback pictures. A stage with no
picture on it now gets its background and nothing else.

### Four things that will bite whoever adds the next one

**Give it `width` and `height`, not just a viewBox.** They are what
give the picture an intrinsic size, which is what the video canvas
needs to draw it at.

**No two hyphens in a row inside an XML comment.** It is not legal,
the browser refuses the whole file, the `<img>` loads as nothing, and
the frame comes out with the marks and the fret numbers floating on a
black background with no guitar under them. It cost a round here.

**Tighten the viewBox to the guitar.** The acoustic arrived as a 177.2
square with the guitar lying across the middle of it. The engine hangs
a picture by its strings and takes the stage's height from the
picture's, so all that empty sky and floor came out as a box twice as
tall as the guitar. Measure the drawing's bounding box off a render
and make that the viewBox.

**Render it into a page, not as a document.** Open an SVG directly in
a browser and what comes back is offset by the body margin and
stretched to the window — a measurement of the browser, not of the
guitar. It was worth eleven pixels on the electric, a sixth of a fret
at the nut, and every mark in the video sat visibly right of where it
belonged. An `<img>` at the picture's exact size, in a page with
`margin: 0`, gives the file's own coordinates.

### Which line is which fret

A geometric fret series fits equally well however the wires are
numbered — the nut position and the scale length absorb any shift — so
counting "the first line I can see must be fret 1" is a coin toss, and
getting it wrong puts every mark a fret out for the whole video. It
happened twice on the photograph this folder used to hold.

There are two ways to settle it, and which one to trust depends on the
drawing.

**The nut, when it is drawn as a nut.** On the classical it is the bar
drawn 7.3 thick where every fret is 3.6; on the single cut it is a
bone bar with its own colour; on the acoustic and the double cut it is
the one line wider than the rest. When the picture shows the nut, the
first line is fret 0 and there is nothing to argue about.

**The fret rule, fitted to every wire at once.** `pos(n) = A − B·2^(−n/12)`
is linear in `A` and `B`, so a least-squares fit takes a second and
tells you two things: how well the drawing follows the real 17.817
rule, and where that rule says the nut is. On the acoustic every wire
lands within 1.7 of the fit across a scale of 1091, and the fit's nut
falls on the front edge of the nut bar as drawn. Nothing else fits
that way.

**The inlay dots are a check, not an oracle.** On a photograph they
are the only anchor there is. On these drawings they sometimes agree
all the way — the double cut's nine come out as 3, 5, 7, 9, 12, 15,
17, 19 and 21, the full standard set — and sometimes wander: this
owner puts a DOUBLE dot at the seventh as well as the twelfth on two
of them, and the acoustic's last two dots sit on 14 and 16 where a
real guitar would put 15 and 17. Use them to confirm 3, 5, 7, 9 and
12; do not use them alone to number a drawing.

### The whole guitar, never a slice of one

All four are `fit: 'whole'`: the picture is scaled to fit its box on
BOTH axes and centred in it, the way a photo viewer shows a
photograph, so nothing is ever cut. A guitar that is all there reads
as a guitar; one sliced across the body reads as a picture that did
not fit. The box a page should give it is `stageHeightFor`, which for
a whole picture is simply its own height at the frame's width; a
shorter box shows it smaller with air down the sides rather than
cutting it.

`fit: 'frame'` is the other way: fill the frame and let the body run
off the top and the bottom, with `span: [left, right]` saying which
stretch of the file to show and `drop` how far down the stage to hang
it. Nothing uses it now -- the owner asked for the whole guitar -- but
it is what the fade below exists for, and it is still tested.

### The cut edges are faded, not sliced

(Only for `fit: 'frame'`. A picture shown whole is never cut, so it
never gets a band.) A picture scaled to the frame's width is taller
than the band the stage gets, so the body runs off the top and the
bottom and stops dead — two hard horizontal lines across a guitar,
which is the one thing that gives away a picture laid on a page. The page hands the
engine the colour behind the stage (`fadeTo`, read off the video
frame) and the engine lays a gradient band over each edge the picture
is actually cut at, opaque at the edge and gone before it reaches the
board. Everything about the playing — the hand, the marks, the fret
numbers — is drawn on top of it at full strength.

It is the best-looking thing here by a distance, and it is worth
being plain about why: no renderer written by hand is going to beat a
photograph of a real instrument. The renders below are what to use
when there is no photograph.

Both were measured off their files — the fret wires as the bright
lines across the dark board, the strings as the bright lines along
it, fitted across the whole run rather than read off two points. The
strings land within half a pixel of their fits, where a string gap is
about twenty. The numbers live in `guitar-engine/src/photo.ts`.

**A photograph for one of the other three goes in the same way.** It
wants to be shot along the neck, nut at the left, body at the right,
background removed, and at least 2000px wide. Measuring it is an hour
with the same script that measured this one.

## It is measured, and the measurements live in the engine

A mark has to land on the fifth fret of the second string, and only
the file knows where that is. So `guitar-engine/src/photo.ts` carries
one set of measurements per drawing — `ACOUSTIC_DRAWN`,
`CLASSICAL_DRAWN`, `ELECTRIC_DRAWN`, `STRAT_DRAWN` — in that file's
own pixels:

| what | where |
| --- | --- |
| `width` / `height` | the picture's own size, the units of everything below |
| `frets` | every fret wire, index 0 the nut, index n fret n |
| `boardEndX` | where the board stops, past the last wire |
| `stringsAtNut` | the outer strings at the nut: thinnest, thickest |
| `stringsAtEnd` | the same two where the board ends |
| `boardAtNut` / `boardAtEnd` | the board's own edges at those places |
| `span` / `drop` | which part of the picture fills the frame, and how low it hangs |
| `fit` | `frame` for a whole guitar, `board` for a bare fretboard strip |

The two outer strings are measured at BOTH ends because the band they
make does not just widen along the board, it drifts: the engine reads
each of them off at any point and spreads the other four evenly
between, rather than fanning six strings about one middle line. A
middle-and-a-half model put every string a sixth of a gap out at both
ends of this acoustic.

**Replacing a file means re-measuring it.** The numbers are not
guesses to be nudged until it looks right: a wire half a fret out puts
every mark in the video half a fret out with it.
