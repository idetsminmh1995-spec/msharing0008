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

## The fretboard renders

`fretboard-classical.webp`, `fretboard-acoustic.webp`,
`fretboard-electric.webp`, `fretboard-extended.webp` — one studio
render per guitar, and what the video frame actually draws.

The photoreal plugins do not draw their instruments at runtime: they
model one, light it, render it once at high resolution, and blit the
picture. These are that step, and the model is in the repository —
`guitar-engine/tools/render_fretboard.py` (numpy + Pillow):

```bash
python3 tools/render_fretboard.py --model acoustic --width 2880 \
    --out /tmp/fretboard-acoustic.png
```

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
