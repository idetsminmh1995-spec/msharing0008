# The violin the video frame draws

One file: **`violin-drawn.svg`**, and the page draws it in all three
shapes.

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

**Give it `width` and `height`, not just a `viewBox`.** They are what
give the picture an intrinsic size, which is what the video canvas
needs to draw it at.

**Tighten the `viewBox` to the instrument.** Empty space around it in
the file is empty space in the frame: the page fits the drawing to its
column, so a drawing that is half air comes out half the size it could
be.

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
