# The pictures the Bass Guitar video frame draws

**This folder is waiting for four drawings.** Everything else on the
Bass page is built and wired — the notation, the Human Finger Engine,
the neck marks, the hand legend, the picking marks, the count voice,
the video export. What it cannot do yet is show a bass, because there
is no bass here to show.

## What to drop in, and under exactly these names

| file | what it is | strings |
| --- | --- | --- |
| `precision-drawn.svg` | a Precision-style bass | 4 |
| `jazz-drawn.svg` | a Jazz-style bass | 4 |
| `acoustic-drawn.svg` | an acoustic bass | 4 |
| `five-drawn.svg` | a five-string bass | 5 |

The names are what the page asks for. A file under any other name is
a file the page will not find, and the frame stays empty with a line
saying which one is missing.

Fewer than four is fine — each one starts working the moment it is
measured, and the others keep saying they are missing.

## Lay the bass out the way the guitars are laid out

Everything below is the same lesson the four guitars in
`../guitar/README.md` taught, and every one of them cost a round to
learn. That file is worth reading before drawing a new instrument.

**Lying down, nut at the LEFT, body at the RIGHT.** The engine draws
a neck horizontally, with the strings running left to right and the
thin string at the top. A bass drawn upright has to be turned a
quarter turn counter-clockwise first, which is how
`classical-drawn.svg` and `strat-drawn.svg` were made from the
owner's upright originals.

**Give it `width` and `height`, not just a `viewBox`.** They are what
give the picture an intrinsic size, which is what the video canvas
needs to draw it at.

**Tighten the `viewBox` to the bass itself.** The engine hangs the
picture by its strings and takes the stage's height from the
picture's, so empty sky above the instrument comes out as a box twice
as tall as it should be.

**No two hyphens in a row inside an XML comment.** It is not legal,
the browser refuses the whole file, and the frame comes out with the
marks and the fret numbers floating on black with no bass under them.

**Every fret wire visible, and the nut drawn as a nut.** Which line
is fret 1 cannot be settled by counting — a fret series fits equally
well however the wires are numbered — so the nut being visibly
thicker, or drawn in bone, is what settles it. Get it wrong and every
mark in the video is a fret out for the whole video.

## Then it has to be measured

A mark has to land on the fifth fret of the second string, and only
the file knows where that is. So each drawing gets one entry in
`guitar-engine/src/photo.ts` — the same file the four guitars use,
because a bass is a fretted neck and the engine does not care how
many strings it has:

| what | where |
| --- | --- |
| `width` / `height` | the picture's own size, the units of everything below |
| `frets` | every fret wire, index 0 the nut, index n fret n |
| `boardEndX` | where the board stops, past the last wire |
| `stringsAtNut` | the outer strings at the nut: thinnest, thickest |
| `stringsAtEnd` | the same two where the board ends |
| `boardAtNut` / `boardAtEnd` | the board's own edges at those places |
| `span` / `drop` | which part of the picture fills the frame, and how low it hangs |
| `pickX` | where the picking hand sits along the strings |
| `fit` | `whole` |

The two outer strings are measured at BOTH ends because the band they
make does not just widen along the board, it drifts. Four strings are
spread evenly between them, the same way six are.

`pickX` matters more on a bass than on a guitar: fingerstyle is
played over the end of the fretboard or just behind it, not down by
the bridge, and it must be clear of a pickup rather than on one.

**Measure it by rendering it into a page, not by opening the SVG as a
document.** Opening it directly adds the body margin and stretches
the drawing to the window: a measurement of the browser, not of the
bass. It was worth eleven pixels on the Telecaster, a sixth of a fret.

## What the page already knows about a bass

Four strings, tuned **E1 A1 D2 G2** (MIDI 28, 33, 38, 43) — an octave
below a guitar's bottom four. The five-string adds a low **B0** (23)
below them.

A 34-inch scale, which is what makes the Finger Engine's answers
right: the hand's stretch in millimetres is the same hand it always
was, but on a bass neck those millimetres buy far fewer frets, so the
engine chooses differently and correctly without being told to.

And the right hand is a bassist's, not a guitarist's: index and
middle ALTERNATE, note after note, whichever string each lands on.
That is decided on the page, note by note, and handed to the engine
as `PickMark.fingers` — a classical guitarist's hand can be worked
out from the string alone, and a bassist's cannot.

## The logo

`../logo/sharing-bass-logo-full.webp`, beside the drum, guitar and
piano marks. Same treatment: the page pulls the layout box onto the
ink with negative margins written as fractions of the file's own
pixel counts, so a new file means re-measuring the ink's bounding box
(see `../logo/README.md`). Until it is there the page falls back to
the guitar mark.
