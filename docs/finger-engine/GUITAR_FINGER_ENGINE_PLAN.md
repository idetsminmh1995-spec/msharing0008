# Guitar Human Finger Engine — Implementation Plan

| Field | Value |
|---|---|
| Plan version | **0.2.1** |
| Status | DRAFT — for owner review before any implementation |
| Owner | Aung Paing |
| Product | MusicNote → Video Create → instrument engines |
| Last updated | 2026-09-25 |
| Timeline schema version | `finger-timeline@1.0.0` (see Part 09) |

---

## အကျဉ်းချုပ် (Burmese summary for the owner)

ဒီ Plan က Guitar Human Finger Engine အတွက် code tool ဖတ်ပြီး ရေးနိုင်အောင် ပြင်ဆင်ထားတဲ့ spec ပါ။

- **Input**: MusicXML (.musicxml / .xml / .mxl) နဲ့ MIDI ပဲ။ MusicXML ရဲ့ note အစဉ်နဲ့ အချိန်ကို ကိုယ်ပိုင် **Notation Engine** ကနေ ယူမယ် (notation နဲ့ အစက်တွေ sync ဖြစ်အောင်)။ Tab (ကြိုး/fret) ပါရင် လေးစားလိုက်နာမယ်၊ မပါရင် Engine က ကိုယ်တိုင်ရွေးမယ်၊ တစ်ဝက်ပါရင် ကျန်တာ ဖြည့်မယ်။
- **တွက်ချက်ပုံ**: fretboard ကို mm အကွာအဝေးအစစ်နဲ့ တွက်၊ ဖြစ်နိုင်တဲ့ (ကြိုး, fret, လက်ချောင်း) combination တွေထဲက phrase တစ်ခုလုံး cost အနည်းဆုံးလမ်းကြောင်းကို Viterbi/Beam search နဲ့ ရှာ။
- **Output**: လက်ချောင်းတစ်ချောင်းစီရဲ့ keyframe timeline (JSON) — SVG fretboard က ဒါကိုဖတ်ပြီး အရောင်အစက်တွေ ဆွဲ။ ညာလက် (pick ↓↑ / p-i-m-a) event တွေလည်း ပါ။
- **ပြင်ဆင်ရလွယ်အောင်**: စည်းမျဉ်းတိုင်းမှာ ID (ဥပမာ `LH-04`) ရှိ၊ ဂဏန်းတိုင်း config ထဲမှာ၊ ဆုံးဖြတ်ချက်တွေ Part 00 မှာ၊ ပြောင်းလဲမှုတွေ the Changelog (end of this file) မှာ။
- `PROPOSED` လို့ ရေးထားတာတွေက ကျွန်တော် default အဖြစ် အဆိုပြုထားတာ — အတည်ပြုပေးဖို့ လိုသေးတယ်။ Part 13 ကို ကြည့်ပါ။

---

## What this engine does

Given a guitar part (MusicXML or MIDI), the engine decides — the way a real guitarist would —
**which string, fret and left-hand finger** plays every note, **how the right hand** plays it
(pick direction or p-i-m-a finger), and **how every finger moves over time**. It outputs a
keyframe timeline that the existing TypeScript + SVG fretboard renders as colored finger dots.

The engine does **not** draw anything. Rendering, colors and layout belong to the SVG layer.

## Contents (read in this order)

| Part | Title | Contents |
|---|---|---|
| README | Overview | This part: overview, rules for the coding tool, how to update the plan |
| 00 | Decisions | Confirmed decisions (D-xxx) and proposed defaults (P-xxx) |
| 01 | Architecture | Pipeline, modules, folder layout, Notation Engine integration |
| 02 | Data model | TypeScript types and conventions (string numbering, time units) |
| 03 | Input | Notation Engine adapter, MusicXML and MIDI, normalization, tab/pitch resolution |
| 04 | Fretboard geometry | Fret-distance formula, string spacing, reference numbers |
| 05 | Left-hand model | Finger rules, span limits, barre, open strings, persistence |
| 06 | Cost and solver | Stages, candidates, static/transition cost, Viterbi + beam |
| 07 | Right hand | Pick (alternate/economy/strum) and fingerstyle (p-i-m-a) |
| 08 | Motion planner | Keyframes, timing, shifts, techniques, humanization |
| 09 | Timeline output | The JSON contract consumed by the SVG renderer |
| 10 | Config and presets | Every tunable number, presets, weights |
| 11 | Validation and testing | Output validator, fixtures, acceptance criteria, debug |
| 12 | Roadmap | Phases; what to build first |
| 13 | Open questions | Questions awaiting the owner |
| 14 | References | Research sources and what was taken from each |
| CL | Changelog | Plan version history |

## How to use this file with a coding tool

Give the coding tool this single file and say: "Read the whole plan. Implement Phase 0 only (Part 12). Follow the Rules for the coding tool below."

## Rules for the coding tool (read before writing code)

1. **Build one phase at a time** as listed in Part 12. Do not implement features from later phases.
2. **Every rule has a stable ID** (`IN-`, `GEO-`, `LH-`, `SV-`, `RH-`, `MP-`, `OUT-`, `V-`). When code implements a rule, add a comment with the ID, e.g. `// [LH-04] pairwise span limit`. This is how future plan updates are traced to code.
3. **No magic numbers.** Every numeric value comes from the config object defined in Part 10. Defaults live in one file (`defaults.ts`).
4. **Pure and deterministic.** Engine modules are pure TypeScript functions with no DOM access, no network, no global state. Same input + same config + same seed ⇒ byte-identical output.
5. **Do not change the timeline contract** (Part 09) without bumping its schema version.
6. **When the plan is ambiguous**, do not guess silently: implement the documented default, leave a `TODO(OQ-xx)` comment referencing Part 13, and report it.
7. **Reuse before rewriting.** Note order and timing for MusicXML come from the owner's **Notation Engine** (D-011, IN-E01) — never compute a second timeline. The project also already parses MIDI and `.mxl` (ZIP) files for the drum tool. Check the repository for existing parsers/readers and wrap them in adapters instead of duplicating them. alphaTab is not part of this project; do not add it.
8. Items marked **PROPOSED** are implemented as the default but must stay switchable through config, because the owner may change them.

## How to update this plan

- Bump `Plan version` (semver): patch = wording/typo; minor = new rule/feature or changed default; major = changed contract or architecture.
- Add an entry to the Changelog (end of this file) listing changed rule IDs.
- New decisions get the next `D-xxx` ID in Part 00; when a `P-xxx` is confirmed, move it to the confirmed table and record the date.
- **Never reuse or renumber a rule ID.** To remove a rule, mark it `DEPRECATED (vX.Y.Z)` and keep the line.
- This plan is ONE file. Each Part keeps its own `Status:` line (DRAFT / REVIEWED / FROZEN). Edit a Part in place; do not split the file.

## Status legend used throughout

| Tag | Meaning |
|---|---|
| **CONFIRMED** | Agreed with the owner |
| **PROPOSED** | Default chosen during planning, awaiting owner confirmation — implement behind config |
| **OPEN** | Not decided; see Part 13 |
| **CALIBRATE** | Engineering estimate; must be tuned by watching output videos |


---

## Part 00 — Decisions

Status: DRAFT

### Confirmed by the owner (CONFIRMED)

| ID | Decision | Date |
|---|---|---|
| D-001 | The guitar in the video is drawn with TypeScript + SVG as a fretboard; fingers are shown as **dots** on the fretboard. The engine only produces data; it never renders. | 2026-09-25 |
| D-002 | Each finger has its own color, **user-customizable**. The engine outputs finger IDs (`1`,`2`,`3`,`4`,`T`) only; colors live in the SVG layer's config. | 2026-09-25 |
| D-003 | Finger movement must follow how real people play. Internal states `Pressed / Held / Approaching / Lifted` are **engine-internal**: they decide *where and when a dot is/moves*, not a separate visual style. One dot style is used in the video. | 2026-09-25 |
| D-004 | The **right hand** (pick ↓↑, p-i-m-a) is computed by the engine and **shown in the video**. Where/how it is drawn is the SVG layer's job. | 2026-09-25 |
| D-005 | Input **with tab** (string/fret present) and **without tab** are both supported. | 2026-09-25 |
| D-006 | Architecture: instrument-independent **Fretboard Core** (`core/`) kept separate from the **guitar rules** (`guitar/`). | 2026-09-25 |
| D-007 | The **Guitar Engine is built first**. | 2026-09-25 |
| D-008 | Input formats: **MusicXML + MIDI only** (no Guitar Pro files). | 2026-09-25 |
| D-009 | This plan is written for a coding tool to read and implement, and must be easy to update later. | 2026-09-25 |
| D-010 | **Scope of this plan: the Guitar Human Finger Engine only.** Nothing for other instruments is specified here. | 2026-09-25 |
| D-011 | **alphaTab is not used anywhere.** Notation display and notation timing come from the owner's own **Notation Engine**; this engine integrates with it. | 2026-09-25 |

### Proposed defaults (PROPOSED — awaiting confirmation, implement behind config)

| ID | Proposal | Config key | Linked question |
|---|---|---|---|
| P-001 | When tab (string+fret) is given, **respect it 100%**. If it is physically infeasible under the span limits, keep the tab, relax the limit for that stage only, and emit warning `TAB_INFEASIBLE`. Never silently re-tab. | `input.tabPolicy = "respect"` | OQ-01 |
| P-002 | When `<fingering>` (left-hand finger) is given, lock that finger. | `input.respectFingering = true` | OQ-01 |
| P-003 | Partial tab: lock the notes that have string/fret; the engine solves the rest in context. | — | OQ-01 |
| P-004 | Tuning comes from MusicXML `<staff-tuning>`; if missing (always for MIDI), use standard tuning `E2 A2 D3 G3 B3 E4`. The UI may override tuning. | `instrument.tuning` | OQ-02 |
| P-005 | Capo is supported (MusicXML `<capo>` + UI override). | `instrument.capo` | OQ-02 |
| P-006 | **Internal string numbering: 1 = lowest-pitched string** (same as MusicXML `<staff-tuning line>`). MusicXML `<string>` (1 = highest) is converted at the adapter. The Notation Engine's own convention must be checked and converted at its adapter too (OQ-11). | — | OQ-11 |
| P-007 | Tab data (`<string>`, `<fret>`, `<fingering>`, `<pluck>`, techniques) is taken **from the Notation Engine's parsed score if it keeps these fields**; otherwise the finger engine reads them from the MusicXML file itself. Timing and note order always come from the Notation Engine (so dots and notation stay in sync). | — | OQ-11 |
| P-008 | Hold policy `realistic`: fingers stay down after a note ends until needed elsewhere or an idle timeout passes (real players do this). Alternative `noteDuration` lifts at note end. | `motion.holdPolicy` | OQ-04 |
| P-009 | Right-hand mode is auto-detected (pick vs fingerstyle) with a UI override. | `rightHand.mode = "auto"` | OQ-05 |
| P-010 | The engine runs in the browser inside a Web Worker; pure TypeScript, no runtime dependencies, deterministic with a seed. | — | — |
| P-011 | Output times are seconds from the start of the musical content (t = 0 at the first tick). Count-in pre-roll offsets are added by the Video Engine, not by this engine. | — | — |
| P-012 | Thumb-over-the-neck fretting is disabled in the first phases. | `leftHand.allowThumb = false` | — |
| P-013 | Notes outside the playable range are **not transposed**; they get no dot and a warning `OUT_OF_RANGE`. | `input.outOfRange = "skip"` | — |


