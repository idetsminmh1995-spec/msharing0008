# The Violin and Cello video frames

Read off the owner's two mock-ups (one sheet per instrument, three
panels each). Both sheets are the SAME design with a different
instrument and a different title, so one page shape serves both.

## First, the thing the mock-up cannot be measured for

**The panels are not drawn at the ratios they are labelled with.** The
panel marked `16:9 (e.g. 1920 x 1080)` is 684 x 575 on the sheet —
about 6:5. The 1:1 panel is not square either. So the mock-up says
WHAT goes where and the proportions have to be worked out at the real
ratio: a true 16:9 frame is half again as wide as the panel drawn, so
the notation gets much more width and much less height than the sheet
suggests, and the instrument photo takes a narrower column.

Everything below is therefore the arrangement, not a set of fractions
to copy.

## Colours, which the mock-up IS exact about

| what | colour |
| --- | --- |
| frame background | `#000000`, pure black |
| frame border | a thin grey rounded line inset from the edge, about `#808488` |
| Title 1 | amber `#ED9300` |
| Title 2 | white |
| stat box border | red |
| stat box label | the same amber as Title 1 |
| stat box value | white |
| notation | white |
| playback cursor | the red rounded capsule, as on the drum and guitar frames |

The stat labels being amber rather than red is the one colour that
differs from the frames already built; the guitar frame's `#D8AE7A` is
already close and becomes this.

## What is in the frame

Four stat boxes, in this order: **KEY, TIME, BPM, COUNT** — the same
four the guitar and piano frames carry, and the same order, because it
is the order a player reads a score in.

The mark is the instrument's own: `sharing-violin-logo-full.svg` and
`sharing-cello-logo-full.svg`. (The mock-up shows the GUITAR mark,
because it was drawn before the violin and cello marks existed.)

The instrument is a **photograph** — a violin or cello stood upright
with its bow across it — not a drawing the engine paints. That is the
first real difference from the guitar and bass frames, where the
instrument IS the engine's stage.

The notation is **wrapped into systems** and stands still: four
systems in the 16:9 panel, three in 9:16. That is the second real
difference. The drum, guitar and bass frames draw ONE system as a long
strip and scroll it under a fixed cursor; here the whole passage is on
screen at once and the cursor travels through it. The notation engine
already has the mode this needs (`config.layout.mode = 'page'`, with
`config.page` giving the box in staff spaces).

## The three shapes

**16:9** — logo and titles top-left, stat boxes top-right on the same
line. The instrument stands in a column down the LEFT, from under the
header to the bottom. The notation fills everything to its right.

**9:16** — logo and titles at the top, stat boxes in a row under them,
the instrument large in the middle of the frame, the notation across
the bottom.

**1:1** — logo and titles top-left; the stat boxes drop to a second
line, under the titles and to the right. The instrument is down the
left and the notation to its right, as in 16:9.

## The photographs

There are none yet. They go in R2 beside the drum kits, which is where
the drum page already reads its backgrounds from, so no Worker change
is needed — `/assets/...` is a straight R2 passthrough:

```
violins/{Model}/16x9/Violin.png
violins/{Model}/9x16/Violin.png
violins/{Model}/1x1/Violin.png
cellos/{Model}/16x9/Cello.png       (and 9x16, 1x1)
```

One picture per shape, as the drum kits do, because a frame that is
half as wide wants a different crop and not the same crop shrunk.
Transparent PNG, the instrument upright with its bow, nothing else in
the picture: the frame is black and supplies its own background.

Until they are there the frame says which one is missing and draws
everything else, the way the bass page does for a bass it has no
drawing of.

## What is NOT decided here

The mock-up shows a TAB staff under the notation with finger numbers
on it. A violin has no frets, so that staff is a FINGERING staff —
which string, which finger — and what fills it is a bowing-and-
fingering engine that does not exist yet. The frame is built first and
draws whatever the score already carries; the engine comes after,
the way the guitar's fretboard came before its finger engine.
