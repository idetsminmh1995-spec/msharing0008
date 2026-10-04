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

**Phases 1 and 2 are built.** Everything after them is deliberately
absent rather than stubbed — an engine full of functions that return
zero is an engine nobody can tell is unfinished.

| Phase | What it is | State |
|---|---|---|
| 1 | 88-key geometry, one rigged hand, static poses | **built** |
| 2 | Notes to exact key positions | **built** |
| 3 | Hand split, then fingering | — |
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

### What this engine will reuse rather than rebuild

`finger-engine/src/core/solver/` is a **generic shortest-path over
stages** that already knows nothing about guitars: it is handed stages,
a way to expand them, and two cost functions. That is exactly the shape
of Module 3's fingering search. `finger-engine/src/core/hand-profiles.ts`
already says in its own header that hand size belongs to the *person*,
not the instrument. Phase 3 lifts both rather than writing a second
Viterbi.

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

## Build

```bash
npm install
npm run verify   # typecheck, lint, format, and the tests against the BUILT bundle
```