---

## Part 01 — Architecture

Status: DRAFT

### 1. Pipeline

```
 MusicXML / .mxl ─► Notation Engine (owner's) ──┐
                    + MusicXML technical data   ├─► [1] Input adapters
 MIDI ──────────────────────────────────────────┘          │
                                                           ▼
                         [2] Normalizer ─► [3] Stage builder
                                                           │
                                                           ▼
                         [4] Candidate generator (per stage, all playable hand configs)
                                                           │
                                                           ▼
                         [5] Left-hand solver (cost model + Viterbi / beam search)
                                                           │
                                                           ▼
                         [6] Right-hand solver (pick directions or p-i-m-a)
                                                           │
                                                           ▼
                         [7] Motion planner (finger keyframes, shifts, techniques)
                                                           │
                                                           ▼
                         [8] Validator (hard-rule check of the result)
                                                           │
                                                           ▼
                         [9] Timeline serializer ─► FingerTimeline JSON ─► SVG renderer
```

Each numbered box is a separate module with its own unit tests. Each module is a pure
function: `output = step(input, config)`.

### 2. Core vs guitar rules (D-006)

| Layer | Folder | Knows about |
|---|---|---|
| **Fretboard Core** | `core/` | strings, tunings, frets, scale length, mm geometry, tempo map, time, seeded RNG, generic DP/beam solver, timeline schema, generic validator |
| **Input** | `input/` | adapter from the Notation Engine's score, MusicXML technical data, MIDI, normalization |
| **Guitar rules** | `guitar/` | guitar hand rules, chord/barre, pick & fingerstyle, guitar motion rules, guitar presets |

Rule: nothing in `core/` or `input/` may import from `guitar/`. The solver in `core/`
is generic: it receives stages, a candidate generator and cost functions as parameters.
Keeping this separation makes the guitar rules easy to change without touching the solver.

### 3. Proposed folder layout

```
src/finger-engine/
  index.ts                     // public API: analyzeGuitar(), parse*(), types
  defaults.ts                  // ALL default numbers (see Part 10)
  core/
    types.ts                   // shared types (Part 02)
    tuning.ts                  // tuning presets, pitch<->string/fret
    geometry.ts                // GEO-* rules
    tempo.ts                   // tick <-> seconds with a tempo map
    rng.ts                     // seeded PRNG (mulberry32 or similar)
    solver/viterbi.ts          // generic DP over stages
    solver/beam.ts             // pruning / top-K per stage
    timeline-schema.ts         // FingerTimeline types + version constant
    validate-core.ts           // generic checks (pitch correctness, ranges)
  input/
    notation-engine/adapter.ts // IN-E* rules: Notation Engine score -> ParsedPart
    musicxml/read-mxl.ts       // reuse existing ZIP reader if present
    musicxml/technical.ts      // string/fret/fingering/pluck/techniques (IN-X*)
    musicxml/parse.ts          // only what the Notation Engine does not provide
    midi/parse.ts              // reuse existing MIDI parser if present
    midi/track-select.ts
    midi/string-channels.ts    // later phase
    normalize.ts               // IN-N* rules
  guitar/
    index.ts                   // analyzeGuitar()
    stages.ts                  // SV-01..03
    candidates.ts              // SV-10..
    left-hand-rules.ts         // LH-* hard rules
    left-hand-cost.ts          // static + transition cost
    right-hand/pick.ts         // RH-P*
    right-hand/fingerstyle.ts  // RH-F*
    motion/planner.ts          // MP-*
    presets.ts
    validate-guitar.ts         // V-* guitar rules
  debug/
    report.ts                  // human-readable reasons/confidence
  __tests__/
    fixtures/                  // .musicxml / .mid test files + expected JSON
```

### 4. Public API (shape, not final code)

```ts
// Input
fromNotationEngine(score: NotationEngineScore, musicXmlSource?: ArrayBuffer | string): ParsedPart[]  // preferred path
parseMusicXml(data: ArrayBuffer | string): ParsedPart[]         // fallback when used standalone (tests)
parseMidi(data: ArrayBuffer): ParsedPart[]                      // one part per candidate track

// Analyze one guitar part
analyzeGuitar(part: ParsedPart, options?: {
  instrument?: Partial<InstrumentSpec>,   // tuning, capo, frets, scale length override
  config?: DeepPartial<GuitarEngineConfig>,
  presetId?: string,
  seed?: number,
}): FingerTimeline
```

### 5. Runtime

- Runs in a **Web Worker** (P-010) so the UI never freezes. The worker posts progress events per phase.
- No network access inside the engine. Assets and files are passed in as data.
- Performance target: a 5-minute single-guitar part analyzes in **≤ 2 s** on a mid-range laptop (CALIBRATE).

### 6. Integration points with the existing app

| Point | Rule |
|---|---|
| Time base | Engine times are seconds from content start (P-011). The Video Engine adds the count-in pre-roll it already computes. |
| Notation Engine (D-011) | The owner's own Notation Engine is the **single source of note order and timing** (unrolled repeats/voltas, tempo map). The finger engine consumes its score through `input/notation-engine/adapter.ts` so finger dots, the notation cursor and the audio can never drift apart. See OQ-06, OQ-11. |
| Notation Engine data model | **Read in Phase 0** (`notation-engine/src/core/note.ts`, `src/timing/`, `src/playback/repeats.ts`). **Present on a note:** `stringNumber`, `fret`, `fingering` (`<technical><fingering>`, 0 = open), `slideStart`/`slideStop` (from `<slide>` and `<glissando>`), plus `voice`, `startTick`, `durationTicks` and the pitch. **String numbering:** MusicXML's — **1 = highest-pitched string**, drawn on the top tab line — so it is converted with `notationEngineStringToInternal` (IN-E04). **Time unit:** ticks at `TICKS_PER_QUARTER = 480`, turned into seconds by `buildTempoMap` + `tickToSeconds`; `buildRepeatPlan` gives the unrolled performance order the video plays (IN-E01, OQ-06). **Note IDs:** none — the adapter derives `p{part}-m{measure}-v{voice}-n{index}` (DM-09). **Missing, so read from the MusicXML file itself (IN-E02):** `<pluck>`, hammer-on/pull-off, bend, `<staff-tuning>`, `<capo>`, `<transpose>`. |
| Rendering | The SVG fretboard reads `FingerTimeline` (09) and interpolates keyframes each frame. |


---

## Part 02 — Data model and conventions

Status: DRAFT

### 1. Conventions (apply everywhere)

| ID | Convention |
|---|---|
| DM-01 | **String index**: integer `1..N`, **1 = lowest-pitched string** (P-006). For standard 6-string: 1=E2, 2=A2, 3=D3, 4=G3, 5=B3, 6=E4. |
| DM-02 | **Fret**: integer, `0` = open string (or the capo when a capo is used, see DM-05). Frets are always **physical, counted from the nut**. |
| DM-03 | **Left-hand finger IDs**: `1` index, `2` middle, `3` ring, `4` pinky, `T` thumb. Open strings have `finger = null`. |
| DM-04 | **Right-hand finger IDs**: `p` thumb, `i` index, `m` middle, `a` ring, `c` little finger; `pick` for a plectrum. |
| DM-05 | **Capo** `c`: physical frets `< c` cannot be fretted; a note "open behind capo" is stored as `fret = c` with `finger = null` and `isCapoOpen = true`. |
| DM-06 | **Pitch**: MIDI note number of the **sounding** pitch (after transposition, see Part 03). |
| DM-07 | **Time**: every event stores `tick` (in the source resolution) **and** `time` (seconds from content start, computed with the tempo map). Solver and motion planner use seconds. |
| DM-08 | **Distances** are millimetres unless the name says otherwise. |
| DM-09 | **IDs**: every note gets a stable `noteId` (e.g. `p1-m12-v1-n3` for MusicXML part/measure/voice/index, or `t2-n145` for MIDI track/index) used across all stages and in the output. |

### 2. Core types (TypeScript sketch)

```ts
type StringIndex = number;      // 1..numStrings, 1 = lowest (DM-01)
type Fret = number;             // 0..numFrets (DM-02)
type LHFinger = 1 | 2 | 3 | 4 | 'T';
type RHFinger = 'p' | 'i' | 'm' | 'a' | 'c' | 'pick';

interface InstrumentSpec {
  kind: 'guitar';
  numStrings: number;           // 6 default; 7/8 allowed
  tuning: number[];             // MIDI pitch of open strings, index 0 = string 1 (lowest)
  capo: number;                 // 0 = none
  numFrets: number;             // 22 or 24 typical
  scaleLengthMm: number;        // 648 default (see 04)
  nutSpacingMm: number;         // distance string 1 ↔ string N at the nut
  bridgeSpacingMm: number;      // distance string 1 ↔ string N at the bridge
}

type Technique =
  | 'normal' | 'hammerOn' | 'pullOff' | 'slideIn' | 'slideOut' | 'slideLegato' | 'slideShift'
  | 'bend' | 'release' | 'preBend' | 'vibrato' | 'tap' | 'harmonicNatural' | 'harmonicArtificial'
  | 'palmMute' | 'deadNote' | 'letRing' | 'tieContinuation' | 'grace';

interface NoteEvent {
  noteId: string;
  pitch: number;                // sounding MIDI pitch (DM-06)
  tick: number; durationTicks: number;
  time: number; duration: number;   // seconds
  velocity?: number;            // 0..127
  voice?: number;               // MusicXML voice / MIDI channel
  // Constraints from the source (all optional)
  lockedString?: StringIndex;   // from <string> (converted) or MIDI string channel
  lockedFret?: Fret;            // from <fret>
  lockedFinger?: LHFinger;      // from <fingering>
  lockedRH?: RHFinger;          // from <pluck>
  lockedPickDir?: 'down' | 'up';// from <down-bow>/<up-bow>
  techniques: Technique[];
  techniqueLinks?: { type: 'hammerOn'|'pullOff'|'slide'|'tie', toNoteId?: string, fromNoteId?: string }[];
  bend?: { semitones: number, points?: { t: number, semitones: number }[] };
  sourceRef: { format: 'musicxml' | 'midi', part: string, measure?: number, index: number };
  notationNoteId?: string;      // the Notation Engine's own note ID (IN-E03), for linking dots ↔ notation
}

interface ParsedPart {
  partId: string; name: string;
  gmProgram?: number;           // 0-based GM program (24..31 guitars)
  instrumentHint: Partial<InstrumentSpec>;   // tuning/capo found in file
  notes: NoteEvent[];
  tempoMap: TempoMap;
  timeSignatures: { tick: number, numerator: number, denominator: number }[];
  hasTab: boolean;              // true if any note had <string>+<fret> (P-007)
}
```

### 3. Solver-level types

```ts
interface Stage {                // one onset moment (SV-01)
  index: number;
  time: number;
  onsets: NoteEvent[];           // notes starting now (a chord = several)
  sustained: NoteEvent[];        // notes still sounding from earlier stages
}

interface Placement {            // one note on the fretboard
  noteId: string;
  string: StringIndex; fret: Fret;
  finger: LHFinger | null;       // null = open string / capo-open
}

interface HandConfig {           // one solver state = a candidate for a stage
  placements: Placement[];       // onsets + sustained fretted notes
  handPos: number;               // fret number under the index finger (float allowed)
  barre?: { finger: LHFinger, fret: Fret, fromString: StringIndex, toString: StringIndex };
  staticCost: number;            // cached
  features: Record<string, number>;   // for debug and future weight learning
}
```

