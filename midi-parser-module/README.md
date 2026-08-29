# Drum MIDI → Video: MIDI Parser + R/L Timeline Builder (comparison module)

This is a **standalone, working piece** of the larger Drum MIDI → Video app —
built by Claude, for comparing against the equivalent module Manus AI
produces. It has no UI; it's pure logic + a runnable demo, per the earlier
technical plan.

## What's in here

- `src/types.ts` — shared types + custom error classes (`MidiParseError`,
  `MidiTooLongError`) and the `MAX_MIDI_DURATION_SECONDS` (10 min) constant.
- `src/midiParser.ts` — parses a raw MIDI `ArrayBuffer` into notes, tempo
  changes, time signatures, and duration. Throws clear errors instead of
  failing silently (spec Section 21).
- `src/timelineBuilder.ts` — converts parsed notes into the deterministic
  `{ time, midiNote, hand }` animation timeline, with **R/L alternation
  tracked independently per MIDI note number** (spec Section 7), plus a
  `groupSimultaneous()` helper for concurrent-hit handling (spec Section 11).
- `src/makeTestMidi.ts` — generates a synthetic test MIDI file (no real MIDI
  file needed) with a tempo change, a 3/4 time signature, and repeated/
  simultaneous kick/snare/hi-hat hits, specifically to exercise every rule
  above.
- `src/demo.ts` — runs the whole pipeline end-to-end and prints the results.

## Run it

```bash
npm install
npm run demo
```

You should see output like:

```
Kick (36): R -> L -> R
Hi-Hat (42): R -> L -> R -> L -> R -> L -> R -> L -> R
Snare (38): R -> L -> R
```

confirming each MIDI note number alternates hands **independently**.

## A gotcha worth knowing (found while building this)

`@tonejs/midi`'s `Header.tempos` / `Header.timeSignatures` arrays can be
pushed to directly when building a MIDI file programmatically, **but you
must call `header.update()` afterward** — otherwise the new tempo event's
internal `.time` is left `undefined`, and any later `secondsToTicks()` call
(which `track.addNote()` uses internally) hangs indefinitely instead of
throwing. This only bites you when *constructing* MIDI files with tempo
changes (as `makeTestMidi.ts` does); parsing real uploaded MIDI files via
`new Midi(buffer)` is unaffected. Worth checking whether Manus's version
does anything similar if it also generates MIDI programmatically.

## How this fits the full app

This module is the foundation both the **preview renderer** (Canvas) and the
**final video renderer** (WebCodecs/ffmpeg.wasm) will consume — both read
from the same `AnimationEvent[]` timeline this module produces, so timing is
guaranteed to match between preview and final export (spec Section 15).

## Comparing with Manus's version

Good things to check when comparing outputs:
1. Does R/L alternation stay independent per note number, or does it leak
   into a global flag?
2. Does it correctly reflect **actual** time signature changes from the
   file (not hardcoded 4/4)?
3. Does it reject invalid/oversized files with a clear error, or fail
   silently / crash?
4. Are simultaneous notes preserved as separate events, or does one
   overwrite another?
5. Is timing derived deterministically from MIDI timestamps (not
   `setInterval` approximation)?
