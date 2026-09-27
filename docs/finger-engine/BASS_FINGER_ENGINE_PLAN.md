# Bass Guitar Human Finger Engine — Implementation Plan

| Field | Value |
|---|---|
| Plan version | **0.1.0** |
| Status | DRAFT — for owner review before any implementation |
| Owner | Aung Paing |
| Product | MusicNote → Video Create → instrument engines |
| Last updated | 2026-09-27 |
| Timeline schema | `finger-timeline@1.1.0` — additive over `1.0.0` from the Guitar plan (see Part 09) |
| Depends on | Guitar Human Finger Engine plan v0.2.1 — the shared Fretboard Core (restated in Part 02) |

---

## အကျဉ်းချုပ် (Burmese summary for the owner)

ဒီ Plan က **Bass Guitar အတွက် သီးသန့် Human Finger Engine** ပါ။ Guitar Engine နဲ့ **Fretboard Core** (geometry၊ solver၊ timeline) ကို မျှသုံးပြီး bass ရဲ့ ကိုယ်ပိုင်စည်းမျဉ်းတွေကိုပဲ အသစ်ရေးထားပါတယ်။ ဒီဖိုင်တစ်ခုတည်းကို code tool ကို ပေးရင် ရေးနိုင်အောင် core စည်းမျဉ်းတွေကိုလည်း Part 02 မှာ ပြန်ရေးထားပါတယ်။

- **ဘယ်လက်**: အောက်ပိုင်း fret တွေမှာ **Simandl** (1-2-4 လက်ချောင်းသုံး၊ လက်သူကြွယ်က လက်သန်းကို ကူဖိ)၊ အပေါ်ပိုင်းမှာ **one-finger-per-fret (OFPF)**။ ဘယ်နေရာမှာ ပြောင်းမလဲကို fret နံပါတ်နဲ့ မဆုံးဖြတ်ဘဲ **လက်ဆန့်ရတဲ့ mm အကွာအဝေး**နဲ့ ဆုံးဖြတ်ပါတယ်။ 34" bass မှာ OFPF က fret 8 လောက်ကစပြီးမှ သက်တောင့်သက်သာ ဖြစ်တယ်လို့ တွက်ချက်မှုက ပြပါတယ်။ ဒါက "fret 1–8 မှာ Simandl၊ 9 အထက်မှာ OFPF" ဆိုတဲ့ ဆရာတွေရဲ့ အကြံပြုချက်နဲ့ ကိုက်ပါတယ်။
- **ညာလက်**:
  - i-m အလှည့်ကျ ဆွဲတယ်။ အသံနိမ့်ကြိုးဘက်ကို ကူးရင် **raking** (လက်ချောင်းတစ်ချောင်းတည်းနဲ့ ဆက်ဆွဲ) သုံးတယ်၊ rest stroke နဲ့ ဆွဲတယ်။
  - လက်ချောင်း ၃ ချောင်း technique၊ pick (alternate / downstroke only) ပါတယ်။
  - **Slap (T) / Pop (P)**၊ double thumb၊ tapping ပါတယ်။
  - Muting အတွက် လက်မ ဘယ်ကြိုးပေါ်တင်ထားလဲဆိုတာလည်း တွက်ပေးတယ်။
- **Bass သီးသန့်အချက်များ**:
  - ကြိုး ၄/၅/၆ ချောင်းနဲ့ tuning ကို auto အကြံပြုတယ် (B ကြိုး၊ drop D စသည်)။
  - Bass ကို အသံထက် octave တစ်ခု မြင့်ပြီး ရေးလေ့ရှိလို့ sounding pitch ကို စစ်တဲ့ စည်းမျဉ်း ထည့်ထားတယ်။
  - Dead note (x) နဲ့ ghost note တွေကို ကိုင်တွယ်တယ်။ Fretless bass ကိုလည်း support လုပ်တယ်။
  - Note ပြီးတာနဲ့ ဖိထားတာကို လွှတ်ပြီး ကြိုးကို mute လုပ်ပုံလည်း ထည့်ထားတယ်။
- **Output**: Guitar နဲ့ တူညီတဲ့ timeline ပါ။ Schema 1.1.0 မှာ field အသစ်တွေ ထပ်ပေါင်းထားရုံ ဖြစ်လို့ SVG renderer တစ်ခုတည်းကို ကြိုး ၄/၅/၆ ပြောင်းပြီး သုံးလို့ရပါတယ်။
- `PROPOSED` လို့ ရေးထားတာတွေက ကျွန်တော် default အဖြစ် အဆိုပြုထားတာ ဖြစ်လို့ အတည်ပြုပေးဖို့ လိုပါတယ်။ **Part 13** ကို ကြည့်ပါ။

---

## What this engine does

Given a bass part (MusicXML or MIDI), the engine decides — the way a real bass player would —
**which string, fret and fretting finger** plays every note, **how the plucking hand** plays it
(index/middle alternation, raking, pick direction, slap thumb or pop finger), **how every finger
moves over time**, and where the plucking-hand thumb rests for muting. It outputs a keyframe
timeline that the TypeScript + SVG fretboard renders as colored finger dots, like the Guitar engine.

The engine does **not** draw anything. Rendering, colors and layout belong to the SVG layer.

## Relationship to the Guitar engine

| Area | Status |
|---|---|
| Fretboard Core (`core/`: geometry, tempo, RNG, stage/solver framework, timeline schema, core validator) | **Shared** — defined in the Guitar plan, restated in Part 02 |
| Input (`input/`: Notation Engine adapter, MusicXML technical parser, MIDI parser) | **Shared** — bass additions in Part 04 |
| Bass rules (`bass/`: left hand, right hand, motion, presets, bass validator) | **New** — this plan |
| Timeline JSON | **Shared contract**, bass adds optional fields (`1.1.0`, Part 09) |

If this plan is implemented **before** the Guitar engine exists, build `core/` and `input/` first
exactly as Part 02 states, in the same folder layout, so the Guitar engine can reuse them later.

## Contents (read in this order)

| Part | Title | Contents |
|---|---|---|
| README | Overview | This part: overview, rules for the coding tool, how to update the plan |
| 00 | Decisions | Confirmed decisions (BD-xxx) and proposed defaults (BP-xxx) |
| 01 | Architecture | Pipeline, folder layout, public API, integration with the app |
| 02 | Shared core (restated) | Inherited conventions, geometry formulas, solver, motion, output, validator rules |
| 03 | Bass instrument and geometry | String counts, tunings, dimensions, fretless, computed reference numbers |
| 04 | Input for bass | Part detection, sounding pitch, tuning/string-count suggestion, technique marks, MIDI |
| 05 | Left-hand model | Simandl vs one-finger-per-fret, spans, extensions, double stops, muting, dead notes |
| 06 | Cost and solver | Bass cost features and weights on top of the shared solver |
| 07 | Right hand | Fingerstyle (i-m, raking, 3-finger, thumb), pick, slap/pop, tapping, thumb rest |
| 08 | Motion planner | Hold/release, support finger, dead notes, slides, harmonics, fretless, humanize |
| 09 | Timeline output | Schema `1.1.0` additions and a complete bass example |
| 10 | Config and presets | Every tunable number, hand-size profiles, bass presets |
| 11 | Validation and testing | Validator checks, fixtures with expected results, acceptance criteria |
| 12 | Roadmap | Build phases B0–B5 |
| 13 | Open questions | Questions awaiting the owner |
| 14 | References | Research sources and what was taken from each |
| CL | Changelog | Plan version history |

## How to use this file with a coding tool

Give the coding tool this single file and say: *"Read the whole plan. Implement Phase B0 only
(Part 12). Follow the Rules for the coding tool below."*

## Rules for the coding tool (read before writing code)

1. **Build one phase at a time** as listed in Part 12. Do not implement features from later phases.
2. **Every rule has a stable ID.** Bass rules start with `B` (`BLH-05`, `BRH-F03` …); inherited core rules keep their Guitar-plan IDs (`GEO-01`, `SV-20` …). When code implements a rule, add a comment with the ID, e.g. `// [BLH-04] Simandl/OFPF zone`.
3. **No magic numbers.** Every numeric value comes from the config (Part 10). Bass defaults live in `bass/defaults.ts`; the human-hand profile lives in `core/hand-profiles.ts` and is shared with the Guitar engine.
4. **Pure and deterministic.** No DOM, no network, no global state. Same input + config + seed ⇒ byte-identical output.
5. **Timeline contract** (Part 09): only additive changes are allowed without a major version bump. Never remove or rename a `1.0.0` field.
6. **When the plan is ambiguous**, implement the documented default, leave `TODO(OQ-Bxx)` referencing Part 13, and report it.
7. **Reuse before rewriting.** Timing and note order for MusicXML come from the owner's **Notation Engine**. Reuse the shared `core/` and `input/`. Never fork core code into `bass/`; if bass needs a core change, make it generic and keep the Guitar tests passing. alphaTab is not part of this project; do not add it.
8. `bass/` must never import from `guitar/`, and `guitar/` must never import from `bass/`. Anything both need goes into `core/`.
9. Items marked **PROPOSED** are implemented as the default but stay switchable through config.

## How to update this plan

- Bump `Plan version` (semver): patch = wording; minor = new rule/feature or changed default; major = changed contract or architecture.
- Add an entry to the Changelog (end of this file) listing changed rule IDs.
- New decisions get the next `BD-xxx`; when a `BP-xxx` is confirmed, move it to the confirmed table with the date.
- **Never reuse or renumber a rule ID.** To remove a rule, mark it `DEPRECATED (vX.Y.Z)` and keep the line.
- This plan is ONE file. Each Part keeps its own `Status:` line (DRAFT / REVIEWED / FROZEN). Edit Parts in place.
- If a change touches the shared core (Part 02), the same change must be made in the Guitar plan.

## Status legend used throughout

| Tag | Meaning |
|---|---|
| **CONFIRMED** | Agreed with the owner |
| **PROPOSED** | Default chosen during planning, awaiting owner confirmation — implement behind config |
| **OPEN** | Not decided; see Part 13 |
| **CALIBRATE** | Engineering estimate; must be tuned by watching output videos |
| **INHERITED** | Same rule as the Guitar plan; must stay identical in both plans |


---

## Part 00 — Decisions

Status: DRAFT

### Confirmed by the owner (CONFIRMED)

| ID | Decision | Date |
|---|---|---|
| BD-001 | The **Bass Human Finger Engine is a separate engine** from the Guitar engine. Both share one instrument-independent **Fretboard Core**. | 2026-09-25 |
| BD-002 | The **Guitar engine is built first**; the Bass engine follows and reuses the core. | 2026-09-25 |
| BD-003 | **alphaTab is not used anywhere.** Notation display and notation timing come from the owner's own **Notation Engine**. | 2026-09-25 |
| BD-004 | Plans are written for a coding tool to read and implement, and must be easy to update later. | 2026-09-25 |
| BD-005 | The bass plan must be researched carefully and include everything needed. | 2026-09-27 |

### Carried over from the Guitar plan (PROPOSED for bass — confirm in OQ-B01)

These were confirmed for the Guitar engine. This plan assumes they apply to bass in the same way.

| ID | Carried-over decision |
|---|---|
| BP-001 | The bass in the video is drawn with TypeScript + SVG as a fretboard (4, 5 or 6 strings). Fingers are **colored dots**, colors user-customizable. The engine outputs finger IDs only. |
| BP-002 | Internal finger states (`pressed / held / approaching / lifted`, plus bass `mute` and `support`) are **engine-internal**: they decide where and when a dot is and how it moves. They are not separate visual styles. |
| BP-003 | The **right hand** (i/m/a, raking, pick ↓↑, slap T / pop P) is computed by the engine and **shown in the video**. How it is drawn is the SVG layer's job. |
| BP-004 | Input with tab (string/fret) and without tab are both supported. Partial tab is completed by the engine. |
| BP-005 | Input formats: **MusicXML (.musicxml/.xml/.mxl) + MIDI** only. |

### Proposed defaults (PROPOSED — awaiting confirmation, implement behind config)

| ID | Proposal | Config key | Question |
|---|---|---|---|
| BP-006 | Default instrument: **4-string, 34" (863.6 mm) scale, 22 frets, standard tuning E1 A1 D2 G2**. 5/6-string, other scales and tunings selectable. | `instrument.*` | OQ-B02 |
| BP-007 | **Instrument suggestion**: the engine proposes the string count and tuning from the pitch range (e.g. notes below E1 ⇒ 5-string B or drop D). The UI shows the suggestion and the user can override it. Notes are never silently transposed. | `instrument.autoSuggest = true` | OQ-B03 |
| BP-008 | Left-hand system **`auto`**: Simandl (1-2-4, ring finger supports the pinky) where one-finger-per-fret would overstretch the hand, and OFPF where it fits. The switch is decided by **mm span, not by fret number** (BLH-04). | `leftHand.system = "auto"` | OQ-B04 |
| BP-009 | One **human-hand profile** (`small / medium / large`) is shared by the Guitar and Bass engines, because it is the same person's hand. Default `medium` = the Guitar plan's span numbers. | `hand.profile = "medium"` | OQ-B05 |
| BP-010 | Right-hand mode **`auto`**: explicit marks → GM program → part name → default **fingerstyle i-m**. | `rightHand.mode = "auto"` | OQ-B06 |
| BP-011 | **Raking** is enabled for crossings to a lower-pitched (thicker) string. | `rightHand.fingerstyle.rake.enabled = true` | — |
| BP-012 | Bass hold policy **`releaseAtNoteEnd`**: at the end of a note the finger stops pressing but keeps touching the string (this is how bassists stop the note and mute it). It lifts when needed elsewhere or after an idle timeout. | `motion.holdPolicy` | OQ-B07 |
| BP-013 | In Simandl fingering, the **ring finger (3) is output as a `support` dot** next to the pinky. The renderer may show or hide supports. | `output.emitSupportFingers = true` | OQ-B08 |
| BP-014 | The **plucking-hand thumb rest** (muting) is output as optional data. Default style `movableAnchor`. | `rightHand.thumbRest.style` | OQ-B09 |
| BP-015 | **Sounding pitch**: take it from the Notation Engine. The engine also checks the octave, because bass is usually written an octave above sounding pitch (BIN-03, BIN-04a..c). | — | OQ-B10 |
| BP-016 | **Fretless** bass is supported: fingertip exactly on the fret line (no "behind the fret" offset). | `instrument.fretless` | OQ-B11 |
| BP-017 | Synth bass (GM 38/39) is analyzed as electric bass, fingerstyle, with info `SYNTH_BASS_ASSUMED_FINGERSTYLE`. | — | — |
| BP-018 | Timeline schema becomes **`1.1.0`** (additive fields only). Guitar output stays valid; one renderer serves both instruments. | — | — |
| BP-019 | Double bass / contrabass parts are **out of scope** (different technique). They get warning `UPRIGHT_BASS_NOT_SUPPORTED` and are analyzed as electric bass only if the user forces it. | — | OQ-B12 |
| BP-020 | Output times are seconds from content start. The Video Engine adds the count-in pre-roll. The engine runs in a Web Worker. | — | — |


