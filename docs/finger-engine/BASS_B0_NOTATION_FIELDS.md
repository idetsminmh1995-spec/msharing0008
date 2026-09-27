# OQ-B10 — what the Notation Engine gives the Bass Finger Engine

Phase B0 of `BASS_FINGER_ENGINE_PLAN.md` is done only when "the
Notation Engine's fields for bass have been checked and reported".
This is that report. It was written by reading
`notation-engine/src/parser/musicxml/` rather than by asking the
plan, so it says what the code does today.

**The headline**: the Notation Engine has no concept of sounding
pitch. It never reads `<transpose>` — the word does not appear
anywhere in its sources — so a bass part arrives here at WRITTEN
pitch, which for a bass is normally an octave above where it sounds.
That is the whole reason BIN-03 and BIN-04a..c exist, and it means
the octave check is not a safety net on this pipeline, it is the
only thing standing between the engine and a part solved twelve
frets out.

## The fields, one by one

| What the bass engine needs | In MusicXML | Notation Engine | How the engine gets it |
| --- | --- | --- | --- |
| pitch | `<pitch>` | **kept** (step/alter/octave) | the adapter, as written pitch |
| sounding pitch | `<transpose>` | **dropped** | the adapter re-reads the file (`transposeSemitones`) |
| string and fret | `<notations><technical>` | **kept** | the adapter, per note — so BIN-04a works |
| fingering | `<technical><fingering>` | **kept** | the adapter (locked, V-06) |
| staff line count | `<staff-details><staff-lines>` | **kept** | `readPartEvidence` reads it again, per part |
| string tuning | `<staff-details><staff-tuning>` | **dropped** | the adapter re-reads the file (`tuning`) |
| capo | `<staff-details><capo>` | **dropped** | the adapter re-reads the file |
| part name | `<part-name>` | **kept** | `ParsedPart.name`, and `readPartEvidence` |
| part abbreviation | `<part-abbreviation>` | **dropped** | `readPartEvidence` |
| declared instrument | `<score-instrument><instrument-sound>` | **dropped** | `readPartEvidence` |
| GM program | `<midi-instrument><midi-program>` | **dropped** | `readPartEvidence` |
| bowed or not | `<up-bow>`, `<down-bow>`, the word "arco" | **dropped** | `readPartEvidence` |
| dead notes | `<notehead>x</notehead>` | **kept** (`explicitNotehead`) | available for B3 |
| articulations | `<notations><articulations>` | **kept** | available for B3 |
| slides | `<slide>`, `<glissando>` | **kept** | the adapter |
| harmonics, pizzicato | `<harmonic>`, `pizzicato` | **not parsed** | B3/B4 will need its own reader |

"Dropped" is not a criticism of the Notation Engine: it draws music.
The `<part-list>` contains no music and no notes, so a drawing engine
has no reason to keep it, and `<transpose>` changes no printed
notehead.

## What that cost, and what was built for it

`detectPart` (BIN-02) asks for four kinds of evidence, and three of
them — the declared sound, the GM program and the abbreviation — were
in the part of the file nobody was reading. Left alone, rules (1) and
(2) of BIN-02 would have been unreachable in the real pipeline and
every bass would have been detected by its NAME, the weakest of the
four tests and the one that a part called "Gtr 2" defeats.

So Phase B0 adds `input/musicxml/part-evidence.ts`:
`readPartEvidence(xml)` returns one `PartEvidence` per `<score-part
id>`, and `fromNotationEngine` now returns it as `result.evidence`
beside the parts. It reads the file a second time, exactly as the
adapter already did for `<transpose>`, `<staff-tuning>` and `<capo>`.

Two details worth writing down:

- **`<midi-program>` is one-based** (1..128) where General MIDI is
  zero-based (0..127). The evidence carries it as `midiProgramXml`
  and `detectPart` subtracts the one; a MIDI file's own program goes
  in `midiProgram` untouched. Getting this wrong turns Electric Bass
  (pick) into Fretless and Slap Bass 1 into Synth Bass.
- **MusicXML has no `<arco>` element.** The word is a direction, and
  the gesture is `<up-bow>` / `<down-bow>`, so both are looked for.
  This is what separates an upright (out of scope, BP-019) from an
  acoustic BASS GUITAR, which is analysed normally.

## What is still open

`<harmonic>` and `pizzicato` are not parsed by either engine. They
belong to Phase B3/B4 (BIN-07: slap, pop, dead, ghost, palm mute),
and the same trick will serve: read them off the file beside the
notes rather than asking the Notation Engine to carry them.
