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

## Every note says what it is

Two labels, both in both designs, because a learner watching a key
light up has two questions and they are different questions.

**On the falling bar: which NOTE.** 'D' on a D, 'D#' on the black key
above it. Sharps throughout, because this names a KEY and not a note in
a score -- the black key between D and E is one key, and someone
looking for it on the instrument is looking for "the one above D".
Whether the music calls it D# or Eb is the score's business, and the
notation above the keyboard already answers it.

The name sits at the BOTTOM of its bar, the end that lands: on a long
held note a centred name would float half a screen above the key it is
about to light. It is sized from the WHITE key and not from its own
bar, so a sharp -- the name a learner most needs, because a sharp is
the key they cannot find -- is the same size as every other and simply
overhangs its narrower bar onto the dark behind. A bar too small for a
legible name goes without one: a run of sixteenths is a row of short
bars, and a row of smudges reads worse than the bars alone.

**On the key: WHERE.** Every C is named on its own key, C1 to C8,
because nobody can count 52 white keys but anyone can see which C a
note landed near. `keyNames: false` turns them off.

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

### The hand is the owner's own drawing: `src/hand/`

| File | What it is |
|---|---|
| `hand/artwork.ts` | The owner's `Hands.svg`, converted once into white keys. |
| `hand/place.ts` | Where that drawing goes to play what it is playing. |
| `hand/draw.ts` | The drawing, moved there. |

None of the three knows about keyboards, notes, seconds or SVG, and
none of them can be wrong about a hand in a way a keyboard could fix.
`hands.ts` is the bridge: it turns a keyboard and a fingering into the
targets the placement fit takes, and what comes back into the stage's
own list of shapes.

It is three modules rather than a fourth engine on purpose. A hand only
means anything on top of `keyboardGeometry`, which lives here; a
separate bundle would either copy that geometry or depend back on this
one, and a cycle between two bundles is worse than a boundary inside
one. The boundary is what was wanted, and this is where it is.

### The hand is drawn, not assembled

Three earlier attempts built the hand here, out of five posed fingers
walked into one outline, with a separate thumb overlaid and creases
drawn afterwards. Every one of them looked built. The owner drew a hand
instead, and that drawing is what is on the keys now.

A shape built from parts can always come apart, and no amount of
solving stops a drawn thumb from looking drawn. An artist's outline
cannot come apart, so the engine's job shrinks to the one thing a
program does well: deciding where the outline goes.

**The numbers were taken from the file, not guessed.** The SVG was
rendered in a real browser and its outline sampled with
`getPointAtLength`, 4000 points around a 5715-unit path. The four long
fingertips are the local minima of that outline's top profile; the
THUMB's is the outline's extreme in X instead, because a thumb points
sideways rather than up the keys. The wrist is where the forearm's two
edges stop narrowing. One white key is 120 of the drawing's own units,
taken from the hand's LENGTH -- wrist crease to middle fingertip is 947
units here and about 7.9 white keys on a real hand -- because this hand
is drawn SPLAYED, which stretches every width measurement and leaves
the length alone.

**The right hand is the left one mirrored**, which is what the file
itself does, so only one outline is stored.

### Two corrections before it touches the keys

The drawing is a FLAT hand, held open. A hand at a keyboard is neither.

- **`PLAY_SCALE_Y` (0.5) is foreshortening**, and it is real geometry: a
  flat hand measures about 185mm from the wrist crease to the middle
  fingertip, and the same hand curved over the keys puts that fingertip
  only about 105mm FORWARD of the wrist. Seen from above -- which is
  how this stage sees it -- that is all the length there is.
- **`PLAY_SCALE_X` (0.72) closes the splay.** The drawing's thumb and
  little finger are six white keys apart, which is a hand reaching for
  a tenth. Closing it all the way to a real playing span would mean
  0.63, and that is where a rigid outline stops being able to tell the
  truth: it would narrow the FINGERS by the same factor as the gaps
  between them, and a hand with 13mm fingers reads as a rake.

### The hand moves, turns and opens; the fingers follow

