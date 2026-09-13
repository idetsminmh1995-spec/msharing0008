# Phase 39 — Standard MIDI File Parser

**Status:** complete and thoroughly tested against every test requirement
`§11.2` itself names. 361/361 tests pass. Starts Stage 7 (MIDI and
timing — the whole area v1 was missing).

## 0. Scope, per §11's own framing

`§11`'s own responsibility statement is explicit: this module turns a
`.mid` byte stream into a note list plus a tempo/meta timeline — it does
**not** produce notation directly, since MIDI has no concept of
enharmonic spelling, voices, or beaming. Its output feeds Phases 40
(timing) and beyond (alignment); this phase's job ends at a clean,
well-typed `MidiFile` result.

## 1. What was written

**`src/parser/midi/byte-reader.ts`** — `ByteReader`, a cursor over the
file's bytes (uint8/uint16BE/uint32BE/ASCII/raw-bytes reads, all
returning `undefined` rather than throwing when the stream runs out —
every caller up the chain turns that into a diagnostic).

**`src/parser/midi/vlq.ts`** — `readVariableLengthQuantity`, `§11.1`'s
variable-length quantity scheme (7 bits per byte, high bit = "more
follow"), used for every delta-time and every meta/sysex event's
declared length.

**`src/parser/midi/diagnostic.ts`** — `MidiDiagnostic`/`midiDiagnostic`,
structurally the same shape as the MusicXML parser's own `Diagnostic`
(`§10.7`'s "never throws, records a diagnostic" discipline extended to
this format too), kept as an independent type rather than imported —
these are two separate parser front-ends with no reason to depend on
each other, and MIDI's own natural "where" is a track index, not
MusicXML's partId/measureNumber.

**`src/parser/midi/midi-file.ts`** — `MidiFile`/`MidiTrack`/`MidiNote`/
`TempoEvent`/`TimeSignatureEvent`/`KeySignatureEvent`, matching `§11`'s
own specified output interface exactly. `KeySignatureEvent.sharpsFlats`
deliberately uses the same signed -7..+7 convention as MusicXML's own
`<fifths>` so both parsers' outputs are directly comparable later.

**`src/parser/midi/parse.ts`** — `parseMidiFile`, the main entry point:
- Header validation: real `"MThd"` magic, format 0/1 accepted, format 2
  and any unrecognized format rejected, SMPTE-frame division (high bit
  of `division` set) rejected rather than mis-parsed as PPQ — all per
  `§11.1`/`§11.2`'s explicit error-condition list.
- Running status (`§11.1`): a status byte may be omitted when it
  repeats; the parser tracks the last real status byte and reuses it
  when a "data byte" appears where a status byte was expected.
- Note-off as note-on-with-velocity-0 (`§11.1`): both encodings funnel
  into the same active-note bookkeeping (a map keyed by
  channel+noteNumber), so either one correctly closes a note and
  computes its duration.
- Tempo/time-signature/key-signature meta events decoded per `§11.1`'s
  exact byte layouts (24-bit big-endian microseconds; `2^dd` denominator;
  signed sharps/flats byte) and collected from **every track** into one
  global list, per `§11.1`'s explicit requirement (format 1's conductor
  track isn't assumed to be the only place tempo data can live).
  Unknown meta events are skipped by their own declared length, never
  assumed — the same discipline Phase 38 already established for
  MusicXML's own unknown elements.
- Tick normalization (`§11.2`): every tick (note starts, durations, and
  every meta event's own tick) is converted once, at parse time, from
  the file's own PPQ to the engine's fixed 480-per-quarter unit — the
  same `TICKS_PER_QUARTER` constant the MusicXML side uses, so outputs
  from both parsers are directly comparable downstream.
- Every real error condition returns `midiFile: undefined` plus a
  diagnostic, never an exception, matching `§10.7`'s discipline exactly
  (bad header magic, truncated header, SMPTE division, format 2/unknown
  format, bad track magic, and a track truncated mid-event all recover
  this way rather than crashing).

**`test/helpers/midi-builder.js`** (test-only) — a small MIDI **encoder**
used purely to build real, valid `.mid` byte streams to test against,
the same spirit as Phase 36's tests building a genuine `.mxl` archive
via `fflate`'s own `zipSync` rather than mocking one. Never part of the
public engine API — `§11`'s own scope is parsing only.

## 2. How this was verified

Ran `npm run verify` clean, 361/361 (22 new tests). Covered every test
requirement `§11.2` itself explicitly names, and nothing less:
- **VLQ decoding across its full range** — single-byte values (0, 64,
  127) and multi-byte values (128, 16384, 2097151), plus a direct check
  of the encoder's own known continuation-bit shape for one concrete
  value.
- **Running status** — a second note-on with no repeated status byte,
  confirmed to read the correct note numbers for both notes.
- **Note-on-zero as note-off** — confirmed a velocity-0 note-on closes
  the note with the correct duration and preserves the *original*
  note-on's velocity, not the closing event's.
- **A multi-tempo file's tempo list** — two tempo events across
  different tracks collected, in order, into one global list; also
  confirmed a file with no tempo event at all has a correctly empty list
  (the 120 BPM default being a downstream concern, not this parser's).
- **PPQ->480 normalization for 96, 480, and 960** — a real quarter note's
  worth of raw ticks in each of these three declared PPQ values all
  normalize to exactly 480.
- **A truncated file producing a diagnostic, not an exception** — two
  distinct truncation shapes: a bad track-chunk magic (recovers with
  whatever earlier tracks parsed successfully) and a track truncated
  mid-event (a note-on missing its velocity byte, recovers keeping the
  earlier complete note).

Also extended Phase 38's own dynamic diagnostic-code-coverage check
(`test/unit/diagnostics-hardening.test.js`) to scan `parser/midi/` too,
not just `parser/musicxml/` — and it **immediately caught two real gaps**
in this phase's own first test draft (`TRUNCATED_TRACK` and
`UNKNOWN_FORMAT` had gone unasserted), exactly the kind of thing that
check exists to catch, fixed in the same pass.

## 3. Known limitations (stated, not silently missing)

- **Not wired into anything yet** — this phase produces `MidiFile`, but
  nothing downstream (Phase 40's timing engine, Phase 41's alignment)
  consumes it yet, matching `§11`'s own framing that this module's
  output *feeds* those phases rather than doing their job itself.
- **Channel-voice events other than note-on/note-off are read (to stay
  byte-synchronized) but not recorded** — control change, program
  change, pitch bend, and aftertouch carry no notation-relevant data for
  this parser's stated scope. A future phase needing program-change data
  (e.g., instrument identification) would need to extend this.
- **SysEx events are skipped entirely**, not recorded in any form.

## 4. How to modify it

- **Record additional channel-voice event types** — extend
  `parseTrackEvents` in `parse.ts`'s channel-voice branch to also push
  program-change/control-change data into a new output list, following
  the same pattern the note-on/off handling already uses.
- **Feed `MidiFile` into a real consumer** — Phase 40's timing engine is
  the next natural place; it would consume `tempoEvents` to convert
  ticks into real elapsed time.

## 5. How to revert/remove it

Delete `src/parser/midi/` entirely, remove its `export * from` line from
`src/parser/index.ts`, delete `test/unit/midi-parser.test.js` and
`test/helpers/midi-builder.js`, and revert the `SRC_DIRS`/coverage-scan
changes in `test/unit/diagnostics-hardening.test.js` back to scanning
only `parser/musicxml/`.
