# Piano Engine

The keyboard under the music on the Piano video page: 61, 73, 76 or 88
keys, the notes falling onto it, and a colour per hand.

TypeScript in, SVG out. It knows nothing about scores, files or pages —
notes arrive as MIDI numbers in seconds with a hand attached, and this
draws them.

```bash
npm run build     # -> dist/piano-engine.js  (global: PianoEngine)
npm run verify    # typecheck + lint + format + tests
```

The built bundle is copied to `website/assets/piano-engine.js`, which is
what the page loads — GitHub Pages has no build step, so the file has to
be in the repo.

## The sizes are real instruments

```
61 keys   C2 - C7     MIDI 36 - 96
73 keys   E1 - E7     MIDI 28 - 100
76 keys   E1 - G7     MIDI 28 - 103
88 keys   A0 - C8     MIDI 21 - 108
```

They are not the middle of a piano cut down: a 61 starts on a C, a 73
and a 76 start on an E. Getting that wrong puts every note a few
semitones off its key, which looks like the engine cannot read the
score. A note outside the chosen keyboard is not drawn at all rather
than clamped onto the nearest key it does have.

## One description, two renderers

`stageShapes(options)` returns the whole frame as a list of rectangles
in paint order. Everything that decides what the stage LOOKS like is
there: which colour a key is, what goes over what, where the line sits.

- `renderPianoStage(options)` writes those shapes as SVG. That is what
  the page puts in the DOM.
- The video renderer walks the same list and paints it onto a canvas.
  Rasterising an SVG thirty times a second costs more than the rest of
  the frame together; painting ~130 rectangles costs microseconds.

Two hand-written drawings would drift apart, and the first anyone would
know of it is a published video that does not match the preview.

## The two hands

```js
PianoEngine.renderPianoStage({
  size: 88,
  width: 1920, height: 600,
  seconds: 12.5,
  notes: [{ midi: 60, startSeconds: 12.4, endSeconds: 13, hand: 'right' }],
  leadSeconds: 2.5,
  colors: { leftHand: '#FFC400', rightHand: '#4FA3FF' },
});
```

Which hand plays a note is the caller's answer, not this engine's. The
page reads it from the score's own staves — MusicXML writes a piano
part on two, the upper played by the right hand and the lower by the
left — so nothing here guesses from pitch. A key held by both hands
reads as the right hand: one key cannot show two colours.

## Falling notes

A note's distance from the keyboard is its distance in TIME, scaled by
`leadSeconds`: a note due in one second, on a 2.5-second fall, sits 40%
of the way down. Its bar is as tall as the note is long through the
same scale, which is what makes a held chord read as held rather than
as a row of dots. Anything already played, still above the stage, or
off the chosen keyboard is dropped rather than drawn out of view.

Because the scale is the FALL AREA divided by the lead time, a tall
frame (9:16) moves notes further in the same seconds than a wide one.
That is the same time made visible over more pixels; the page offers
1.5s / 2.5s / 4s so a shape that feels too fast can be given a longer
fall.

## The grid the notes fall through

`gridLines` is a list of `{ seconds, kind: 'bar' | 'beat' }` — the
score's own bars and beats, in the same seconds the notes use. A
barline is ruled a little stronger than a beat, both faint enough to
read past, and both scroll with the music so a bar's line and that
bar's notes arrive together.

The engine does not work out where the bars are: a caller that knows
the score hands them over, which is how a 6/8 bar rules six lines and
a 3/4 bar three, and how a tempo change spaces them exactly as it
spaces the notes.

## Coming down out of the frame

`fade` dims the top of the falling area, so a note appears faintly and
gains its colour as it comes down instead of switching on at an edge.
It takes the colour it fades INTO — the frame's own background, which
only the caller knows — plus how much of the fall it covers and how
dim a note starts:

```js
fade: { color: 'rgb(23, 17, 14)', fraction: 0.38, strength: 0.88 }
```

It is drawn as bands of that colour at falling alphas rather than as a
gradient, because a rectangle is the one thing the SVG and the canvas
draw identically. `strength: 1` would not be a fade but a wall, so a
note is always at least faintly visible.

## Two designs

One engine, one set of facts, two pictures of them. `design` picks:

- **`falling-notes`** (the default) is the stage this engine started as:
  bars coming down a grid onto the keyboard, a line where they land.
- **`hands`** drops every one of those -- no bars, no grid, no fade, no
  strike line -- and puts two hands on the keyboard instead, pressing
  the keys, with the finger's number on each key being played.

The notes, the fingering and the keyboard are the same objects either
way. Nothing is computed for one design that the other has to work
around, and the default is the picture that shipped before there was a
design to pick: a caller that says nothing gets the stage it had.

## Hands on the keys

Two hands, always both, drawn over the keyboard and pressing one finger
per note.

```js
const plan = PianoEngine.planFingering(notes);

PianoEngine.renderPianoStage({
  size: 88, width: 1920, height: 600, seconds: 12.5, notes,
  design: 'hands',
  colors: { leftHand: '#FFC400', rightHand: '#4FA3FF' },
  hands: {
    notes: plan.notes,              // every note, now with a finger
    anchors: plan.anchors,          // where each hand sits, over time
    colors: PianoEngine.handColorsFor({ leftHand: '#FFC400', rightHand: '#4FA3FF' }),
    fingerNumbers: true,            // the default
  },
});
```

