# The marks the video frames burn in

Eight of them, all vector, all built from one file:

| file | what it is |
| --- | --- |
| `sharing-drum-logo-full.svg` | Drum |
| `sharing-violin-logo-full.svg` | Violin |
| `sharing-guitar-logo-full.svg` | Guitar |
| `sharing-bass-logo-full.svg` | Bass Guitar |
| `sharing-piano-logo-full.svg` | Piano |
| `sharing-cello-logo-full.svg` | Cello |
| `sharing-vocal-logo-full.svg` | Vocal |
| `sharing-logo-full.svg` | the plain M Sharing mark, no instrument |

They replace four `.webp` rasters, which are gone.

## They all share one box, and that is not a coincidence

**1414 x 2000, ink at columns 151 to 1257, rows 333 to 1649.** The
frame's CSS pulls the layout box onto the ink with negative margins
written as fractions of those numbers, so a mark whose ink sits
anywhere else lands anywhere else in the video.

A raster had to be trimmed to its ink, resized and pasted to get
there. An SVG only needs a `viewBox` that says so, which is what
`docs/logo-kit.py` computes: one scale for both axes, the ink centred in the
box. Every one of the eight lands within 4 pixels of 1414x2000 — under
a third of a percent, and a fraction of a pixel at the 104px the frame
actually draws them at.

So a new mark needs no page change at all, only the same box.

## Where they came from, and the two things that had to be fixed

`drum.svg`, `violin.svg` and `bass.svg` are the owner's Illustrator
exports. They are **the same document three times** — inside each are
top-level groups named `Drum`, `Violin`, `Guitar`, `Vocal`, `Paino`,
`Bass`, `Cello` and `MShairng`, all but one carrying `display="none"`.
So the whole family comes out of any one of them, and all eight marks
above were cut from `drum.svg`.

**8.6 MB, of which almost none is the drawing.** Nine copies of a
2480x3508 PNG of the whole artboard, which no browser ever draws
(removing all nine changes not one pixel), and Illustrator's own
`<i:aipgf>` blob — the editable document, zstd'd and base64'd into the
file. Both go, and the marks come out between 31 and 74 KB.

**The two words were live text.** "Sharing" is set in `Aka02` and the
instrument's name in `AJKunheingETM03`, two fonts nobody's browser
has, so an `<img>` pointing at the file draws them in whatever serif
the machine falls back to — a different wrong face on every machine.
That is not hypothetical: the bass mark that was on the site until now
had exactly that, "Sharing" in a Didone serif and "BASS GUITAR" in a
plain sans, because it was built by rendering `bass.svg` on a machine
without the fonts.

Illustrator embedded both fonts in the file as SVG `<font>` elements —
650 glyphs with their real outlines. Chrome dropped SVG fonts years
ago and Firefox never had them, so the browser ignores them, but they
are the same outlines "Create Outlines" would have produced. So
`docs/logo-kit.py` lays each character out by hand: look the glyph up, scale
by `font-size / units-per-em`, flip it (font coordinates run y-up from
the baseline, SVG runs y-down), advance the pen by `horiz-adv-x`. Then
the fonts leave the file. Nobody has to have them again.

The script is `docs/logo-kit.py`. Nothing on the site runs it — it is
kept because it is how these were made, and because the next mark the
owner draws goes through it unchanged.

**The piano mark says PAINO.** It says that in the artwork, and it
said it in the raster it replaces, so it was left alone: it is the
owner's word to change, and changing it silently would be a change to
their brand.

## The two drumsticks

`drumstick-left.svg` (amber) and `drumstick-right.svg` (blue) — a hand
gripping a stick, one for each bottom corner of the **9:16** drum
frame. The web address that sits between them in the finished video is
NOT drawn here: it is burned into the kit photo itself, in
`Drum Bg.png` under the kit's own `9x16` folder, and a frame that drew
its own would print it twice.

They are the owner's own artwork: traced off the mock-up they sent, at
the half-way line of the colour ramp rather than at a yes/no
threshold, so the long diagonal of the shaft comes out straight
instead of as a staircase. About sixty points each, straight lines
only, under a kilobyte.

Both are drawn flush with the frame's bottom edge, and both were
traced from a picture where that edge had already cut them — so the
flat bottom is part of the shape, and moving them up the frame would
show it. Place them on the bottom, or re-trace.

They are not in the 16:9 or 1:1 frames. A landscape frame has the kit
across the whole width and nowhere to put them that is not on top of a
cymbal.
