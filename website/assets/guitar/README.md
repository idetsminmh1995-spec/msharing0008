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

## The drawing

`classical-drawn.svg` — the owner's own classical guitar, drawn in
Illustrator and turned a quarter turn counter-clockwise so it lies the
way every other guitar here lies: headstock in from the left, body out
to the right. This is what the page draws for **Classical Guitar**.

`Classic Guitar.svg` — the upright original it was built from, kept as
the source. Nothing draws it.

Two things were changed in the turned copy and nothing else. The whole
drawing is rotated (`translate(0,584.3) rotate(-90)` around the
original artwork, with the viewBox turned to match), and the two
middle strings were moved 1.7 units at the nut onto even spacing —
they were drawn 8.4 apart where the others are 12.5, and the engine
spaces six strings evenly between the outer two.

Measuring it took no measuring. A drawing carries its own numbers, so
the calibration is read straight out of the file: every fret bar is a
rectangle with a stated y and height, and the centre of the bar is the
wire. The nut needs no argument either — it is the bar drawn 7.3 thick
where every fret is 3.6. **Twenty lines: the nut and nineteen frets.**
It is a good drawing: taking the nut and the twelfth as the scale,
every other wire lands within 2.6 units of the real 17.817 rule,
across a scale of 920.

Turning it counter-clockwise puts the low E at the bottom, which is
where the engine numbers string 6: upright, the low E is on the left,
and the left side goes down.

The frame shows the guitar from just before the NUT to just past the
BRIDGE — `span: [251, 1293]`, `drop: 0.13` in `photo.ts`. A photograph
of a guitar already has its body running off the edges, because that
is how someone frames one; a drawing has air around it, so scaled to
the width it came out small, with the notation towering over it and
the headstock taking a quarter of the frame for nothing. `span` says
which stretch of the file to fill the width with instead, and sets
the scale and the offset together, because those are one decision.
`drop` hangs it lower down the stage. Everything drawn on it — the
marks, the numbers, the board — goes with it, because they are all
worked out from where the picture lands.

An SVG works everywhere a photograph does — the preview's `<image>`
and the video canvas's `drawImage` both take one — as long as it
carries `width` and `height` attributes, which is what gives it an
intrinsic size for the canvas. It also stays sharp at any frame size,
which a photograph does not.

## The photographs

`acoustic-natural.webp` — a natural-top dreadnought, framed by its
owner: neck in from the left edge, body filling the right,
background cut away. This is what the page draws for **Acoustic
Guitar**.

`acoustic-sunburst.webp` — a sunburst cutaway dreadnought, the same
idea. Kept, measured and ready; nothing draws it at the moment.

### Measuring one: the dots are the anchor, not the first wire

A geometric fret series fits equally well however the wires are
numbered — the nut position and the scale length absorb any shift —
so counting "the first wire I can see must be fret 1" is a coin toss,
and getting it wrong puts every mark a fret out for the whole video.
It happened twice here, silently, before the check below settled it.

The INLAY DOTS cannot move: 3, 5, 7, 9, 12, 15, 17, 19 are where a
guitar puts them, and a dot sits between the wires of its own fret
and the one before. So do not fit the dots — **number** them. Measure
every dot centre, try each numbering of the wires, and keep the one
that lands the dots on fret numbers a guitar is really inlaid at.

For `acoustic-natural.webp` there are seven dots, at 262, 420, 562,
690, 859, 1003 and 1086. Taking the first line in the picture as the
NUT lands them on 3, 5, 7, 9, 12, 15 and 17 — every one within a pixel
of its own midpoint, and the standard set. Taking it as the first
fret instead lands them on 4, 6, 8, 10, 13, 16 and 18, which is not a
pattern any guitar has ever been built with. So the first line is the
nut, and the picture shows **21 lines: the nut and twenty frets**.