---

## Part 01 — Architecture

Status: DRAFT

### 1. Pipeline

```
 MusicXML / .mxl ─► Notation Engine (owner's) ──┐
                    + MusicXML technical data   ├─► [1] Input adapters (shared, + bass marks)
 MIDI ──────────────────────────────────────────┘          │
                                                           ▼
                         [2] Part detection + instrument suggestion (strings, tuning, octave)
                                                           │
                                                           ▼
                         [3] Normalizer ─► [4] Stage builder (shared)
                                                           │
                                                           ▼
                         [5] Candidate generator (bass hand configurations)
                                                           │
                                                           ▼
                         [6] Left-hand solver (shared Viterbi/beam + bass costs)
                                                           │
                                                           ▼
                         [7] Right-hand solver (fingerstyle / pick / slap / tap)
                                                           │
                                                           ▼
                         [8] Motion planner (finger keyframes, support, mute, thumb rest)
                                                           │
                                                           ▼
                         [9] Validator (core V-* + bass BV-*)
                                                           │
                                                           ▼
                         [10] Timeline serializer ─► FingerTimeline 1.1.0 ─► SVG renderer
```

Each numbered box is a separate module with its own unit tests: `output = step(input, config)`.

### 2. Folder layout

```
src/finger-engine/
  core/                          // SHARED with the Guitar engine (Part 02)
    types.ts  tuning.ts  geometry.ts  tempo.ts  rng.ts
    hand-profiles.ts             // BP-009: small / medium / large span limits
    solver/viterbi.ts  solver/beam.ts
    timeline-schema.ts           // version constant → '1.1.0' (Part 09)
    validate-core.ts
  input/                         // SHARED
    notation-engine/adapter.ts
    musicxml/read-mxl.ts  musicxml/technical.ts  musicxml/parse.ts
    musicxml/bass-marks.ts       // BIN-07: slap/pop/dead/ghost/palm-mute detection
    midi/parse.ts  midi/track-select.ts  midi/string-channels.ts
    part-detect.ts               // BIN-02: guitar vs bass vs other
    normalize.ts
  bass/                          // NEW (this plan)
    index.ts                     // analyzeBass()
    defaults.ts                  // all bass numbers (Part 10)
    instrument.ts                // BG-*, BIN-05/06: tunings, string-count suggestion
    octave.ts                    // BIN-03, BIN-04a..c: sounding-pitch check
    candidates.ts                // BSV-10..14
    left-hand-rules.ts           // BLH-* HARD
    left-hand-cost.ts            // BLH-* SOFT → features (Part 06)
    right-hand/mode.ts           // BRH-01..04
    right-hand/fingerstyle.ts    // BRH-F*
    right-hand/pick.ts           // BRH-P*
    right-hand/slap.ts           // BRH-S*
    right-hand/tap.ts            // BRH-X*
    right-hand/thumb-rest.ts     // BRH-T*
    motion/planner.ts            // BMP-*
    presets.ts
    validate-bass.ts             // BV-*
  __tests__/bass/fixtures/       // FB-* input files + expected assertions
```

### 3. Public API (shape, not final code)

```ts
suggestBassInstrument(part: ParsedPart, hint?: Partial<InstrumentSpec>): {
  numStrings: 4 | 5 | 6; tuning: number[]; octaveShift: 0 | -12 | 12;
  confidence: number; reasons: string[];
}

analyzeBass(part: ParsedPart, options?: {
  instrument?: Partial<InstrumentSpec>,     // strings, tuning, capo, frets, scale, fretless
  config?: DeepPartial<BassEngineConfig>,
  presetId?: string,                        // Part 10 §3
  handProfile?: 'small' | 'medium' | 'large',
  seed?: number,
}): FingerTimeline                          // schema 1.1.0, instrument.kind = 'bass'
```

### 4. Runtime

- Runs in a **Web Worker** (BP-020). Progress events per step.
- Bass lines are mostly single notes. Performance target: a 5-minute bass part in **≤ 1 s** on a mid-range laptop (CALIBRATE).

### 5. Integration with the app

| Point | Rule |
|---|---|
| Notation Engine | Single source of note order, repeats, tempo map and note times (IN-E01..06, Part 02). Bass note IDs link finger dots to notation notes. |
| Video Engine | Engine times start at content start. The Video Engine adds the count-in pre-roll it already computes. |
| SVG fretboard | The renderer must support 4, 5 and 6 strings, 20–24 frets, and a fretless mode (no fret wires, optional fret-line markers). It reads `FingerTimeline` 1.1.0 and interpolates keyframes each frame. |
| Right-hand display | The renderer reads `rightHand.events` (kind `pluck` / `pick` / `slap` / `pop` / `tap`, finger, direction, rake flag) and optionally `rightHand.thumbRest`. |
| UI | Video Create shows: detected instrument (strings/tuning/octave) with override, right-hand mode with override, preset, and hand size. |


---

## Part 02 — Shared core (INHERITED, restated)

Status: DRAFT — every rule in this Part is **INHERITED** from the Guitar plan v0.2.1 and must stay identical in both plans. It is restated here so this file can be implemented on its own.

### 1. Conventions

| ID | Rule |
|---|---|
| DM-01 | **String index** `1..N`, **1 = lowest-pitched string**. Bass 4-string: 1=E1, 2=A1, 3=D2, 4=G2. Bass 5-string (low B): 1=B0 … 5=G2. |
| DM-02 | **Fret**: integer, `0` = open string (or the capo). Frets are always physical, counted from the nut. |
| DM-03 | **Fretting-finger IDs**: `1` index, `2` middle, `3` ring, `4` pinky, `T` thumb (not used on bass). Open strings have `finger = null`. |
| DM-04 | **Plucking-hand IDs**: `p` thumb, `i` index, `m` middle, `a` ring, `c` little, `pick`. |
| DM-05 | **Capo** `c`: frets `< c` cannot be fretted. "Open behind capo" = `fret = c`, `finger = null`. |
| DM-06 | **Pitch** = MIDI number of the **sounding** pitch. |
| DM-07 | **Time**: every event has `tick` (source resolution) and `time` / `duration` in seconds from content start. Solver and motion use seconds. |
| DM-08 | **Distances** in millimetres unless named otherwise. |
| DM-09 | **IDs**: every note has a stable `noteId`, plus `notationNoteId` from the Notation Engine. A note repeated by a repeat sign gets suffix `#r2`, `#r3` … |

### 2. Notation Engine adapter

| ID | Rule |
|---|---|
| IN-E01 | For MusicXML, the Notation Engine parses the file first. The finger engine takes from it the note list in **performance order** (repeats unrolled), tempo map, time signatures and note times. It never computes its own timing for MusicXML. |
| IN-E02 | Tab and technique data (`<string>`, `<fret>`, `<fingering>`, `<pluck>`, hammer-on/pull-off, slide, bend, tap, harmonic, bow marks, tuning, capo, transpose) is read from the Notation Engine's score **if it keeps it**. Otherwise it is read from the MusicXML file and attached to the matching note by document position (part, measure, voice, index). |
| IN-E03 | Store the Notation Engine's note ID in `NoteEvent.notationNoteId`. |
| IN-E04 | Convert the Notation Engine's string numbering to DM-01 inside the adapter, with a unit test. |
| IN-E05 | A written note played twice because of a repeat becomes two events with the same `notationNoteId`. |
| IN-E06 | The standalone MusicXML parser exists for tests and missing fields and must reproduce the Notation Engine's notes/times on the fixtures. |
| IN-X03 | MusicXML `<string>` counts **1 = highest string** ⇒ `internal = numStrings + 1 − xmlString`. `<staff-tuning line="1">` is the lowest string. |

### 3. Geometry

| ID | Rule |
|---|---|
| GEO-01 | Distance from nut to fret `n`: `d(n) = L × (1 − 2^(−n/12))`, `L` = scale length. |
| GEO-02 | Width of fret space `n`: `w(n) = d(n) − d(n−1)`. |
| GEO-03 | Fingertip x-position for a note at fret `n > 0`: `x(n) = d(n) − k × w(n)`, `k = geometry.fingertipBehindFret`. Open string `x = 0`. (Fretless bass: `k = 0`, BG-06.) |
| GEO-04 | String y-position: spacing interpolates linearly from nut spread to bridge spread along the neck: `y(s, x) = (s − 1) × (nutSpread + (bridgeSpread − nutSpread) × x / L) / (N − 1)`. |
| GEO-05 | Distances between fingertips: Euclidean, plus along-neck `|Δx|` and across-neck `|Δy|` separately. |
| GEO-06 | Output positions are in fret/string units. Millimetres are used only for costs and timing. |

### 4. Stages, states and solver

| ID | Rule |
|---|---|
| SV-01 | A **stage** is one onset moment. Notes starting together (a double stop) form one stage. |
| SV-02 | Onset grouping: MusicXML ⇒ same tick. MIDI ⇒ within `solver.onsetToleranceSec`. |
| SV-03 | Per stage: `dt` since the previous onset, and `freeTime` = the time the hand is really free to move (from the release of what must be held to this onset). Open strings extend `freeTime`. |
| SV-04 | Split into independent segments at silences ≥ `solver.segmentGapSec`. |
| SV-10 | A **state** = the full hand configuration after the stage's onsets (placements + kept sustained notes + hand position). |
| SV-11 | Onset candidates: every `(string, fret)` with `tuning[s] + fret = pitch`, `capo ≤ fret ≤ numFrets`, filtered by locks; every finger allowed by the hard rules. |
| SV-12 | Expansion from each surviving previous state; identical results are merged, keeping the cheaper path. |
| SV-13 | Beam: keep the best `solver.beamWidth` states per stage; drop candidates with static cost above `solver.maxStaticCost`. |
| SV-14 | Infeasible stage: relax spans ×`solver.relaxSpanFactor` (`STRETCH_RELAXED`), then allow cutting sustained notes, then drop the most costly note of a double stop (`UNPLAYABLE_CHORD`). Locked tab is never changed (`TAB_INFEASIBLE`). |
| SV-20 | Forward pass: beam-limited Viterbi. Total = Σ static cost + Σ (transition cost)^`solver.hardMoveExponent`. The exponent > 1 avoids one very hard move (minimax idea). |
| SV-21 | Backward pass for best-cost-through each state. |
| SV-22 | Chosen path = argmin at the last stage, traced back. |
| SV-23 | Confidence per stage = `1 − exp(−margin / solver.confidenceScale)` (margin to the runner-up). |
| SV-24 | 1–3 reason codes per note from the largest cost advantages. Locked notes: `TAB_LOCKED` / `FINGER_LOCKED`. |
| SV-25 | Every state keeps its feature vector (debug; future weight learning). |

### 5. Motion (shared parts)

| ID | Rule |
|---|---|
| MP-01 | A fretting finger arrives at `onset − lead`, `lead = clamp(freeTime × leadFraction, minLead, maxLead)`. |
| MP-02 | Travel time for distance `D` mm: `T = a + b × log2(1 + D / W)` (Fitts-style). If it does not fit, compress and flag `SHIFT_RUSHED`. |
| MP-03 | A finger departs at the latest of its release and the moment it is no longer needed, but early enough for MP-01/02. |
| MP-04 | Hand shift: all active fingers move together. A finger staying on its string during a shift is a **guide finger** and slides along the string. |
| MP-05 | Hold policy is configurable. Bass default: `releaseAtNoteEnd` (BMP-01). |
| MP-06 | Non-pressing fingers of the active hand hover near `handPos + (finger − 1)` frets. Hover dots are hidden. |
| MP-20..23 | Seeded humanization: arrival jitter ± `humanize.timeJitterSec` (never later than onset − 5 ms), position jitter ± `humanize.posJitterFret` along the neck. `humanize.enabled = false` gives exact motion. |

### 6. Output and validation (shared parts)

| ID | Rule |
|---|---|
| OUT-01 | Keyframes per finger are sorted by strictly increasing `t`. |
| OUT-02 | Between keyframes A and B: `ease = step` holds A; otherwise interpolate `string`, `fret`, `bend`. Boolean fields switch at B.t. |
| OUT-03 | Before the first / after the last keyframe a finger is not visible. |
| OUT-04 | Fret coordinate = `n − k` (e.g. fret 5 with k 0.3 ⇒ 4.7). Open strings have no finger keyframe. |
| OUT-05 | `string` 1..N, 1 = lowest pitch. The renderer decides screen orientation. |
| OUT-06 | Times are seconds from content start. |
| OUT-07 | No colors in the timeline. |
| V-01..V-11 | Pitch = tuning + fret; no two notes on one string; one finger = one fret (except declared barre); finger order along the neck; spans within limits (or flagged); locks unchanged; fingers pressed from arrival to at least 50 ms into the note (except hammer landings); keyframes increasing, no NaN; legato links on one string; one right-hand event per plucked note; determinism. |


