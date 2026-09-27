# The pictures the Bass Guitar video frame draws

**Two of four drawings are in use, and both are measured.**
`jazz-drawn.svg` is the owner's Jazz Bass and `precision-drawn.svg`
the owner's Precision, turned a quarter turn out of its upright
original and cropped to itself.

`Bass Guitar 2.svg` is the same Jazz Bass the other way round: nut at
the RIGHT, and its headstock lettering reads forwards rather than
backwards. The engine needs the nut at the LEFT, so using it means
mirroring it, which gives back exactly the file already in use. Kept
and unused.

## What to drop in, and under exactly these names

| file | what it is | strings | state |
| --- | --- | --- | --- |
| `jazz-drawn.svg` | a Jazz-style bass | 4 | **measured, 20 frets** |
| `precision-drawn.svg` | a Precision-style bass | 4 | **measured, 21 frets** |
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
thin string at the top — which is how tab is written and how all four
guitars here are drawn. A bass drawn upright has to be turned a
quarter turn counter-clockwise first, which is how `classical-drawn.svg`,
`strat-drawn.svg` and `precision-drawn.svg` were made from the owner's
upright originals.

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

Both basses prove it. The Jazz's fit is equally good whether the
first line is called 0, 1 or 2 — worst residual 1.35 units over a
506-unit board, the same either way — so the fit says nothing. What
says it is that the first line is drawn pale and 3.8 units wide where
every fret wire is 1.3 to 1.8, and that the headstock's yellow stops
there. The Precision is the same story with wider margins: its nut is
6.33 units against 1.9 for every other wire, three times over.

**And the Jazz's inlays would have lied.** Its blocks fall in the
spaces at 1, 3, 5, 7, 9, 12, 15, 17 and 19; a real Fender puts them
at 3 through 21. The artist started the pattern a space early, so
reading the drawing by its dots — the check the guitar README calls
an oracle and warns against — would have put every mark two frets out,
and the video would have looked entirely plausible. (The Precision's
dots do agree, at 12 double, 15, 17 and so on. That is luck, not a
method.)

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

### Slanted wires, and how the Precision was read

A scan down one fixed row of the picture works on a drawing whose
fret wires are vertical. The Precision's are NOT: its neck tapers and
each wire is drawn square to the board's own centreline, so a wire's
x at the top of the board is a few units from its x at the bottom.
Pick a row and every wire reads differently, and the error grows up
the neck — the worst kind of wrong, because it looks right at the nut.

So the scan follows the BOARD's centreline instead: read the board's
own edges from the columns BETWEEN the wires (a wire column is white
and has no edges of its own to find), then sample a band either side
of the line halfway between them. That line is where the strings are,
so it is the line a fret's x means.

Its dot inlays sit on exactly that line — and are grey where the
wires are white, so a threshold that takes only white takes only
wires. Its strings are white too, but they run the length of the
board rather than across it, so they never make a vertical band.

The first scan, before any of this, reported fifteen frets and a
board ending at 1000. Both were wrong: the window it looked in fitted
the neck at the nut, where the board is 61 units across, and the neck
is 92 where it meets the body — so the last six frets fell outside
the window and were thrown away. A Precision has twenty-one, and it
has twenty-one here.

## The headstock lettering

The Jazz's headstock carried "Fender JAZZ BASS" — and, because the
drawing is a mirrored right-handed bass, it read backwards. It is
turned off rather than deleted: the paths are still in the file,
inside `<g id="headstock-lettering" display="none">`, and changing
that `none` to `inline` puts it back exactly as it was. Two reasons
for turning it off: backwards words look like a mistake in a video,
and un-mirroring them would print another company's name legibly in
every frame of the owner's own product.

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

`../logo/sharing-bass-logo-full.svg`, beside the drum, guitar and
piano marks. Same treatment: the page pulls the layout box onto the
ink with negative margins written as fractions of the file's own
pixel counts, so a new file means re-measuring the ink's bounding box
(see `../logo/README.md`). Until it is there the page falls back to
the guitar mark.
