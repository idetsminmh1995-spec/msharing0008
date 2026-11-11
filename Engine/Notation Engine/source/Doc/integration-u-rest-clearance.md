# Integration U — rests that did not get out of the way

**Not a numbered phase.** Found in the same side-by-side as Integration
T: with every notehead finally on MuseScore's line, the rests were still
a staff space out.

**Status:** complete. `npm run verify` clean (917 tests).

## 1. What was wrong

§9.14 separates two voices' rests by pushing the upper voice's up a
staff space and the lower voice's down one. MuseScore starts there too
-- `computeVoiceOffset` returns exactly ±1 -- and then does something
this engine did not: it **checks**.

`RestLayout::resolveVerticalRestConflicts` measures what is left after
that first push, and moves a rest further, a whole space at a time,
until it clears whatever else is at the same moment:

- 0.55sp between a rest and another rest (`minRestToRestClearance`),
- 0.55sp between a whole or half rest and a chord,
- 0.35sp for any shorter rest against a chord.

Where two RESTS collide the move is split -- `floor(steps / 2)` for the
upper, `ceil(steps / 2)` for the lower. Where a rest collides with a
CHORD the rest moves the whole way, because the notes are where the
music is.

On the owner's drum chart that is the difference between a half rest
sitting between the two lowest staff lines and sitting on the bottom
line, under the kick, where MuseScore puts it: the voice-2 half rest's
±1 position leaves it 0.43sp clear of the snare at the same beat, and
0.55 is the floor.

## 2. The fix

`computeRestClearanceOffsets(measure, staffNumber, ctx)` in
`render-from-musicxml.ts`, computed once per (measure, staff) beside the
notehead-collision pass that was already there -- a collision is a fact
about two voices and cannot be seen from inside either one's loop.

Extents come from the real glyph boxes the engine already has
(`getGlyph(...).bBox`), remembering that SMuFL measures y UP from the
glyph's origin while this engine's y goes down: a quarter rest is three
staff spaces tall, a half rest half a space and entirely above its own
line, a whole rest half a space and entirely below it. Guessing those
would have put every rest in the wrong place for the right reason.

### The one rule that was inferred

MuseScore resolves per segment; this engine applies **one push per voice
per measure**, the largest any of that voice's rests needed. That part
is read off MuseScore's OUTPUT rather than its source: in bar 5 of the
owner's file, the quarter rest that had to move took the half rest after
it to the same new height. It is also the better-looking rule --- rests
of one voice wandering up and down within a bar would read as a mistake
--- but it is an inference, and this record says so rather than letting
it look like something that was verified.

## 3. How it was checked

MuseScore writes `default-y` on every note and rest it exports: the
element's distance above the measure's top staff line, in tenths, ten to
a staff space. That is MuseScore reporting its own finished layout,
which makes it the strongest evidence available anywhere in this suite.

Two new tests in `test/unit/musescore.test.js` compare this engine's
rendered y for every rest (nine, across three bars, two voices, three
durations) and every notehead (seventeen) against that reported layout,
as sorted multisets. Both now match exactly.

That makes three independent checks of the same file: where MuseScore
WOULD put each note from its display position, where MuseScore SAYS it
put each note, and where it says it put each rest.

## 4. How to revert

Delete `computeRestClearanceOffsets` and the `restPushes` term in the
voice loop's `restOffset`; `voiceRestOffset`'s ±1 is what remains.