---

## Part 03 — Bass instrument and geometry

Status: DRAFT

### 1. Strings and tunings

| ID | Rule |
|---|---|
| BG-01 | Supported string counts: **4, 5, 6**. `InstrumentSpec.kind = 'bass'`. |
| BG-02 | Tuning presets (MIDI numbers of open strings, index 0 = string 1 = lowest). Custom tunings are allowed. |

| Preset ID | Strings (low → high) | MIDI | Range with 22 frets |
|---|---|---|---|
| `4-standard` (default) | E1 A1 D2 G2 | 28 33 38 43 | 28–65 (E1–F4) |
| `4-dropD` | D1 A1 D2 G2 | 26 33 38 43 | 26–65 |
| `4-halfDown` | E♭1 A♭1 D♭2 G♭2 | 27 32 37 42 | 27–64 |
| `4-Dstandard` | D1 G1 C2 F2 | 26 31 36 41 | 26–63 |
| `5-lowB` | B0 E1 A1 D2 G2 | 23 28 33 38 43 | 23–65 (B0–F4) |
| `5-highC` | E1 A1 D2 G2 C3 | 28 33 38 43 48 | 28–70 |
| `6-standard` | B0 E1 A1 D2 G2 C3 | 23 28 33 38 43 48 | 23–70 (B0–A♯4) |

The 4-string standard tuning is one octave below the four lowest guitar strings (guitar E2 = 40, bass E1 = 28). A research paper on bass string detection uses the same MIDI numbers (28, 33, 38, 43).

### 2. Dimensions

| ID | Rule |
|---|---|
| BG-03 | Default scale length **34" = 863.6 mm** (long scale, the most common). Presets: short 30" (762 mm), medium 32" (812.8 mm), extra-long 35" (889 mm — common on 5-strings for a clearer low B). |
| BG-04 | Default number of frets **22** (vintage basses have 20, modern ones 21–24). UI-selectable. |
| BG-05 | String spread defaults (distance between the centers of string 1 and string N, CALIBRATE): |

