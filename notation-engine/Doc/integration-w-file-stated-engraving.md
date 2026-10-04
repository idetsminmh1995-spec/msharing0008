# Integration W — the hook, the dot, and everything the file already said

**Not a numbered phase.** The owner handed over the MuseScore export of
a piano piece and asked a direct question: what is in this file that the
engine does not use?

**Status:** complete. `npm run verify` clean (996 tests).

## 1. How it was answered

By counting. Every element name in the file, against what the parser and
the renderer actually read:

```
   3  accidental      156  beam        209  duration      3  dot
   1  appearance        1  defaults    198  staff       185  stem
   3  credit            1  scaling       3  print         1  work
```

Four of those turned out to be real gaps, two of them visible on every
page.

## 2. What was wrong

### 2.1 A dotted note was not drawn dotted

`duration.dots` reached the tick maths, the beam grouping, the playback
timeline — and then the notehead was drawn without it. A dotted quarter
and a quarter were the same picture. Three dotted notes in this file,
none of them on the page.

### 2.2 A dotted eighth got the sixteenth's beam

`renderBeamGroup` drew as many parallel beams as the group's SHORTEST
note needed, across the whole group:

```ts
const lineCount = Math.max(1, ...events.map((e) => numBeamLines(e.duration.type)));
```

So a dotted eighth beamed to a sixteenth came out with two full beams
and read as two sixteenths. What is engraved is one full beam over both,
plus a short hook on the sixteenth alone — which this file states
outright, in a `<beam number="2">backward hook</beam>` the renderer
parsed and then ignored, because it only ever looked at level 1.

### 2.3 A courtesy accidental on a chord member was dropped

The single-note path passed `hasExplicitAccidental` into the accidental
state machine. `renderChordHeadsPart` did not:

```ts
const decision = evaluateAccidental(state, n.pitch.step, n.pitch.octave, n.pitch.alter);
```

A chord is where real files put most of their cautionary accidentals,
and this one is no exception: its `<accidental cautionary="yes">natural`
sits on the middle note of a three-note chord, and was never drawn.

### 2.4 `<defaults>`, `<work>` and `<credit>` were not read at all

The file states the engraving it was written with — every line width, in
tenths — and the engine used Bravura's numbers instead. They agree
almost everywhere, and differ where it shows: the file's staff line is
0.11sp and Bravura's is 0.13. It also states its own title, composer and
title-page layout, and a `<print>`'s `<staff-layout>`/`<system-layout>`,
which the parser reported as "ignored layout hints."

## 3. The fixes

### 3.1 `geometry/augmentation-dot.ts` + `render/augmentation-dot.ts`

A dot sits to the right of the notehead and always in a SPACE: a note in
a space keeps its own height, a note on a line pushes its dot up half a
space, because a dot drawn on a line cannot be seen. `dotPosition` is
that one rule, and a test walks every position from -6 to +6 asserting
no dot ever lands on a line.

Distances are MuseScore's own, from `musescore/style.ts`:
`dotNoteDistance` 0.5sp from the notehead, `dotDotDistance` 0.65sp
between dots, `dotRestDistance` 0.25sp for a rest, which has no notehead
to clear.

A chord's dots share one column measured from its widest notehead, and
two members a SECOND apart — one on a line, one in the space above —
would want the same space, so the lower one is pushed down instead of
printed on top of the other.

Wired into all three drawing paths: the single note, the chord, and the
rest.

### 3.2 `computeBeamSegments` — which lines a group actually gets

Replaces the single `lineCount` with a list of segments:

- Level 1 always runs the length of the group. That is what makes it one
  group.
- At level 2 and above, each maximal run of CONSECUTIVE notes needing
  that level gets its own line. A run of two or more is drawn between
  their stems; a run of exactly ONE has no other stem to reach and
  becomes a hook, `BEAM_HOOK_LENGTH` (MuseScore's `beamMinLen`, 1.1sp)
  long.
- A hook's direction comes from the file's own `<beam number="N">` when
  it states one (§10.8 again: the file is the authority). Where it says
  nothing, a hook points BACKWARD, toward the note it shares its beat
  with — except on the group's first note, which has nothing behind it.

`renderBeam` now takes those segments and the group's stem Xs, and
clips each line to its own segment, so a secondary beam can no longer
run under notes that do not have it.

### 3.3 One line in `renderChordHeadsPart`

`hasExplicitAccidental` passed, as the single-note path already did.

### 3.4 `parser/musicxml/defaults.ts`

`<defaults>`, `<work>`, `<identification>` and `<credit>`, parsed. A
tenth is a tenth of a staff space, by definition of the format, so every
measurement converts by a division by ten and nothing else;
`<scaling>` is the one piece that is not in tenths, and ties them to the
physical page (40 tenths = 7mm, so a 1.75mm staff space) for a host
exporting at the file's own size.

`<note-size>` is converted from the percentage the file writes to the
multiplier every consumer wants. The fonts the file names (Leland,
Edwin) are kept even though this engine draws in its own — §10.7's rule
is that nothing is dropped silently.

A new `lineWidth(theme, fileKey, smuflKey, fallback)` resolves every
drawn line's thickness in the order that is actually right: the FILE's
own `<line-width>` first, then the music font's SMuFL default, then a
hardcoded fallback. Eleven call sites moved onto it.

`<print>`'s `<staff-layout>` and `<system-layout>` are read too. A
`<staff-distance>` is MusicXML's clearance from the previous staff's
bottom line to this one's top line, which is exactly what
`computeStaffDistance` floors — so it is applied as a FLOOR, not as the
answer: the file's number was computed for the file's own engraving, and
if this engine's skyline needs more room, giving it less would put a
chord through a staff line.

## 4. How it was checked

The owner's own file is now a fixture
(`musescore-piano-defaults.musicxml`), and it renders with **zero**
diagnostics where it used to report three.

- `test/unit/augmentation-dot.test.js` — the placement rule, the chord
  column, the second's separation, and the dot on the page.
- `test/unit/beam-shape.test.js` — nine cases of `computeBeamSegments`,
  including the dotted-eighth pair both ways round and the file's own
  hint winning over the inferred direction.
- `test/unit/beam.test.js` — the same, end to end, on a fixture built
  from this file's own pattern: the hook is measurably shorter than the
  primary beam, which is the whole difference.
- `test/unit/score-defaults.test.js` — the tenths conversion, every line
  width, the credits with their stated positions, and the file's 0.11
  staff line winning over Bravura's 0.13 while a file that states
  nothing still gets 0.13.

Looked at as a picture, in a headless Chromium with Bravura loaded,
before and after — which is how the double beam was spotted in the first
place.

## 5. Not done

The parsed `<credit>` text is not DRAWN. The engine has no title block,
and inventing one would change the height of every rendered score,
including the video frames the host already composes around. The data is
on `ParseResult` for a host that wants it.

`<scaling>`, the page layout and the fonts are likewise parsed and
exposed, not applied: this engine draws at its own scale into whatever
box the host gives it.

## 6. How to revert

- Dots: delete both `augmentation-dot.ts` files and the three
  `renderAugmentationDots` calls.
- Beams: restore `lineCount` in `renderBeamGroup` and `renderBeam`'s old
  `lineCount` option.
- Defaults: delete `parser/musicxml/defaults.ts`, the three
  `ParseResult` fields, and `lineWidth` — the call sites go back to
  `getEngravingDefault(...) ?? FALLBACK`.
