# finger-engine — the Guitar Human Finger Engine

Works out, the way a guitarist would, **which string, which fret and which finger**
plays every note of a score, and writes a keyframe timeline the SVG fretboard draws.
It draws nothing itself and it only ever knows about the guitar.

The specification is [`docs/finger-engine/GUITAR_FINGER_ENGINE_PLAN.md`](../docs/finger-engine/GUITAR_FINGER_ENGINE_PLAN.md).
Every rule in the code carries the plan's own ID in a comment — `GEO-03`, `IN-X03`,
`V-01`, `OUT-04` — so a change to the plan can be traced to the code that implements it,
and a failing test points at the paragraph it came from.

## What is built

**Phase 0 (foundations) only.** The plan builds in phases, one at a time, and each ends
with a demo the owner approves before the next begins. Phase 0 is everything the later
phases stand on:

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

The input adapters, the solver, the motion planner and the right hand are **Phases 1–3
and are deliberately absent**.

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

Phase 0 checks that the files say what the plan says they say, with a throwaway reader in
the test — using the real adapter to check the adapter's own fixtures would prove nothing.
Phase 1 runs them through the solver.

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
