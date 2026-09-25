# Guitar Engine

The neck under the music on the Guitar video page: six strings, the
frets, and a mark where the music is being played — one colour per
finger, and a slide that travels rather than jumps.

TypeScript in, SVG out. It knows nothing about scores, files or pages:
notes arrive as a string, a fret and a finger, in seconds.

```bash
npm run build     # -> dist/guitar-engine.js  (global: GuitarEngine)
npm run verify    # typecheck + lint + format + tests
```

The built bundle is copied to `website/assets/guitar-engine.js`, which
is what the page loads — GitHub Pages has no build step, so the file
has to be in the repo.

## A note is a PLACE, not a pitch

The same pitch is playable in five places on a guitar, and which one
the player uses is the whole point of the picture. So a note here is a
string and a fret:

```js
{ string: 3, fret: 5, startSeconds: 2, endSeconds: 2.5, finger: 1 }
```

Nothing is inferred from pitch. Where a score writes no tab position,
this engine draws nothing rather than guessing a shape — an invented
fingering shown confidently is worse than an empty neck.

## The four fingers, in colours that do not move

`finger` is numbered as a score numbers them: **1 index, 2 middle,
3 ring, 4 little**, and **0 an open string** — played, but by no
finger, so it has its own colour rather than borrowing one.

The four colours are **fixed**, not pickable:

```
1 index   red      2 middle  blue
3 ring    green    4 little  yellow
```

Their whole job is to be learnt once. A viewer who has seen the hand
knows what red means for the rest of the video, and for the next video
too; four colours anyone can re-pick is four colours nobody can learn.

`undefined` is a fifth case and a real one: nobody has decided yet.
It is drawn in `colors.unassigned`, never in a finger's colour, so a
video never says "little finger" about a note no one has answered.

Which finger plays which note is NOT decided here. A score that writes
a fingering has already answered it; the rest is the Human Finger
Engine's question, and this engine draws whatever it is told.

`renderHand()` draws the little hand that says which colour is which:
the fretting hand seen from the back, fingers up. A legend of four
coloured squares is a legend of four coloured squares; a hand says it
without words.

## Slides

A slide is one finger travelling along a string while the note sounds,
so the mark it draws is not at a fret but between two of them, moving:

```js
{ string: 2, fret: 5, slideToFret: 9, startSeconds: 0, endSeconds: 1 }
```

`positionsAt` reports a FRACTIONAL fret while it travels — half way
through the note, half way along the neck — and `markShapes` draws the
road behind it so the movement reads in a still frame as well as in
motion. A slide to the fret it is already on is not a slide.

## One description, two renderers

`stageShapes(options)` returns the whole frame as rectangles and
circles in paint order. `renderGuitarStage` writes them as SVG for the
page; the video renderer paints the same list onto a canvas, because
rasterising an SVG thirty times a second costs more than the rest of
the frame together. Two hand-written drawings would drift, and the
first anyone would know of it is a published video that does not match
the preview.

## A guitar, not a fretboard

The picture reads as an instrument: a headstock with a tuning peg per
string at one end, the fretted neck, and the body at the other —
a soundhole and its rosette on an **acoustic**, two pickups and a
bridge on an **electric**, with the wood changing to match. That is
what `instrument: 'acoustic' | 'electric'` picks, and the strings run
the whole length as they do on the real thing.

The fret numbers are ruled under the board in a faint ink, there to be
glanced at rather than read. When the neck is drawn too small to carry
all of them, the ones a player actually looks for are kept — the
inlaid frets and every third — rather than crushing twenty-two
numbers into the space.

## The neck is a diagram, not a photograph

Frets are evenly spaced rather than following the real 17.817 rule:
this is drawn to be read, and even spacing keeps the high frets wide
enough to hold a mark. Strings thicken from the first to the last,
because that is how a player tells them apart at a glance. Inlays sit
at 3, 5, 7, 9, doubled at the twelfth, under the strings as they are
in the wood.

## Tests

`npm test` runs against the BUILT bundle in a bare sandbox — the same
file the browser loads, so a test cannot pass against code the page
will not run.
