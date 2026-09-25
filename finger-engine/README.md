# finger-engine — the Guitar Human Finger Engine

Works out, the way a guitarist would, **which string, which fret and which finger**
plays every note of a score, and writes a keyframe timeline the SVG fretboard draws.
It draws nothing itself and it only ever knows about the guitar.

The specification is [`docs/finger-engine/GUITAR_FINGER_ENGINE_PLAN.md`](../docs/finger-engine/GUITAR_FINGER_ENGINE_PLAN.md).
Every rule in the code carries the plan's own ID in a comment — `GEO-03`, `IN-X03`,
`V-01`, `OUT-04` — so a change to the plan can be traced to the code that implements it,
and a failing test points at the paragraph it came from.

## What is built

**Phases 0 and 1.** The plan builds in phases, one at a time, and each ends with a demo
the owner approves before the next begins.

Phase 0 is everything the later phases stand on:

| File | Plan | What it is |
|---|---|---|
| `src/core/types.ts` | Part 02 | The data model: notes, placements, techniques, the instrument. |
| `src/core/tuning.ts` | Part 03 | Strings, and the **three** different ways the world numbers them. |
| `src/core/geometry.ts` | Part 04 | Where a fret and a string actually are, in millimetres. |
| `src/core/tempo.ts` | DM-07 | Ticks to seconds, through a tempo map. |
| `src/core/rng.ts` | README rule 4 | The engine's only source of randomness — seeded. |
| `src/core/timeline-schema.ts` | Part 09 | `finger-timeline@1.0.0`, the contract with the renderer. |
| `src/core/validate-core.ts` | Part 11 §1 | The checks that do not know about guitars (V-01, V-08). |
| `src/defaults.ts` | Part 10 | Every number the engine uses. There are no others. |

Phase 1 is a single-note line played end to end — a melody, a riff, a solo without
techniques:

| File | Plan | What it is |
|---|---|---|
| `src/input/notation-engine/adapter.ts` | IN-E01..06 | The Notation Engine's score, unrolled, with its own times. |
| `src/input/musicxml/parse.ts`, `technical.ts`, `xml.ts` | IN-X* | A MusicXML file on its own, for the fields notation does not keep and for the tests. |
| `src/input/midi/parse.ts` | IN-M01..05, 07 | A MIDI file: pitch and time and nothing else. |
| `src/input/normalize.ts` | IN-N* | One shape, in seconds, in range. |
| `src/guitar/stages.ts` | SV-01..04 | The part cut into onset moments. |
| `src/guitar/candidates.ts` | SV-10..14 | Every way a stage could be played. |
| `src/guitar/left-hand-rules.ts` | LH-01..15 | What a hand cannot do, at all. |
| `src/guitar/left-hand-cost.ts` | Part 06 §3/§4 | What it costs to hold a shape, and to get to it. |
| `src/core/solver/viterbi.ts`, `beam.ts` | SV-20..22 | The shortest path through the whole phrase. |
| `src/guitar/right-hand/pick.ts` | RH-01, P01, P03, P04 | Which way the pick is travelling. |
| `src/guitar/motion/planner.ts` | MP-01..06, 20..23 | When each finger sets off, lands, holds and lifts. |
| `src/guitar/validate-guitar.ts` | V-02..V-07, V-09, V-10 | The finished timeline, re-read as a hand. |
| `src/debug/report.ts` | Part 11 §4 | Why each note came out the way it did. |

**Chords and barres (Phase 2), and the techniques — hammer-on, pull-off, slide, bend,
fingerstyle (Phase 3) — are deliberately absent.** A stage that would need a barre is
refused and reported rather than half-drawn.

## The bug this engine is built around

Three numbering conventions describe the same six strings:

- **MusicXML** `<string>1</string>` is the **thin E** — it counts from the highest.
- `<staff-tuning line="1">` is the **bottom line** of the tab staff — the lowest string.
- **This engine** numbers from the lowest: string 1 is the low E [DM-01].
- The **SVG fretboard** draws string 1 at the top, like MusicXML [OUT-05].

Read a file with the wrong one and every note lands on the wrong string — and the result
still looks like a guitar part, which is what makes it dangerous. Every conversion lives
in `tuning.ts`, is named after the rule it implements, and is unit-tested. Nothing else
in the engine is allowed to do the arithmetic inline.

## Rules this package keeps