A hand asked to play a key its thumb cannot reach does not grow a
thumb: it MOVES, it TURNS, and it OPENS, and the other four fingers go
with it. Those are the three numbers the fit solves for, plus the
depth, which the keyboard decides rather than the music:

- turning the hand moves a fingertip sideways **in proportion to how
  far forward that fingertip is**. The long fingers, well past the
  knuckles, swing a long way; the thumb, whose tip is beside the palm
  rather than in front of it, barely swings at all.
- so a thumb reaching a distant key is answered mostly by MOVING the
  hand, a little finger reaching one mostly by TURNING it, and a chord
  wider than the drawing's own splay by OPENING it.

That relationship is linear for small turns, so position, turn and
spread together are one weighted least-squares fit -- a 3x3 system,
solved exactly, once per frame. Fingers that are not playing join in at
a tenth of the weight: they want to stay over the keys the hand is
sitting on, and without them a hand playing one note would have nothing
to say about where it is. They must never outvote a finger that IS
playing, which at an octave -- two playing, three resting -- is exactly
what a lighter ratio let them do.

`spread` is clamped to 0.8--1.45 and `turn` to about 18 degrees, and
the position is then re-solved against the values actually used: a
clamped hand that kept the unclamped position sits beside the keys it
is playing.

### Depth: where the wrist really is

Not on the keys. A player's fingertips rest about 40mm up a white key
and their wrist is about 105mm forward of them, so the wrist is out in
FRONT of the keyboard, over the key slip. `WRIST_IN_FRONT` is that gap,
and it is what puts the fingertips on the front third of the keys
instead of up among the black ones.

Two rules pull the whole hand back from there, and only ever back:

- a finger on a **black key** cannot be out in front of where that key
  ends, because a black key stops part way down the board;
- **every** fingertip has to stay on the keyboard at all. This drawing
  holds its thumb low and out to the side -- a flat hand's thumb, not a
  playing one's -- so it is the finger that falls off the front first.

### What the drawing cannot say, and what says it instead

One outline cannot bend a single finger, so it cannot show WHICH finger
is down. Two marks do that:

- the pressing fingertip, dotted in the hand's own note colour -- the
  colour of the bar that fell onto that key;
- the finger's NUMBER, on the key, which is what every piano lesson
  video puts there because the hand is the thing in the way.

And three short creases at the base of the long fingers, struck from
the artwork's own fingertip positions so they move with the hand's
spread and turn. A silhouette with no creases on a keyboard reads as a
glove.

### Around the hand

**All 88 keys.** 88 Keys means 88 keys: showing a window of the
instrument and calling it an 88 answers a different question from the
one the control asks. What IS capped is how long a white key is drawn
-- a real one is 150mm long and 23mm wide, and stretched to fill a tall
frame it is a tower of planks with a spider on it.

**The falling design's keyboard takes 42% of the stage**, where it used
to take a third. The keys are what a viewer actually watches -- the
note lands there, the key lights there, every C is named there -- and a
third left those names too small to read at video size. The fall above
loses the same room and that costs nothing: a note's distance from the
keys is TIME, so a shorter fall is the same seconds drawn closer
together. `keyboardHeight` still overrides it outright.

**A strip in front of the keys.** The keyboard does not reach the
bottom of the stage: the wrist sits out in front of the keys, exactly
as on a real piano. The strip is as wide as `HAND_REACH_PAST_KEYS` -- a
number that belongs to the hand, not to the page -- so the layout
cannot drift away from where the hand actually is. The rest of the
forearm runs off the bottom of the frame, which is where an arm comes
from.

**The finger numbers** go on the KEY, at its front edge where no hand
reaches, in the hand's own colour -- a hand on a keyboard cannot say
which finger a learner should use, because the hand is the thing in the
way. Every piano lesson video does this, for exactly that reason.
`fingerNumbers: false` turns them off.

`handFingertips(hand, options)` returns where every finger is, so a
caller -- or a test -- can ask without reading it back out of a path
string. Nothing in the drawing is the source of truth about the hand;
the placement is.

## Tests

`npm test` runs against the BUILT bundle in a bare sandbox — the same
file the browser loads, so a test cannot pass against code the page
will not run.