### 4. Output type

See Part 09 (`FingerTimeline`). It is the only type the renderer depends on.


---

## Part 03 — Input: MusicXML and MIDI

Status: DRAFT

The adapters turn a file into `ParsedPart[]` (see Part 02). All guitar-specific
meaning (string/fret/finger/technique) is extracted here so later stages never look at XML/MIDI.

---

### 0. Notation Engine adapter (`IN-E*`) — preferred path for MusicXML (D-011)

The owner's Notation Engine already reads MusicXML to draw notation and drive the cursor.
The finger engine must follow the **same notes in the same order at the same times**.

| ID | Rule |
|---|---|
| IN-E01 | For MusicXML input, the Notation Engine parses the file first. The finger engine takes from it: the note list in **performance order** (repeats/voltas unrolled), the tempo map, time signatures and note times. The finger engine never computes its own timing for MusicXML. |
| IN-E02 | Guitar data (`<string>`, `<fret>`, `<fingering>`, `<pluck>`, hammer-on/pull-off, slide, bend, tap, harmonic, down/up-bow, `<staff-tuning>`, `<capo>`, `<transpose>`) is read from the Notation Engine's score **if it keeps it**. For any field it does not keep, read it from the MusicXML file with the `IN-X*` rules below and attach it to the matching notation note by document position (part, measure, voice, note index inside the measure). |
| IN-E03 | Store the Notation Engine's note ID in `NoteEvent.notationNoteId`, so the video can link a finger dot to the note on the notation (e.g. highlight both together). |
| IN-E04 | Convert the Notation Engine's string numbering (whatever it is) to the internal convention (P-006) inside the adapter, with a unit test. |
| IN-E05 | A written note that is played twice because of a repeat becomes two `NoteEvent`s with the same `notationNoteId` and different `noteId`s (suffix `#r2`, `#r3` …). |
| IN-E06 | The standalone MusicXML parser (`IN-X*`) still exists for unit tests and for fields the Notation Engine does not provide; it must produce exactly the same notes/times as the Notation Engine for the test fixtures. |

---

### A. MusicXML adapter (`IN-X*`)

#### A1. Container

