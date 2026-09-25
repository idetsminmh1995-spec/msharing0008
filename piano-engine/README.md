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

## Tests

`npm test` runs against the BUILT bundle in a bare sandbox — the same
file the browser loads, so a test cannot pass against code the page
will not run.
