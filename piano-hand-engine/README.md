# piano-hand-engine — the Piano Hand Motion Engine

MusicXML or MIDI in; a pair of hands, physically plausible, playing it.
It draws nothing. It produces a **serialisable intermediate
representation** — which hand, which finger, where that key is, where
the wrist has to be — and a renderer turns that into pixels.

Built from piano geometry, fingering, kinematics and motion planning,
from first principles. No proprietary implementation is copied, and no
asset from any other product is used. The research below is read for
**architecture and algorithms** only.

| Reference | What was taken from it |
|---|---|
| [PianoPlayer](https://github.com/marcomusy/pianoplayer) | That fingering is a **search over a window of upcoming notes**, not a per-note decision — a cost over feasible combinations, a hand size that sets the relaxed thumb-to-little span, and a look-ahead depth of 5–9 notes. |
| [PianoMotion10M](https://github.com/agnJason/PianoMotion10M) | The **two-stage split**: predict where the hand *is* first, then generate the detailed gesture inside that position. Modules 5 and 6 are that split. |
| FürElise | That motion is fitted to a **parametric hand** and then **aligned to the MIDI key presses** — contact time is the anchor, and the motion is what bends around it. |
| supersimplepiano.com | Looked at, as a user, for what reads clearly on screen. Nothing of theirs is in here. |

## Status

**Phases 1 to 3 are built.** Everything after them is deliberately
absent rather than stubbed — an engine full of functions that return
zero is an engine nobody can tell is unfinished.

On the owner's own piano export: 185 notes, all placed on keys, split
by staff, both hands fingered in 21ms with nothing strained and nothing
left unfingered.

| Phase | What it is | State |
|---|---|---|
| 1 | 88-key geometry, one rigged hand, static poses | **built** |
| 2 | Notes to exact key positions | **built** |
| 3 | Hand split, then fingering | **built** |
| 4 | Finger target to an IK pose | — |
| 5 | Wrist trajectory | — |
| 6 | Chords as one shape | — |
| 7 | Scales, arpeggios, thumb-under, crossings | — |
| 8 | Humanisation | — |
| 9 | Two hands at once | — |
| 10 | Rendering | — |
| 11 | Optional ML refinement | — |

## What is here

| File | Module | What it is |
|---|---|---|
| `src/core/types.ts` | 12 | The data model, and the coordinate system stated once. |
| `src/core/timeline.ts` | 11 | The one clock. Milliseconds, frames, what is sounding when. |
| `src/keyboard/pianoGeometry.ts` | 1 | A real piano in millimetres: 88 keys, black keys proud and short. |
| `src/keyboard/keyPosition.ts` | 1 | A note to the point a fingertip touches, and how far a key is down. |
| `src/kinematics/handPose.ts` | 6 | Bones, joints, joint limits, hand sizes, forward kinematics, static poses. |
| `src/core/solver.ts` | 3 | A Viterbi with a beam. Knows nothing about pianos. |
| `src/fingering/handSpan.ts` | 3 | How far apart two fingers can be — the one measurement the search turns on. |
| `src/fingering/handSplit.ts` | 2 | Which hand, from the evidence, in order. |
| `src/fingering/fingeringCost.ts` | 3 | What a fingering costs a player. |
| `src/fingering/fingeringSolver.ts` | 3 | The candidates, the locks, and the answer. |

## The coordinate system

Everything is **millimetres on a real piano**, never pixels.

```
x  ALONG the keyboard, rising to the player's RIGHT. 0 is the left
   edge of the instrument's lowest key.
y  UP. 0 is a white key's playing surface; a black key is +11,
   a pressed key is negative.
z  AWAY from the player. 0 is the white keys' front edge.
```

Right-handed, y up — the convention WebGL uses, so a renderer takes
these numbers as they are.

This is the one decision the rest rests on. A hand's reach is 200mm
whatever size the video is; a thumb passing under travels about three
white keys; a black key stands 11mm proud. None of that can be said in
"fractions of a box", which is how a *drawn* keyboard necessarily works.

### One simplification, stated

A real piano's black keys sit slightly off the line between their white
neighbours so the white keys' tails come out usable widths. This models
them **centred** on that line. The error is about a millimetre, it is
the same model `piano-engine` draws, and the two agreeing matters more
than a millimetre: a hand drawn over a key it is not on is worse than a
hand on a key that is a millimetre off. `BLACK_KEY_OFFSETS` is where the
real offsets go, and nothing else would change.

## How this fits the repository

### Where the existing pipeline ends

`website/video-create/piano/index.html` → **`buildPianoNotes()`**. It
walks the Notation Engine's parsed score, turns ticks into seconds
through `playback.tempoMap`, and emits

```js
{ midi, startSeconds, endSeconds, hand: (note.staff ?? 1) >= 2 ? 'left' : 'right' }
```

then hands that to `piano-engine`'s `planFingering`, which walks the
notes in time order keeping a five-finger anchor per hand. That is a
good greedy answer and it is not a search: it cannot look ahead, so it
cannot plan a thumb-under three notes early, and it has no geometry — it
counts white keys, not millimetres.

### The integration point

**Exactly at `buildPianoNotes()`'s output.** It is the one place in the
project where a score has become timed MIDI notes and nothing has been
drawn yet. This engine takes `PerformanceNote[]` there and returns a
solved timeline; `piano-engine` reads that back per frame instead of
calling `planFingering`.

Nothing else moves. The notation engine is untouched, `piano-engine`
keeps drawing, and the two stay in step through one shared clock.

### What already exists, and what does not

**A keyboard model exists, in drawing units.**
`piano-engine/src/keyboard.ts` has the four instrument ranges with the
right first and last notes, `isBlackKey`, and `keyboardGeometry(size,
box)` — but it divides whatever box a page gives it. There are no
millimetres, no depth, no black-key rise, and its black keys are a drawn
0.62 × white in both width and length. The ranges and `isBlackKey` are
the same arithmetic here; the physical model is new.

**The metadata exists upstream and is thrown away at the boundary.**
The Notation Engine's note carries `staff`, its voice, `<technical>
<fingering>` (parsed since Integration W, never drawn), ties, and chord
grouping. `buildPianoNotes` keeps pitch, time and a hand derived from
the staff alone. So Module 2's evidence order — staff first, then stated
fingering, then track, then inference — is implementable, but the
adapter has to stop discarding. `PerformanceNote` is deliberately wider
than `PianoNote` for exactly that reason.

**MIDI velocity is not carried at all.** Nothing in the current path
maps dynamics to a velocity, so `PerformanceNote.velocity` is optional
and Phase 3 will have to decide what a missing one means.

### Why nothing is shared with `finger-engine`

`finger-engine` is the guitar and bass engine, and it stays that way.
The owner's instruction is that the instruments stay apart — a guitar
and a bass already finger differently enough to need their own rules,
and a piano is not a fretted instrument at all.

It is worth saying what is NOT shared and why, because the shapes look
alike from a distance. `finger-engine` has a generic shortest-path over
stages, and so does this; they are both a Viterbi, because "the cheapest
way through time" is the same problem wherever it turns up. But the
things either side of the search have nothing in common:

- A guitar's candidate is a **string and a fret**; a piano's is a
  **finger**. One note can be played at four places on a guitar and at
  exactly one on a piano — the whole search is a different shape.
- A guitar hand's cost is a **barre, a stretch across frets, a finger
  per string**; a piano hand's is a **span in millimetres, a thumb
  passing under, a black key under a short finger**.
- A guitar's left hand does not move the way a piano's does. A fret is a
  discrete position; a keyboard is 1220mm of continuous travel.

So the search is written here, for the piano, and the two engines never
import from one another.

## How the fingering is decided

Not note by note. The finger that plays this note is the one that
leaves the hand able to play the next four, and a solver that answers
one note at a time cannot know that — it is why an automatic fingering
puts the thumb somewhere a player never would and then has to leap.

So the whole phrase is one search. Every onset offers several shapes,
holding one costs something, moving between two costs something, and
the cheapest path through the lot is the fingering. It is a Viterbi
with a beam, so the whole piece is affordable: PianoPlayer looks 5 to 9
notes ahead because it searches combinations, and a lattice does not
have to.

What a shape costs to **hold**: the span between every pair of fingers
in it against what that pair reaches, the thumb on a black key, the
little finger on a black key, a long finger threading between two
blacks. Fingers that cross inside one chord, or two notes on one
finger, are refused outright.

What it costs to **move**: how far the hand travelled — measured from
where the *thumb* would sit, not from the notes, because a run up a
scale under one hand position moves the hand not at all — how little
time it had to do it in, whether a repeated note changed finger
pointlessly or kept a finger it cannot re-strike in time, and what
crossed. A thumb passing under while the music keeps going the same way
is the ordinary way a scale continues and is cheap; one that happens
and turns straight back is the search finding a cheap move rather than
a musical one, and costs more than not doing it. Any other crossing is
a player doing something they would rather not.

Three sources of fingering, in order: a **caller override** beats the
**file's own `<fingering>`**, which beats the **search**. A stated
finger becomes the only candidate for its note, so the notes around it
are planned to fit it rather than fought against it.

## Rules

1. **Contact time is the MIDI time.** Visual anticipation may start
   early; the key going down may not move by a millisecond. Nothing in
   this engine is allowed to adjust a note's time to make a movement
   look better.
2. **Millimetres, never pixels.**
3. **Angles, never joint positions.** A finger is a chain; storing both
   its angles and its fingertip invites them to disagree.
4. **Say what was inferred.** Every solved event carries a confidence:
   1 where the file stated the answer, lower where the engine guessed.
5. **No placeholders.** A phase that is not built is absent.
6. **A refusal is a refusal.** An impossible shape costs infinity and
   is kept out of the search, so the solver asks for its rules to be
   relaxed instead of carrying the impossible shape forward and calling
   the stage solved.

## Build

```bash
npm install
npm run verify   # typecheck, lint, format, and the tests against the BUILT bundle
```