| ID | Rule |
|---|---|
| IN-X01 | Accept `.musicxml`, `.xml` (uncompressed) and `.mxl` (ZIP container). Reuse the existing in-browser ZIP reader already written for the drum tool. |
| IN-X02 | Parse every `<part>`; a guitar part is chosen by the user or auto-selected (part name contains guitar/gtr, or `<midi-program>` 25–32 in MusicXML's 1-based numbering, or the part has a TAB clef). |

#### A2. Tab data inside `<notations><technical>` (MusicXML 4.0)

| Element | Meaning | Engine use |
|---|---|---|
| `<string>` | String number, **1 = highest string** in MusicXML | Convert: `internal = numStrings + 1 − xmlString` (IN-X03) |
| `<fret>` | Fret number, 0 = open | `lockedFret` |
| `<fingering>` | For fretted instruments this is the **fretting (left-hand) finger** | `lockedFinger` (IN-X06) |
| `<pluck>` | The **plucking (right-hand) finger** (p, i, m, a, c) | `lockedRH` |
| `<down-bow>` / `<up-bow>` | Used by notation programs for pick down/up strokes | `lockedPickDir` |
| `<hammer-on type="start/stop">` | Hammer-on between two notes | technique link |
| `<pull-off type="start/stop">` | Pull-off between two notes | technique link |
| `<bend>` (+ `<bend-alter>`, `<pre-bend/>`, `<release/>`) | String bend | `bend` |
| `<tap>`, `<harmonic>`, `<open-string>` | Tapping, harmonics, explicit open string | techniques |
| `<slide>` / `<glissando>` (in `<notations>`, not `<technical>`) | Slide between notes | technique link |

| ID | Rule |
|---|---|
| IN-X03 | **String numbering conversion is mandatory**: MusicXML `<string>` 1 = highest; `<staff-tuning line="1">` = lowest string; engine string 1 = lowest. Write a unit test for all three. |
| IN-X04 | `<string>` **with** `<fret>` ⇒ full tab lock (`lockedString`, `lockedFret`). |
| IN-X05 | `<string>` **without** `<fret>` (common in classical scores exported from MuseScore: a circled string number on the notation staff) ⇒ **string constraint only**; fret is computed from pitch. Emit info `STRING_ONLY_HINT`. |
| IN-X06 | `<fingering>` content `"1".."4"` ⇒ finger; `"0"` ⇒ open string; `"T"`/`"t"` ⇒ thumb; anything else ⇒ ignore + warning `UNKNOWN_FINGERING_TOKEN`. If several `<fingering>` exist, use the first without `alternate="yes"`; `substitution="yes"` means a finger change during the note (Phase 4+, ignore before). |
| IN-X07 | `<pluck>` content `p i m a c` (case-insensitive) ⇒ `lockedRH`; others ignored with warning. |

#### A3. Tuning, capo, transposition

| ID | Rule |
|---|---|
| IN-X10 | Tuning from `<attributes><staff-details>`: `<staff-lines>` = number of strings; each `<staff-tuning line="n">` (`<tuning-step>`, `<tuning-alter>`, `<tuning-octave>`) where **line 1 = lowest string**. Missing ⇒ standard tuning (P-004). |
| IN-X11 | `<capo>` (inside `<staff-details>`) = fret of the capo; it raises the open tuning by that many semitones. |
| IN-X12 | **Sounding pitch** = written `<pitch>` + `<transpose>` (`chromatic` + 12 × `octave-change`). Guitar parts are often notated an octave above sounding pitch, so this matters. |
| IN-X13 | **Consistency check when tab exists**: `expected = tuning[string] + fret`. If `expected == soundingPitch` ⇒ OK. If it differs by exactly ±12 for (almost) every note ⇒ apply the octave correction to pitch, warning `OCTAVE_CORRECTED`. Other mismatch ⇒ keep **tab as the position authority**, keep pitch for audio, warning `PITCH_TAB_MISMATCH`. |
| IN-X14 | **Capo fret reference is ambiguous across programs** (some write frets relative to the capo, some relative to the nut). Resolve by testing both hypotheses against pitch with IN-X13; choose the one that matches; if neither, warning `CAPO_AMBIGUOUS` and assume nut-relative. Internally frets are always physical (DM-02). |
| IN-X15 | If there is no tab and no `<transpose>`, but the part uses an octave-transposing clef (`<clef-octave-change>-1`), test whether pitches fit the instrument range as-is or shifted by −12; pick the hypothesis where more notes are playable. Verify with real exported fixtures (MuseScore, Guitar Pro 8) before freezing this rule. **CALIBRATE** |

#### A4. Structure

| ID | Rule |
|---|---|
| IN-X20 | `<chord/>` marks a note that starts together with the previous note. |
| IN-X21 | Notation staff + TAB staff inside one part often duplicate the same notes. Merge duplicates (same onset tick + same pitch); the TAB copy's string/fret wins. |
| IN-X22 | Ties (`<tie type="start/stop">`): the continuation is **not** a new onset — merge into one `NoteEvent` with the combined duration and technique `tieContinuation` recorded. No new pluck, no finger change. |
| IN-X23 | Grace notes (`<grace/>`): give them a short real duration (config `input.graceDurationSec`, default 0.06 s) taken **before** the main note; usually played as hammer-on/pull-off/slide. |
| IN-X24 | Rests produce no events; they matter for stage gaps. |
| IN-X25 | Tempo from `<sound tempo="…">` and `<metronome>`; `<divisions>` gives ticks per quarter. Convert to seconds with the tempo map. |
| IN-X26 | Repeats / voltas / D.S. / D.C.: the note list is **unrolled in performance order by the Notation Engine** (IN-E01) — the same order the notation cursor and the video use. See OQ-06. |

---

### B. MIDI adapter (`IN-M*`)

| ID | Rule |
|---|---|
| IN-M01 | Reuse the project's existing MIDI parser (drum tool). Convert note-on/note-off pairs (note-on with velocity 0 = note-off) into `NoteEvent`s. |
| IN-M02 | Track selection: exclude channel 10 (drums). Prefer tracks with GM program 24–31 (0-based: nylon, steel, jazz, clean, muted, overdriven, distortion, harmonics). Bass programs 32–39 and all other non-guitar programs are excluded. If several candidates remain, the UI asks the user. |
| IN-M03 | MIDI has **no tuning, string or fret data** by default ⇒ tuning from UI or standard (P-004); all notes are unlocked. |
| IN-M04 | Overlapping notes of the same pitch: end the earlier one at the later onset. |
| IN-M05 | Pitch bend events on the track's channel ⇒ `bend` data (semitones = value / 8192 × bendRange; bendRange default 2, or read from RPN 0 if present). |
| IN-M06 | **String-per-channel files** (later phase): MIDI guitar controllers use one MIDI channel per string (Mode 4, mono), and some tab programs export that way. Detection heuristic: a track whose notes are spread over 4–8 channels, each channel monophonic, each channel's lowest pitch ≥ a plausible open-string pitch. If detected with high confidence ⇒ `lockedString` per channel; otherwise ignore. **CALIBRATE** with real files. |
| IN-M07 | Quantization is **not** applied; real timing is kept (it is part of the human feel). Onset grouping uses a tolerance (SV-02). |

---

### C. Normalizer (`IN-N*`)

| ID | Rule |
|---|---|
| IN-N01 | Sort notes by time, then by pitch (low → high). |
| IN-N02 | Remove exact duplicates (same pitch, onset within 5 ms). |
| IN-N03 | Range check against the instrument: `tuning[1] + capo ≤ pitch ≤ tuning[N] + numFrets`. Out of range ⇒ P-013 (skip + `OUT_OF_RANGE`). |
| IN-N04 | Locked string/fret that contradicts pitch ⇒ IN-X13 handling. |
| IN-N05 | Mark `hasTab = true` if any note is fully locked (P-007). |
| IN-N06 | Compute `time`/`duration` in seconds for every note from the tempo map (DM-07). |


---

## Part 04 — Fretboard geometry (core)

Status: DRAFT

The engine measures difficulty in **real millimetres**, not in fret numbers, because frets get
narrower toward the body: a four-fret stretch at fret 1 is much harder than at fret 12.

### 1. Formulas

| ID | Rule |
|---|---|
| GEO-01 | Distance from nut to fret `n`: `d(n) = L × (1 − 2^(−n/12))`, `L` = scale length. (Fret 12 is at exactly `L/2`.) |
| GEO-02 | Width of fret space `n` (between fret wire `n−1` and `n`): `w(n) = d(n) − d(n−1)`. |
| GEO-03 | **Fingertip x-position** for a note at fret `n > 0`: just behind the fret wire, `x(n) = d(n) − k × w(n)`, `k = geometry.fingertipBehindFret` (default **0.3**, CALIBRATE visually). Open string: `x = 0` (nut); capo-open: `x = d(capo)`. |
| GEO-04 | **String y-position** (across the neck) interpolates linearly from nut to bridge: spacing between adjacent strings `s(x) = (nutSpacing + (bridgeSpacing − nutSpacing) × x / L) / (N − 1)`. `y(string, x) = (string − 1) × s(x)`. |
| GEO-05 | Distance between two fingertip points = Euclidean distance of `(x, y)`; along-neck distance `|Δx|` and across-neck distance `|Δy|` are also exposed separately because they cost differently (06). |
| GEO-06 | The SVG renderer uses its own drawing geometry. The engine outputs positions in **fret/string units** (09), and uses millimetres only to compute costs and timing. |

### 2. Default instrument dimensions

| Parameter | Default | Notes |
|---|---|---|
| Scale length | **648 mm** (25.5") | Fender-style. Gibson-style is ≈ 628 mm (24.75"); classical ≈ 650 mm. Selectable. |
| Nut width | 43 mm | Electric nut widths are typically ~41.3–44.5 mm; classical ~48–52 mm. |
| String spread at nut (string 1 ↔ 6) | 35 mm | ≈ 7 mm per gap (CALIBRATE) |
| String spread at bridge (string 1 ↔ 6) | 52.5 mm | ≈ 10.5 mm per gap; e.g. one Fender bridge uses 10.26 mm |
| Number of frets | 22 | 24 selectable |

### 3. Reference numbers (L = 648 mm, computed with GEO-01..03, k = 0.3)

Fret positions:

| Fret | Distance from nut (mm) | Fret width (mm) |
|---|---|---|
| 1 | 36.4 | 36.4 |
| 3 | 103.1 | 32.4 |
| 5 | 162.5 | 28.9 |
| 7 | 215.5 | 25.7 |
| 9 | 262.7 | 22.9 |
| 12 | 324.0 | 19.3 |
| 15 | 375.5 | 16.2 |
| 17 | 405.3 | 14.4 |
| 19 | 431.8 | 12.9 |
| 22 | 466.2 | 10.8 |
| 24 | 486.0 | 9.6 |

Index-to-pinky fingertip span (index at fret `p`):

| Index at fret | 4-fret span (p…p+3) | 5-fret span (p…p+4) | 6-fret span (p…p+5) |
|---|---|---|---|
| 1 | 99.0 mm | 128.4 mm | 156.2 mm |
| 3 | 88.2 mm | 114.4 mm | — |
| 5 | 78.6 mm | 101.9 mm | 123.9 mm |
| 7 | 70.0 mm | 90.8 mm | — |
| 9 | 62.4 mm | 80.9 mm | 98.4 mm |
| 12 | 52.5 mm | 68.0 mm | 82.7 mm |

These numbers feed the span limits in Part 05 (LH-04). With the default hard
limit of 120 mm, a 5-fret stretch is allowed from fret 3 upward but not at fret 1, which matches
normal playing experience. A behavioural study of professional guitarists (Heijink &
Meulenbroek 2002) used exactly "4-fret = small span" vs "5-fret = large span" as a complexity
factor, which is why these two columns are the main calibration anchors.


---

## Part 05 — Left-hand model (Guitar)

Status: DRAFT

Rules are **HARD** (a candidate that breaks them is discarded) or **SOFT** (adds cost, see 06).
All numbers are config keys under `leftHand.*` (10).

### 1. Fingers and positions

| ID | Type | Rule |
|---|---|---|
| LH-01 | HARD | Fretting fingers are `1 2 3 4`. Thumb `T` only when `leftHand.allowThumb` (P-012, off). |
| LH-02 | HARD | Every fretted note is pressed by exactly one finger. Open strings (and capo-open) use no finger. |
| LH-03 | HARD | **One finger, one fret.** A finger may press several strings only at the **same fret** (barre / partial barre, LH-10). |
| LH-04 | HARD + SOFT | **Span limits**, measured with fingertip positions (GEO-03), per finger pair. Above `comfort` ⇒ soft cost growing quadratically; above `max` ⇒ discard. Defaults (mm, CALIBRATE): see table below. |
| LH-05 | HARD | **Finger order along the neck**: if fret(a) < fret(b) then finger(a) < finger(b) (index nearest the nut). Equal frets may use any fingers (e.g. A-major shape 2-2-2 with fingers 1-2-3). |
| LH-06 | SOFT | **Finger crossing across strings at the same or adjacent fret**: a higher-numbered finger on a lower (bass-side) string when a lower-numbered finger is on a higher string, at adjacent frets, costs `crossing`. (Natural shapes lean diagonally; reverse diagonals are awkward.) |
| LH-07 | — | **Hand position** `handPos` = fret under the index finger. Under one-finger-per-fret, a note at fret `f` played by finger `h` implies `handPos = f − (h − 1)`. Stretches let `handPos` deviate; it is recomputed from the actual index-finger fret when the index is used, otherwise inferred from the lowest-numbered finger in use. |
| LH-08 | SOFT | **Finger difficulty** (pinky weakest). Cost `−ln(pFinger)` with defaults `p1=0.35, p2=0.30, p3=0.25, p4=0.10` (values from Hori & Sagayama 2016). |
| LH-09 | SOFT | **High positions**: small cost per fret above `leftHand.preferredMaxFret` (default 12) — style dependent; a "lead" preset lowers it. |

Default pairwise span limits (fingertip distance along the neck, mm):

| Pair | comfort | max |
|---|---|---|
| 1–2 | 40 | 65 |
| 2–3 | 30 | 45 |
| 3–4 | 30 | 45 |
| 1–3 | 65 | 95 |
| 2–4 | 60 | 85 |
| 1–4 | 90 | 120 |

(Beginner preset: 1–4 max 100. Advanced preset: 1–4 max 130.)

### 2. Barre and partial barre

| ID | Type | Rule |
|---|---|---|
| LH-10 | HARD | A **barre** is finger 1 lying across strings `from..to` (contiguous, ≥ 2 strings) at one fret; it frets every covered string where no higher finger presses a higher fret. A **mini-barre** (2–3 strings) may also use finger 3 (e.g. A-shape) or finger 2. |
| LH-11 | HARD | A barre cannot sound a note **lower** on a covered string than the barre fret; any covered string that should ring open makes the barre invalid (unless the barre stops before that string). |
| LH-12 | SOFT | Barre cost = `barreBase` + `barrePerString × strings` + extra for barre at frets 1–3 (harder). Prefer a barre over using 4 separate fingers only when it frees fingers needed for the shape. |

### 3. Open strings and same string

| ID | Type | Rule |
|---|---|---|
| LH-13 | SOFT | Open strings cost nothing for the left hand and create a **free shift window** (the hand may move while an open string sounds). Style weight `openStringBonus` may be negative (beginner prefers open strings) or positive (some lead styles avoid them). |
| LH-14 | HARD | **Same-string blocking**: on one string only the highest pressed fret sounds. A finger held at a higher fret on a string blocks any lower note on that string; it must lift first (pull-off). A finger held at a **lower** fret on the same string while a higher finger plays is allowed and normal (legato, trills). |
| LH-15 | HARD | Two simultaneous notes cannot use the same string. If a chord needs more strings than exist, or two notes are only playable on the same string, keep the best subset and warn `UNPLAYABLE_CHORD` for the dropped note(s). |

### 4. Techniques

| ID | Type | Rule |
|---|---|---|
| LH-20 | HARD | **Hammer-on / pull-off** notes are on the **same string** as the previous note of the link. |
| LH-21 | SOFT | Hammer-on: the target is usually a **higher-numbered finger** while the lower finger stays pressed. Pull-off: the lower finger is **already pressed** before the pull (prepared). |
| LH-22 | HARD | **Legato slide** (`slide` link): same string **and same finger**; the finger travels along the string. |
| LH-23 | SOFT | **Bends** prefer fingers 3 (supported by 2 and 1 behind it on the same string) or 2; bending with finger 1 or 4 costs `bendWeakFinger`. |
| LH-24 | SOFT | **Tapping** notes (`tap`) are right-hand notes: no left-hand finger is assigned; the left hand keeps its position. |
| LH-25 | — | Natural harmonics: finger touches above the fret wire (x = d(n), not behind it) and lifts right after the pluck. |

### 5. Persistence (what real players do between notes)

| ID | Type | Rule |
|---|---|---|
| LH-30 | SOFT | **Keep fingers down** that will be needed again soon (chord shapes, pedal notes). Lifting and re-placing the same finger on the same spot within `persistWindow` costs `relift`. |
| LH-31 | SOFT | **Sustained notes**: a note still sounding (its duration covers the next onset) should keep its finger. Cutting it early to free the finger costs `sustainCut × cutFraction`. This keeps legato and let-ring passages realistic, while allowing the cut when a player really would. |
| LH-32 | SOFT | **Same finger to a different spot** when the time gap is short costs `sameFingerJump` scaled by `1/Δt` (it has to lift, travel and land). Same finger rolling to an adjacent string at the **same fret** is cheap (`roll`). |


---

## Part 06 — Cost model and solver

Status: DRAFT

The fingering problem is solved as a **shortest path over time**: at every onset there are
several ways to play the notes; each way has a difficulty (static cost) and moving from one
way to the next has a difficulty (transition cost). The engine finds the sequence with the
lowest total over the whole phrase. This is the classic approach in fingering research
(Sayegh 1989 "optimum path"; Radisavljevic & Driessen 2004 dynamic programming with static
+ transition costs; Hori & Sagayama 2016 HMM/Viterbi).

---

### 1. Stages

| ID | Rule |
|---|---|
| SV-01 | A **stage** is one onset moment. All notes starting together form one stage (a chord or a single note). |
| SV-02 | Onset grouping: MusicXML ⇒ same tick. MIDI ⇒ onsets within `solver.onsetToleranceSec` (default 0.015 s) of the first onset in the group. |
| SV-03 | For each stage record `dt` = time since the previous stage onset, and `freeTime` = time the hand is actually free to move: from the latest moment the previous fretted notes may be released (their end, or the next onset if they are cut) to this onset. If the previous stage was only open strings, `freeTime` extends back to the last fretted stage (LH-13 free shift window). |
| SV-04 | Segmentation (performance only): split into independent segments where nothing sounds for ≥ `solver.segmentGapSec` (default 2.0 s). The first stage of a segment has no transition cost. |

### 2. States and candidates

| ID | Rule |
|---|---|
| SV-10 | A **state** is the full hand configuration after the stage's onsets: placements of all notes starting now **plus** the sustained notes the hand keeps holding (`HandConfig`, 02). |
| SV-11 | **Onset candidates**: for each onset note, every `(string, fret)` with `tuning[string] + fret = pitch`, `capo ≤ fret ≤ numFrets` — filtered by `lockedString`/`lockedFret`. For each position, every finger allowed by LH-01 (open ⇒ no finger), filtered by `lockedFinger`. For a chord, the cartesian product filtered by the HARD rules (LH-03/04/05/10/11/14/15). |
| SV-12 | **Expansion**: a state at stage k is built from a surviving state at k−1 plus one onset candidate. Sustained notes of the predecessor are kept if compatible (no string/finger conflict, span still legal); otherwise they are **cut** (LH-31 cost). Identical resulting configurations are merged, keeping the cheaper path (Viterbi merge). |
| SV-13 | **Beam**: after each stage keep the best `solver.beamWidth` states (default 256) by accumulated cost. Also discard onset candidates with static cost above `solver.maxStaticCost`. |
| SV-14 | **Infeasible stage**: if no candidate survives, relax in this order and record the warning: (a) span `max` → `max × 1.15` (`STRETCH_RELAXED`), (b) allow cutting all sustained notes, (c) drop the highest-cost note of a chord (`UNPLAYABLE_CHORD`). Locked tab is never changed (P-001) — only limits are relaxed (`TAB_INFEASIBLE`). |

### 3. Static cost `Cs(state)` (weights `w.*` in config)

`Cs = Σ w_f × feature_f`

| Feature | Definition | Source rule |
|---|---|---|
| `span` | Σ over finger pairs of `max(0, dist − comfort)²` (mm²/100) | LH-04 |
| `fingerDifficulty` | Σ over used fingers of `−ln(pFinger)` | LH-08 |
| `crossing` | count of crossed finger pairs | LH-06 |
| `barre` | `barreBase + barrePerString × n` (+ low-fret extra) | LH-12 |
| `openStrings` | count of open strings (weight may be negative) | LH-13 |
| `highFret` | Σ `max(0, fret − preferredMaxFret)` | LH-09 |
| `bendFinger` | 1 if a bend uses finger 1 or 4 | LH-23 |
| `techniqueFinger` | 1 if a hammer-on target finger ≤ the held finger (should be higher) | LH-21 |

### 4. Transition cost `Ct(prev, next)`

`Ct = Σ w_f × feature_f`, then the **hardest-move emphasis** `Ct' = Ct^p` with `p = solver.hardMoveExponent` (default 1.3, CALIBRATE). `p > 1` makes the solver avoid a single very hard move even if the total gets slightly higher. (Hori & Sagayama showed that minimizing the *worst* move gives more natural fingerings than minimizing only the sum, and suggested blending the two with an Lp norm; this exponent is a cheap way to do that inside ordinary dynamic programming.)

| Feature | Definition | Source rule |
|---|---|---|
| `shift` | `(|ΔhandX| / shiftRefMm) / max(freeTime, minFreeTime)` where `ΔhandX` is the index-finger x movement in mm (GEO-03), `shiftRefMm` default 25 | SV-03, Hori's Laplace term uses the onset interval as the scale |
| `shiftCount` | 1 if the hand position changes by more than half a fret | — |
| `guideFinger` | negative (bonus) if a finger stays on the same string during the shift (guide finger) | MP-04 |
| `stringChange` | `ln(1 + |Δstring|)` between consecutive melody notes | Hori & Sagayama |
| `sameFingerJump` | 1 / max(dt, minFreeTime) when a finger must leave a spot for a different spot | LH-32 |
| `roll` | 1 when a finger rolls to an adjacent string at the same fret | LH-32 |
| `relift` | 1 when a finger lifts and returns to the same spot within `persistWindow` | LH-30 |
| `sustainCut` | Σ fraction of each cut note's remaining duration | LH-31 |
| `legatoViolation` | ∞ (discard) if a hammer/pull/slide link is not on the same string / same finger as required | LH-20/22 |

### 5. Solver

| ID | Rule |
|---|---|
| SV-20 | **Forward pass**: beam-limited Viterbi over stages with SV-12 expansion; total = Σ Cs + Σ Ct'. |
| SV-21 | **Backward pass** (same beam) to get, for every surviving state, the best cost of the rest of the phrase. `bestThrough(state) = forward + backward`. |
| SV-22 | The chosen path = argmin of the final stage, traced back. |
| SV-23 | **Confidence** per stage = `1 − exp(−margin / solver.confidenceScale)`, `margin` = `bestThrough(runner-up state) − bestThrough(chosen state)`. |
| SV-24 | **Reasons** per note: the 1–3 features with the largest cost advantage of the chosen state over the runner-up, mapped to reason codes (below). Locked notes get `TAB_LOCKED` / `FINGER_LOCKED`. |
| SV-25 | Keep each state's `features` vector in the debug output; it enables future **weight learning** from files that already contain human tab (Radisavljevic & Driessen's "path difference learning" learns weights from published tablature). MusicNote's own Notes Store files with tab could become that training set (roadmap, Phase 5). |

