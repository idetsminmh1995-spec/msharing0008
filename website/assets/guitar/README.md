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

## The photographed guitar

`acoustic-cutaway.webp` — a cutaway dreadnought, neck running in from
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