(That one is double-dotted at the SEVENTH as well as the twelfth,
which is unusual. It means "the double dot is the twelfth" is not the
check on this picture — the whole set is. A fit that used the doubles
alone is exactly how the second wrong numbering happened.)

### The cut edges are faded, not sliced

A picture scaled to the frame's width is taller than the band the
stage gets, so the body runs off the top and the bottom and stops
dead — two hard horizontal lines across a guitar, which is the one
thing that gives away a picture laid on a page. The page hands the
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

## The guitar renders

`fretboard-classical.webp`, `fretboard-acoustic.webp`,
`fretboard-electric.webp`, `fretboard-strat.webp` — one studio render
per guitar. The two electrics' are what the video frame draws; the
classical's and the acoustic's are kept for reference, since the
owner's drawing and the photograph above took their places. Each is a
WHOLE guitar in a frame-shaped window: the neck, the joint where the
body opens out, the cutaway, and the top with its soundhole or its
pickups, with the body running off the top and the bottom of the
window because a guitar's body is wider than any frame. (A bare
fretboard strip is `--view board`, which is what these were at first
and which does not read as a guitar.)

The photoreal plugins do not draw their instruments at runtime: they
model one, light it, render it once at high resolution, and blit the
picture. These are that step, and the model is in the repository —
`guitar-engine/tools/render_fretboard.py` (numpy + Pillow):

```bash
python3 tools/render_fretboard.py --model acoustic --width 2880 \
    --out /tmp/fretboard-acoustic.png
```

`--view guitar` (the default) frames the whole instrument;
`--aspect` is the window's shape and `--strings-at` is where down it
the strings sit — 0.53, which is where the engine's board band has
its middle, so the picture lines up with the marks drawn over it
without anything having to be nudged.

It builds each board from the real measurements of the instrument —
the 17.817 rule for the frets, the nut width, the string gauges — so
**the calibration is exact by construction, not measured afterwards**.
The script prints the numbers on its way out; they are pasted into
`guitar-engine/src/photo.ts` as `ACOUSTIC_BOARD` and its three
siblings. Re-render a board and you re-paste them.

## The photographed guitar

`acoustic-cutaway.webp` — the whole-guitar photograph, neck in from
the left and body off the right. Nothing draws it at the moment: the
page moved to the fretboard renders above. One line in the page's
`GUITARS` map puts it back.
 — a cutaway dreadnought, neck running in from
the left edge and the body leaving by the right. It is what the Guitar
page draws when **Acoustic — photograph** is picked, in place of the
guitar the engine draws out of shapes and gradients.

The file is the guitar and nothing else: it was trimmed to the ink, so
its top edge is the top of the body and its bottom edge is where the
picture was cut. The background is transparent, so the video frame's
own colour shows through above and below the neck.

## It is measured, and the measurements live in the engine

A mark has to land on the fifth fret of the second string, and only
this file knows where that is. So `guitar-engine/src/photo.ts` carries
the measurements — `ACOUSTIC_CUTAWAY` — in this file's own pixels:

| what | where |
| --- | --- |
| `frets` | every fret wire, index 0 the nut, index n fret n |
| `boardEndX` | where the board stops, past the last wire |
| `stringsAtNut` | the outer strings at the nut: thinnest, thickest |
| `stringsAtEnd` | the same two where the board ends |
| `boardAtNut` / `boardAtEnd` | the board's own edges at those places |

**Replacing this file means re-measuring it.** The numbers are not
guesses to be nudged until it looks right: they were read off the
image, and a wire half a fret out puts every mark in the video half a
fret out with it. To measure a new picture, find the fret wires as the
bright vertical lines across the board (average each column over the
board's rows and take the peaks) and the strings as the bright
horizontal lines, at the nut and again at the end of the board.

Keep the same shape of picture if you can: neck in from the left, body
off the right, trimmed to the ink. The engine scales the file to the
width of the frame and hangs it by its strings, so a picture framed
differently will sit differently.