### 6. Reason codes

`TAB_LOCKED`, `FINGER_LOCKED`, `STAY_IN_POSITION`, `OPEN_STRING`, `SHIFT_WITH_TIME`, `SHIFT_RUSHED`,
`GUIDE_FINGER`, `AVOID_PINKY`, `AVOID_STRETCH`, `BARRE`, `MINI_BARRE`, `KEEP_SUSTAIN`, `CUT_SUSTAIN`,
`LEGATO_SAME_STRING`, `SLIDE_SAME_FINGER`, `BEND_STRONG_FINGER`, `FEWER_STRING_CHANGES`, `FALLBACK_RELAXED`.


---

## Part 07 — Right hand (Guitar)

Status: DRAFT

The right hand runs **after** the left-hand solver, because it needs to know which string
each note is on. Output: `rightHand.events` in the timeline (09). Displayed in the video (D-004).

### 1. Mode selection

| ID | Rule |
|---|---|
| RH-01 | Modes: `pick`, `fingerstyle`, (`hybrid` later). Config `rightHand.mode`: `auto` (default, P-009) or a fixed mode chosen in the UI. |
| RH-02 | `auto` decides per part: any `<pluck>` in the file ⇒ `fingerstyle`; any `<down-bow>/<up-bow>` ⇒ `pick`; GM program 24 (nylon, 0-based) or part name containing "classical"/"nylon" ⇒ `fingerstyle`; independent bass voice + melody voice sounding together in > 30 % of stages ⇒ `fingerstyle`; otherwise ⇒ `pick`. Record the reason in debug. |

### 2. Pick mode (`RH-P*`)

| ID | Rule |
|---|---|
| RH-P01 | **Grid-based alternate picking** (default). Find the local subdivision grid per beat (the smallest regular note value used in that beat: 8ths, 16ths, triplets…). Grid slot index even ⇒ **down**, odd ⇒ **up**. The hand keeps moving on rests ("ghost strokes"), so a note after a rest still gets the direction of its slot. |
| RH-P02 | **Economy / sweep** (preset option): when the next note is on the adjacent string in the direction the pick is already travelling (down-stroke to a higher-pitched string, up-stroke to a lower one), keep the same direction instead of alternating. |
| RH-P03 | **Legato notes are not picked**: hammer-on and pull-off targets, legato-slide targets and tie continuations produce no pick event. Tapped notes produce a `tap` event instead. |
| RH-P04 | **Explicit marks win**: `lockedPickDir` from `<down-bow>/<up-bow>` overrides RH-P01/P02. |
| RH-P05 | **Chords = strums**. Direction follows the strum grid (RH-P01 at the strum subdivision): down on the beat, up on the off-beat. A down-strum hits strings low → high, an up-strum high → low, often only the top 3–4 strings on up-strums (`strum.upStrumMaxStrings`, default 4). |
| RH-P06 | **Strum spread**: strings are hit one after another over `strum.spreadSec` (default 0.020 s for a normal strum, CALIBRATE). If the source gives an arpeggio/brush duration, use it. The first string is hit at the notated onset. |
| RH-P07 | **Palm mute** (`palmMute`): event flag `muted = true` for the renderer. |

### 3. Fingerstyle mode (`RH-F*`)

| ID | Rule |
|---|---|
| RH-F01 | Home assignment: `p` for strings 1–3 (the three bass strings), `i` string 4, `m` string 5, `a` string 6 (engine numbering, 1 = lowest). This is the default "home position" only; RH-F02..F05 may move fingers. |
| RH-F02 | **Bass voice with `p`**: notes of the lowest voice (or the lowest note of each chord) use `p` even on string 4 when needed. |
| RH-F03 | **No repeated finger on consecutive melody notes** (except `p`): alternate `i-m` (or `m-a`) on repeated notes and scale runs. |
| RH-F04 | **Chords**: assign fingers in string order — `p` lowest, then `i`, `m`, `a` upward; never cross (a finger on a lower string than a finger with a lower name). Max 4 simultaneous plucks; with 5–6 notes, `p` sweeps two adjacent bass strings or the chord becomes a strum (`p` or `i` brush). |
| RH-F05 | **Explicit `<pluck>` wins** over all rules. |
| RH-F06 | Implemented as a small cost-based DP over the fingerstyle events (costs: distance from home string, repeated finger, crossing), same generic solver from `core/`. |

### 4. Right-hand event

```ts
interface RightHandEvent {
  time: number;                      // seconds (first string for strums)
  noteIds: string[];
  strings: StringIndex[];            // in the order they are hit
  kind: 'pick' | 'strum' | 'pluck' | 'tap';
  direction?: 'down' | 'up';         // pick / strum
  fingers?: RHFinger[];              // fingerstyle: one per string in `strings`
  stringTimes?: number[];            // strums: per-string hit time (RH-P06)
  muted?: boolean;
  reason?: string;                   // e.g. 'GRID_DOWN', 'ECONOMY', 'LOCKED', 'HOME_STRING'
}
```


---

## Part 08 — Motion planner (Guitar)

Status: DRAFT

Turns the solved fingering (one `HandConfig` per stage) into **continuous finger movement**:
keyframes for each left-hand finger, the hand position, and barres. This is what makes the
dots look like a real hand instead of dots jumping from note to note (D-003).

### 1. Internal states (engine-only, D-003)

| State | Meaning | Visible effect in the video |
|---|---|---|
| `pressed` | finger presses a string and the note sounds | dot shown at the note position |
| `held` | finger still presses after the note ended (P-008 realistic) or presses a sustained note | dot stays in place |
| `approaching` | finger travelling to its next target | dot moves toward the target |
| `lifted` | finger not in use | dot hidden |

The keyframes carry `pressed: boolean` and `visible: boolean`; the renderer may ignore the
state name (one dot style, D-003).

### 2. Timing rules