`planFingering` is solved ONCE for the whole piece, not per frame. The
answer cannot change between frames, and a hand that re-decided its
fingering thirty times a second would twitch.

**A hand plays in reaches, not note by note.** It settles over the keys
the next few chords need and stays there until the music leaves them.
Deciding one note at a time is what makes a drawn hand crawl up the
keyboard a key per note with the thumb on everything. The position is
the one that puts the middle finger on the middle of the passage, and
that single rule gives the textbook fingerings for free: a five-key
scale comes out 1-2-3-4-5 in the right hand and 5-4-3-2-1 in the left,
because a five-key span centred on finger 3 puts the thumb exactly on
its near end. A stretch wider than the hand cannot be centred, so the
hand sits on the near end and the outer fingers stretch for the rest.

`anchorAt` slides a hand between positions over 0.18s, eased in and
out, **arriving as the chord sounds** — a hand still moving when the
note speaks looks like it missed it.

**Which way round a hand goes.** The player sits at the FRONT of the
keys, which in this picture is the bottom of the frame. So the hands
come up from the bottom: the heel of the palm is nearest the viewer,
the fingers point away, up the keys, and a finger reaching a black key
reaches further than one on a white. Drawing it the other way round --
an arm coming down out of the sky with fingers pointing at the viewer
-- is the single thing that stops a drawn hand reading as a hand.

**One silhouette, not seven parts.** A hand is drawn twice: once in the
edge colour with every part a little fatter, then again in the skin
colour at its true size. The parts overlap, so the first pass shows
only where nothing covers it -- which is exactly the outline of the
whole hand. There is no line between the palm and a finger, or between
two fingers that touch, because there is nothing there to draw a line
with. Outlining each part separately is what made the first attempt
look like a rake.

**Measured in white keys.** A white key is 23mm and a hand is a hand,
so the proportions are real measurements rather than taste: a palm is
about three and a half keys across and three and a half deep, and a
middle finger is two and a half long. That is why a hand covers five
white keys -- not because five is convenient, but because a hand is
90mm wide. Everything else is derived from those, so a hand stays the
right size for the KEYS in any frame, however deep the keyboard has to
be drawn.

Three more things make it read as a hand, none of them detail:

- the fingers are not the same length, and each finger's own length is
  what decides how far up the key it reaches. That is why the thumb
  plays near the front of the keys and the middle finger much further
  back, and why five tips are never in a row. Five equal bars read as
  a comb.
- a finger that is not playing curls a little short of its reach, and
  one that is playing straightens past it, so pressing always moves a
  finger AWAY from the player. That is the whole of the animation;
  without it the hand is a sticker.
- the hand leans, thumb side forward, which is what makes a left hand
  look like a left hand rather than a mirrored right one.

A finger is a stroked path with a round cap, which is the one thing the
rectangle list could not describe before: `StageShape.path` carries SVG
path data that an `<path d>` and a canvas `new Path2D(d)` parse
identically, so the preview and the exported video stay one drawing.

### How much keyboard the hands design shows

A keyboard stretched to whatever box it is given stops being a
keyboard. A 9:16 stage is twice as tall as it is wide, and 88 keys
across it are four millimetres wide on a phone with hands on them that
are specks. So the hands design shows a WINDOW, and two things decide
how wide it is -- the answer being the larger:

- **what the frame can carry.** A white key is about six and a half of
  its own widths long; eleven is the most this engine will draw before
  the drawing starts lying. A 16:9 stage is wide and shallow and
  carries most of the piano; a 9:16 stage carries a few octaves. That
  is not a compromise, it is what a lesson video filmed in portrait
  shows, because it is all that fits.
- **what the piece needs.** A hand reaching a key outside the window
  would be drawn pressing nothing, so the window always covers every
  note in the score, however wide that makes it.

Fixed for the whole video and centred on the music's own range: a
keyboard that scrolled would move under the hands, and then neither the
hands nor the keys could be read. The `falling-notes` design is not
windowed or capped -- it has always drawn the whole keyboard, and the
notes coming down fill the height.

### The finger numbers

A hand on a keyboard cannot say which finger a learner should use: the
hand is the thing in the way. So the number goes on the KEY, at its
front edge where no hand reaches, in the hand's own colour. Every piano
lesson video does this, for exactly that reason. `fingerNumbers: false`
turns them off.

The hands wear the notes' own colours on the outline and the pressing
fingertip, so the hand playing the amber notes is the amber-edged one
without a legend. The skin stays neutral on both — two differently
coloured hands read as two different people. The pressed fingertip is
drawn in the DARK edge colour, because the key under it is lit in the
note colour and an amber dot on an amber key is camouflage.

## Tests

`npm test` runs against the BUILT bundle in a bare sandbox — the same
file the browser loads, so a test cannot pass against code the page
will not run.