1. **One phase at a time.** Code for a later phase does not appear early.
2. **Every rule cites its ID.** A comment names the plan rule it implements.
3. **No magic numbers** outside `defaults.ts`.
4. **Deterministic.** Same input, same config, same seed → byte-identical output. There is
   no `Math.random` anywhere; `makeRng(seed)` is the only source.
5. **The timeline is a contract.** Anything that breaks a reader needs a new major schema
   version, and the version travels inside every timeline.

## Using it

```js
// The preferred road in: the Notation Engine owns note order and timing (D-011).
const { parts } = FingerEngine.fromNotationEngine(score, playback, { musicXml });
const timeline = FingerEngine.analyzeGuitar(parts[0], { seed: 1 });

// Standalone, for tests and for files the app reads directly:
const fromXml = FingerEngine.parseMusicXml(text).parts;
const fromMidi = FingerEngine.parseMidi(bytes).parts;
```

`timeline` is `finger-timeline@1.0.0` (Part 09): every note with its string, fret, finger,
reasons and confidence; a keyframe track per finger; the picking hand's strokes; and the
warnings. It is the only thing the renderer ever sees.

**Speed.** A five-minute part of ordinary density (about 1,200 notes) analyzes in ~1 s;
five minutes of unbroken sixteenth notes (3,000 notes) takes ~2.5 s, a little over the
plan's 2 s target for a case no song really is. Measured in Node on this machine, not a
laptop, so treat both as CALIBRATE.

## Build and test

```bash
npm run verify     # typecheck + lint + format:check + build + test
npm run build      # dist/finger-engine.js (IIFE, global FingerEngine)
npm test           # builds, then runs node --test against the BUILT bundle
```

The tests load `dist/finger-engine.js` into a `vm` sandbox and exercise the bundle the
browser would get, not the TypeScript sources — a build that breaks is a test that fails.

One realm gotcha: an array built inside the sandbox has a different `Array.prototype`, so
`assert.deepEqual` reports "same structure but not reference-equal". Compare element-wise
or join to a string.

## Fixtures

`test/fixtures/` holds the plan's Part 08 fixtures that Phase 0 owns:

- **F-01** — C major scale C3→C4, MusicXML with no tab, no `<string>`, no `<fret>` and no
  `<fingering>`. The solver must find open position by itself. The expected fingering is in
  `f01-c-major-scale.expected.json`, straight from the plan's table.
- **F-09** — the same part written an octave high with `<transpose><octave-change>-1`. Its
  sounding pitches are F-01's, so its fingering must be F-01's [IN-X22]. Reading the written
  pitch instead would put the whole scale twelve frets up the neck: playable, and completely
  wrong.

Phase 1 adds the rest of its own row of the table: **F-02** (the same pentatonic box with
tab, where the file fixes the position and only the fingers are the engine's), **F-03** (the
same notes without tab), **F-05** (a repeated note in sixteenths with a rest inside it),
**F-12** (a written stretch no hand makes), **F-13** (F-01 as a MIDI file) and **F-14** (a
note below the instrument). **F-17**, determinism, is a test rather than a file.

The fixtures are checked the way Part 08 asks: exactly where one fingering is the right
answer, and by PROPERTY — "at most one shift", "no span violations" — where several are
things a guitarist really does.

## Notation Engine data model (Part 01 §6, OQ-11)

Read from `notation-engine/src/core/note.ts` and `src/timing/`, in Phase 0:

| The engine has | Notes |
|---|---|
| `stringNumber` | **MusicXML numbering, 1 = highest string.** Convert with `notationEngineStringToInternal` [IN-E04]. |
| `fret`, `fingering` | `fingering` is `<technical><fingering>`; 0 means an open string. |
| `slideStart` / `slideStop` | From `<slide>` and `<glissando>`. |
| Time | Ticks, `TICKS_PER_QUARTER = 480`, plus `buildTempoMap` / `tickToSeconds` [DM-07]. |
| Performance order | `buildRepeatPlan` unrolls repeats and voltas; the finger engine consumes that order [IN-E01]. |

Missing, so the adapter falls back to the MusicXML file itself [IN-E02]: `<pluck>`,
hammer-on/pull-off, bend, `<staff-tuning>`, `<capo>`, `<transpose>`, and per-note stable
IDs (derive them as `p{part}-m{measure}-v{voice}-n{index}` [DM-09]).