| ID | Rule |
|---|---|
| MP-01 | **Arrive before the sound**: a fretting finger reaches its target at `onset − lead`, `lead = clamp(freeTime × leadFraction, minLead, maxLead)`; defaults `leadFraction 0.4`, `minLead 0.020 s`, `maxLead 0.120 s` (CALIBRATE). Research on professional guitarists shows the left hand is placed ahead of the right-hand pluck and that players use the available timing tolerance; exact values are to be tuned by eye. |
| MP-02 | **Travel time** for a move of distance `D` mm (Fitts-style): `T = a + b × log2(1 + D / W)`; defaults `a 0.040 s`, `b 0.030 s/bit`, `W 10 mm` (CALIBRATE). If `T` does not fit in `freeTime − minLead`, compress to fit and flag `SHIFT_RUSHED`. |
| MP-03 | **Departure**: a finger leaves its old spot at the latest of (its note's release, the moment it is no longer needed) and early enough to satisfy MP-01/02. |
| MP-04 | **Hand shift**: when `handPos` changes, all fingers that are down or hovering move together by the same Δ (the whole hand moves). The shift starts after the last note that must be held is released and ends `minLead` before the next onset. A finger that stays on the same string during the shift is a **guide finger**: its dot slides along the string with `pressed = false` (light contact) instead of disappearing. |
| MP-05 | **Hold policy** (P-008): `realistic` ⇒ after a note ends the finger stays `held` until needed elsewhere, or until the hand shifts, or `idleLiftSec` (default 0.6 s) passes with no need. `noteDuration` ⇒ lift at note end. |
| MP-06 | **Hover**: a finger that is not pressing but belongs to the active hand is conceptually hovering near `handPos + (finger − 1)` frets over its last string. Hover positions are used as start points for `approaching`; hovering dots are `visible = false`. |

### 3. Techniques

| ID | Rule |
|---|---|
| MP-10 | **Legato slide**: the finger stays `pressed` and moves along the string from the start fret to the target fret during `min(noteDuration, slideMaxSec)` ending exactly at the target onset. Easing `easeInOut`. |
| MP-11 | **Hammer-on**: the hammering finger lands **exactly at the target onset** (the landing makes the sound), not before. The lower finger stays `pressed`. |
| MP-12 | **Pull-off**: the lower (target) finger must be `pressed` before the pull (prepared, MP-01 timing); the pulling finger lifts **exactly at the target onset**. |
| MP-13 | **Bend**: the dot moves across the string direction by `bendOffset(semitones)` (output as semitones; the renderer converts to pixels). Timing from `<bend>` or the MIDI pitch-bend curve; default bend rise 0.15 s. Supporting fingers behind on the same string move with it. |
| MP-14 | **Barre**: emitted as a separate object `{finger, fret, fromString, toString, start, end}`; the barre finger's own keyframes still exist (its dot is placed on the lowest covered string) so the renderer can draw either a bar or a dot. |
| MP-15 | **Harmonic**: touch point on the fret wire (LH-25); release `0.05 s` after the pluck. |
| MP-16 | **Vibrato**: later phase; small periodic offset keyframes. |

### 4. Humanization

| ID | Rule |
|---|---|
| MP-20 | Seeded PRNG (`core/rng.ts`); seed stored in the output (`engine.seed`). Same seed ⇒ same result. |
| MP-21 | Arrival-time jitter ±`humanize.timeJitterSec` (default 0.008 s), never later than `onset − 0.005 s`. |
| MP-22 | Position jitter ±`humanize.posJitterFret` (default 0.05 of a fret width) along the neck; none across strings. |
| MP-23 | `humanize.enabled = false` produces perfectly regular motion (useful for tests and for teaching videos). |

### 5. Keyframe generation algorithm (summary for the implementer)

1. For each finger build a list of **jobs**: `(noteId, string, fret, pressStart, pressEnd, technique)` from the solved path.
2. Between consecutive jobs of the same finger insert `depart` → `approaching` → `arrive` keyframes using MP-01..03.
3. Apply hand-shift grouping (MP-04) so fingers moving because of a shift share start/end times.
4. Apply hold policy (MP-05) and technique overrides (MP-10..15).
5. Add `visible=false` keyframes where a finger becomes `lifted`.
6. Apply humanization (MP-20..22) last.
7. Validate (V-* in 11) before serializing.


---

## Part 09 — Output: `FingerTimeline` (contract with the SVG renderer)

Status: DRAFT — schema `finger-timeline@1.0.0`

This JSON is the **only** interface between the engine and the video/SVG layer. Any change
that breaks readers requires a new major schema version (README rule 5).

### 1. Shape

```ts
interface FingerTimeline {
  schema: 'finger-timeline';
  schemaVersion: '1.0.0';
  engine: { name: 'guitar-finger-engine'; version: string; presetId: string; seed: number; configHash: string };
  instrument: {
    kind: 'guitar';
    numStrings: number;
    stringOrder: 'lowToHigh';          // string 1 = lowest pitch (DM-01)
    tuning: number[];                  // MIDI, index 0 = string 1
    capo: number;
    numFrets: number;
  };
  duration: number;                    // seconds, last note end

  notes: TimelineNote[];               // one per played note
  leftHand: {
    hand: HandKeyframe[];              // index-finger fret position over time
    fingers: Record<'1'|'2'|'3'|'4'|'T', FingerKeyframe[]>;
    barres: Barre[];
  };
  rightHand: { mode: 'pick' | 'fingerstyle'; events: RightHandEvent[] };   // see 07
  warnings: EngineWarning[];
  debug?: DebugInfo;                   // only when config.debug = true
}

interface TimelineNote {
  noteId: string;
  time: number; duration: number;      // seconds
  pitch: number;
  string: number; fret: number;
  finger: '1'|'2'|'3'|'4'|'T'|null;    // null = open / capo-open
  techniques: string[];
  locked: { string: boolean; fret: boolean; finger: boolean };
  reasons: string[];                   // SV-24 codes
  confidence: number;                  // 0..1 (SV-23)
}

interface FingerKeyframe {
  t: number;                           // seconds
  string: number;                      // float allowed while moving across strings
  fret: number;                        // float: fret index + position inside the fret space
  pressed: boolean;                    // touching the string with pressure
  visible: boolean;                    // false = lifted / hovering (dot hidden)
  bend?: number;                       // semitones (MP-13)
  ease?: 'linear' | 'easeInOut' | 'step';   // how to go from THIS keyframe to the next
  noteId?: string;                     // the note this keyframe serves, if any
}

interface HandKeyframe { t: number; fret: number; ease?: 'linear' | 'easeInOut' }

interface Barre { finger: '1'|'2'|'3'|'4'; fret: number; fromString: number; toString: number; start: number; end: number }

interface EngineWarning { code: string; time?: number; noteIds?: string[]; message: string }
```

### 2. Keyframe semantics (renderer must follow)

| ID | Rule |
|---|---|
| OUT-01 | Keyframes per finger are sorted by `t`, strictly increasing. |
| OUT-02 | Between keyframe A (t₀) and B (t₁): if `A.ease` is `step` the value stays A until t₁; otherwise interpolate `string`, `fret` and `bend` from A to B with that easing. `pressed`/`visible` switch at B.t. |
| OUT-03 | Before the first keyframe and after the last, the finger is not visible. |
| OUT-04 | **Fret coordinate**: `fret = n − k` where `k` is the fingertip offset inside the fret space (GEO-03). Example: a note at fret 5 with k = 0.3 ⇒ `fret = 4.7`. Open string ⇒ no finger keyframe (the renderer may highlight the string using `notes`). The renderer maps fret coordinates to its own pixel geometry (GEO-06). |
| OUT-05 | `string` is 1..N, 1 = lowest-pitched string. The renderer decides whether string 1 is drawn at the top or bottom of the screen. |
| OUT-06 | All times are seconds from content start (P-011). The Video Engine adds count-in pre-roll. |
| OUT-07 | Colors are **not** in the timeline (D-002). The renderer maps finger IDs to the user's color settings. |

### 3. Minimal example

Two eighth notes at 60 BPM: E3 on string 3 (D string) fret 2 with finger 2, then open G (string 4).

```json
{
  "schema": "finger-timeline", "schemaVersion": "1.0.0",
  "engine": { "name": "guitar-finger-engine", "version": "0.1.0", "presetId": "default", "seed": 1, "configHash": "…" },
  "instrument": { "kind": "guitar", "numStrings": 6, "stringOrder": "lowToHigh",
                  "tuning": [40,45,50,55,59,64], "capo": 0, "numFrets": 22 },
  "duration": 1.0,
  "notes": [
    { "noteId": "t1-n0", "time": 0.0, "duration": 0.5, "pitch": 52, "string": 3, "fret": 2,
      "finger": "2", "techniques": ["normal"], "locked": {"string": false, "fret": false, "finger": false},
      "reasons": ["STAY_IN_POSITION"], "confidence": 0.82 },
    { "noteId": "t1-n1", "time": 0.5, "duration": 0.5, "pitch": 55, "string": 4, "fret": 0,
      "finger": null, "techniques": ["normal"], "locked": {"string": false, "fret": false, "finger": false},
      "reasons": ["OPEN_STRING"], "confidence": 0.9 }
  ],
  "leftHand": {
    "hand": [ { "t": 0.0, "fret": 1 } ],
    "fingers": {
      "1": [], "3": [], "4": [], "T": [],
      "2": [
        { "t": -0.06, "string": 3, "fret": 1.7, "pressed": false, "visible": true, "ease": "easeInOut" },
        { "t": -0.02, "string": 3, "fret": 1.7, "pressed": true,  "visible": true, "ease": "step", "noteId": "t1-n0" },
        { "t": 0.5,   "string": 3, "fret": 1.7, "pressed": true,  "visible": true, "ease": "step" },
        { "t": 1.1,   "string": 3, "fret": 1.7, "pressed": false, "visible": false }
      ]
    },
    "barres": []
  },
  "rightHand": { "mode": "pick", "events": [
    { "time": 0.0, "noteIds": ["t1-n0"], "strings": [3], "kind": "pick", "direction": "down", "reason": "GRID_DOWN" },
    { "time": 0.5, "noteIds": ["t1-n1"], "strings": [4], "kind": "pick", "direction": "up",   "reason": "GRID_UP" }
  ]},
  "warnings": []
}
```

(Negative `t` is allowed for the approach before the very first note; the Video Engine's
count-in pre-roll covers it. In the example the finger is `held` after its note ends, P-008,
and lifts after the idle timeout.)


---

## Part 10 — Config and presets

Status: DRAFT

All numbers used by the engine live in **one config object**; defaults in `defaults.ts`.
A preset is a partial config merged over the defaults; the UI/user config is merged last.
`configHash` (hash of the final merged config) is written into the output for reproducibility.
Every value below is **CALIBRATE** unless marked otherwise.

### 1. Config keys and defaults

```ts
const DEFAULTS = {
  input: {
    tabPolicy: 'respect',            // P-001  ('respect' | 'suggest' later)
    respectFingering: true,          // P-002
    outOfRange: 'skip',              // P-013
    graceDurationSec: 0.06,          // IN-X23
    pitchBendRangeSemitones: 2,      // IN-M05
  },
  instrument: {                      // P-004 / P-005 / 04
    numStrings: 6, tuning: [40, 45, 50, 55, 59, 64], capo: 0,
    numFrets: 22, scaleLengthMm: 648, nutSpacingMm: 35, bridgeSpacingMm: 52.5,
  },
  geometry: { fingertipBehindFret: 0.3 },                         // GEO-03
  leftHand: {
    allowThumb: false,                                           // P-012
    spanMm: {                                                     // LH-04
      '1-2': { comfort: 40, max: 65 },  '2-3': { comfort: 30, max: 45 },
      '3-4': { comfort: 30, max: 45 },  '1-3': { comfort: 65, max: 95 },
      '2-4': { comfort: 60, max: 85 },  '1-4': { comfort: 90, max: 120 },
    },
    fingerProb: { 1: 0.35, 2: 0.30, 3: 0.25, 4: 0.10 },           // LH-08 (Hori & Sagayama)
    preferredMaxFret: 12,                                         // LH-09
    persistWindowSec: 1.0,                                        // LH-30
  },
  solver: {
    onsetToleranceSec: 0.015,        // SV-02
    segmentGapSec: 2.0,              // SV-04
    beamWidth: 256,                  // SV-13
    maxStaticCost: 50,               // SV-13
    hardMoveExponent: 1.3,           // SV §4
    shiftRefMm: 25, minFreeTimeSec: 0.05,
    confidenceScale: 2.0,            // SV-23
    relaxSpanFactor: 1.15,           // SV-14
  },
  weights: {
    // static (06 §3)
    span: 1.0, fingerDifficulty: 1.0, crossing: 2.0, barreBase: 1.5, barrePerString: 0.2,
    barreLowFretExtra: 1.0, openStrings: -0.3, highFret: 0.1, bendFinger: 2.0, techniqueFinger: 1.5,
    // transition (06 §4)
    shift: 1.0, shiftCount: 1.0, guideFinger: -0.5, stringChange: 0.5, sameFingerJump: 0.5,
    roll: 0.2, relift: 0.8, sustainCut: 2.0,
  },
  rightHand: {
    mode: 'auto',                    // P-009
    pickStyle: 'alternate',          // 'alternate' | 'economy'  (RH-P01/P02)
    strum: { spreadSec: 0.020, upStrumMaxStrings: 4 },            // RH-P05/P06
  },
  motion: {
    holdPolicy: 'realistic',         // P-008
    idleLiftSec: 0.6,                // MP-05
    leadFraction: 0.4, minLeadSec: 0.020, maxLeadSec: 0.120,      // MP-01
    fitts: { aSec: 0.040, bSecPerBit: 0.030, targetWidthMm: 10 }, // MP-02
    slideMaxSec: 0.15, bendRiseSec: 0.15, harmonicReleaseSec: 0.05,
  },
  humanize: { enabled: true, timeJitterSec: 0.008, posJitterFret: 0.05 },  // MP-20..23
  debug: false,
};
```

### 2. Presets

| Preset ID | Phase | Changes vs default | Intended use |
|---|---|---|---|
| `default` | 1 | — | General pop/rock with pick |
| `beginner` | 1 | `1-4.max 100`, `openStrings −1.0`, `preferredMaxFret 5`, `fingerProb.4 0.05`, `shift 1.5` | Teaching videos: open position, fewer stretches |
| `rock-lead` | 4 | `openStrings +0.3`, `preferredMaxFret 17`, `pickStyle 'economy'`, `stringChange 0.3` | Solos in boxes higher on the neck |
| `classical` | 4 | `rightHand.mode 'fingerstyle'`, `sustainCut 4.0`, `relift 1.2`, `humanize.enabled true` | Nylon-string classical |
| `fingerstyle-acoustic` | 4 | `rightHand.mode 'fingerstyle'`, `openStrings −0.6` | Acoustic fingerpicking |

### 3. Adding a preset (for future updates)

1. Add an entry in `guitar/presets.ts` with only the changed keys.
2. Add a fixture test showing the intended difference.
3. Add a row to the table above and a the Changelog (end of this file) entry.


---

## Part 11 — Validation, testing and debug

Status: DRAFT

### 1. Output validator (runs on every result, `guitar/validate-guitar.ts`)

The validator is independent of the solver: it re-checks the final timeline. Any failure in a
test is a bug; in production it becomes a warning `VALIDATION_FAILED` with details.

| ID | Check |
|---|---|
| V-01 | Every `TimelineNote` satisfies `tuning[string] + fret == pitch` (unless `PITCH_TAB_MISMATCH` was reported for that note). |
| V-02 | No two simultaneous notes on the same string (LH-15). |
| V-03 | No finger presses two different frets at the same time; a finger on several strings only as a declared barre (LH-03, LH-10). |
| V-04 | Finger order along the neck (LH-05) at every moment. |
| V-05 | Pairwise spans ≤ `max` (or `max × relaxSpanFactor` where `STRETCH_RELAXED`/`TAB_INFEASIBLE` was reported) (LH-04). |
| V-06 | Locked string/fret/finger values are unchanged in the output (P-001/P-002). |
| V-07 | A fretting finger is `pressed` at the fret/string of its note from `onset` to at least `onset + min(duration, 0.05 s)`, and arrives no later than the onset (MP-01) except hammer-on landings (MP-11, exactly at onset). |
| V-08 | Keyframes strictly increasing in time (OUT-01); no NaN/Infinity anywhere. |
| V-09 | Hammer/pull/slide links on the same string; slides with the same finger (LH-20/22). |
| V-10 | Every note has exactly one right-hand event unless it is a legato target / tie continuation (RH-P03). |
| V-11 | Determinism: same input + config + seed ⇒ identical JSON (tested, not checked at runtime). |

### 2. Fixtures (`__tests__/fixtures/`)

Each fixture = input file + expected assertions. Prefer **property assertions** ("stays in one
position", "no pinky") over exact snapshots where several human fingerings are acceptable.

| ID | Input | Phase | Expected |
|---|---|---|---|
| F-01 | C major scale C3→C4, MusicXML without tab | 1 | Open-position fingering: C3 = string 2 fret 3 finger 3; D3 open string 3; E3 s3 f2 finger 2; F3 s3 f3 finger 3; G3 open s4; A3 s4 f2 finger 2; B3 open s5; C4 s5 f1 finger 1 |
| F-02 | A minor pentatonic, 5th-fret box, tab-locked | 1 | Fingers: fret 5 → 1, fret 7 → 3, fret 8 → 4 (or 3 on strings 5–6 if configured); hand stays at position 5, zero shifts |
| F-03 | Same notes as F-02 **without** tab | 1 | Property: ≤ 1 hand shift in total; confidence reported; no span violations |
| F-04 | MusicXML tutorial hammer-on / pull-off bar (MusicXML string 3 = engine string 4) | 3 | Same string throughout; hammer target finger lands exactly at onset; fret 5 → finger 1, 7 → finger 3, 8 → finger 4 |
| F-05 | Repeated note, 16th notes | 1 | Picks D U D U …; after a 16th rest the next note keeps the grid direction |
| F-06 | Open chords C, G, D, Am, E (tab-locked) | 2 | C x32010 → fingers 3,2,1; D xx0232 → 1,3,2; Am x02210 → 2,3,1; E 022100 → 2,3,1; G either 2,1,3 or 3,2,4 accepted |
| F-07 | F major barre 133211 at fret 1 | 2 | Barre object finger 1 strings 1–6 fret 1; finger 3 on s2 f3; finger 4 on s3 f3; finger 2 on s4 f2 (engine numbering, 1 = low E) |
| F-08 | Strummed 8th-note chords with rests | 2 | Down on beats, up on off-beats; up-strums ≤ 4 strings; spread 20 ms |
| F-09 | Guitar part written an octave high with `<transpose><octave-change>-1` | 1 | Sounding pitches correct; F-01 fingering reproduced |
| F-10 | Capo 2, frets written relative to capo in one file and to the nut in another | 2 | Both resolve to the same physical frets; `CAPO_AMBIGUOUS` not raised |
| F-11 | Classical score with `<string>` but no `<fret>` (MuseScore export) | 2 | Notes stay on the indicated string; `STRING_ONLY_HINT` info |
| F-12 | Tab with a 7-fret stretch at fret 1 | 1 | Tab unchanged; `TAB_INFEASIBLE` warning; output still valid otherwise |
| F-13 | MIDI version of F-01 | 1 | Same fingering as F-01 |
| F-14 | Out-of-range note (below the low E) | 1 | Skipped, `OUT_OF_RANGE`, rest of the part unaffected |
| F-15 | Legato slide 5 → 7 on one string | 3 | Same finger; dot moves continuously; `pressed` throughout |
| F-16 | p-i-m-a arpeggio over an Am chord | 3 | p on strings 1–3 bass notes; i/m/a on 4/5/6; no finger crossing |
| F-17 | Determinism | 1 | Same seed ⇒ identical output; different seed ⇒ only jitter values differ |

Fixture sources: write small MusicXML files by hand (so tab/octave details are known) and
export the same content from MuseScore and Guitar Pro 8 to cover real-world encodings.

### 3. Acceptance criteria per phase

- All fixtures of the phase pass; validator reports zero errors on all fixtures.
- Performance target met (01 §5) on a long real song.
- Owner reviews a rendered video of fixtures F-01/F-02/F-05 and approves the movement feel.

### 4. Debug report (`config.debug = true`)

Like the drum engine's reason + confidence tag, every note shows: string, fret, finger, reasons
(SV-24), confidence (SV-23), cost features of the chosen state and of the runner-up. A text
report groups notes by measure so the owner can see *why* the engine chose each fingering.


---

## Part 12 — Roadmap (build order)

Status: DRAFT

Each phase ends with a demo video of its fixtures that the owner approves before the next
phase starts. The coding tool implements **only the current phase** (README rule 1).

### Phase 0 — Foundations — IMPLEMENTED
- **Read the Notation Engine's score types first** and fill in the "Notation Engine data model" row of Part 01 §6 (fields available, string numbering, time unit, note IDs). Report which guitar fields are missing (OQ-11).
- `core/`: types (02), `defaults.ts` (10), tuning, geometry (GEO-01..05), tempo map, seeded RNG, timeline schema constant (09).
- Validator skeleton (V-01, V-08) and test harness.
- Hand-written fixture files for F-01 and F-09.
- **Done when**: geometry numbers match the table in 04 §3; string-numbering conversions (IN-X03, IN-E04) unit-tested.

### Phase 1 — Single-note lines (melody, riffs, solos without techniques) — IMPLEMENTED
- Input: Notation Engine adapter (IN-E01..06), MusicXML technical data (IN-X01..04, 06, 10–13, 20, 22–25) and MIDI (IN-M01–05, 07); normalizer (IN-N*).
- Solver for single-note stages: SV-01..04, 10–14, 20–24 with static/transition features that apply to single notes.
- Motion planner: MP-01..06, MP-20..23.
- Right hand pick: RH-01 (fixed `pick` or `auto` falling back to pick), RH-P01, P03, P04.
- Timeline output (09) + debug report (11 §4).
- Fixtures: F-01, 02, 03, 05, 09, 12, 13, 14, 17.
- **Demo**: colored dots moving on the SVG fretboard for a melody, with pick arrows.

### Phase 2 — Chords
- Chord candidates, barre/mini-barre (LH-10..12), same-string rules (LH-14/15).
- Sustain and persistence (LH-30..32), hold policy (MP-05) with chords, barre objects (MP-14).
- Strumming (RH-P05, P06), tab/notation staff merge (IN-X21), capo resolution (IN-X14), string-only hints (IN-X05).
- Fixtures: F-06, 07, 08, 10, 11.

### Phase 3 — Techniques and fingerstyle
- Hammer-on, pull-off, slide, bend, harmonic, tap (LH-20..25, MP-10..15), grace notes (IN-X23).
- Fingerstyle p-i-m-a (RH-F01..06) and `auto` mode detection (RH-02).
- Fixtures: F-04, 15, 16.

### Phase 4 — Presets, polish, overrides
- Presets `rock-lead`, `classical`, `fingerstyle-acoustic`; economy picking (RH-P02); vibrato (MP-16).
- **Manual overrides**: the user clicks a note in the editor and sets string/fret/finger; the override becomes a lock and the engine re-solves around it.
- MIDI string-per-channel detection (IN-M06).
- Calibration pass: tune every CALIBRATE value against owner-approved videos.

### Phase 5 — Learned weights (optional, later)
- Use MusicXML files that already contain human tab (e.g. from the Notes Store) as training data; learn weights per style with path-difference learning (06, SV-25).


---

## Part 13 — Open questions for the owner

Status: OPEN — answers move into Part 00 as D-xxx

| ID | Question | Current default | Affects |
|---|---|---|---|
| OQ-01 | When a file has tab: respect it 100% (warn if impossible), or let the engine re-tab impossible passages? Should `<fingering>` in the file always win? | Respect 100% + warn; fingering wins (P-001/002/003) | IN-X04..06, SV-14 |
| OQ-02 | Should the Video Create UI let the user choose tuning (standard, drop D, etc.) and capo for MIDI files, which carry no tuning? | Yes, standard by default (P-004/005) | UI, IN-M03 |
| OQ-03 | WITHDRAWN (v0.2.0) — was about alphaTab; alphaTab is not used (D-011). Replaced by OQ-11. | — | — |
| OQ-04 | Finger dots after a note ends: stay down like a real player (`realistic`) or disappear at note end (`noteDuration`)? | `realistic` (P-008) | MP-05 |
| OQ-05 | Right-hand mode: auto-detect with a UI override, or always ask the user? | Auto + override (P-009) | RH-01/02 |
| OQ-06 | Repeats/voltas/D.S.: does the Notation Engine already produce the unrolled performance order and tempo map that the video uses? The finger engine will consume exactly that (IN-E01). | Yes — Notation Engine is the single timing source | IN-E01, IN-X26, 01 §6 |
| OQ-07 | Open strings have no finger dot. Should the video show something for them (string highlight, "0" marker at the nut)? This is renderer-side, but the timeline already provides the data (`notes` with `finger: null`). | Renderer decides | SVG layer |
| OQ-08 | Which style should the `default` preset aim at first — pop/rock with a pick, or acoustic fingerstyle? | Pop/rock with pick | 10 §2, Phase 1 |
| OQ-09 | Where should these plan files live? Suggested: `docs/finger-engine/` in the MusicNote repository, next to the code in `src/finger-engine/`. | `docs/finger-engine/` | Repo |
| OQ-10 | Guitar dimensions: one fixed guitar (648 mm, 22 frets) for all videos, or selectable per video (e.g. classical 650 mm / 19 frets, 24-fret electric, 7-string)? | Fixed default, selectable later | 04, UI |
| OQ-11 | Does your Notation Engine's score keep the guitar data from MusicXML — `<string>`, `<fret>`, `<fingering>`, `<pluck>`, hammer-on/pull-off, slide, bend, tuning, capo, transpose? Which string numbering does it use, and does every note have a stable ID? (If some fields are missing, the finger engine reads them from the MusicXML file itself — IN-E02.) | **Answered in Phase 0.** It keeps `<string>`, `<fret>`, `<fingering>` and slide (`slideStart`/`slideStop`, from `<slide>` and `<glissando>`). It does **not** keep `<pluck>`, hammer-on/pull-off, bend, `<staff-tuning>`, `<capo>` or `<transpose>` — those come from the MusicXML file (IN-E02). String numbering is MusicXML's, 1 = highest (IN-E04). Notes have no stable ID; the adapter derives one (DM-09). See 01 §6. | IN-E02..04, P-006, P-007 |
| OQ-12 | Should the finger engine's chosen string/fret be sent back to the Notation Engine so a TAB staff drawn on screen shows the same fingering as the dots? | Later integration; not in Phases 0–1 | Notation Engine |


---

## Part 14 — Research references

Status: DRAFT (collected 2026-09-25)

| # | Source | What the plan takes from it | Used in |
|---|---|---|---|
| R1 | W3C MusicXML 4.0 — `<technical>` element: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/technical/ | Full list of technical children (string, fret, fingering, pluck, hammer-on, pull-off, bend, tap, harmonic, up-bow/down-bow …) | 03 A2 |
| R2 | W3C MusicXML 4.0 — Tablature tutorial: https://www.w3.org/2021/06/musicxml40/tutorial/tablature/ | `<string>` 1 = highest string; frets start at 0; `<staff-details>`, `<staff-lines>`, `<staff-tuning line>` (line 1 = low E in the example); hammer-on/pull-off encoding | 03, F-04 |
| R3 | W3C MusicXML 4.0 — `<fingering>`: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/fingering/ | For fretted instruments `<fingering>` = fretting finger, `<pluck>` = plucking finger; `substitution`, `alternate` attributes | IN-X06/07 |
| R4 | W3C MusicXML 4.0 — `<capo>`: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/capo/ | Capo raises the open tuning by N semitones | IN-X11/14 |
| R5 | W3C MusicXML 4.0 — `<transpose>`: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/transpose/ | What to add to written pitch to get sounding pitch | IN-X12 |
| R6 | Bug report with a MuseScore-exported classical guitar file: https://github.com/CoderLine/alphaTab/issues/2822 | Real MuseScore exports contain `<string>` without `<fret>` on the notation staff (a circled string indication only). Used only as evidence of this file format case. | IN-X05, F-11 |
| R7 | Hori & Sagayama, "Minimax Viterbi algorithm for HMM-based guitar fingering decision", ISMIR 2016: https://archives.ismir.net/ismir2016/paper/000285.pdf | States (string, fret, finger); index-finger position `fret − finger + 1`; hand-move cost scaled by onset interval (Laplace); string-change term `1/(1+|Δs|)`; finger difficulty 0.35/0.30/0.25/0.10; minimizing the hardest move gives more natural fingerings; open-string MIDI numbers 64 59 55 50 45 40 | LH-07, LH-08, 06 §4 |
| R8 | Radisavljevic & Driessen, "Path Difference Learning for Guitar Fingering Problem", ICMC 2004: https://www.ece.uvic.ca/~peterd/papers/PDL_paperICMC2004_ver9.PDF | Stages at note changes; states as (string, fret, finger) rows; static + transition cost; feature-based linear weights; features used to reject impractical fingerings; weights learned from tablature | 06, SV-25, Phase 5 |
| R9 | Sayegh, "Fingering for String Instruments with the Optimum Path Paradigm", Computer Music Journal 13(3), 1989 (cited via R7/R8) | Fingering as an optimum-path (Viterbi) problem | 06 |
| R10 | Heijink & Meulenbroek, "On the Complexity of Classical Guitar Playing: Functional Adaptations to Task Constraints", J. Motor Behavior 34(4), 2002: https://www.tandfonline.com/doi/abs/10.1080/00222890209601952 | Players keep joints mid-range; 4-fret vs 5-fret span and hand repositioning as complexity factors; players use timing/placement tolerance of left-hand fingers | 04 §3, LH-04, MP-01 |
| R11 | Xu & Wang, "Synchronize Dual Hands for Physics-Based Dexterous Guitar Playing", SIGGRAPH Asia 2024: https://arxiv.org/html/2409.16629v2 | Left hand must fret before the right hand plucks; some techniques (harmonics) need the left hand to release right after the pluck | MP-01, MP-15 |
| R12 | Scale lengths (Fender Stratocaster 25.5" / 648 mm): https://en.wikipedia.org/wiki/Fender_Stratocaster ; Gibson 24.75" ≈ 628 mm: https://guitarkitworld.com/blogs/resources/guitar-scale | Default scale length | 04 §2 |
| R13 | Nut widths (electric ~41.3–44.5 mm, classical ~48–52 mm): https://guitarsymphony.com/guitar-nut-width/ ; bridge spacing example 10.26 mm: https://en.wikipedia.org/wiki/Fender_Lead_Series | String spacing defaults | 04 §2 |
| R14 | MIDI guitar mono mode (one channel per string): https://www.soundonsound.com/techniques/guitar-midi-explored ; MuseScore issue #28201: https://github.com/musescore/MuseScore/issues/28201 | Channel-per-string MIDI files carry string information | IN-M06 |

Numbers marked CALIBRATE (span comfort/max per finger pair, lead times, Fitts constants,
strum spread, weights) are **engineering estimates**, not values from these papers.


---

## Changelog

Format: `## [plan version] — date` then the changed rule IDs.

### [0.2.3] — 2026-09-25
- **Phase 1 implemented** in `finger-engine/`: the Notation Engine adapter (IN-E01..06), the
  standalone MusicXML (IN-X01..04, 06, 10–13, 20, 22–25) and MIDI (IN-M01..05, 07) readers,
  the normalizer (IN-N*), stages (SV-01..04), candidates (SV-10..14), the left-hand cost
  model and beam/Viterbi solver (SV-20..24), pick-mode right hand (RH-01, RH-P01, P03, P04),
  the motion planner (MP-01..06, 20..23), the guitar validator (V-02..V-07, V-09, V-10),
  the timeline (09) and the debug report (11 §4). 88 tests.
- Fixtures F-01, F-02, F-03, F-05, F-09, F-12, F-13, F-14 and F-17 all pass, and the
  validator reports no errors on any of them (11 §3).
- **07 §4 vs 09**: the timeline's `RightHandEvent` now matches Part 07 §4 exactly
  (`kind: 'pick' | 'strum' | 'pluck' | 'tap'`, `fingers`, `stringTimes`, `muted`). The
  Phase 0 sketch had `'finger'` and a single `finger`. Schema version unchanged: nothing
  had read it yet.
- **RH-P01 clarified in code**: the grid slot is counted inside its own beat, so every beat
  starts on a down-stroke however it is divided — the same "down on the beat, up on the
  off-beat" RH-P05 states for strums.
- **V-05 and TAB_INFEASIBLE**: where the FILE's own tab needs a stretch past the limits
  (F-12), the validator does not re-measure it. P-001 keeps the tab as written and the
  warning has already said so; reporting it again as an engine error would blame the engine
  for obeying the rule.
- New warning codes used by Phase 1, all reported and never thrown: `MXL_NOT_UNZIPPED` and
  `NOT_MUSICXML` (the file is not what it claims), `NOT_MIDI`, `MIDI_SMPTE_UNSUPPORTED`,
  `NO_NOTES`, `NO_PARTS`, and `RIGHT_HAND_FALLBACK` (fingerstyle asked for before Phase 3).
- **01 §5 performance**: a five-minute part of ordinary density (~1,200 notes) analyzes in
  about 1 s; five minutes of unbroken sixteenths (3,000 notes) in about 2.5 s. CALIBRATE.
- IN-X01 (.mxl) is read by the app's existing ZIP reader before the engine sees it, as the
  rule says to reuse rather than reimplement; handed an archive, the parser says so instead
  of guessing.

### [0.2.2] — 2026-09-25
- **OQ-11 answered** and the "Notation Engine data model" row of 01 §6 filled in, by reading
  `notation-engine/src/core/note.ts`, `src/timing/` and `src/playback/repeats.ts`:
  `stringNumber` (MusicXML numbering, 1 = highest), `fret`, `fingering`, `slideStart`/`slideStop`
  are kept; `<pluck>`, hammer-on/pull-off, bend, `<staff-tuning>`, `<capo>` and `<transpose>`
  are not, so the adapter reads those from the MusicXML file (IN-E02). Time is ticks at 480 per
  quarter with a tempo map; notes have no stable ID, so DM-09 derives one.
- No rule changed. Phase 0 implemented in `finger-engine/`.

### [0.2.1] — 2026-09-25
- Packaging only: all Parts merged into one file `GUITAR_FINGER_ENGINE_PLAN.md` so the owner and the coding tool read a single document. No rule changed.

### [0.2.0] — 2026-09-25
- Scope narrowed to the **Guitar Human Finger Engine only** (new D-010). Removed the bass engine
  from the architecture table, folder layout, roadmap (old Phase 5) and references. Old Phase 6
  (learned weights) is now Phase 5.
- **alphaTab removed everywhere** (new D-011): the owner uses his own Notation Engine.
  - New rule family `IN-E01..06`: Notation Engine adapter — single source of note order, timing
    and repeats; guitar fields read from its score or, if missing, from the MusicXML file.
  - `NoteEvent.notationNoteId` added (02) to link finger dots to notation notes.
  - D-006 reworded (core vs guitar rules). P-006 and P-007 rewritten without alphaTab.
  - OQ-03 withdrawn; OQ-06 updated; new OQ-11 (what the Notation Engine keeps) and OQ-12
    (sending chosen tab back to the Notation Engine).
  - Phase 0 now starts by reading the Notation Engine's score types.
  - References renumbered R1–R14; alphaTab documentation references removed.

### [0.1.0] — 2026-09-25
- First draft.
- Decisions D-001 … D-009 recorded (confirmed in chat with the owner).
- Proposed defaults P-001 … P-013 recorded, awaiting confirmation (see Part 13).
- Rule families introduced: DM, IN-X, IN-M, IN-N, GEO, LH, SV, RH, RH-P, RH-F, MP, OUT, V.
- Timeline contract `finger-timeline@1.0.0` defined.
- Fixtures F-01 … F-17 defined; roadmap Phases 0 … 6.
