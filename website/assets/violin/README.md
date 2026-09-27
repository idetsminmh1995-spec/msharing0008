# The violin the video frame draws

One file: **`violin.svg`**, the owner's own drawing, and the page
draws it in all three shapes.

That is the difference from the drum kits, which are photographs filed
per shape in R2 (`drums/{Brand}/{Model}/{ratio}/`). A kit photograph
has to be cropped for each frame — a landscape crop shrunk into a
portrait one leaves the kit a sliver in the middle — but a vector
drawing of one tall instrument is the same drawing at every shape,
scaled. One file, no crops, no bucket, and no upload when the shape
changes.

A name with no file behind it simply reports that it has none, in the
card, and the rest of the page keeps working. A second violin is one
line in the page's `VIOLINS` table and one file here.

## What was done to the file as sent

Two things, neither of which changes a line of the artwork:

**A tight `viewBox`, and a `width`/`height` to go with it.** It came
with `viewBox="0 0 451.7 472.9"` and no size at all. Seventy-three
units of that height were empty sky above the scroll and thirty-three
empty below the body -- nearly a quarter of the picture -- and the
page fits the drawing to its column, so a drawing that is a quarter
air comes out a quarter smaller than it could be. Measured by
rendering it transparent and reading the alpha, the ink is
430.97 x 369.01 at `10.24, 71.70`, and that is the box now.

**An intrinsic size.** An `<img>` whose SVG carries only a `viewBox`
has no size of its own, and the canvas the video is rendered on draws
what it is given: `width` and `height` are what stop it guessing.

## How to draw it

**Standing UP, with its bow.** This is the opposite of the rule the
guitars and basses in `../guitar/` and `../bass/` follow, and for the
opposite reason: those lie down because the engine draws a neck
horizontally and puts marks along it. Nothing marks this one. It
stands in a tall column down the side of the frame (or in the middle,
in 9:16), so it wants to be tall.

**On nothing.** No background rectangle, white or otherwise — the
frame is black and supplies its own. A white box behind the violin is
a white box in the video.

**Give it `width` and `height`, and a `viewBox` tight to the
instrument.** See above for why, and what it cost this one.

**Text to outlines**, if there is any. A font the browser does not
have is a word in the wrong typeface, in every frame of the video —
which is exactly what happened to the brand marks in
`../logo/README.md`.

**No embedded rasters**, or the file is eight megabytes and vector for
nothing.

**No two hyphens in a row inside an XML comment.** It is not legal,
the browser refuses the whole file, and the frame comes out with the
music floating on black and no violin beside it.

## What is NOT needed yet, and what would change that

Nothing measures this drawing. The guitars and basses carry
measurements in `guitar-engine/src/photo.ts` — every fret wire, the
outer strings at each end of the board — because the finger engine
lands marks on real frets. A violin has no frets, and no engine yet.

When a bowing-and-fingering engine comes, this drawing will need the
same treatment: the four strings' positions at the nut and at the
bridge, where the bow crosses, and the neck's own band. That is easier
to measure on a drawing than on a photograph, which is one more reason
to keep it vector.
