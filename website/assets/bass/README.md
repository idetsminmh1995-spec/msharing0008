# The pictures the Bass Guitar video frame draws

**One of four drawings is in use.** `jazz-drawn.svg` is the owner's
own Jazz Bass, measured, and the page draws it.

`precision-drawn.svg` is the owner's Precision Bass, built from the
upright `Bass Guitar 1.svg` the same way the classical guitar was
built from its own original: rotated a quarter turn counter-clockwise
and its viewBox tightened onto the bass. It is not MEASURED yet, so
the page still says it is waiting for it — a drawing being present is
not the same as the engine knowing where its fret wires are, and a
picture with no measurements puts every mark nowhere.

`Bass Guitar 2.svg` is the same Jazz Bass the other way round: nut at
the RIGHT, and its headstock lettering reads forwards rather than
backwards. The engine needs the nut at the LEFT, so using it means
mirroring it, which gives back exactly the file already in use. Kept
and unused until the owner says which way the headstock should read.

## What to drop in, and under exactly these names

| file | what it is | strings | state |
| --- | --- | --- | --- |
| `jazz-drawn.svg` | a Jazz-style bass | 4 | **measured, in use** |
| `precision-drawn.svg` | a Precision-style bass | 4 | turned and cropped; not measured |
| `acoustic-drawn.svg` | an acoustic bass | 4 | missing |
| `five-drawn.svg` | a five-string bass | 5 | missing |

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

The Jazz Bass proves both halves of that. Its fit is equally good
whether the first line is called 0, 1 or 2 — worst residual 1.35
units over a 506-unit board, the same either way — so the fit says
nothing. What says it is that the first line is drawn pale and 3.8
units wide where every fret wire is 1.3 to 1.8, and that the
headstock's yellow stops there. Twenty frets after it, which is a
Jazz Bass.

**And its inlays would have lied.** The blocks fall in the spaces at
1, 3, 5, 7, 9, 12, 15, 17 and 19; a real Fender puts them at 3
through 21. The artist started the pattern a space early, so reading
the drawing by its dots — the check the guitar README calls an oracle
and warns against — would have put every mark two frets out, and the
video would have looked entirely plausible.

The Jazz Bass proves both halves of that. Its fit is equally good
whether the first line is called 0, 1 or 2 (worst residual 1.35 units
over a 506-unit board, the same either way) — so the fit says
nothing. What says it is that the first line is drawn pale and 3.8
units wide where every fret wire is 1.3 to 1.8, and that the
headstock's yellow stops there.

**And its inlays would have lied.** The blocks fall in the spaces at
1, 3, 5, 7, 9, 12, 15, 17 and 19; a real Fender puts them at 3
through 21. The artist started the pattern a space early, so reading
the drawing by its dots — the check the guitar README calls an oracle
and warns against — would have put every mark two frets out, and the
video would have looked entirely plausible.

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