| Strings | Typical nut width | Nut spread (default) | Bridge spacing per gap | Bridge spread (default) |
|---|---|---|---|---|
| 4 | 38 mm (Jazz style) – 44.5 mm (Precision style) | 33 mm | 19 mm (Fender standard, ¾") | 57 mm |
| 5 | 44.5–47.6 mm | 37 mm | 16–19.85 mm (default 18) | 72 mm |
| 6 | 51–55 mm | 44 mm | 14–16.5 mm (default 16.5) | 82.5 mm |

| ID | Rule |
|---|---|
| BG-06 | **Fretless** (`instrument.fretless = true`, or GM program 35 / sound `pluck.bass.fretless`): the fingertip sits **exactly on the fret line**: `k = 0` in GEO-03. The dot fret coordinate is the whole number `n`. Candidates and costs are otherwise unchanged. |
| BG-07 | Fretted bass fingertip offset: `geometry.fingertipBehindFret = 0.25` (CALIBRATE). Teaching sources say to press "as closely behind the fret as possible without being on the fret". Bass frets are wide, so the fraction is a little smaller than the guitar's 0.3. |
| BG-08 | Capo: supported by the core (DM-05) but rare on bass. Default 0. |

### 3. Reference numbers (computed with GEO-01..03, k = 0.25)

Fret positions on a 34" (863.6 mm) scale:

| Fret | Distance from nut (mm) | Fret width (mm) |
|---|---|---|
| 1 | 48.5 | 48.5 |
| 2 | 94.2 | 45.7 |
| 3 | 137.4 | 43.2 |
| 5 | 216.6 | 38.5 |
| 7 | 287.2 | 34.3 |
| 9 | 350.1 | 30.5 |
| 12 | 431.8 | 25.7 |
| 15 | 500.5 | 21.6 |
| 17 | 540.1 | 19.2 |
| 20 | 591.6 | 16.2 |
| 22 | 621.3 | 14.4 |
| 24 | 647.7 | 12.8 |

Index-to-pinky fingertip span (index at fret `p`), 34" scale:

| Index at fret | Simandl span (p…p+2) | OFPF span (p…p+3) | One fret (p…p+1) |
|---|---|---|---|
| 1 | 90.3 mm | 131.6 mm | 46.4 mm |
| 2 | 85.2 mm | 124.2 mm | 43.8 mm |
| 3 | 80.4 mm | 117.3 mm | 41.4 mm |
| 5 | 71.6 mm | 104.5 mm | 36.9 mm |
| 7 | 63.8 mm | 93.1 mm | 32.8 mm |
| 9 | 56.9 mm | 82.9 mm | 29.2 mm |
| 12 | 47.8 mm | 69.7 mm | 24.6 mm |

Where the OFPF span first fits the medium hand (comfort 90 mm / max 120 mm, same numbers as the Guitar plan):

| Scale | OFPF ≤ 120 mm (allowed) from index fret | OFPF ≤ 90 mm (comfortable) from index fret | Simandl span at fret 1 |
|---|---|---|---|
| 30" | 1 | 6 | 79.6 mm |
| 32" | 2 | 7 | 84.9 mm |
| 34" | 3 | 8 | 90.3 mm |
| 35" | 4 | 9 | 92.9 mm |

**Calibration anchor.** With the same human-hand limits as the Guitar engine, these points fall out of the numbers on a 34" bass:

- One-finger-per-fret becomes comfortable from about **fret 8**.
- Simandl at fret 1 sits right at the comfort limit (90 mm).
- The ring and pinky fingers cannot sit one fret apart at fret 1 (46.4 mm > the 3–4 maximum of 45 mm).

This matches the common teaching advice, "Simandl in frets 1–8, one-finger-per-fret from about fret 9". It is why BLH-04 decides the fingering system from millimetres instead of a fixed fret number. A short-scale bass automatically allows one-finger-per-fret lower on the neck.


---

## Part 04 — Input for bass

Status: DRAFT

The shared adapters (Part 02 §2 and the Guitar plan's `IN-X*`, `IN-M*`, `IN-N*` rules) are reused unchanged. This Part adds only what bass needs.

### 1. Part detection

| ID | Rule |
|---|---|
| BIN-01 | **MusicXML path**: the Notation Engine provides notes and timing (IN-E01). Bass technique marks not kept by the Notation Engine are read from the file (IN-E02 and BIN-07). |
| BIN-02 | A part is **bass** if any of these is true, checked in order: (1) `<score-instrument><instrument-sound>` starts with `pluck.bass` (`pluck.bass.electric`, `pluck.bass.fretless`, `pluck.bass.acoustic`, `pluck.bass.synth` …); (2) `<midi-instrument><midi-program>` is 33–40 (MusicXML is 1-based); (3) the part name or abbreviation matches `/bass|bajo|basse|baixo|b\.?\s?gtr|e\.?\s?bass/i`; (4) it has a TAB staff with 4–6 lines whose lowest `<staff-tuning>` is ≤ E1 (28) or ≤ B0 (23). **MIDI path**: GM program 32–39 (0-based) or the track name matches (3). |
| BIN-02a | Exclusions: part names matching `/double\s?bass|contrabass|upright/i` or sound `pluck.bass.acoustic` with an arco marking ⇒ upright bass ⇒ BP-019 (warning, not analyzed unless forced). `pluck.bass.acoustic` alone (acoustic bass guitar) is analyzed normally. |

GM bass programs (MIDI 0-based / MusicXML 1-based) and what they suggest:

| 0-based | 1-based | Name | Suggestion |
|---|---|---|---|
| 32 | 33 | Acoustic Bass | fingerstyle, prefer Simandl (upright-like sound) |
| 33 | 34 | Electric Bass (finger) | fingerstyle i-m |
| 34 | 35 | Electric Bass (pick) | pick |
| 35 | 36 | Fretless Bass | fingerstyle + `fretless = true` |
| 36 | 37 | Slap Bass 1 | slap/pop |
| 37 | 38 | Slap Bass 2 | slap/pop |
| 38 | 39 | Synth Bass 1 | fingerstyle, info (BP-017) |
| 39 | 40 | Synth Bass 2 | fingerstyle, info (BP-017) |

### 2. Sounding pitch and octave

Bass is normally **written an octave above the pitch it sounds**. Files may state this in several ways (a `<transpose>` with `<octave-change>-1`, a transposing clef, or nothing at all), and programs differ.

| ID | Rule |
|---|---|
| BIN-03 | Pitch priority: (1) the Notation Engine's **sounding** pitch, if it provides one; (2) written `<pitch>` + `<transpose>` (`chromatic` + 12 × `octave-change`); (3) the tab check BIN-04a; (4) the range test BIN-04b. Verify rules (2)–(4) against real MuseScore and Guitar Pro 8 bass exports before freezing them (CALIBRATE). |
| BIN-04a | **With tab**: `expected = tuning[string] + fret`. If `expected = pitch − 12` (or `+ 12`) for ≥ 90 % of tabbed notes, apply that octave correction to all notes and raise info `OCTAVE_CORRECTED`. Any other mismatch: tab stays the position authority, pitch stays for audio, warning `PITCH_TAB_MISMATCH` (same as the Guitar rule IN-X13). |
| BIN-04b | **Without tab**: test two hypotheses, `as-is` and `−12`. Score each: fraction of notes inside the selected instrument's range (weight 0.7) + fraction inside the typical bass register 23–55 (weight 0.3). Choose the higher score. If the two scores differ by < 0.1, keep `as-is` and raise `OCTAVE_UNCERTAIN`; the UI then asks the user. MIDI files normally carry sounding pitch, so for MIDI the `−12` hypothesis needs a margin ≥ 0.25 to win. |
| BIN-04c | The UI always offers an **octave override** (−12 / 0 / +12). It is stored in `instrument.octaveShift` and applied before everything else. |

### 3. String count and tuning suggestion

| ID | Rule |
|---|---|
| BIN-05 | If the file gives tuning (`<staff-details>` / `<staff-tuning>`, `<staff-lines>`), use it, and the string count equals `<staff-lines>`. |
| BIN-06 | Otherwise suggest (BP-007), using sounding pitches after BIN-03, BIN-04a..c. With `min` = lowest pitch and `max` = highest pitch: |

| Condition | Suggestion | Reason code |
|---|---|---|
| `min ≥ 28` and `max ≤ 43 + numFrets` | 4-string standard | `RANGE_FITS_4` |
| `min ∈ {26}` and no pitch 27 | 4-string drop D | `LOW_D_ONLY` |
| `23 ≤ min < 28` (otherwise) | 5-string low B | `BELOW_E1` |
| `max > 43 + numFrets` and `min ≥ 28` | 5-string high C | `ABOVE_G_STRING` |
| `min < 28` and `max > 43 + numFrets` | 6-string | `WIDE_RANGE` |
| `min < 23` | best of the above + `OUT_OF_RANGE` for the lowest notes | `BELOW_B0` |

The user can override. After the final choice, notes outside the range are skipped with `OUT_OF_RANGE` (never transposed).

### 4. Technique marks (MusicXML)

| ID | Rule |
|---|---|
| BIN-07 | Map MusicXML to bass techniques as in the table below. MusicXML 4.0 has **no dedicated slap or pop element**, so these are detected heuristically. |

| Source | Engine meaning |
|---|---|
| `<technical><hammer-on>` / `<pull-off>` | legato link (same string) |
| `<notations><slide>` / `<glissando>` between two notes | legato slide (same finger) |
| `<slide>` / `<glissando>` with no partner note | slide-in (at a note start) or slide-out (at a note end) |
| `<technical><bend>` | bend |
| `<technical><harmonic>` | natural harmonic (artificial = later phase) |
| `<technical><tap>` | tapped note (plucking-hand finger, no fretting finger) |
| `<notehead>x</notehead>` (or `circle-x`) | **dead note** — muted, percussive, no real pitch |
| `<notehead parentheses="yes">` | **ghost note** — quiet but pitched |
| `<technical><fingering>` 1–4 | fretting-finger lock. `T` is not used on bass: ignore + warning |
| `<technical><pluck>` p / i / m / a | plucking-finger lock (`p` = thumb pluck) |
| `<technical><down-bow>` / `<up-bow>` | pick direction lock |
| `<technical><other-technical>` text or `smufl` containing `slap`, `thump`, `T`, `S` | **slap** (thumb) |
| `<technical><other-technical>` containing `pop`, `P` | **pop** |
| `<direction><words>` "slap", "pop", "S", "T", "P", "slap on", "fingers", "pick" at the note's position | slap / pop / mode change from that point |
| `<other-technical>` or `<words>` "P.M.", "palm mute" | muted pluck (palm or thumb mute) |
| velocity / dynamics (`<dynamics>`, `<sound dynamics>`) | accent / ghost hints |

Unknown marks are kept in `NoteEvent.rawMarks` for the debug report.

### 5. MIDI

| ID | Rule |
|---|---|
| BIN-08 | Track selection: exclude channel 10 (drums). Prefer GM programs 32–39. Otherwise use the track name (BIN-02). If several candidates remain, the UI asks. |
| BIN-09 | GM program ⇒ right-hand mode and fretless hints (table in §1). |
| BIN-10 | Ghost notes: velocity ≤ `input.ghostVelocity` (default 45) ⇒ `ghost = true` (CALIBRATE). Dead notes are **not** inferred from MIDI by default (`input.midiDeadNoteHeuristic = false`). When enabled: notes ≤ 60 ms long with velocity ≤ 50 are dead notes. |
| BIN-11 | Channel-per-string MIDI (4–6 monophonic channels on one track; Guitar rule IN-M06) ⇒ `lockedString` per channel, when detected with high confidence. |
| BIN-12 | Pitch bend ⇒ `bend` (bend range from RPN 0, default 2 semitones). Pitch bends on a fretless track are treated as slides / vibrato, not bends. |

### 6. Normalization (bass additions)

| ID | Rule |
|---|---|
| BIN-13 | Apply `instrument.octaveShift`, then BIN-06, then the range check (P-013 of the Guitar plan: skip + `OUT_OF_RANGE`). |
| BIN-14 | Dead notes keep their written pitch (if any) only to choose a string. They do not need `tuning + fret = pitch`. |
| BIN-15 | Overlapping notes are kept as written: the solver decides whether a note keeps ringing or is cut (sustain cost, BSV). Only tiny overlaps < `input.legatoOverlapTrimSec` (default 0.03 s, typical of recorded MIDI) are trimmed so the earlier note ends at the next onset. |


---

## Part 05 — Left-hand (fretting-hand) model for bass

Status: DRAFT

Rules are **HARD** (a candidate that breaks them is discarded) or **SOFT** (adds cost, Part 06). All numbers are config keys (Part 10).

### 1. Fingers and fingering systems

| ID | Type | Rule |
|---|---|---|
| BLH-01 | HARD | Fretting fingers are `1 2 3 4`. The thumb never frets on bass. |
| BLH-02 | HARD | One finger presses one fret. A finger covers two adjacent strings at the same fret only as a declared mini-barre (BLH-12). Only one note per string sounds; a finger held at a higher fret on a string blocks lower notes on that string. |
| BLH-03 | HARD | **Finger order along the neck**: if fret(a) < fret(b) then finger(a) < finger(b). Equal frets may use any fingers. |
| BLH-04 | — | **Two fingering systems** (researched, both taught to electric bassists): |

- **One-finger-per-fret (OFPF)** at hand position `p`: finger `f` ↔ fret `p + f − 1` (4-fret span).
- **Simandl** at hand position `p`: finger 1 ↔ `p`, finger 2 ↔ `p+1`, finger 4 ↔ `p+2` (3-fret span, a whole tone). The **ring finger 3 presses together with the pinky as support** and does not play notes on its own.

**Zone rule (BP-008):** `Z(p) = simandl` if the OFPF span at `p` (index fret `p` … pinky fret `p+3`, computed with GEO-03) is greater than `hand.span['1-4'].comfort`; otherwise `Z(p) = ofpf`. On a 34" bass with the medium hand this gives Simandl for index frets 1–7 and OFPF from fret 8 (Part 03 §3).

- In the Simandl zone, finger 3 playing a note **alone** costs `ringAlone` (SOFT, high). A note at `p+3` needs a shift or an extension (BLH-06).
- In the OFPF zone, `ringAlone = 0`.
- `leftHand.system = 'simandl' | 'ofpf' | 'auto'` forces a system. The span limits (BLH-05) still apply, so forced OFPF at fret 1 on a 34" bass is infeasible for a medium hand and falls back per SV-14.
- The chosen system per segment is written to `leftHand.system` in the output (Part 09) for teaching/debug.

### 2. Spans and hand size

| ID | Type | Rule |
|---|---|---|
| BLH-05 | HARD + SOFT | **Span limits** come from the shared human-hand profile (BP-009). Fingertip distance along the neck per finger pair. Above `comfort` ⇒ quadratic cost `span`; above `max` ⇒ discard. A `support` finger is **not** included in span checks (it sits against the pinky). |

Medium hand (default; identical to the Guitar plan's LH-04 numbers):

| Pair | comfort (mm) | max (mm) |
|---|---|---|
| 1–2 | 40 | 65 |
| 2–3 | 30 | 45 |
| 3–4 | 30 | 45 |
| 1–3 | 65 | 95 |
| 2–4 | 60 | 85 |
| 1–4 | 90 | 120 |

| ID | Type | Rule |
|---|---|---|
| BLH-05a | HARD + SOFT | **Hand-frame span**: when the hand is in a position, it spans the whole frame of its system, even if only one finger presses. On bass, a single-note line has only one finger down at a time, so checking pressed fingers alone would never limit the stretch. The frame is index fret `p` … pinky fret `p+3` (OFPF) or `p+2` (Simandl), widened by one fret for an extension (BLH-06). The frame endpoints are checked against the `1–4` pair limits: above `comfort` ⇒ cost `frameSpan`; above `max` ⇒ discard. |

Profiles multiply both columns: `small × 0.9`, `medium × 1.0`, `large × 1.1` (CALIBRATE). Examples on a 34" bass:

| Profile | 1–4 max | OFPF allowed from index fret | OFPF comfortable from |
|---|---|---|---|
| small | 108 mm | 5 | 10 (≤ 81 mm) |
| medium | 120 mm | 3 | 8 |
| large | 132 mm | 1 | 6 (≤ 99 mm) |

| ID | Type | Rule |
|---|---|---|
| BLH-06 | SOFT | **Extensions without shifting**: (a) the index reaches back one fret below the position (`extensionBack`); (b) the pinky reaches one fret beyond the position (`extensionForward`). Allowed only while the widened frame stays within the BLH-05a limit. These are common in chromatic walking lines. |
| BLH-07 | SOFT | **Finger difficulty** cost `−ln(p)` with bass defaults `p1 0.35, p2 0.30, p3 0.15, p4 0.20` (CALIBRATE). The pinky is used more on bass than on guitar because the ring finger supports it. |

### 3. Position, strings and open strings

| ID | Type | Rule |
|---|---|---|
| BLH-08 | SOFT | **Open strings**: weight `openStrings` (default −0.2, a slight preference). An open string frees the hand and creates a free shift window (SV-03). Open-string pedal tones (E, A) are very common. Presets for jazz and fretless make open strings slightly costly. |
| BLH-09 | SOFT | **Register**: cost per fret above `preferredMaxFret` (default 9). Bass lines mostly live in the lower half of the neck. |
| BLH-10 | — | **Staying in position** is not a separate rule. It comes from the shift and string-change costs (Part 06). On 5/6-string basses, this makes the engine use the low B string to avoid a shift (fixture FB-08). |

### 4. Double stops and shapes

| ID | Type | Rule |
|---|---|---|
| BLH-11 | SOFT | **Double stops** (2–3 notes at once) use the same candidate/span rules. Typical shapes the costs should produce (checked by fixtures, not hard-coded): |

| Shape | Strings | Fret offset | Expected fingers |
|---|---|---|---|
| Octave | s, s+2 | +2 | 1 & 4 (Simandl zone) or 1 & 3 (OFPF zone) |
| Fifth / power | s, s+1 | +2 | 1 & 4 (Simandl) or 1 & 3 (OFPF) |
| Fourth | s, s+1 | 0 | one finger mini-barre, or 3 & 4 |
| Major tenth | s, s+3 | +1 | 1 & 2 (or 2 & 3) |
| Minor tenth | s, s+3 | 0 | two different fingers at the same fret (e.g. 1 & 2 or 2 & 3; any accepted) |

| ID | Type | Rule |
|---|---|---|
| BLH-12 | SOFT | **Mini-barre / roll**: one finger across two adjacent strings at the same fret. Simultaneous = mini-barre (`miniBarre` cost). Sequential = the finger **rolls** from one string to the next (`roll` cost, small). This is common for fourths and root–fifth–octave patterns that land on the same fret. Using two different fingers is also allowed. |

### 5. Techniques

| ID | Type | Rule |
|---|---|---|
| BLH-13 | HARD | **Legato**: hammer-on / pull-off stay on the same string; a legato slide keeps the same finger on the same string. |
| BLH-14 | SOFT | **Bends**: prefer finger 3 or 4 with support fingers behind on the same string. A bend with finger 1 costs `bendWeakFinger`. Bass bends are usually ≤ 1 semitone. |
| BLH-15 | — | **Dead notes** (x noteheads): no fretting finger is needed and there is no pitch constraint. The nearest free finger (prefer 1, then 2) touches the string lightly: role `mute`, not pressed. String: the locked string, else the string of the nearest pitched note, else the string implied by the written pitch in the current position. The hand position does not change for a dead note. |
| BLH-16 | — | **Ghost notes**: fretted normally. The `ghost` flag is kept for the renderer (e.g. smaller dot). |
| BLH-17 | — | **Muting by release** (BP-012): a note ends when its finger stops pressing. The finger stays on the string as a `mute` touch (BMP-01). |
| BLH-18 | SOFT | **Persistence**: a finger that will play the same spot again within `persistWindowSec` stays touching (no lift). Lifting and re-placing costs `relift`. |
| BLH-19 | — | **Natural harmonics**: the finger touches directly **over** the fret wire (x = d(n), not behind it), without pressing, and lifts `harmonicReleaseSec` after the pluck. Common harmonic frets on bass: 12, 7, 5, 4 (and 9, 3.9, 3.2). |
| BLH-20 | — | **Right-hand tapping**: no fretting finger, and the hand position stays. Left-hand tapping (hammer-on from nowhere) is a later phase. |
| BLH-21 | — | **Slide-in / slide-out** (one-sided slides): the note's own finger starts `slide.inFrets` below the target (or above, if marked "from above") and slides in. A slide-out moves `slide.outFrets` down after the note while releasing. No extra finger is used. |


---

## Part 06 — Cost model and solver for bass

Status: DRAFT

The solver is the shared one (SV-01..25, Part 02): a shortest path over onset stages with static and transition costs, beam-limited Viterbi, a backward pass, confidence and reasons. This Part defines the **bass candidates and cost features**.

### 1. Candidates

| ID | Rule |
|---|---|
| BSV-10 | For each pitched onset note: every `(string, fret)` with `tuning[s] + fret = pitch`, filtered by locks. For each position, the allowed fingers and their **system interpretation**: OFPF (`handPos = fret − (finger − 1)`, any finger) is always generated subject to spans. Simandl is generated only where `Z(handPos) = simandl` (BLH-04) or the system is forced: finger 1 ⇒ `handPos = fret`, finger 2 ⇒ `fret − 1`, finger 4 ⇒ `fret − 2`, finger 3 ⇒ `ringAlone`. |
| BSV-11 | A Simandl candidate that uses finger 4 automatically adds finger 3 as `support` on the same string. While the pinky presses, finger 3 is **not available** for any other note (HARD). |
| BSV-12 | **Dead notes** (BLH-15) are stages that do not change the hand position and have no finger cost. If their string has a sustained note, that note is cut (sustain cost applies). The touching finger is chosen by the motion planner. |
| BSV-13 | **Natural harmonics**: candidates are the harmonic nodes whose sounding pitch equals the note: `tuning[s] + 12` at fret 12; `+19` at fret 7 (or 19); `+24` at fret 5 (or 24); `+28` at fret 4 (or 9, 16). Tab locks win. No pressing finger; the nearest free finger touches (BLH-19). |
| BSV-14 | **Tapped notes**: string/fret candidates as usual, but no fretting finger and no hand-position change. The plucking-hand finger taps (BRH-X01). |
| BSV-15 | Double stops (2–3 notes): the cartesian product of note candidates, filtered by BLH-02/03/05 and BSV-11. |

### 2. Static cost `Cs(state)` — bass features

| Feature | Definition | Rule | Default weight |
|---|---|---|---|
| `span` | Σ over pressed pairs (supports excluded) `max(0, dist − comfort)²` (mm²/100) | BLH-05 | 1.0 |
| `frameSpan` | `max(0, frameDist − comfort['1-4'])²` (mm²/100) for the hand frame of the state's system and position | BLH-05a | 1.0 |
| `fingerDifficulty` | Σ `−ln(p_finger)` | BLH-07 | 1.0 |
| `ringAlone` | 1 if finger 3 plays alone in the Simandl zone | BLH-04 | 3.0 |
| `extensionBack` | 1 if the index reaches one fret below the position | BLH-06 | 0.6 |
| `extensionForward` | 1 if the pinky reaches one fret beyond the position | BLH-06 | 0.8 |
| `crossing` | crossed finger pairs at adjacent frets | (Guitar LH-06) | 2.0 |
| `miniBarre` | 1 per mini-barre | BLH-12 | 0.5 |
| `openStrings` | number of open strings | BLH-08 | −0.2 |
| `highFret` | Σ `max(0, fret − preferredMaxFret)` | BLH-09 | 0.15 |
| `bendFinger` | 1 if a bend uses finger 1 | BLH-14 | 2.0 |
| `techniqueFinger` | 1 if a hammer-on target finger is not higher than the held finger | BLH-13 | 1.5 |

### 3. Transition cost `Ct(prev, next)` — bass features

`Ct' = Ct ^ solver.hardMoveExponent` (default 1.3, SV-20).

| Feature | Definition | Rule | Default weight |
|---|---|---|---|
| `shift` | `(|Δx_index| / shiftRefMm) / max(freeTime, minFreeTimeSec)`; `shiftRefMm = 35` (≈ one fret at fret 5 on a 34" bass) | SV-03, MP-02 | 1.0 |
| `shiftCount` | 1 if the hand position changes by more than half a fret | — | 0.8 |
| `guideFinger` | bonus if a finger stays on its string during the shift | MP-04 | −0.5 |
| `stringChange` | `ln(1 + |Δstring|)` between consecutive notes | — | 0.4 |
| `sameFingerJump` | `1 / max(dt, minFreeTimeSec)` when one finger must leave for a different spot | — | 0.5 |
| `roll` | 1 when a finger rolls to the adjacent string at the same fret | BLH-12 | 0.2 |
| `relift` | 1 when a finger lifts and returns to the same spot within `persistWindowSec` | BLH-18 | 0.4 |
| `sustainCut` | Σ fraction of each cut note's remaining duration | — | 1.0 |
| `legatoViolation` | ∞ (discard) if a hammer/pull/slide is not on the required string/finger | BLH-13 | — |

The bass weights differ from the Guitar weights where bass playing differs: more position shifts are normal (`shiftCount` 0.8), and bassists end notes on purpose (`sustainCut` 1.0 instead of 2.0).

### 4. Solver settings (bass defaults)

| Key | Default | Note |
|---|---|---|
| `solver.onsetToleranceSec` | 0.015 | SV-02 |
| `solver.segmentGapSec` | 2.0 | SV-04 |
| `solver.beamWidth` | 128 | bass states are smaller than guitar chord states |
| `solver.maxStaticCost` | 50 | SV-13 |
| `solver.hardMoveExponent` | 1.3 | SV-20 |
| `solver.minFreeTimeSec` | 0.05 | — |
| `solver.confidenceScale` | 2.0 | SV-23 |
| `solver.relaxSpanFactor` | 1.15 | SV-14 |

### 5. Bass reason codes (in addition to the shared ones)

`SIMANDL_POSITION`, `OFPF_POSITION`, `RING_SUPPORTS_PINKY`, `EXTENSION_BACK`, `EXTENSION_FORWARD`, `ROLL`, `MINI_BARRE`, `OPEN_PEDAL`, `STAY_ON_LOW_B`, `DEAD_NOTE_TOUCH`, `HARMONIC_NODE`, `SHIFT_ON_OPEN_STRING`, `OCTAVE_SHAPE`, `FIFTH_SHAPE`.


---

## Part 07 — Right hand (plucking hand) for bass

Status: DRAFT

The right hand runs after the left-hand solver, because it needs each note's string. Output: `rightHand.events` and `rightHand.thumbRest` (Part 09). It is displayed in the video (BP-003).

### 1. Mode selection

| ID | Rule |
|---|---|
| BRH-01 | Modes: `fingerstyle` (2 or 3 fingers), `thumb` (thumb-only plucking), `pick`, `slap`. `tap` notes can occur inside any mode. `rightHand.mode = 'auto'` (default, BP-010) or a fixed mode. |
| BRH-02 | `auto` decides per note, in priority order: (1) a note-level mark (`<pluck>`, bow marks ⇒ pick, slap/pop marks, `tap`); (2) a mode segment started by a `<words>` direction ("slap", "pop", "fingers", "pick") that lasts until the next such direction; (3) GM program (Part 04 §1); (4) part/instrument name containing "slap", "pick", "fretless"; (5) preset default = `fingerstyle`, 2 fingers. |
| BRH-03 | Mode smoothing: a segment shorter than one bar that is surrounded by one other mode is merged into it, unless its notes carry explicit marks. |
| BRH-04 | Legato notes (hammer-on and pull-off targets, legato-slide targets, tie continuations) produce **no** plucking event in any mode. |

### 2. Fingerstyle (`BRH-F*`)

Researched practice: bassists alternate index and middle, use **rest strokes** (the finger follows through and lands on the next thicker string), and use **raking** (one finger plays several strings in one motion) only when moving toward lower-pitched strings.

| ID | Rule |
|---|---|
| BRH-F01 | Fingers `i` and `m` (2-finger default). With `fingerstyle.fingers = 3`, `a` is also used. |
| BRH-F02 | **Alternation**: consecutive plucks use different fingers. Repeating a finger costs `repeat` (×2 when the interval is < `fingerstyle.fastSec`, default 0.11 s). |
| BRH-F03 | **Raking** (`rake.enabled`, BP-011): when the next note is on a **lower-pitched string** (engine string index decreases by 1 … `rake.maxStrings`, default 2), using the **same finger** gets bonus `rake` instead of the repeat penalty. The event gets `rake: true`. |
| BRH-F04 | **No reverse raking**: the same finger moving to a higher-pitched string costs `repeat + reverseRake`. |
| BRH-F05 | Implemented as a small DP over the plucks (generic solver from `core/`). State = (last finger, last string). Costs from BRH-F02..F04 plus `ringFinger` for using `a`. |
| BRH-F06 | **Stroke type**: `rest` by default (the finger lands on string `s − 1`). Use `free` when string `s − 1` is still sounding a note that must keep ringing (resting would mute it). On string 1 the rest stroke lands on the thumb or pickup. |
| BRH-F07 | **3-finger mode** (preset `metal-three-finger`, or when note intervals fall below `fingerstyle.threeFingerBelowSec`, default 0.09 s, and `fingers = 3` is allowed): cycle `a-m-i` (default order, configurable `i-m-a`) on fast runs and gallops. |
| BRH-F08 | Explicit `<pluck>` marks win over all rules. |
| BRH-F09 | Ghost notes are plucked normally, with the flag `ghost`. Dead notes are plucked (a percussive pluck) with the flag `dead`. |

### 3. Thumb-only mode (`BRH-M*`)

| ID | Rule |
|---|---|
| BRH-M01 | Every plucked note uses `p` (down-stroke), often palm-muted (Motown / upright-like sound). Preset `thumb-muted`. |
| BRH-M02 | `<pluck>p</pluck>` inside fingerstyle marks a single thumb pluck. It does **not** mean slap. |

### 4. Pick (`BRH-P*`)

| ID | Rule |
|---|---|
| BRH-P01 | `pick.style = 'alternate'`: grid-based alternate picking (same as the Guitar rule RH-P01). Even grid slots are down-strokes, odd slots are up-strokes, and the hand keeps moving through rests. |
| BRH-P02 | `pick.style = 'downOnly'`: all down-strokes while the time between plucks is ≥ `pick.downOnlyMinIntervalSec` (default 0.14 s). Faster runs switch to alternate picking for that run only. This is typical for driving rock/punk eighth notes. |
| BRH-P03 | `pick.style = 'auto'` (default): `downOnly` if the part's median interval between plucks is ≥ `pick.downOnlyMinIntervalSec`, otherwise `alternate`. |
| BRH-P04 | Explicit `<down-bow>` / `<up-bow>` win. Palm-mute marks set `muted: true`. |

### 5. Slap and pop (`BRH-S*`)

Researched practice: the side of the thumb's bony joint slaps the **low strings** (E and A); the index or middle finger **pops** the **high strings** (D and G) by snapping them away from the body. Slap lines mix in hammer-ons, pull-offs and dead (ghost) notes. Double thumbing uses both sides of the thumb (down and up).

| ID | Rule |
|---|---|
| BRH-S01 | Default split: strings `1 … slap.thumbMaxString` get a thumb **slap** (`kind: 'slap'`, finger `p`, direction `down`). Higher strings get a **pop** (`kind: 'pop'`, finger `i`). `slap.thumbMaxString` defaults to 2 on a 4-string (E, A) and to 3 on a 5/6-string (B, E, A). |
| BRH-S02 | Explicit slap/pop marks (BIN-07) win over BRH-S01, e.g. a thumb slap on the D string. |
| BRH-S03 | Consecutive pops closer than `slap.popAlternateSec` (default 0.15 s) alternate `i` / `m`. Double-stop pops (e.g. an octave) use `i` + `m` together. |
| BRH-S04 | **Double thumbing** (`slap.doubleThumb = true`, preset `funk-slap-advanced`): consecutive thumb notes closer than `slap.doubleThumbSec` (default 0.12 s) alternate down (`direction: 'down'`) and up-stroke (`direction: 'up'`). |
| BRH-S05 | Dead notes in slap: the fretting hand mutes (BLH-15) and the right hand still slaps or pops, chosen by BRH-S01. |
| BRH-S06 | Legato notes after a slap or pop are not plucked (BRH-04). |
| BRH-S07 | Left-hand slaps (fretting-hand percussive hits) are a later phase. |

### 6. Tapping and harmonics

| ID | Rule |
|---|---|
| BRH-X01 | A tapped note produces `kind: 'tap'`, finger `i` (or `m` when two taps are closer than 0.15 s). There is no fretting finger (BSV-14). |
| BRH-X02 | Harmonics are plucked by the current mode's rule. |

### 7. Thumb rest (muting position) (`BRH-T*`)

Researched practice: the plucking-hand thumb rests on the pickup (anchor), moves between the pickup and the lowest string (movable anchor), or floats on the strings below the one being played (floating thumb). This mutes the lower strings.

| ID | Rule |
|---|---|
| BRH-T01 | `thumbRest.style = 'anchor'`: the thumb stays on the pickup (`on: 'pickup'`). |
| BRH-T02 | `thumbRest.style = 'movableAnchor'` (default, BP-014): `pickup` while the plucked string ≤ 2. On a 4-string, it rests on string 1 while plucking strings 3–4. On a 5/6-string, it rests on string `s − 2` while plucking string `s ≥ 3`. |
| BRH-T03 | `thumbRest.style = 'floating'`: the thumb lies on string `s − 1` (muting every lower string) while plucking string `s ≥ 2`; `pickup` while plucking string 1. |
| BRH-T04 | The thumb moves just before the pluck (`thumbRest.leadSec`, default 0.04 s). In `slap` mode there is no thumb rest (the thumb is plucking). In `thumb` mode the rest is the palm. |

### 8. Right-hand event (schema 1.1.0)

```ts
interface RightHandEvent {
  time: number;                        // seconds
  noteIds: string[];
  strings: number[];                   // in the order hit
  kind: 'pluck' | 'pick' | 'strum' | 'tap' | 'slap' | 'pop';   // 'slap' and 'pop' are new in 1.1.0
  fingers?: ('p' | 'i' | 'm' | 'a' | 'c')[];                   // pluck / slap / pop / tap
  direction?: 'down' | 'up';           // pick, strum, slap (double thumbing)
  stroke?: 'rest' | 'free';            // new: fingerstyle
  rake?: boolean;                      // new: raking pluck (same finger as the previous pluck)
  muted?: boolean;                     // palm / thumb mute
  ghost?: boolean;                     // new
  dead?: boolean;                      // new
  reason?: string;                     // e.g. 'ALTERNATE', 'RAKE', 'GRID_DOWN', 'DOWN_ONLY', 'THUMB_LOW_STRING', 'POP_HIGH_STRING', 'LOCKED'
}
```


---

## Part 08 — Motion planner for bass

Status: DRAFT

The shared motion rules apply (MP-01..06, MP-20..23: arrival lead, Fitts travel time, whole-hand shifts, guide finger, humanization). This Part adds what is specific to bass.

### 1. Finger roles (engine-internal, BP-002)

| Role | Meaning | Keyframe fields |
|---|---|---|
| `fret` | the finger presses a note | `pressed: true, visible: true, role: 'fret'` |
| `support` | the ring finger pressing behind the pinky (Simandl), or fingers behind a bending finger | `pressed: true, visible: true, role: 'support'` |
| `mute` | the finger touches without pressing: after a note (release), for a dead note, or for a harmonic | `pressed: false, visible: true, role: 'mute'` |
| hover / lifted | not in use | `visible: false` |

### 2. Rules

| ID | Rule |
|---|---|
| BMP-01 | **Hold policy `releaseAtNoteEnd`** (BP-012): at the note's end time the finger switches to `role: 'mute'` (`pressed: false`) and stays on the string. It leaves when (a) it is needed elsewhere, (b) the hand shifts, or (c) `motion.idleLiftSec` (default 0.4 s) passes. Then it becomes `visible: false`. Alternatives: `realistic` (Guitar default, stay pressed) and `noteDuration` (lift at note end). |
| BMP-02 | **Support finger** (BSV-11): finger 3 gets keyframes that mirror finger 4 on the same string, at fret coordinate `finger4Fret − motion.supportOffsetFret` (default 0.35), with the same timing and `role: 'support'`. Emitted only when `output.emitSupportFingers = true` (BP-013). |
| BMP-03 | **Bend support**: fingers behind a bending finger on the same string move with it (`bend` value copied). |
| BMP-04 | **Dead notes**: the chosen finger (BLH-15) arrives with `role: 'mute'` at `onset − lead` at the current hand position on the dead note's string, and stays through the note's duration. |
| BMP-05 | **Harmonics**: the finger arrives over the fret wire (fret coordinate = the whole number `n`) with `role: 'mute'` and lifts `motion.harmonicReleaseSec` (default 0.05 s) after the pluck. |
| BMP-06 | **Legato slide**: the finger stays `pressed` and moves along the string, ending exactly at the target onset. Duration `min(noteDuration, motion.slideMaxSec)`, default 0.15 s, `easeInOut`. |
| BMP-07 | **Slide-in**: the finger starts `slide.inFrets` (default 3) below the target, pressed, `slide.inSec` (default 0.10 s) before the onset, and arrives exactly at the onset. **Slide-out**: after the note, the finger slides `slide.outFrets` (default 5) down over `slide.outSec` (default 0.15 s) while releasing (`pressed` → false at the end), then lifts. |
| BMP-08 | **Hammer-on**: the hammering finger lands exactly at the target onset (the landing makes the sound). **Pull-off**: the lower finger is already pressed, and the pulling finger lifts exactly at the target onset. |
| BMP-09 | **Shifts**: bass shifts are longer in mm. The same Fitts rule (MP-02) gives longer travel times automatically. Defaults: `lead` = `clamp(freeTime × 0.4, 0.02 s, 0.15 s)`. Open strings give the shift free time (SV-03). |
| BMP-10 | **Fretless**: fret coordinates are whole numbers `n` (BG-06). Legato slides on fretless move continuously. Vibrato (later phase) adds small along-the-string oscillation. |
| BMP-11 | **Plucking-hand timing**: a pluck, pick, slap or pop happens at the onset. A rake keeps the same finger moving continuously across strings. `thumbRest` keyframes step `thumbRest.leadSec` before each pluck that changes the rest position (BRH-T04). |
| BMP-12 | **Humanization**: shared MP-20..23. Bass defaults: `timeJitterSec` 0.008, `posJitterFret` 0.04. |

### 3. Keyframe generation (summary for the implementer)

1. Build per-finger jobs from the solved path: `(noteId, string, fret, pressStart, pressEnd, role, technique)`.
2. Add support-finger jobs (BMP-02) and dead-note / harmonic touch jobs (BMP-04/05).
3. Between jobs of the same finger insert depart → approach → arrive keyframes (MP-01..03).
4. Group hand shifts (MP-04), with guide fingers sliding.
5. Apply the hold policy (BMP-01) and technique overrides (BMP-06..08).
6. Add `visible: false` keyframes where a finger lifts.
7. Build right-hand events (Part 07) and thumb-rest keyframes (BRH-T*).
8. Apply humanization last (BMP-12).
9. Validate (Part 11) before serializing.


---

## Part 09 — Output: `FingerTimeline` 1.1.0 (contract with the SVG renderer)

Status: DRAFT — schema `finger-timeline@1.1.0`

The bass engine writes the **same JSON contract** as the Guitar engine (`1.0.0`, Guitar plan Part 09) and adds only **optional** fields. A renderer that understands `1.0.0` can still draw bass finger dots. The full `1.0.0` shape is summarized in §1; the additions are in §2.

### 1. Base shape (from 1.0.0, unchanged)

```ts
interface FingerTimeline {
  schema: 'finger-timeline';
  schemaVersion: '1.1.0';
  engine: { name: 'bass-finger-engine'; version: string; presetId: string; seed: number; configHash: string };
  instrument: { kind: 'guitar' | 'bass'; numStrings: number; stringOrder: 'lowToHigh';
                tuning: number[]; capo: number; numFrets: number;
                fretless?: boolean; octaveShift?: number;                       // 1.1.0
                suggestion?: { numStrings: number; tuning: number[]; reasons: string[] } };  // 1.1.0
  duration: number;
  notes: TimelineNote[];
  leftHand: { hand: HandKeyframe[]; fingers: Record<'1'|'2'|'3'|'4'|'T', FingerKeyframe[]>; barres: Barre[];
              system?: { t: number; mode: 'simandl' | 'ofpf' }[] };           // 1.1.0
  rightHand: { mode: 'pick' | 'fingerstyle' | 'thumb' | 'slap' | 'mixed';     // 'thumb' | 'slap' | 'mixed' are 1.1.0
               events: RightHandEvent[];                                       // Part 07 §8
               segments?: { start: number; end: number; mode: string }[];      // 1.1.0
               thumbRest?: { t: number; on: 'pickup' | 'palm' | number }[] };  // 1.1.0
  warnings: { code: string; time?: number; noteIds?: string[]; message: string }[];
  debug?: unknown;
}

interface TimelineNote {
  noteId: string; notationNoteId?: string;
  time: number; duration: number; pitch: number;
  string: number; fret: number; finger: '1'|'2'|'3'|'4'|null;
  techniques: string[];
  locked: { string: boolean; fret: boolean; finger: boolean };
  reasons: string[]; confidence: number;
  dead?: boolean; ghost?: boolean; harmonic?: boolean;          // 1.1.0
  system?: 'simandl' | 'ofpf';                                  // 1.1.0
}

interface FingerKeyframe {
  t: number; string: number; fret: number;
  pressed: boolean; visible: boolean;
  bend?: number; ease?: 'linear' | 'easeInOut' | 'step'; noteId?: string;
  role?: 'fret' | 'support' | 'mute';                           // 1.1.0, absent = 'fret'
}
```

### 2. Rules for the additions

| ID | Rule |
|---|---|
| BOUT-01 | `schemaVersion` is `'1.1.0'`. All `1.0.0` fields keep their meaning. Readers must ignore fields they do not know. |
| BOUT-02 | `instrument.kind = 'bass'`. `fretless` / `octaveShift` / `suggestion` describe what was analyzed (BG-06, BIN-04c, BIN-06). |
| BOUT-03 | `FingerKeyframe.role`: `fret` (default), `support` (Simandl ring finger, bend support), `mute` (touching without pressing: release, dead note, harmonic). `mute` keyframes always have `pressed: false`. |
| BOUT-04 | `TimelineNote.dead`: the note is a dead (x) note — `fret` is only the touch position and `tuning + fret = pitch` is not required. `ghost`: a quiet note. `harmonic`: natural harmonic; `fret` is the node fret (whole number). |
| BOUT-05 | `leftHand.system`: step segments of the fingering system for teaching/debug (BLH-04). |
| BOUT-06 | `RightHandEvent` 1.1.0 fields as in Part 07 §8 (`slap`, `pop`, `stroke`, `rake`, `ghost`, `dead`). |
| BOUT-07 | `rightHand.thumbRest`: step keyframes of where the plucking thumb rests (`pickup`, `palm`, or a string index), BRH-T*. |
| BOUT-08 | Renderer guidance (not engine rules): `support` dots may be drawn smaller or hidden; `mute` dots are drawn in the same style as other dots (one dot style) unless the owner decides otherwise (OQ-B07); `dead` notes may show an ✕ on the string; a fretless neck has no fret wires and whole-number fret coordinates. |

### 3. Complete example

Root–fifth–octave, then back to the fifth. G1 → D2 → G2 → D2, quarter notes at 120 BPM (0.5 s each, played 0.45 s long). The input is tab-locked (the file gives strings and frets — this is fixture FB-02; without tab the engine might choose the open G string for G2). 4-string 34" bass, Simandl position 3, fingerstyle with raking on the last note, movable-anchor thumb, humanization off.

- G1 = string 1 (E string) fret 3, finger 1.
- D2 = string 2 (A string) fret 5, finger 4 with ring support.
- G2 = string 3 (D string) fret 5: finger 4 **rolls** to the next string.
- D2 again: finger 4 rolls back. The right hand **rakes** from string 3 to string 2 with the same finger.

```json
{
  "schema": "finger-timeline", "schemaVersion": "1.1.0",
  "engine": { "name": "bass-finger-engine", "version": "0.1.0", "presetId": "default", "seed": 1, "configHash": "…" },
  "instrument": { "kind": "bass", "numStrings": 4, "stringOrder": "lowToHigh",
                  "tuning": [28, 33, 38, 43], "capo": 0, "numFrets": 22, "fretless": false, "octaveShift": 0 },
  "duration": 1.95,
  "notes": [
    { "noteId": "n1", "time": 0.0, "duration": 0.45, "pitch": 31, "string": 1, "fret": 3, "finger": "1",
      "techniques": ["normal"], "locked": {"string": false, "fret": false, "finger": false},
      "reasons": ["SIMANDL_POSITION"], "confidence": 0.8, "system": "simandl" },
    { "noteId": "n2", "time": 0.5, "duration": 0.45, "pitch": 38, "string": 2, "fret": 5, "finger": "4",
      "techniques": ["normal"], "locked": {"string": false, "fret": false, "finger": false},
      "reasons": ["FIFTH_SHAPE", "RING_SUPPORTS_PINKY"], "confidence": 0.75, "system": "simandl" },
    { "noteId": "n3", "time": 1.0, "duration": 0.45, "pitch": 43, "string": 3, "fret": 5, "finger": "4",
      "techniques": ["normal"], "locked": {"string": false, "fret": false, "finger": false},
      "reasons": ["OCTAVE_SHAPE", "ROLL"], "confidence": 0.7, "system": "simandl" },
    { "noteId": "n4", "time": 1.5, "duration": 0.45, "pitch": 38, "string": 2, "fret": 5, "finger": "4",
      "techniques": ["normal"], "locked": {"string": false, "fret": false, "finger": false},
      "reasons": ["ROLL"], "confidence": 0.7, "system": "simandl" }
  ],
  "leftHand": {
    "hand": [ { "t": 0.0, "fret": 3 } ],
    "system": [ { "t": 0.0, "mode": "simandl" } ],
    "fingers": {
      "1": [
        { "t": -0.06, "string": 1, "fret": 2.75, "pressed": false, "visible": true,  "ease": "easeInOut" },
        { "t": -0.02, "string": 1, "fret": 2.75, "pressed": true,  "visible": true,  "ease": "step", "noteId": "n1", "role": "fret" },
        { "t": 0.45,  "string": 1, "fret": 2.75, "pressed": false, "visible": true,  "ease": "step", "role": "mute" },
        { "t": 0.85,  "string": 1, "fret": 2.75, "pressed": false, "visible": false }
      ],
      "4": [
        { "t": 0.40, "string": 2, "fret": 4.75, "pressed": false, "visible": true, "ease": "easeInOut" },
        { "t": 0.47, "string": 2, "fret": 4.75, "pressed": true,  "visible": true, "ease": "step", "noteId": "n2", "role": "fret" },
        { "t": 0.95, "string": 2, "fret": 4.75, "pressed": false, "visible": true, "ease": "easeInOut", "role": "mute" },
        { "t": 0.97, "string": 3, "fret": 4.75, "pressed": true,  "visible": true, "ease": "step", "noteId": "n3", "role": "fret" },
        { "t": 1.45, "string": 3, "fret": 4.75, "pressed": false, "visible": true, "ease": "easeInOut", "role": "mute" },
        { "t": 1.47, "string": 2, "fret": 4.75, "pressed": true,  "visible": true, "ease": "step", "noteId": "n4", "role": "fret" },
        { "t": 1.95, "string": 2, "fret": 4.75, "pressed": false, "visible": true, "ease": "step", "role": "mute" },
        { "t": 2.35, "string": 2, "fret": 4.75, "pressed": false, "visible": false }
      ],
      "3": [
        { "t": 0.47, "string": 2, "fret": 4.40, "pressed": true, "visible": true,  "ease": "step", "role": "support" },
        { "t": 0.95, "string": 2, "fret": 4.40, "pressed": false, "visible": false, "ease": "step" },
        { "t": 0.97, "string": 3, "fret": 4.40, "pressed": true, "visible": true,  "ease": "step", "role": "support" },
        { "t": 1.45, "string": 3, "fret": 4.40, "pressed": false, "visible": false, "ease": "step" },
        { "t": 1.47, "string": 2, "fret": 4.40, "pressed": true, "visible": true,  "ease": "step", "role": "support" },
        { "t": 1.95, "string": 2, "fret": 4.40, "pressed": false, "visible": false }
      ],
      "2": [], "T": []
    },
    "barres": []
  },
  "rightHand": {
    "mode": "fingerstyle",
    "events": [
      { "time": 0.0, "noteIds": ["n1"], "strings": [1], "kind": "pluck", "fingers": ["i"], "stroke": "rest", "reason": "ALTERNATE" },
      { "time": 0.5, "noteIds": ["n2"], "strings": [2], "kind": "pluck", "fingers": ["m"], "stroke": "rest", "reason": "ALTERNATE" },
      { "time": 1.0, "noteIds": ["n3"], "strings": [3], "kind": "pluck", "fingers": ["i"], "stroke": "rest", "reason": "ALTERNATE" },
      { "time": 1.5, "noteIds": ["n4"], "strings": [2], "kind": "pluck", "fingers": ["i"], "stroke": "rest", "rake": true, "reason": "RAKE" }
    ],
    "thumbRest": [
      { "t": -0.04, "on": "pickup" },
      { "t": 0.96,  "on": 1 },
      { "t": 1.46,  "on": "pickup" }
    ]
  },
  "warnings": []
}
```

Notes on the example:

- After G1 ends, finger 1 keeps touching the E string (muting) until the idle timeout (BMP-01).
- When the pinky switches to `mute` the support finger is hidden, because the ring finger only presses together with the pinky.
- The rake at 1.5 s uses the index again. It had just rest-stroked the D string (string 3) and landed on the A string (string 2), where the next note is.


---

## Part 10 — Config and presets

Status: DRAFT

All numbers live in one config object. Bass defaults are in `bass/defaults.ts`. The hand profile is in `core/hand-profiles.ts` and is shared with the Guitar engine. A preset is a partial config merged over the defaults; user/UI settings are merged last. `configHash` goes into the output. Every value is **CALIBRATE** unless it comes from a cited measurement.

### 1. Defaults

```ts
const BASS_DEFAULTS = {
  instrument: {                                   // BG-*, BP-006
    numStrings: 4, tuningPreset: '4-standard', tuning: [28, 33, 38, 43], capo: 0,
    numFrets: 22, scaleLengthMm: 863.6, nutSpreadMm: 33, bridgeSpreadMm: 57,
    fretless: false, octaveShift: 0, autoSuggest: true,
  },
  input: {
    tabPolicy: 'respect', respectFingering: true, outOfRange: 'skip',
    ghostVelocity: 45, midiDeadNoteHeuristic: false, legatoOverlapTrimSec: 0.03,
    pitchBendRangeSemitones: 2, graceDurationSec: 0.06,
  },
  geometry: { fingertipBehindFret: 0.25 },        // BG-07 (fretless forces 0, BG-06)
  hand: { profile: 'medium' },                    // BP-009, spans in core/hand-profiles.ts
  leftHand: {
    system: 'auto',                               // BLH-04
    fingerProb: { 1: 0.35, 2: 0.30, 3: 0.15, 4: 0.20 },   // BLH-07
    preferredMaxFret: 9,                          // BLH-09
    persistWindowSec: 0.8,                        // BLH-18
  },
  solver: {
    onsetToleranceSec: 0.015, segmentGapSec: 2.0, beamWidth: 128, maxStaticCost: 50,
    hardMoveExponent: 1.3, shiftRefMm: 35, minFreeTimeSec: 0.05,
    confidenceScale: 2.0, relaxSpanFactor: 1.15,
  },
  weights: {
    // static (Part 06 §2)
    span: 1.0, frameSpan: 1.0, fingerDifficulty: 1.0, ringAlone: 3.0, extensionBack: 0.6, extensionForward: 0.8,
    crossing: 2.0, miniBarre: 0.5, openStrings: -0.2, highFret: 0.15, bendFinger: 2.0, techniqueFinger: 1.5,
    // transition (Part 06 §3)
    shift: 1.0, shiftCount: 0.8, guideFinger: -0.5, stringChange: 0.4, sameFingerJump: 0.5,
    roll: 0.2, relift: 0.4, sustainCut: 1.0,
  },
  rightHand: {
    mode: 'auto',                                 // BP-010
    fingerstyle: {
      fingers: 2, threeFingerOrder: 'a-m-i', threeFingerBelowSec: 0.09, fastSec: 0.11,
      rake: { enabled: true, maxStrings: 2 },     // BP-011
      costs: { repeat: 2.0, rake: -0.5, reverseRake: 1.0, ringFinger: 0.3 },
    },
    pick: { style: 'auto', downOnlyMinIntervalSec: 0.14 },
    slap: { thumbMaxString: 'auto', popAlternateSec: 0.15, doubleThumb: false, doubleThumbSec: 0.12 },
    thumbRest: { style: 'movableAnchor', leadSec: 0.04 },   // BP-014
  },
  motion: {
    holdPolicy: 'releaseAtNoteEnd',               // BP-012
    idleLiftSec: 0.4, supportOffsetFret: 0.35,
    leadFraction: 0.4, minLeadSec: 0.02, maxLeadSec: 0.15,
    fitts: { aSec: 0.040, bSecPerBit: 0.030, targetWidthMm: 12 },
    slideMaxSec: 0.15, harmonicReleaseSec: 0.05, bendRiseSec: 0.15,
  },
  slide: { inFrets: 3, inSec: 0.10, outFrets: 5, outSec: 0.15 },
  output: { emitSupportFingers: true, emitThumbRest: true },
  humanize: { enabled: true, timeJitterSec: 0.008, posJitterFret: 0.04 },
  debug: false,
};
```

### 2. Hand profiles (shared with the Guitar engine, BP-009)

| Profile | Multiplier on every `comfort` and `max` span | Use |
|---|---|---|
| `small` | 0.9 | smaller hands, beginners |
| `medium` | 1.0 | default (the Guitar plan's LH-04 numbers) |
| `large` | 1.1 | large hands: one-finger-per-fret from fret 1 on a 34" bass |

### 3. Presets

| Preset ID | Phase | Changes vs default | Intended use |
|---|---|---|---|
| `default` | B1 | — | Pop/rock/R&B fingerstyle, auto fingering system |
| `beginner` | B1 | `leftHand.system 'simandl'`, `openStrings −0.8`, `preferredMaxFret 5`, `shiftCount 1.5`, `rake.enabled false` | Teaching videos: first positions, open strings, strict alternation |
| `rock-pick` | B2 | `rightHand.mode 'pick'`, `pick.style 'auto'`, `openStrings −0.4` | Pick bass, down-picked eighth notes |
| `jazz-walking` | B2 | `openStrings +0.2`, `extensionBack 0.3`, `extensionForward 0.4`, `preferredMaxFret 12`, `sustainCut 1.5` | Walking lines with chromatic approach notes, legato quarter notes |
| `thumb-muted` | B2 | `rightHand.mode 'thumb'`, all plucks `muted: true`, `thumbRest.style 'anchor'` | Motown / upright-like thumb sound |
| `metal-three-finger` | B4 | `fingerstyle.fingers 3`, `threeFingerBelowSec 0.11` | Fast runs and gallops |
| `funk-slap` | B4 | `rightHand.mode 'slap'` | Slap and pop, octave patterns, dead notes |
| `funk-slap-advanced` | B4 | `funk-slap` + `slap.doubleThumb true` | Double-thumbing |
| `fretless` | B4 | `instrument.fretless true`, `openStrings +0.3`, `humanize.posJitterFret 0.02` | Fretless bass (singing lines, slides) |

### 4. Adding a preset later

1. Add an entry in `bass/presets.ts` containing only the changed keys.
2. Add a fixture proving the intended difference (Part 11).
3. Add a row above and a Changelog entry.


---

## Part 11 — Validation, testing and debug

Status: DRAFT

### 1. Validator (`bass/validate-bass.ts`, runs on every result)

The validator re-checks the final timeline independently of the solver. In tests any failure is a bug. In production it becomes warning `VALIDATION_FAILED` with details.

| ID | Check |
|---|---|
| BV-01 | All shared checks V-01..V-11 (Part 02 §6). Exceptions: V-01 (`tuning + fret = pitch`) is skipped for `dead` notes, and uses the harmonic node table (BSV-13) for `harmonic` notes. |
| BV-02 | **Simandl support**: when `emitSupportFingers` is on, every finger-4 press with `system = 'simandl'` has a finger-3 `support` keyframe on the same string with the same press interval. Finger 3 never plays another note during that interval. |
| BV-03 | Finger 3 plays alone in the Simandl zone only if the note is finger-locked or the reason list contains `FALLBACK_RELAXED`. |
| BV-04 | `rake: true` only when the plucking finger equals the previous pluck's finger **and** the string index decreased by 1 … `rake.maxStrings`. |
| BV-05 | `slap` events only on strings ≤ `thumbMaxString`, and `pop` events only above it, unless the note carries an explicit mark. |
| BV-06 | With `releaseAtNoteEnd`, each fretting finger's `pressed` switches to false within 1 ms of its note's end time (before humanization), with `role: 'mute'`. `mute` keyframes always have `pressed: false`. |
| BV-07 | Fretless: every `fret`-role keyframe has a whole-number fret coordinate (± `posJitterFret` when humanization is on). |
| BV-08 | Dead notes: a `mute` keyframe on the dead note's string covering its onset, the hand position unchanged, and a right-hand event with `dead: true`. |
| BV-09 | Legato targets (hammer, pull, legato slide, tie) have no right-hand event. Every other note has exactly one. |
| BV-10 | `thumbRest` is present if `emitThumbRest` is on and the mode is not `slap`. Each entry is `pickup`, `palm` or a valid string index. |
| BV-11 | `instrument.numStrings`, `tuning` and `octaveShift` match the analysis settings. Every `OUT_OF_RANGE` note is absent from `notes` and listed in `warnings`. |

### 2. Fixtures (`__tests__/bass/fixtures/`)

Each fixture = input file(s) + assertions. Where several human fingerings are acceptable, **property assertions** are used instead of exact snapshots. Default instrument: 4-string 34", standard tuning, default preset, medium hand, humanization off.

| ID | Input | Phase | Expected |
|---|---|---|---|
| FB-01 | C major scale C2→C3 (MIDI 36–48), quarter notes at 100 BPM, no tab | B1 | Default: all notes on strings 2–4 at frets 2–5 or open (open D and G are allowed); pitch correct; ≤ 1 shift; no `ringAlone`; no frame-span violation. With `leftHand.system 'ofpf'`, `hand.profile 'large'` and `weights.openStrings +1.0`: fingers exactly **2 4 1 2 4 1 3 4** (the classic position-2 pattern: C=A3, D=A5, E=D2, F=D3, G=D5, A=G2, B=G4, C=G5) and 0 shifts. |
| FB-02 | G1 D2 G2 D2 tab-locked (the Part 09 example) | B1 | Fingers 1, 4, 4, 4 (Simandl position 3, the pinky rolls); finger-3 support on each pinky note; right hand `i m i i` with `rake: true` on the last note; thumb rest `pickup, pickup, 1, pickup`. The output equals the Part 09 JSON (except `configHash`). |
| FB-03 | Octave shapes, tab-locked: A1 (E5) + A2 (D7) as consecutive notes; then A2 (A12) + A3 (G14) | B1 | Low shape: fingers 1 → 4 (Simandl zone). High shape: fingers 1 → 3 (OFPF zone). `system` segments `simandl` then `ofpf`. |
| FB-04 | Eight eighth notes on one fretted note (A string fret 5) | B1 | Right hand strictly alternates (`i m i m …` or `m i m i …`); no rake flags; finger 1 or 4 pressed each time with `mute` touches between notes. |
| FB-05 | Descending crossings, tab-locked: D5 → A5 → E5 eighth notes | B1 | One finger for all three plucks; the 2nd and 3rd have `rake: true`. With `rake.enabled false`: alternation. |
| FB-06 | Ascending crossings, tab-locked: E5 → A5 → D5 | B1 | Alternation; no rake flags. |
| FB-07 | Open E pedal alternating with G-string notes at frets 5 and 10 (E, G5, E, G10, E, G5), tab-locked, eighth notes | B1 | Open E notes have no finger. The hand shifts between positions 5 and 10, and every shift happens during an open-E note (`SHIFT_ON_OPEN_STRING`). |
| FB-08 | Line D1 E1 F1 G1 A1 (26, 28, 29, 31, 33), no tab | B1 | Auto-suggestion `4-dropD` (`LOW_D_ONLY`), D1 = string 1 open. Adding an E♭1 (27) to the line changes the suggestion to `5-lowB`. On a forced 5-string, D1 = string 1 fret 3. On a forced 4-string standard tuning, D1 is skipped with `OUT_OF_RANGE`. |
| FB-09 | A line whose lowest note is B0 (23) | B1 | Suggestion `5-lowB` (`BELOW_E1`); B0 = string 1 open. |
| FB-10 | The same bass line in four encodings: MusicXML with `<transpose><octave-change>-1`; MusicXML with tab and no transpose (written octave high); MusicXML with neither; MIDI | B1 | Identical sounding pitches in all four. Info `OCTAVE_CORRECTED` for the tab case. The third case chooses by BIN-04b; `OCTAVE_UNCERTAIN` only if the scores are close. |
| FB-11 | Legato slide D5 → D7; a note with slide-in; a note with slide-out | B3 | The same finger stays pressed along the slide and arrives exactly at the onset. Slide-in starts 3 frets below; slide-out moves 5 frets down and releases. |
| FB-12 | A string 5 h 7 p 5 | B3 | Same string; finger 1 held on fret 5; the hammer finger lands exactly at the onset; no right-hand event for the hammer and pull targets. |
| FB-13 | Funk figure with x-notehead dead notes | B3 | Dead notes: `mute` touch, no pitch check, hand position unchanged, right-hand event `dead: true`. |
| FB-14 | Slap octave figure: open E1 (thumb) then E2 on the D string fret 2 (pop), repeated in sixteenths | B4 | `slap` with `p` on string 1, `pop` with `i` on string 3; pops closer than 0.15 s alternate `i`/`m`; with `funk-slap-advanced`, fast thumb notes alternate down/up. |
| FB-15 | Pick: eighth notes at 120 BPM (0.25 s) and sixteenth notes at 120 BPM (0.125 s) | B2 | `pick.style 'auto'`: eighths all down-strokes; the sixteenth run alternates. |
| FB-16 | Any line with `instrument.fretless true` | B4 | Every `fret`-role keyframe has a whole-number fret coordinate. |
| FB-17 | Simandl passage with `emitSupportFingers` on and off | B1 | On: a support keyframe for every pinky press in the Simandl zone. Off: no finger-3 keyframes for support. |
| FB-18 | Determinism | B1 | Same seed ⇒ identical JSON; a different seed changes only jitter values. |
| FB-19 | Double stops, tab-locked: power fifth E3+A5 at once; octave A12+G14 at once | B2 | Fifth: fingers 1 & 4 (Simandl). Octave at fret 12: fingers 1 & 3 (OFPF). |
| FB-20 | Plucks on strings 1, 2, 3, 4 in order (4-string) | B2 | `movableAnchor` thumb rest: `pickup, pickup, 1, 1`. `floating`: `pickup, 1, 2, 3`. |
| FB-21 | Gallop (eighth + two sixteenths) at 180 BPM on one string, preset `metal-three-finger` | B4 | No finger repeated back-to-back; `a` is used; order follows `a-m-i`. |
| FB-22 | FB-01 input with `weights.openStrings +1.0`, once with `hand.profile 'small'` and once with `'large'` | B1 | Large: stays in one position (OFPF frame at fret 2 = 124 mm ≤ 132 mm), 0 shifts. Small: ≥ 1 shift (the OFPF frame is not allowed below fret 5). No span or frame-span violations in either. |

Fixture sources: small hand-written MusicXML files (so tab and octave details are known exactly), plus the same content exported from MuseScore and Guitar Pro 8 to cover real encodings (octave handling BIN-03, slap/pop marks BIN-07).

### 3. Acceptance per phase

- All fixtures of the phase pass; the validator reports zero errors on all fixtures.
- The Guitar engine's tests still pass (shared core untouched or changed generically).
- Performance target met on a long real bass part (Part 01 §4).
- The owner watches a rendered video of the phase's fixtures and approves the movement feel.

### 4. Debug report (`config.debug = true`)

Per note: string, fret, finger, fingering system (Simandl/OFPF), reasons, confidence, cost features of the chosen and the runner-up state. Per pluck: finger, stroke, rake, reason. Plus the instrument suggestion with its reasons and the octave decision (BIN-04a..c). The notes are grouped by measure.


---

## Part 12 — Roadmap (build order)

Status: DRAFT

The Bass engine is built **after** the Guitar engine (BD-002) and reuses its core. Each phase ends with a demo video of its fixtures that the owner approves before the next phase. The coding tool implements **only the current phase**.

### Phase B0 — Foundations

- Check that the shared `core/` and `input/` from the Guitar engine exist. If they do not, build them exactly as Part 02 states.
- Add to the core (generic, Guitar tests must still pass):
  - `core/hand-profiles.ts` (BP-009).
  - `kind: 'bass'` in the instrument types.
  - Timeline schema `1.1.0` types (Part 09).
- `bass/instrument.ts`: tuning presets (BG-02), dimensions (BG-03..05, 07), fretless (BG-06).
- Input:
  - Part detection (BIN-02, BIN-02a).
  - Octave logic (BIN-03, BIN-04a..c).
  - Instrument suggestion (BIN-05, BIN-06, BIN-13).
- Fixtures: FB-08, FB-09, FB-10 (input-level assertions).
- **Done when**:
  - Unit tests reproduce every number in Part 03 §3 (34" table, and the 30/32/35" rows).
  - Suggestion and octave tests pass.
  - The Notation Engine's fields for bass have been checked and reported (OQ-B10).

### Phase B1 — Single-note fingerstyle lines

- Candidates and fingering systems:
  - BSV-10, BSV-11.
  - BLH-01..10 and BLH-05a.
  - BLH-17, BLH-18.
- Cost features of Part 06 that apply to single notes.
- Right hand:
  - Mode selection BRH-01..04 (`auto` resolves to fingerstyle).
  - Fingerstyle BRH-F01..F06, BRH-F08, BRH-F09.
- Motion: shared MP rules + BMP-01, BMP-02, BMP-09, BMP-11, BMP-12.
- Timeline 1.1.0 output and the debug report.
- Fixtures: FB-01..FB-07, FB-17, FB-18, FB-22.
- **Demo**: colored dots on a 4-string SVG fretboard for a bass line, with i/m and rake markers.

### Phase B2 — Double stops, pick, thumb, muting position

- Double stops BSV-15, BLH-11, BLH-12.
- Pick BRH-P01..P04; thumb mode BRH-M01, BRH-M02.
- Thumb rest BRH-T01..T04.
- Presets `rock-pick`, `jazz-walking`, `thumb-muted`.
- Fixtures: FB-15, FB-19, FB-20.

### Phase B3 — Techniques

- Legato BLH-13; slides BLH-21, BMP-06, BMP-07; hammer-on/pull-off BMP-08.
- Dead notes BLH-15, BSV-12, BMP-04; ghost notes BLH-16.
- Harmonics BLH-19, BSV-13, BMP-05; bends BLH-14, BMP-03.
- Right-hand tapping BSV-14, BRH-X01, BLH-20.
- Technique marks BIN-07 (except slap/pop); MIDI heuristics BIN-10, BIN-12.
- Fixtures: FB-11, FB-12, FB-13.

### Phase B4 — Slap, three-finger, fretless, overrides, calibration

- Slap and pop:
  - BRH-S01..S06.
  - Slap/pop mark detection (BIN-07), verified with the owner's sample files (OQ-B13).
  - Double thumbing.
- Three-finger BRH-F07; fretless BG-06, BMP-10.
- Presets `funk-slap`, `funk-slap-advanced`, `metal-three-finger`, `fretless`.
- **Manual overrides**: the user clicks a note and sets string/fret/finger or pluck finger. The override becomes a lock and the engine re-solves around it.
- Channel-per-string MIDI (BIN-11).
- Calibration pass: tune every CALIBRATE value against owner-approved videos.
- Fixtures: FB-14, FB-16, FB-21.

### Phase B5 — Later (optional)

- Left-hand slaps (BRH-S07), left-hand tapping, vibrato, artificial harmonics.
- Upright / double bass preset (BP-019), if wanted.
- Learned weights from MusicXML files with human tab (e.g. from the Notes Store), using the feature vectors (SV-25).


---

## Part 13 — Open questions for the owner

Status: OPEN — answers move into Part 00 as BD-xxx

| ID | Question | Current default | Affects |
|---|---|---|---|
| OQ-B01 | Do the Guitar decisions also apply to the bass video? (SVG fretboard with colored finger dots and custom colors; right hand shown; input with or without tab; MusicXML + MIDI only.) | Yes (BP-001..BP-005) | Everything |
| OQ-B02 | Default bass for videos: 4-string, 34", 22 frets? Should the UI let the user choose 5/6-string, short scale, or fretless? | 4-string 34" 22 frets; others selectable | BG-*, UI |
| OQ-B03 | Is it OK that the engine **suggests** the string count and tuning from the notes (e.g. low B ⇒ 5-string, low D ⇒ drop D) and the user confirms or changes it? | Yes (BP-007) | BIN-06, UI |
| OQ-B04 | Fingering system: `auto` (Simandl low on the neck, one-finger-per-fret higher up, decided by mm), or always one of them? Should the video show which system is used (e.g. a small label for teaching)? | `auto`; no label | BLH-04 |
| OQ-B05 | Add a **hand size** option (small / medium / large) to the UI, shared by guitar and bass videos? | Yes, default medium (BP-009) | BLH-05, UI |
| OQ-B06 | Which right-hand styles matter most for MusicNote customers: fingerstyle, pick, slap, or all? Is fingerstyle i-m the right default? | Fingerstyle i-m; all styles by phase | Part 07, Part 12 |
| OQ-B07 | When a bass note ends, the finger stops pressing but keeps touching the string (muting). Should that dot look the same as a pressing dot, look dimmer, or disappear right at the note end? | Same dot, disappears after 0.4 s (BP-012) | BMP-01, renderer |
| OQ-B08 | In Simandl fingering the ring finger presses together with the pinky. Show the ring-finger dot next to the pinky, or hide it? | Show (BP-013) | BMP-02, renderer |
| OQ-B09 | Show the plucking-hand thumb resting position (muting) in the video? Which default: anchor, movable anchor, or floating thumb? | Data produced; `movableAnchor` (BP-014) | BRH-T*, renderer |
| OQ-B10 | Does your Notation Engine give the **sounding** pitch for bass (an octave below the written note)? Does it keep dead notes (x), ghost notes, slides and other technique marks? | Checked in Phase B0 | BIN-03, BIN-07 |
| OQ-B11 | Is fretless bass needed? | Supported in Phase B4 (BP-016) | BG-06 |
| OQ-B12 | Is upright / double bass needed later? | Out of scope (BP-019) | BIN-02a |
| OQ-B13 | How are slap and pop marked in the files you use or sell (Guitar Pro 8 exports, MuseScore, other)? Please share one sample MusicXML file with slap/pop, dead notes and slides, so detection can be tested on real data. | Heuristics BIN-07 | BIN-07, Phase B4 |
| OQ-B14 | The hand-frame span rule (BLH-05a) found while planning bass also improves the Guitar engine. Add it to the Guitar plan's next version? | Recommended: yes | Guitar plan |
| OQ-B15 | How should the video show the bass right hand: labels (i, m, T, P, ↓↑), a rake mark, and the thumb rest? (Renderer design; the data is already in the timeline.) | Renderer decides | Renderer |


---

## Part 14 — Research references

Status: DRAFT (collected 2026-09-27)

| # | Source | What the plan takes from it | Used in |
|---|---|---|---|
| R1 | StudyBass — Fretting: https://www.studybass.com/lessons/bass-technique/fretting/ | Most bassists use one-finger-per-fret over a 4-fret span; if that is too hard, use fingers 1-2-4 and shift more; press "as closely behind the fret as possible"; stretches are easier higher up where frets are closer; the thumb sits behind the neck; the first finger lies flat to mute | BLH-04, BLH-05, BG-07 |
| R2 | BassBros — The Simandl Technique: https://bassbros.co.uk/blog/the-simandl-technique-game-changer-or-thing-of-the-past/ | Simandl = fingers 1-2-4 with the little finger supported by the ring finger, spanning three frets; hybrid advice: Simandl in frets 1–8, one-finger-per-fret from fret 9 | BLH-04, BMP-02, Part 03 §3 |
| R3 | StudyBass — Plucking: https://www.studybass.com/lessons/bass-technique/plucking/ | Rest stroke (the finger follows through to rest on the next string); alternate index and middle; thumb anchored on the pickup; one finger plucks while the other mutes | BRH-F01, F02, F06, BRH-T01 |
| R4 | StudyBass — String-Crossing: https://www.studybass.com/lessons/bass-technique/string-crossing/ | "Follow through and land on the string below"; thumb and fretting-hand muting while crossing strings | BRH-F06, BRH-T* |
| R5 | No Treble — String raking (2026): https://www.notreble.com/buzz/2026/07/15/how-to-use-string-raking-for-faster-smoother-bass-lines/ | Raking = one finger plays several strings in one downward motion; it works only from a higher-pitched to a lower-pitched string; index or middle; useful for root–fifth–octave lines | BRH-F03, F04, FB-02, FB-05 |
| R6 | No Treble — Float or anchor your thumb (2025): https://www.notreble.com/buzz/2025/02/12/the-secret-to-right-hand-bass-technique-float-or-anchor-your-thumb/ | Anchored thumb on the pickup, movable anchor (pickup, moving to the E string when crossing), floating thumb (consistent muting on higher strings) | BRH-T01..T03 |
| R7 | No Treble — Left-hand pivoting (2013): https://www.notreble.com/buzz/2013/06/03/left-hand-technique-pivoting/ | Pivoting is a double-bass technique; electric bassists use one-finger-per-fret ⇒ pivoting is not modeled; extensions (BLH-06) cover small reaches | BLH-06 |
| R8 | Wikipedia — Slapping (music): https://en.wikipedia.org/wiki/Slapping_(music) | Thumb (bony joint) slaps the low E and A strings; index or middle pops the D and G strings; double thumbing (Victor Wooten); slap lines combine hammer-ons, pull-offs and ghost/dead notes | BRH-S01..S05 |
| R9 | Fraunhofer IDMT — IDMT-SMT-Bass dataset: https://www.idmt.fraunhofer.de/en/publications/datasets/bass.html | Bass plucking styles: finger-style, picked, muted, slap-thumb, slap-pluck; expression styles: normal, vibrato, bending, harmonics, dead-note (plus slides) ⇒ the technique list of this plan | Part 07, BIN-07 |
| R10 | Abeßer, "Automatic String Detection for Bass Guitar and Electric Guitar", CMMR 2012: https://cmmr2012.eecs.qmul.ac.uk/sites/cmmr2012.eecs.qmul.ac.uk/files/pdf/papers/cmmr2012_submission_70.pdf | 4-string tuning MIDI 28, 33, 38, 43; most bass pitches can be played at one, two or three positions ⇒ the fingering ambiguity the solver resolves | BG-02, Part 06 |
| R11 | Wikipedia — Bass guitar: https://en.wikipedia.org/wiki/Bass_guitar | 4-string E A D G one octave below the guitar's lowest four; 5-string adds low B; 6-string B0 E1 A1 D2 G2 C3; scale categories 30"/32"/34"/35"; fretless bass | BG-02, BG-03, BG-06 |
| R12 | StudyBass — Bass scale length: https://www.studybass.com/gear/bass-guitar-buying-guide/bass-scale-length/ | Short ≤ 30", medium 30–33", long 34" (most common), extra-long > 34"; 35" recommended for a clear low B | BG-03 |
| R13 | Wikipedia — Fender Precision Bass: https://en.wikipedia.org/wiki/Fender_Precision_Bass ; Fender Jazz Bass: https://en.wikipedia.org/wiki/Fender_Jazz_Bass | 34" scale; 20-, 21-, 22- and 24-fret necks exist | BG-03, BG-04 |
| R14 | TalkBass — Neck width at nut list: https://www.talkbass.com/wiki/neck-width-at-nut-list/ | Jazz Bass 1.5" (38 mm); Precision 1.75" (44.5 mm), 70s 1.62" (41.3 mm); 5-string 44.45–47.6 mm; 6-string 51.3–55 mm | BG-05 |
| R15 | TalkBass — Bass bridges and string spacing resource: https://www.talkbass.com/threads/bass-bridges-and-string-spacing-resource.944983/ | Fender standard bridge spacing 19 mm (¾"); 5-string 16–19.85 mm; 6-string 14–16.5 mm | BG-05 |
| R16 | Wikipedia — General MIDI: https://en.wikipedia.org/wiki/General_MIDI | Bass programs 33–40 (1-based): Acoustic, Electric (finger), Electric (picked), Fretless, Slap 1, Slap 2, Synth 1, Synth 2 | BIN-02, BIN-09 |
| R17 | W3C MusicXML 4.0 — sounds.xml: https://www.w3.org/2021/06/musicxml40/listings/sounds.xml/ | `pluck.bass`, `pluck.bass.acoustic`, `pluck.bass.electric`, `pluck.bass.fretless`, `pluck.bass.synth` … | BIN-02 |
| R18 | W3C MusicXML 4.0 — `<technical>` element: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/technical/ | Full list of technical marks; **no dedicated slap or pop element** ⇒ heuristics | BIN-07 |
| R19 | W3C MusicXML 4.0 — `<other-technical>`: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/other-technical/ | Technical indications not yet in MusicXML, with an optional SMuFL glyph name | BIN-07 |
| R20 | W3C MusicXML 4.0 — notehead values: https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/notehead-value/ ; `<notehead>`: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/notehead/ | `x` / `circle-x` for dead/muted notes; `parentheses="yes"` for parenthesized (ghost) notes | BIN-07 |
| R21 | MuseScore forum — "Bass play one octave lower than what is written": https://musescore.org/en/node/365133 | Bass sounds one octave lower than written | BIN-03, BIN-04a..c |
| R22 | Shared-solver research, from the Guitar plan: Sayegh 1989 (optimum path); Radisavljevic & Driessen 2004 (static + transition costs, learned weights); Hori & Sagayama 2016 (Viterbi, minimax, finger difficulty); Heijink & Meulenbroek 2002 (span and hand repositioning as complexity factors) | Solver structure, minimax exponent, calibration approach | Part 02, Part 06 |

Numbers marked CALIBRATE (span limits and hand profiles, weights, lead times, Fitts constants, raking and slap timing thresholds, ghost velocity, string spreads) are **engineering estimates**, not values from these sources. The fret positions and span tables in Part 03 are computed exactly from GEO-01..03.

---

## Changelog

### [0.1.0] — 2026-09-27
- First draft of the Bass Guitar Human Finger Engine plan, researched and written as one file.
- Decisions BD-001 … BD-005 (confirmed); carried-over BP-001 … BP-005 and proposed BP-006 … BP-020.
- Shared core restated (Part 02) with the Guitar plan's IDs (DM, IN-E, IN-X03, GEO, SV, MP, OUT, V).
- New rule families: BG (instrument/geometry), BIN (input), BLH (left hand, incl. the hand-frame span BLH-05a), BSV (candidates/costs), BRH (right hand: F fingerstyle, M thumb, P pick, S slap, X tap, T thumb rest), BMP (motion), BOUT (output), BV (validation).
- Timeline schema `finger-timeline@1.1.0` (additive over 1.0.0).
- Fixtures FB-01 … FB-22; roadmap Phases B0 … B5; open questions OQ-B01 … OQ-B15.
