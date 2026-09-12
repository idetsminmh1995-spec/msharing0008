# Notation Engine — Master Plan (AUTHORITATIVE)

**Status:** This is the **current authoritative specification** for the
Notation Engine. It lives at `PLAN.md` — the single plan file for this
project. Read this one.

**Version:** 2.0 · **Supersedes:** the original 50-phase roadmap, now kept at
[`Doc/PLAN-v1-historical.md`](./Doc/PLAN-v1-historical.md) as a read-only
historical record (see §2 for exactly what changed and why).
**Last full review:** this document was produced by merging v1 with the
`PLAN__V1.md` requirements update, auditing them both against the code that
actually exists in `src/`, and verifying every technical claim below against
primary sources (W3C MusicXML spec, SMuFL spec, MMA General MIDI spec,
LilyPond/MuseScore engraving documentation).

> **Note on older references.** Files written before this version may cite
> "PLAN.md Phase N" meaning **v1's** numbering. v2 deliberately did not
> renumber completed phases, so Phases 1–13 mean the same thing in both. For
> anything above 13, check §22's roadmap rather than assuming v1's number
> still applies.

---

## 0. How to read this document

Sections 1–5 are architecture and must be read before writing any code.
Sections 6–20 are per-module specifications: each states Responsibility,
Input, Output, Data Structures, Interfaces, Dependencies, Error Conditions,
and Tests. Section 21 onward covers cross-cutting engineering concerns, risks,
and the phase roadmap.

**Modules marked `[BUILT]` already exist in `src/` and are tested.** Their
specification here describes what is actually implemented, not an aspiration.
Modules marked `[TODO]` are not yet written.

---

## 1. Project Goal

Build an **independent, general-purpose music notation engine** in TypeScript
that renders SVG, with **no notation library as a dependency** — not VexFlow,
not AlphaTab, not OpenSheetMusicDisplay. Every layer (data model, geometry,
layout, rendering) is our own.

The engine must:

1. Accept **MusicXML** from any authoring software and render it correctly.
2. Accept **Standard MIDI Files** and render/synchronise against them.
3. Work for **any instrument** — piano, vocal, guitar, drum kit, orchestral —
   with no per-instrument code paths in the core.
4. Be **resizable to any width × height** and **re-themeable (colours, fonts,
   styles)** at any time, without re-parsing the source file.
5. Expose a **playback-position API** that a host application can drive a
   cursor, an animation, or a video renderer from — without the engine
   knowing anything about audio, video, or animation.

### 1.1 Non-goals (deliberately out of scope)

- **Score editing.** The engine renders; it does not provide an editor UI,
  undo stack, or user input handling.
- **Audio synthesis / playback.** The engine reports musical time positions;
  producing sound is the host application's job.
- **Video encoding / drum animation.** Same reasoning — see §17.
- **MusicXML export.** Import only. (Export could be added later; nothing in
  the architecture forbids it, but it is not planned work.)
- **Automatic transcription** (audio → notation).

---

## 2. Critical Review — what changed from v1 and why

This section exists because the update task explicitly asked for a critical
review rather than a merge. These are the substantive findings.

### 2.1 v1's biggest gap: **there was no MIDI input at all**

`PLAN.md` v1 has 50 phases and **not one of them parses MIDI**. It mentions
MIDI only in passing (Phase 36's title says "MusicXML (and later MIDI)"). But
the originating use case — a drum practice video synchronised to a MIDI file —
is fundamentally MIDI-driven. This is the single largest correction in v2:
MIDI parsing, the tempo map, and MIDI↔MusicXML alignment are now
**first-class modules** (§11, §12, §13), not an afterthought.

### 2.2 v1's ordering flaw: the first end-to-end test was at Phase 39 of 50

v1 builds every rendering feature (Groups B–E, phases 9–35) *before* writing
the MusicXML parser (Phase 36). That means the first time a real file could be
rendered end-to-end was ~78% of the way through the project. Every assumption
about the data model, the glyph metrics, and the layout would have gone
unvalidated against reality until then.

**v2 fixes this with a vertical slice.** After the minimum note-rendering
primitives exist, we build a *deliberately limited* MusicXML parser and a
*deliberately naive* layout, and get `renderFromMusicXML()` working end-to-end
on a simple single-voice score. Only then do we go back and add beams,
tuplets, multi-voice, etc. — each with a real file to test against from day
one. See §22.

### 2.3 Things the update requested that should NOT be in the engine

The update's section list includes *Drum Animation Integration*, *Audio
Synchronization*, and *Video Integration*. Building these **into** the engine
would directly contradict the update's own review question — "Animation နဲ့
Notation Engine ကို မလိုအပ်ဘဲ tightly coupled မဖြစ်ဘူးလား?"

**Resolution:** the engine exposes a small, well-defined **Playback Position
API** and **event stream** (§17). Animation, audio, and video are host
applications *consuming* that API. The engine has zero knowledge of them, zero
dependency on them, and is fully testable without them. §17 specifies the API
contract precisely enough that a host app (like the drum-video app) can be
built against it — that is the correct level of "integration."

### 2.4 Redundancy removed from v1

| v1 item | Disposition in v2 |
|---|---|
| Phase 3b (cross-instrument fidelity) as a separate *phase* | Not a phase — it's an **architectural invariant** (§4.3) and an **acceptance criterion** (§20), enforced by test fixtures |
| Phases 46 + 47 (two cursor sync modes as separate phases) | One module with a `mode` option (§16). They share 100% of their math; splitting them into phases was artificial |
| Phase 39 + 39b (pipeline test + compatibility test) | One compatibility test suite (§10.8) |
| Phase 50 (plugin system) | **Deferred, not planned.** No concrete extension use case exists yet. Designing a plugin API before knowing what plugins are for produces the wrong API. The module boundaries in §4 already permit adding features without touching internals |
| Phase 25 (cross-staff beaming) | **Deferred.** Real, but rare, and expensive. Listed as a Known Limitation (§19) rather than planned work |
| Phase 22's micro-tonal accidentals | **Deferred** to the same place |

### 2.5 Technical assumptions in v1 that were wrong or unverified

| Assumption | Finding |
|---|---|
| v1 Phase 11: "key signature accidental positions differ per clef" — treated as needing per-clef tables for *all* clefs | Correct for treble/bass/alto (verified). **But tenor clef's sharps follow a genuinely different shape**, not an offset — v1 didn't know this. Now a documented limitation (§19) |
| v1 implied percussion staff positioning was a convention we'd have to choose | **Wrong — it is specified.** W3C MusicXML: with a percussion clef, `display-step`/`display-octave` are interpreted *as if in treble clef, G4 on line 2*. Our Phase 10 code already matches this; §6.3 now cites the spec |
| v1 Phase 43: "spacing proportional to duration" (no algorithm given) | Underspecified. §14 now specifies the actual algorithm with real constants from LilyPond's published engraving documentation |
| v1 had no collision-avoidance algorithm, only the words "collision avoidance" | §15 now specifies a **skyline** algorithm, the approach MuseScore uses |

### 2.6 What v1 got right and is kept unchanged

- Staff-space units as the universal coordinate system (not pixels).
- SMuFL/Bravura as the glyph source of truth, with metrics read from the
  font's own metadata rather than hardcoded.
- Strict separation of `geometry/` (pure math) from `render/` (SVG output).
- A single typed config object as the customisation backbone.
- Snapshot-based visual regression testing from very early on.
- Instrument-agnostic core data model.

These are good decisions, already implemented, and v2 builds on them.

---

## 3. Project Scope

### 3.1 Input formats

| Format | Support level |
|---|---|
| MusicXML 3.0/3.1/4.0, uncompressed (`.musicxml`, `.xml`) | Full — primary format |
| Compressed MusicXML (`.mxl`, a ZIP container) | Full (requires a ZIP reader — see §10.2) |
| Standard MIDI File format 0 and 1 (`.mid`) | Full for notes, tempo, time signature, and key signature meta events |
| MIDI format 2 | Not supported (rare; sequences of independent patterns, no meaningful single timeline) |

### 3.2 Notation features

**In scope:** staves (1–6 lines), all standard clefs, key signatures, time
signatures (including additive/irregular), barlines and repeats, noteheads
(all standard shapes), stems, flags, beams, rests, accidentals, ties, slurs,
tuplets, articulations, ornaments, dynamics, hairpins, tempo marks, multiple
voices per staff, grand staff / multi-part scores, lyrics, chord symbols,
grace notes, ledger lines, percussion/drum notation, measure numbering.

**Out of scope for now:** cross-staff beaming, microtonal accidentals,
figured bass, tablature *rendering* (the data model tolerates it; the
renderer does not implement fret numbers), mensural/early notation, jianpu.

---

## 4. Core Architecture

### 4.1 The pipeline

```
  ┌────────────┐   ┌────────────┐   ┌──────────┐   ┌────────┐   ┌─────┐
  │  MusicXML  │──▶│            │   │          │   │        │   │     │
  │   parser   │   │   Score    │──▶│ Geometry │──▶│ Layout │──▶│ SVG │
  ├────────────┤   │ (core data │   │  (pure   │   │        │   │     │
  │    MIDI    │──▶│   model)   │   │   math)  │   │        │   │     │
  │   parser   │   │            │   │          │   │        │   │     │
  └────────────┘   └─────┬──────┘   └──────────┘   └───┬────┘   └─────┘
                         │                             │
                         ▼                             ▼
                   ┌───────────┐              ┌────────────────┐
                   │  Timing   │─────────────▶│   Playback     │
                   │  engine   │              │  position API  │
                   │(tempo map)│              │   (§17)        │
                   └───────────┘              └────────────────┘
```

**Every arrow is one-directional.** No module reaches backwards. The exact
permitted dependencies — verified against the code, not aspirational:

| Module | May import from | Never imports |
|---|---|---|
| `core/` | (nothing) | everything else |
| `glyphs/` | (nothing) | everything else |
| `config/` | (nothing) | everything else |
| `geometry/` | `core/`, `glyphs/`, `config/` | `render/`, `layout/`, `parser/` |
| `render/` | `geometry/`, `glyphs/`, `config/` | `core/` directly, `layout/`, `parser/` |
| `layout/` | `core/`, `geometry/`, `config/` | `render/` |
| `parser/` | `core/` | everything else |

In words:

- `core/` knows nothing about geometry, layout, SVG, or file formats.
- `geometry/` computes positions and sizes; it **never emits SVG**. It reads
  glyph metrics (bounding boxes, anchors) from `glyphs/` because measurement
  is geometry's job, not the renderer's.
- `render/` turns geometry's output into SVG strings; it **never computes
  musical logic**. It reads `glyphs/` too, but only for the glyph *character*
  to place in a `<text>` element — never to decide a position.
- `layout/` orchestrates geometry into positioned systems; it never emits SVG
  directly — it produces positions that `render/` draws.
- `parser/` produces `core/` objects and nothing else.

`config/` is a leaf that anything may read, which is what makes it usable as
the single customisation backbone (§8) without creating cycles.

This is testable at the boundary: `geometry/` functions are pure and unit
testable with no DOM; `render/` functions are string-producing and
snapshot-testable; `parser/` is testable by asserting on the `Score` it
produces without rendering anything.

### 4.2 Coordinate system (single most important convention)

**One unit = one staff space** (the distance between two adjacent staff
lines). Never pixels, anywhere in `geometry/` or `render/`.

- **Y increases downward** (SVG convention), so **higher pitches are more
  negative**.
- **A staff's bottom line is y = 0.** This matches the SMuFL specification's
  glyph registration convention, so a glyph placed at a computed staff
  position needs no offset correction.
- Conversion to pixels happens in exactly **one place**: the `<svg>`
  element's `width`/`height` versus its `viewBox`, controlled by
  `pxPerStaffSpace`. This is what makes §16.3's arbitrary resize a
  single-number change rather than a re-computation.
- **SMuFL glyph font-size = 4 × staff spaces.** Per the SMuFL spec, one staff
  space = 0.25 em, so a glyph rendered "at 1 staff space scale" needs
  `font-size: 4` in staff-space units. `[BUILT: SMUFL_STAFF_SPACES_PER_EM]`

### 4.3 Architectural invariant: instrument-agnosticism

**No module may branch on instrument type.** There is no `if (isDrum)`
anywhere. A drum part and a piano part differ only in:

- which **clef** is applied (percussion vs treble/bass),
- which **notehead mapping** is configured (§8),
- how many **staff lines** the staff has,
- whether a **lyrics** row is present.

All four are configuration, not code paths. This invariant is what makes
"works for any instrument" true by construction rather than by testing every
instrument. It is enforced by a lint-level convention and by §20's acceptance
criteria (drum, piano, and vocal fixtures must all pass the same pipeline).

### 4.4 Determinism

Given the same input file and the same config, the engine must produce
**byte-identical SVG**. No randomness, no time-dependence, no iteration over
unordered maps where order affects output. This is what makes snapshot
testing (§18.2) viable.

---

## 5. Folder / File Structure

```
notation-engine/
  PLAN.md                 <- this file (authoritative spec, v2)
  Doc/                    <- per-phase build records (what/how-to-change/how-to-revert)
    PLAN-v1-historical.md <- the superseded v1 roadmap, read-only
  docs/                   <- generated API reference (Phase: Public API)
  package.json  tsconfig.json  eslint.config.js  .prettierrc.json
  src/
    core/         [BUILT]  data model: Pitch, Duration, Note, Rest, Chord,
                           Voice, Measure, Part, Score + duration/tick math
    glyphs/       [BUILT]  SMuFL glyph table + Bravura metadata loader
    config/       [BUILT]  the single typed EngineConfig + resolveConfig()
    geometry/     [PARTIAL] pure math: staff, clef, key-sig, time-sig, barline
                           [TODO] notehead, stem, flag, rest, accidental, beam,
                           tie, slur, tuplet, ledger, spacing, skyline
    render/       [PARTIAL] SVG string building: primitives, staff, clef,
                           key-sig, time-sig, barline [TODO] the rest
    parser/       [TODO]   musicxml/ and midi/ subfolders
    timing/       [TODO]   tempo map, tick<->seconds, MIDI/XML alignment
    layout/       [TODO]   measure widths, system breaking, scroll/page modes
    playback/     [TODO]   position API + event stream (§17)
    export/       [TODO]   SVG/PNG/PDF output
    index.ts      [BUILT]  public API barrel
  test/
    unit/         [BUILT]  per-module unit tests (node --test)
    visual/       [BUILT]  snapshot regression tests + __snapshots__/
    fixtures/     [TODO]   real MusicXML/MIDI files from multiple programs
    helpers/      [BUILT]  loadEngine(), matchSnapshot()
```

**Rule:** every `geometry/X.ts` that needs drawing has a matching
`render/X.ts`. The geometry file computes positions and returns plain data;
the render file turns that data into SVG strings. Neither does the other's
job. `[BUILT — this pattern is already followed by staff, clef, key-signature,
time-signature, and barline]`

**Three folders exist on disk but are deliberately absent from the list
above:** `src/cursor/`, `src/theme/` and `src/plugins/` are leftover Phase-1
placeholders, each containing only a README. v2 superseded all three —
`cursor/` became the broader `playback/` module (§17), `theme/` was folded
into `config/` (§8) rather than kept as a duplicate system, and `plugins/`
was deferred (§2.4). Their READMEs say so and point at the replacement. They
hold no code and can be deleted; they are noted here only so that finding
them on disk doesn't read as a contradiction of this section.

---

## 6. Module: `core/` — Internal Notation Data Model `[BUILT]`

**Responsibility.** Represent a score exactly as notated, independent of how
it will be drawn or where it came from. Nothing here knows about SVG, pixels,
clefs-as-glyphs, MusicXML, or MIDI.

**Input.** Constructed by parsers (§10, §11) or by hand in tests.
**Output.** A `Score` tree consumed by `geometry/`, `layout/`, `timing/`.

### 6.1 Data structures

```ts
type PitchStep = 'C'|'D'|'E'|'F'|'G'|'A'|'B';

// A discriminated union — this is what makes §4.3 true.
type Pitch = PitchedPitch | UnpitchedPitch;
interface PitchedPitch   { kind:'pitched';   step:PitchStep; alter:number; octave:number }
interface UnpitchedPitch { kind:'unpitched'; displayStep:PitchStep; displayOctave:number }

interface Duration {
  type: DurationType;       // 'whole'|'half'|'quarter'|'eighth'|'16th'...'1024th'
  dots: number;
  ticks: number;            // authoritative length, normalised (see §6.2)
  tuplet?: { actualNotes:number; normalNotes:number };
}

interface Note  { kind:'note'; pitch:Pitch; duration:Duration; voice:number;
                  staff?:number; tieStart?:boolean; tieStop?:boolean }
interface Rest  { kind:'rest'; duration:Duration; voice:number; staff?:number }
interface Chord { kind:'chord'; notes:readonly Note[]; duration:Duration;
                  voice:number; staff?:number }

type MeasureEvent = Note | Rest | Chord;

interface Voice   { id:number; events:readonly MeasureEvent[] }
interface Measure { number:number; voices:readonly Voice[] }
interface Part    { id:string; name?:string; measures:readonly Measure[] }
interface Score   { parts:readonly Part[]; title?:string; composer?:string }
```

**Why `Pitch` is a union rather than a flag:** a drum note and a piano note
are the *same* `Note` type. There is no `Note.isDrum`. `Part` deliberately has
no instrument-kind field either. This is §4.3 enforced by the type system.

**Why `Chord` validates on construction:** `chord(notes)` throws unless there
are ≥2 notes and all share the same voice, tick length, and staff. The
chord's own `duration`/`voice`/`staff` are *derived from its first note*, not
passed separately, so they cannot drift out of sync. `[BUILT]`

### 6.2 Tick normalisation — the drift-prevention foundation

`TICKS_PER_QUARTER = 480`, fixed, engine-internal. **Every** duration from
**every** source is normalised to it on import:

- MusicXML: `ticks = xmlDuration * 480 / divisions` — where `divisions` is
  that file's own (and can legally differ per part, and change mid-piece).
- MIDI: `ticks = midiDelta * 480 / ppq` — where `ppq` is that file's header
  division value.

**This is the single most important anti-drift decision in the engine.**
Because every tick value in the `Score` is in the same unit, ticks from
different parts, different files, and different sources are directly
comparable and summable with no conversion at the point of use. Drift
accumulation from repeated per-note float conversion cannot happen, because
conversion happens exactly once per note at import.

480 is the standard MIDI/DAW convention and divides exactly down to a 128th
note. Durations finer than that (256th and beyond) produce non-integer ticks;
`Duration.ticks` is `number`, not `int`, so this is legal but is noted as a
minor known limitation (§19).

### 6.3 Interfaces (`duration-math.ts`) `[BUILT]`

| Function | Purpose |
|---|---|
| `baseTicksForType(type)` | Ticks for a bare duration type |
| `ticksWithDots(base, dots)` | `base × (2 − 2^−dots)` |
| `applyTuplet(ticks, tuplet)` | `× normalNotes/actualNotes` |
| `ticksForDisplayedDuration(d)` | All three combined |
| `durationTypeAndDotsFromTicks(ticks, maxDots=3)` | Inverse; longest-type-first search; returns `null` rather than approximating |
| `xmlDivisionsToTicks(v, divisions)` / `ticksToXmlDivisions` | MusicXML normalisation |
| `sumTicks(durations)` | Tie-chain totals |

**Error conditions.** `ticksWithDots` throws on negative/non-integer dots.
`xmlDivisionsToTicks` throws on `divisions <= 0`. `durationTypeAndDotsFromTicks`
returns `null` on no exact match — callers must split into tied notes rather
than round.

**Tests.** `[BUILT]` Known-value assertions for every function (dotted ratios,
3:2 triplets, two different `divisions` values round-tripping, tied-eighths
summing to a quarter, nonsense input returning `null`).

---

## 7. Module: `glyphs/` — SMuFL Glyph Table `[BUILT]`

**Responsibility.** Be the single source of truth for musical symbol
codepoints and engraving metrics. Nothing else in the engine may hardcode a
glyph codepoint or an engraving measurement.

**Input.** Two real data files, committed to the repo:
- `data/glyphnames.json` — the W3C SMuFL specification's own glyph-name →
  codepoint table (2,940 entries). **Font-independent.**
- `data/bravura_metadata.json` — Bravura 1.38's engraving defaults, 3,262
  glyph bounding boxes, and 590 glyphs' anchor points. **Font-specific.**

**Output.** `GlyphInfo { name, codepoint, char, description, bBox?, anchors? }`
and engraving-default numbers.

### 7.1 Interfaces `[BUILT]`

| Function | Purpose |
|---|---|
| `getGlyph(name)` | Merges font-independent + font-specific data. Returns `undefined` for unknown names — **never throws**, because a missing anchor is a normal case most glyphs have |
| `getEngravingDefault(key)` / `getEngravingDefaults()` | Bravura's recommended metrics in staff spaces |
| `codepointToChar(cp)` | `"U+E0A4"` → the character |
| `getFontInfo()` | `{ name, version }` for diagnostics |

### 7.2 Engraving defaults actually used by the engine

These are read from the font, not invented. Verified values from Bravura 1.38:

| Key | Value | Used by |
|---|---|---|
| `staffLineThickness` | 0.13 | Staff (§9.1) |
| `stemThickness` | 0.12 | Stems |
| `beamThickness` | 0.5 | Beams |
| `thinBarlineThickness` | 0.16 | Barlines |
| `thickBarlineThickness` | 0.5 | Barlines |
| `barlineSeparation` | 0.4 | Barlines |
| `repeatBarlineDotSeparation` | 0.16 | Repeat barlines |
| `dashedBarlineDashLength` / `GapLength` | 0.5 / 0.25 | Dashed barlines |
| `legerLineThickness` | 0.16 | Ledger lines |
| `slurMidpointThickness` / `slurEndpointThickness` | 0.22 / 0.1 | Slurs |
| `tieMidpointThickness` / `tieEndpointThickness` | 0.22 / 0.1 | Ties |
| `tupletBracketThickness` | 0.16 | Tuplets |

**Swapping fonts.** Because `glyphnames.json` is font-independent and only
`bravura_metadata.json` is font-specific, supporting a different SMuFL font
(Petaluma, Leland) means adding one metadata file and a font-id parameter —
glyph *names* never change. Not planned work, but the design permits it.

**Error conditions.** Unknown glyph name / unknown metric key → `undefined`.
Callers decide whether that is fatal.

**Tests.** `[BUILT]` Real spec-correct codepoints asserted (`gClef` = U+E050,
`noteheadBlack` = U+E0A4, `noteheadXBlack` = U+E0A9), real anchors present,
Bravura's published defaults matched exactly, unknown names returning
`undefined`.

---

## 8. Module: `config/` — Engine Configuration `[BUILT, needs extension]`

**Responsibility.** Hold every user-facing setting in one typed object.
**Nothing user-facing may be hardcoded anywhere else in the engine.**

### 8.1 Current shape `[BUILT]`

```ts
interface EngineConfig {
  colors:          { ink:string; background:string; overrides?:Record<string,string> }
  layout:          { mode:'scroll'|'page'; pxPerStaffSpace:number }
  cursor:          { mode:'cursorMoves'|'notationMoves' }
  noteheadMapping: { defaultShape:string; overridesByKey?:Record<string,string> }
  beam:            { style:'straight'|'flat'|'curved' }
  barNumbers:      { display:'off'|'everyBar'|'everyNBars'|'systemStart'; everyNBars?:number }
  keySignature:    { style:'standard' }
}
resolveConfig(partial?) → EngineConfig   // merges against DEFAULT_CONFIG section by section
```

Every enum-like field is a **union type, not a string**, so typos are compile
errors rather than silent no-ops. `resolveConfig` is the only supported way to
obtain a config; nothing reads `DEFAULT_CONFIG` directly.

### 8.2 Sections to be added as their modules land `[TODO]`

```ts
  spacing:   { increment:number; shortestDurationSpace:number;
               minNoteDistance:number; justify:boolean }        // §14
  staves:    { minStaffDistance:number; minSystemDistance:number } // §15
  page:      { width:number; height:number; margins:{...} }      // §16.2
  fonts:     { musicFont:string; textFont:string; lyricFont:string;
               sizes:{ barNumber:number; lyric:number; dynamic:number;
                       tempo:number; chordSymbol:number } }
  drums:     { mapping:DrumMappingTable }                        // §9.4
  debug:     { logLevel:'silent'|'error'|'warn'|'info'|'debug';
               drawBoundingBoxes:boolean; drawSkyline:boolean }  // §18.3
```

**Rule for adding a section:** add its interface, add its default to
`DEFAULT_CONFIG`, add one line to `resolveConfig`'s merge. Nothing else
changes. `resolveConfig` deliberately spells out each section rather than
using a generic deep-merge, because a generic version cannot stay fully typed
under `exactOptionalPropertyTypes` without unsafe casts.

**Error conditions.** None — `resolveConfig` cannot fail; invalid values are
prevented by the type system at the call site.

**Tests.** `[BUILT]` Empty override equals defaults; single-field override
leaves siblings and other sections untouched; multi-section override merges
correctly; `DEFAULT_CONFIG` is never mutated.

---

## 9. Module: `geometry/` + `render/` — Notation Elements

Each element below follows the same two-file pattern (§5). Elements marked
`[BUILT]` are implemented and tested; `[TODO]` are specified but unwritten.

### 9.1 Staff `[BUILT]`

`computeStaffGeometry(numLines)` → `{ numLines, lineYPositions, height }`.
Bottom line at y=0, higher lines at −1, −2, … Works for **any** positive line
count: 5 (standard), 1 (single-line percussion), 6 (tab), anything else.
`renderStaff(geometry, {x, y, width, color, lineThickness})` draws it.

*Gotcha already fixed and worth not re-introducing:* computing line y as `-i`
yields JavaScript's `-0` at i=0, which is `!==` `0` under strict/deep equality
even though it prints identically. Use `0 - i`.

### 9.2 Clef `[BUILT]`

A clef is **one reference pitch pinned to one reference y**, plus an
`octaveShift`, plus a `positionsByPitch` flag. Not a per-clef lookup table.

```ts
staffPositionForPitch(clef, step, octave)
  = clef.referenceY − (diatonicIndex(step, octave + clef.octaveShift)
                       − clef.referenceDiatonicIndex) × 0.5
```

Each diatonic step is exactly 0.5 staff space. Accidentals never affect
position (C♯ and C♮ share a line), so `alter` is not a parameter — deliberately.

Built-in clefs, each verified against its standard line mnemonic:

| Clef | Reference | Lines bottom→top |
|---|---|---|
| Treble | G4 at y=−1 | E4 G4 B4 D5 F5 |
| Bass | F3 at y=−3 | G2 B2 D3 F3 A3 |
| Alto | C4 at y=−2 | F3 A3 C4 E4 G4 |
| Tenor | C4 at y=−3 | D3 F3 A3 C4 E4 |
| Soprano | C4 at y=0 | C4 E4 G4 B4 D5 |
| Treble 8vb / 8va | G4, octaveShift +1 / −1 | (sounds an octave lower / higher than written) |
| **Percussion** | **G4 at y=−1 (identical to treble)** | — |
| Tab | `positionsByPitch: false` | (string number, not pitch, determines position) |

**The percussion clef's reference is not a guess — it is the specification.**
W3C MusicXML, on `<display-step>`/`<display-octave>`: *"If percussion clef is
used, the display-step and display-octave elements are interpreted as if in
treble clef, with a G in octave 4 on line 2."* Our implementation matches
this exactly. The same spec text also states that if those elements are
absent, the note goes on the **middle line**, "generally used for a one-line
staff" — §10.5 handles that case.

**Clef glyph placement.** Every clef glyph is anchored at the staff's **bottom
line**, regardless of clef. This looks wrong but is correct: SMuFL clef glyphs
are each pre-designed relative to a nominal staff whose bottom line sits at the
font's own baseline, so no per-clef y-offset is needed in the renderer. The
`referenceY` field is for positioning *notes*, not the clef glyph itself.

### 9.3 Key signature `[BUILT, with a documented gap]`

`SHARP_ORDER = F C G D A E B`; `FLAT_ORDER` is its exact reverse.
`keySignatureAccidentals(fifths, clefName)` → `{step, type, y}[]`.
`cancellationNaturals(oldFifths, newFifths, clefName)` handles mid-piece key
changes (cancel-all when going to C or switching type; cancel-only-the-excess
when reducing the same type).

Positions are a **hardcoded per-clef table, not derived from
`staffPositionForPitch`** — engravers place each of the 7 accidentals at a
specific conventional octave chosen for compactness, which does not reduce to
a formula. Treble was verified against explicit line-by-line sources; bass was
verified independently *and* cross-checked as exactly treble+1 across all 14
values; alto as treble+0.5, cross-validated two ways.

**Known gap: tenor and soprano throw a named error rather than guess.** Tenor's
sharps genuinely differ in shape (F♯/G♯ drawn an octave lower, no octave
break) — confirmed by multiple sources and by VexFlow's own source needing a
hardcoded exception array. Shipping a silently-wrong key signature is worse
than refusing to draw one. See §19.

### 9.4 Time signature `[BUILT]`

`timeSignature(num, den, {numeratorDisplay?, symbol?})` validates on
construction: positive-integer numerator, power-of-2 denominator,
`symbol:'common'` only for 4/4, `symbol:'cut'` only for 2/2.

Additive/irregular meters use `numeratorDisplay` (e.g. `"3+2+2"`) while
`numerator` stays the true total (7) for beat maths. There is deliberately no
separate "irregular meter" type — nothing downstream needs to know.

Digits are spaced by **each glyph's real Bravura width** (they are not
uniform: `1` is 1.176sp, `0`/`4` are 1.72sp), and the narrower of
numerator/denominator is centred against the wider.

### 9.5 Barlines & bar numbers `[BUILT]`

`computeBarlineGeometry(type, metrics)` returns a stroke list built entirely
from real Bravura metrics. Dot direction is semantic, not decorative:

| Type | Stroke sequence |
|---|---|
| `single` | thin |
| `double` | thin, thin |
| `final` | thin, thick |
| `repeatBegin` | thick, thin, **dots** (dots point *forward* into the repeat) |
| `repeatEnd` | **dots**, thin, thick (dots point *back* at what just played) |
| `repeatBoth` | dots, thin, thick, thick, thin, dots |
| `dashed` | one dashed line using the font's own dash/gap lengths |

`shouldShowBarNumber(measureNumber, config, isSystemStart)` implements all
four display modes. `isSystemStart` is supplied by the caller because only the
layout engine knows where systems break.

### 9.6 Ledger lines `[BUILT]`

**Responsibility.** Draw short line segments for notes beyond the staff.

**Input.** A staff position (from §9.2), the staff's line count, notehead width.
**Output.** A list of `{ y, x1, x2 }` segments.

**Algorithm.** For a note at position `p` on a staff whose lines occupy
`0 … −(numLines−1)`:
- if `p > 0`: emit a line at every whole-number y from `−1`… down to
  `floor(p)` below the staff;
- if `p < −(numLines−1)`: emit at every whole-number y above the top line up
  to `ceil(p)`.
- Notes *in a space* just outside the staff need no ledger line — only
  positions that land *on* an imaginary line do (i.e. integer y values).

Each segment extends `0.4sp` beyond the notehead on each side (a
conventional value; make it a config field). Thickness =
`legerLineThickness` (0.16).

**Error conditions.** None; a note inside the staff yields an empty list.
**Tests.** Middle C in treble → exactly one ledger line below at y=+1.
**Middle C (C4) in bass → exactly one ledger line above at y=−5** (the
classic fact that middle C sits one ledger line above the bass staff and one
below the treble staff — symmetric with the first test case). C4 in alto →
none. A note 3 ledger lines up → 3 segments at consecutive integers.

### 9.7 Noteheads `[BUILT]`

**Responsibility.** Map a note to its notehead glyph, and draw it.

**Shapes.** All SMuFL lookups, never custom paths: `noteheadWhole`,
`noteheadHalf`, `noteheadBlack`, `noteheadXWhole/Half/Black`,
`noteheadCircleX`, `noteheadDiamondWhole/Half/Black`,
`noteheadTriangleUp…`, `noteheadSquare…`, `noteheadSlash…`, `noteheadPlus…`.

**Shape selection order** (first match wins):
1. an explicit `<notehead>` element from MusicXML for this note;
2. `config.noteheadMapping.overridesByKey[key]`;
3. the duration's default (whole / half / black).

**The mapping key.** For unpitched notes the key is the **GM MIDI note number**
(e.g. `"38"` for snare) when known, else `"<displayStep><displayOctave>"`.
For pitched notes the key is `"<step><octave>"`. This single scheme covers
both the drum use case and pitched overrides (e.g. muted guitar note = X)
without two different mapping systems.

**Tests.** Duration-default selection; an XML `<notehead>x</notehead>`
overriding it; a config override overriding *that*; an unknown key falling
back cleanly.

### 9.8 Stems `[BUILT]`

**Direction rules,** in priority order:
1. explicit per-voice forced direction from config or from the parser
   (this is what makes the drum hand/foot split work — hands up, feet down);
2. explicit `<stem>` element from MusicXML;
3. automatic: notes **above** the middle line get stems **down**, notes on or
   below get stems **up**; for a chord, the note furthest from the middle line
   decides.

**Length.** Default 3.5sp from the notehead. Extended so the stem reaches at
least the middle line when the note is far outside the staff. Shortened never
below 2.5sp.

**Attachment.** Use the notehead glyph's **real anchor point** from §7 —
`stemUpSE` for an up stem, `stemDownNW` for a down stem — not the bounding-box
corner. `[Bravura provides these for 590 glyphs]`

**Thickness.** `stemThickness` (0.12).

**Tests.** Direction for a note above/below/on the middle line; forced
direction overriding automatic; anchor-derived x matching the glyph metadata;
a chord's direction decided by its outermost note.

### 9.9 Flags `[BUILT]`

Only for **unbeamed** notes of 8th or shorter. Glyph is direction-aware:
`flag8thUp` / `flag8thDown`, `flag16thUp/Down`, … through 1024th.
Positioned at the stem's free end. A note that is part of a beam group (§9.12)
must not draw a flag.

### 9.10 Rests `[BUILT]`

Glyphs `restWhole` … `rest1024th`, plus `restHBar` for multi-measure rests.

**Vertical placement:**
- default: centred on the middle line;
- **whole rest hangs below the 4th line; half rest sits on the 3rd line** —
  these two are special-cased in real engraving and must be here too;
- in a multi-voice context, offset per voice (§13) so two voices' rests never
  land on the same y — a bug already encountered and fixed once in the
  prototype, now a first-class rule.

### 9.11 Accidentals `[BUILT]`

Glyphs `accidentalFlat`, `accidentalNatural`, `accidentalSharp`,
`accidentalDoubleSharp`, `accidentalDoubleFlat`.

**Placement:** immediately left of its notehead, `0.16sp` gap.
**Stacking:** when a chord has several accidentals, they must not overlap. Use
a column-assignment pass: sort by pitch descending, place each in the
leftmost column where it does not vertically collide (within 2.5sp) with an
already-placed accidental in that column; add a new column if none fits.

**Which accidentals to draw** is a *musical* decision, not a rendering one:
an accidental is drawn if the note's `alter` differs from what the current key
signature and any earlier accidental in the same measure/octave imply. This
state machine lives in `geometry/accidental-state.ts` and is reset every
barline.

MusicXML complication: a file may supply an explicit `<accidental>` element,
which must be honoured even when our own state machine would not have drawn
one (that is what courtesy accidentals are).

### 9.12 Beam grouping `[TODO]`

**Responsibility.** Decide which consecutive eighth-or-shorter notes within a
measure share one beam, and which stand alone with an individual flag
(§9.9). Grouping only — the beam's actual line geometry (straight/flat/
curved) is a separate concern, §9.13.

**Which notes are even eligible.** Only notes of eighth duration or shorter
(the exact same set §9.9 would otherwise give an individual flag). A rest
**breaks** a run of beamable notes rather than being absorbed into the
group — real notation sometimes beams across a rest, but that's a debated
house-style nuance; breaking at a rest is simpler, matches most software's
default, and is what this phase does. A lone eligible note (nothing
beamable adjacent to it within the same beat) never forms a group of one —
it keeps its individual flag.

**The grouping rule itself** (verified against multiple independent
sources — Wikipedia's "Beam (music)", MyMusicTheory, Musicnotes, and an
OpenLearn music-theory unit all agree on this, not just one source):

- **Simple meter** (any time signature whose denominator is a power of 2
  and isn't the compound case below): the "beat" is one note of the
  denominator's value (e.g. a quarter note in 4/4, a half note in 2/2). A
  beam group is bounded by beat edges — the accumulated tick position
  entering a new beat always starts a new group; a beam never spans two
  beats by default.
- **Compound meter** (denominator = 8, numerator divisible by 3, and
  numerator > 3 — i.e. 6/8, 9/8, 12/8): the "beat" is a dotted quarter (3
  eighth-notes' worth), so the default group size is 3 eighth-notes (or the
  equivalent in finer subdivisions), not 1.
- **Override:** the caller may supply an explicit group size (in ticks) to
  replace the computed beat length — this is what makes the common
  real-world convention of grouping 4 eighth notes together in 4/4 (rather
  than the textbook-strict groups of 2) possible, and is why this phase's
  plan entry says "with override," not just "by beat."

**Known limitation, not a gap:** irregular/additive meters (e.g. 5/8 as
2+3, or MusicXML's `<beats>3+2+2</beats>` from Phase 12) need per-group
boundaries that don't reduce to one fixed beat length — out of scope for
this phase; the fallback (treat the whole measure as simple-meter beat math
using the numeric total) will produce a plausible but not necessarily
idiomatic grouping for such meters until a future phase adds real additive-
meter support.

**Input.** A voice's ordered events (with reconstructed start-ticks, the
same technique Phase 21's `eventStartTicks` already uses) plus the
measure's time signature. **Output.** A list of groups, each a list of
event indices sharing one beam (only groups of 2+; a solitary eligible note
isn't included in the output at all, since "not grouped" is exactly what an
individual flag already handles).

**Tests.** 4/4 with 8 plain eighth notes and no override → four groups of 2
(strict beat-based); the same input with a 4-eighth-note override → two
groups of 4; 6/8 with 6 eighth notes → two groups of 3 (compound meter); a
rest in the middle of a beat's worth of eighths → breaks into two smaller
groups, neither merged across the rest; a single eligible eighth note
surrounded by rests → produces no group at all (stays flagged).

### 9.13 Beam geometry `[TODO — Phase 24]`

The three styles from `config.beam.style` (straight/flat/curved) drawing the
actual beam line(s) for a group `9.12` produced, including secondary beams
for 16th-or-shorter notes and cross-beat slope clamping. Not specified
further here yet — written up properly when Phase 24 starts, following the
same verify-before-implementing approach as every other subsection above.

---

## 10. Module: `parser/musicxml/` — MusicXML Parser `[IN PROGRESS — v1 built (Phase 20); .mxl/score-timewise/v2 elements are Phase 35-36]`

**Responsibility.** Turn any valid MusicXML document into a `Score` (§6),
plus a `ScoreAttributes` side-table of per-measure clef/key/time/barline
information. Never renders anything.

**Input.** A `string` of XML, or an `ArrayBuffer` for `.mxl`.
**Output.** `{ score: Score, attributes: MeasureAttributes[], diagnostics: Diagnostic[] }`.

**Dependencies.** `core/` only. Uses `DOMParser` in the browser; tests inject
a parser so Node can run them.

### 10.1 Traversal model (the part that is easy to get wrong) `[BUILT]`

A `<measure>`'s children must be walked **in document order**, maintaining a
running tick cursor:

- `<note>` → append event, advance cursor by its duration;
- `<note>` with a `<chord/>` child → **does not advance the cursor**, and
  merges into the previous note as a `Chord`;
- `<backup>` → move the cursor **backwards** by its duration;
- `<forward>` → move the cursor **forwards** by its duration.

`<backup>` is how a file encodes a second voice: write voice 1's whole
measure, back up to the start, write voice 2. **A parser that filters to
`voice == 1` silently drops every other voice** — this exact bug was hit and
fixed in the earlier prototype. The parser must never filter by voice; it must
build all voices and let `layout/` deal with them.

The tick cursor is the note's musical position within the measure. Combined
with the measure's start tick, it gives every event an absolute position in
the piece — which §12 needs for MIDI alignment and §17 for the cursor.

### 10.2 `.mxl` (compressed MusicXML)

A `.mxl` is a ZIP archive. `META-INF/container.xml` names the real score file;
the parser must read that pointer rather than assuming a filename.
**Dependency decision:** use a small, well-established ZIP reader (`fflate`)
rather than writing one. This is not a notation dependency and does not
violate §1's independence requirement.

### 10.3 Elements parsed — v1 (the vertical slice) `[BUILT]`

`<score-partwise>`, `<part-list>`/`<score-part>`, `<part>`, `<measure>`,
`<attributes>` (`<divisions>`, `<key><fifths>`, `<time>`, `<clef>`),
`<note>` (`<pitch>`, `<rest>`, `<duration>`, `<type>`, `<dot>`, `<voice>`,
`<staff>`, `<chord>`, `<tie>`), `<backup>`, `<forward>`, `<barline>`.

### 10.4 Elements parsed — v2 (full)

`<unpitched>`, `<instrument>`, `<notehead>`, `<time-modification>`
(tuplets), `<notations>` (`<tied>`, `<slur>`, `<tuplet>`, `<articulations>`,
`<ornaments>`, `<fermata>`), `<beam>`, `<stem>`, `<accidental>`,
`<lyric>`, `<harmony>` (chord symbols), `<grace>`, `<direction>`
(`<dynamics>`, `<wedge>`, `<metronome>`, `<words>`, `<rehearsal>`),
`<print>` (system/page breaks), `<sound tempo>`, `<midi-instrument>`
(`<midi-unpitched>`, `<midi-channel>`).

### 10.5 Percussion handling

Per the spec text quoted in §9.2: `<unpitched>` with `<display-step>` +
`<display-octave>` positions as if treble clef. **If those children are
absent, the note goes on the staff's middle line** — the one-line-staff case.
`<midi-unpitched>` from the part's `<midi-instrument>` gives the GM note
number, which becomes the notehead-mapping key (§9.7) and the drum-mapping key
(§13).

Note: MusicXML's `<midi-unpitched>` is **1-based** while GM note numbers are
0-based — subtract 1. This is a classic off-by-one; assert it in tests.

### 10.6 `<score-timewise>`

The rarely-used alternative document order. Convert to partwise on load
(a mechanical transposition of the measure/part nesting) so the rest of the
parser sees only one shape.

### 10.7 Error conditions and partial rendering `[BUILT for v1's element set]`

The parser **never throws on malformed input**. It records a `Diagnostic`
and continues:

```ts
interface Diagnostic {
  severity: 'error'|'warning'|'info';
  code: string;           // stable, e.g. 'MISSING_DIVISIONS'
  message: string;
  location?: { partId?:string; measureNumber?:number };
}
```

Recovery rules: missing `<divisions>` → assume 1 and warn; unknown `<type>` →
derive from `<duration>`; a measure whose events overrun its time signature →
keep the events, warn, let layout handle the overflow; unknown element →
ignore and record `info`. A file that produces zero parseable measures is the
only case that yields an empty `Score` — and even then the caller gets
diagnostics, not an exception.

### 10.8 Cross-software compatibility — a hard requirement

Every major program emits *valid but differently-shaped* MusicXML. Known
divergences the parser must absorb:

- `<divisions>` declared once vs. re-declared per part vs. changed mid-piece;
- ties encoded as `<tie>` (sound) vs. `<tied>` (notation) vs. both;
- beams given explicitly via `<beam>` vs. left for the renderer to infer;
- `<backup>`/`<forward>` placement conventions for multi-voice;
- `<attributes>` appearing mid-measure, not only at its start;
- percussion parts that omit `<display-step>` entirely;
- differing `<print-object>`/`<print>` usage for breaks.

**Test requirement:** `test/fixtures/` must contain real exports of the *same
short piece* from MuseScore, Sibelius, Finale, Dorico, and Guitar Pro, plus at
least one DAW export. Any of them rendering incorrectly is a bug **in our
parser**, never "that program's fault."

**Tests.** Per-element unit tests on the produced `Score` (no rendering);
the multi-program corpus above; malformed-input recovery tests asserting the
exact `Diagnostic.code` emitted.

---

## 11. Module: `parser/midi/` — Standard MIDI File Parser `[TODO]`

*This module does not exist in v1 of the plan at all — see §2.1.*

**Responsibility.** Turn a `.mid` byte stream into a note list plus a tempo
map and meta-event timeline. It does **not** produce notation directly —
MIDI has no concept of enharmonic spelling, voices, or beaming, so inferring
notation from MIDI alone is lossy. Its outputs feed §12 (timing) and §13
(alignment).

**Input.** `ArrayBuffer`.
**Output.**
```ts
interface MidiFile {
  format: 0|1;
  ppq: number;                    // header division, ticks per quarter note
  tracks: MidiTrack[];
  tempoEvents:  { tick:number; microsecondsPerQuarter:number }[];
  timeSignatureEvents: { tick:number; numerator:number; denominator:number }[];
  keySignatureEvents:  { tick:number; sharpsFlats:number; isMinor:boolean }[];
}
interface MidiNote { tick:number; durationTicks:number; channel:number;
                     noteNumber:number; velocity:number }
```

### 11.1 Format facts the implementation depends on

- Header chunk `MThd`, length 6: `format`, `ntrks`, `division`.
- **`division`**: if the high bit is 0, the value is **ticks per quarter
  note** (PPQ). If the high bit is 1, it is SMPTE frames — rare; record a
  diagnostic and reject rather than mis-parse.
- Track chunk `MTrk`, then delta-time (variable-length quantity) + event
  pairs.
- **Tempo meta event**: `FF 51 03 tt tt tt` — a 24-bit value in
  **microseconds per quarter note**. BPM = 60,000,000 / that value. A file
  with no tempo event means 120 BPM (500,000 µs/quarter).
- **Time signature meta**: `FF 58 04 nn dd cc bb`, where the printed
  denominator is `2^dd`.
- **Key signature meta**: `FF 59 02 sf mi`, `sf` as a signed byte
  (−7…+7 = flats…sharps), `mi` 0=major 1=minor.
- **Running status**: a status byte may be omitted when it repeats. A parser
  that ignores this misreads the entire rest of the track. Must be handled.
- Note-off may be encoded as `NoteOn` with velocity 0. Must be handled.
- Format 1 uses track 0 as a conductor track (tempo/meta only). Tempo events
  from *any* track must still be collected into one global map.

**Percussion:** channel 10 (0-indexed 9) note numbers follow the General MIDI
Level 1 Percussion Key Map (MMA0007/RP003), range **35–81**. See §13.

### 11.2 Tick normalisation

As with MusicXML: every tick is converted once, at parse time, to the
engine's 480-per-quarter internal unit (§6.2). Downstream code never sees the
file's own PPQ.

**Error conditions.** Bad magic bytes / truncated chunk → error diagnostic,
empty result. SMPTE division → error diagnostic. Format 2 → error diagnostic.
Unknown meta event → skip by its declared length (this is why length must be
respected rather than assumed).

**Tests.** VLQ decoding across its full range; running status; note-on-zero
as note-off; a multi-tempo file's tempo list; PPQ→480 normalisation for
several PPQ values (96, 480, 960); a truncated file producing a diagnostic
rather than an exception.

---

## 12. Module: `timing/` — Musical Timing Engine `[TODO]`

**Responsibility.** Convert between the three time domains that must stay
consistent: **ticks** (musical), **seconds** (wall clock), and
**measure+beat** (human-readable position). This is the module that makes
long-song synchronisation correct.

**Input.** A tempo map (from MIDI §11, or from MusicXML `<sound tempo>` /
`<metronome>`), a time-signature map, and measure start ticks.
**Output.** Conversion functions and a `TempoMap` object.

### 12.1 Data structures

```ts
interface TempoSegment { startTick:number; startSeconds:number;
                         microsecondsPerQuarter:number }
interface TempoMap { segments: readonly TempoSegment[] }  // sorted, contiguous
```

### 12.2 The anti-drift design

`startSeconds` is **precomputed cumulatively once** when the map is built:

```
segment[0].startSeconds = 0
segment[i].startSeconds = segment[i-1].startSeconds
                        + (segment[i].startTick - segment[i-1].startTick)
                          / TICKS_PER_QUARTER
                          * segment[i-1].microsecondsPerQuarter / 1e6
```

Then any conversion is a **binary search plus one multiply**:

```
tickToSeconds(t):   find segment s containing t
                    → s.startSeconds + (t - s.startTick)/480 * s.µsPerQuarter/1e6
secondsToTick(sec): find segment s containing sec (by startSeconds)
                    → s.startTick + (sec - s.startSeconds) * 1e6 / s.µsPerQuarter * 480
```

**Why this prevents drift:** the alternative — stepping note by note and
accumulating elapsed time — accumulates floating-point error proportional to
the number of notes, which is exactly why long songs drift. Here, error is
bounded by *one* subtraction and *one* multiplication from the nearest tempo
change, regardless of song length. A 10-minute piece is no less accurate than
a 10-second one.

`tickToSeconds` and `secondsToTick` must be **exact inverses** to within
floating-point epsilon — this is a required test.

### 12.3 Measure/beat position

```ts
interface MusicalPosition { measureNumber:number; beat:number; tickInMeasure:number }
tickToPosition(tick): MusicalPosition
positionToTick(pos):  number
```

Computed from the time-signature map plus measure start ticks. `beat` is
1-based and fractional (beat 2.5 = the "and" of 2 in 4/4).

**Error conditions.** Empty tempo map → treat as a single 120 BPM segment
(the MIDI default) and warn. A tick before the first segment or after the last
clamps to the boundary segment rather than extrapolating wildly.

**Tests.** Constant-tempo round-trip at many ticks; a 3-tempo-change map
verified against hand-computed second values; **an explicit long-song drift
test**: a 10-minute piece at 120 BPM, converting tick→seconds→tick at 10,000
points, asserting max round-trip error < 1 ms; boundary clamping.

---

## 13. Module: `timing/alignment` + `drums/` — MIDI ↔ MusicXML Sync and Drum Mapping `[TODO]`

**Responsibility.** When both a MusicXML file and a MIDI file describe the
same piece, decide which is authoritative for what, and match their notes to
each other.

### 13.1 Authority rules (must be explicit, or bugs are guaranteed)

| Aspect | Authoritative source | Why |
|---|---|---|
| What is **drawn** (pitches, spelling, voices, beaming, ties, articulations) | **MusicXML** | MIDI has no enharmonic spelling, no voices, no beams |
| **Tempo**, and therefore all wall-clock timing | **MIDI**, if present; else MusicXML `<sound tempo>`; else 120 BPM | MIDI tempo maps are usually more detailed and are what the audio was rendered from |
| **Which drum sound** a note is | MIDI note number, via `<midi-unpitched>` when the XML declares it | GM numbers are unambiguous; display positions are not |

### 13.2 Note matching

Both sources are converted to normalised ticks first (§6.2, §11.2), so
matching is tick-based, not time-based:

1. **Exact tick + pitch match** — the common case, when both files were
   exported from the same source.
2. **Tolerance match** — within ±(1/32 note) ticks, for files exported with
   slight quantisation differences.
3. **Ordinal fallback** — if counts match but ticks do not (e.g. one file has
   a pickup measure offset), align by index within the part.
4. **Unmatched** — record a diagnostic and keep both; never silently drop.

The output is an `alignment: Map<coreNoteId, MidiNote>` — the XML note stays
the thing that gets *drawn*; the MIDI note supplies its *sounding time*.

### 13.3 Drum mapping table

```ts
interface DrumMapEntry {
  midiNote: number;          // GM number, 35-81
  name: string;              // 'Snare', 'Closed Hi-Hat', ...
  staffPosition: number;     // in the engine's y units (§4.2)
  noteheadShape: string;     // SMuFL glyph name
  stemDirection?: 'up'|'down';   // hands up / feet down convention
  articulation?: string;     // e.g. open-hi-hat circle
}
type DrumMappingTable = Record<number, DrumMapEntry>;
```

A **default GM table** ships with the engine covering the standard kit —
bass drum (35, 36), side stick (37), snare (38, 40), toms (41, 43, 45, 47,
48, 50), hi-hat closed/pedal/open (42, 44, 46), crashes (49, 57), ride /
bell / edge (51, 53, 59), china (52), splash (55), cowbell (56), tambourine
(54) — and the full 35–81 GM range is representable.

**Every field is overridable via `config.drums.mapping`.** The default table
is a starting point, not a constraint: house styles differ on which line a
tom sits on, and the user must be able to change it. Conventionally cymbals
use `noteheadXBlack`, drums use `noteheadBlack`, and feet (bass drum, hi-hat
pedal) take stems down while hands take stems up — but all of that is table
data, not code.

**Error conditions.** A MIDI note outside 35–81 on channel 10, or a note with
no table entry → render on the middle line with the default notehead and
record a warning, rather than dropping it.

**Tests.** GM number → staff position for every default entry; a config
override replacing an entry; an unmapped note falling back with a diagnostic;
`<midi-unpitched>` 1-based → 0-based conversion; the four matching strategies
each exercised with a purpose-built fixture pair.

---

## 14. Module: `layout/spacing` — Horizontal Spacing `[TODO]`

**Responsibility.** Decide the x-position of every event in a measure, and
the measure's total width. Pure math; produces numbers, not SVG.

### 14.1 The algorithm

Duration-proportional spacing with a logarithmic curve, following the
approach LilyPond documents publicly (its actual published constants are used
as our defaults, since they are the product of decades of engraving practice):

```
spacingIncrement       = 1.2  staff spaces   (≈ one notehead width)
shortestDurationSpace  = 2.0                 (multiplier)
```

- The **reference duration** for a system is the *most frequently occurring
  shortest duration per measure*, **not** the globally shortest note.
  (Using the global shortest means one stray 32nd note inflates the entire
  score.)
- A note of the reference duration is followed by
  `shortestDurationSpace × spacingIncrement` = **2.4 staff spaces**.
- **Doubling a duration adds one `spacingIncrement`.** So relative to a
  reference of an 8th: 8th → 2.4sp, quarter → 3.6sp, half → 4.8sp.
- Durations *shorter* than the reference get space proportional to their
  ratio against it.

### 14.2 Minimum-distance pass

Proportional spacing alone can still overlap when symbols are wide (a chord
with accidentals, a dotted note). After computing proportional positions, a
second pass enforces, for each adjacent pair, a minimum gap equal to the
left element's **full rendered width** (notehead + accidentals + dots + any
articulation that extends horizontally) plus `config.spacing.minNoteDistance`.
Where the minimum wins, the extra width is pushed into the rest of the
measure.

### 14.3 Justification

A system's measures are then stretched so the last barline reaches the right
margin. Stretch is distributed **proportionally to each spring's
flexibility**, not evenly — long notes stretch more readily than short ones.
The final system of a piece is not stretched (ragged-right), matching
standard practice. `config.spacing.justify` can disable stretching entirely.

**Error conditions.** A measure wider than the available system width even at
minimum spacing → allow the overflow, warn, and let §16 break the system
earlier next time.

**Tests.** Ratio assertions (a quarter gets exactly `spacingIncrement` more
than an 8th at the same reference); reference-duration selection given a
mixed-rhythm measure with one stray 32nd; the minimum-distance pass kicking
in for a wide chord; justification summing exactly to the target width.

---

## 15. Module: `layout/skyline` — Collision Avoidance `[TODO]`

**Responsibility.** Prevent overlaps *vertically*, between the staff's own
contents and everything placed above/below it (dynamics, lyrics, chord
symbols, articulations, tempo marks, bar numbers), and between adjacent
staves in a system.

### 15.1 The skyline approach

This is the approach MuseScore uses, and it is the right one here.

For each staff, maintain two **skylines** — a north skyline and a south
skyline — each an ordered list of `{ xStart, xEnd, y }` segments describing
the outermost extent of anything already placed:

```
addToSkyline(shape):  merge the shape's bounding segments into the skyline,
                      taking the extreme y wherever x-ranges overlap
minDistance(other):   the smallest vertical gap between two skylines
                      across their overlapping x-range
```

**Placement procedure for any element that sits above or below a staff:**
1. compute its default offset for its type (from config);
2. query the relevant skyline over the element's x-range;
3. if it would collide, push it outward just enough to clear, plus padding;
4. add the placed element to the skyline.

**Staff distance within a system** is then
`max(config.staves.minStaffDistance, southSkyline(upper).minDistance(northSkyline(lower)) )`.
A sensible default `minStaffDistance` is around 3.5 staff spaces at minimum;
generous scores use more.

### 15.2 Alignment groups

Some element types must stay on one line even if only one of them needed
pushing — **lyrics** always, and dynamics/hairpins when adjacent. After the
per-element pass, each alignment group takes its most-extreme member's
position.

### 15.3 Horizontal collision cases handled elsewhere

Accidental stacking (§9.11) and multi-voice notehead offsetting (§13 of the
old plan, now §9.10 + the voice pass) are *horizontal* and are handled by
their own modules — the skyline is vertical only.

**Error conditions.** None; worst case the skyline pushes an element further
than looks ideal.

**Tests.** Two elements at the same x → the second is pushed clear;
non-overlapping x-ranges → no push; a lyric line staying aligned when one
syllable needed extra room; staff distance growing when the upper staff has
low-hanging content.

---

## 16. Module: `layout/` — System, Page and Resize `[TODO]`

### 16.1 Scroll mode

One unbroken system, arbitrarily wide. Measures are laid out left to right at
their natural (unjustified) widths. This is the mode a video/cursor use case
wants.

### 16.2 Page mode

Measures are packed into systems until the next measure would exceed the
usable width, then a system break occurs and the completed system is
justified (§14.3). Systems are packed onto pages until the next system would
exceed usable height, then a page break occurs.

Respects explicit `<print new-system="yes">` / `new-page="yes"` from MusicXML.
Page geometry (size, margins) comes from `config.page`.

### 16.3 Arbitrary width × height resize — a hard requirement

```ts
engine.resize(widthPx: number, heightPx: number): void
```

Must re-flow to **any** size, not preset zoom steps, and **without
re-parsing** the source file. The implementation exploits §4.2:

- **Pure scale change** (aspect ratio and content unchanged): only
  `pxPerStaffSpace` changes, and only the `<svg>` element's `width`/`height`
  attributes are rewritten. **No re-layout at all.** This is O(1) and is the
  common case for a window resize or a video frame-size change.
- **Re-flow needed** (page mode, or scroll mode where the usable width
  changed enough to alter system breaking): re-run §14 and §16.2 from the
  cached `Score` — the parse result is retained precisely so this is cheap.

**Performance requirement:** the pure-scale path must be well under one
animation frame (16 ms). The re-flow path targets < 100 ms for a typical
50-measure score. See §18.

**Tests.** Same score at three sizes producing correct `width`/`height` vs.
`viewBox` ratios; a pure-scale resize producing *identical* inner SVG (proving
no re-layout happened); a width change that forces different system breaking;
resize after resize returning to the original producing byte-identical output
to the original (determinism, §4.4).

---

## 17. Module: `playback/` — Position API and Event Stream `[TODO]`

**This is the boundary between the engine and any host application.** The
engine has **no** knowledge of audio, video, or animation — see §2.3.

### 17.1 What the engine provides

```ts
interface PlaybackPosition { tick:number; seconds:number; position:MusicalPosition }

// time -> where on the page
positionToX(tick:number): { x:number; systemIndex:number; pageIndex:number }
// where on the page -> time  (for click-to-seek in a host app)
xToPosition(x:number, systemIndex:number): number   // tick

// every notated event, with its resolved sounding time — the stream a host
// app uses to trigger animation, highlight notes, or drive audio.
interface NotationEvent {
  tick: number;
  seconds: number;
  noteIds: readonly string[];
  midiNotes?: readonly number[];    // present when MIDI alignment ran (§13)
  measureNumber: number;
}
getEventStream(): readonly NotationEvent[]   // sorted by tick
```

### 17.2 Cursor

One module, one `mode` option (not two modules — see §2.4):

- `'cursorMoves'` — the notation is static; a marker is drawn at
  `positionToX(currentTick)`. Suits page layout.
- `'notationMoves'` — the marker is fixed at a configured fraction of the
  viewport width and the notation is translated by
  `−(positionToX(currentTick) − fixedX)`. Suits scroll layout and narrow
  video frames.

Both call the *same* `positionToX`. Switching modes is a config change.

Repeat handling: when playback passes a repeat-end barline and jumps back,
the host supplies the *musical* tick it jumped to; the engine does not
simulate playback order itself.

### 17.3 What the host application does (explicitly not the engine)

Driving `currentTick` from an audio clock, rendering video frames,
triggering drum animations from `getEventStream()`, and A/V sync are all
**host responsibilities**. The engine is a pure function of
`(score, config, currentTick) → SVG`. This is what keeps it testable without
a browser, an audio context, or a video encoder — and it is why the drum
video app can be rebuilt on top of this engine without the engine knowing
that app exists.

**Tests.** `positionToX`/`xToPosition` round-trip; event stream sorted and
complete (event count equals note count); event `seconds` matching §12's
tempo map; cursor x under both modes for the same tick.

---

## 18. Engineering Concerns

### 18.1 Performance budget

| Operation | Target | Note |
|---|---|---|
| Parse a 100-measure MusicXML | < 200 ms | one-time |
| Full layout of 100 measures | < 300 ms | one-time |
| Render to SVG string | < 100 ms | one-time |
| **Pure-scale resize** | **< 16 ms** | must not drop a frame |
| Re-flow resize (50 measures) | < 100 ms | interactive |
| Cursor position update | < 1 ms | called every frame |

**Strategies:** the `Score` and layout result are cached so resize/re-theme
never re-parse; `positionToX` uses binary search over a precomputed
position table, never a linear scan; SVG is built by array-join, not repeated
string concatenation; geometry functions are pure and therefore memoisable if
profiling shows a need (do not pre-optimise).

**Memory:** a large orchestral score is the worst case. The `Score` tree is
plain immutable objects; the layout result is one flat array of positioned
items per system, discarded and rebuilt on re-flow.

### 18.2 Testing strategy

Three layers, all runnable with `npm run verify` (typecheck → lint → format →
build → test) `[BUILT]`:

1. **Unit tests** (`test/unit/`) — pure functions, exact expected values.
   `[BUILT: 89 tests across 12 suites]`
2. **Snapshot/visual regression** (`test/visual/`) — render a known score,
   compare the SVG string to a committed golden file. `UPDATE_SNAPSHOTS=1`
   accepts an intentional change. **The mechanism itself was verified** by
   corrupting a snapshot and confirming the test fails. `[BUILT]`
3. **Integration/corpus tests** `[TODO]` — the multi-program MusicXML corpus
   (§10.8) and MIDI+XML pairs, asserting the whole pipeline.

Two environment gotchas already discovered, recorded so they are not
rediscovered: `node --test <dir>` with explicit path arguments fails on Node
22 (use bare `node --test`); and `assert.deepEqual` fails across the `vm`
sandbox boundary even for structurally identical objects (spread into the
test's own realm first).

### 18.3 Debugging and logging

- A single `Diagnostic[]` channel (§10.7) rather than scattered
  `console.log`. Severity-filtered by `config.debug.logLevel`.
- `config.debug.drawBoundingBoxes` overlays every element's computed bounding
  box on the SVG — the fastest way to diagnose a layout bug.
- `config.debug.drawSkyline` overlays the north/south skylines (§15).
- Every rendered element carries a stable `data-id` attribute tracing back to
  its `Score` node, so a visual bug can be traced to a source element.

### 18.4 Error handling philosophy

- **Parsers never throw** — they emit diagnostics and produce the best
  partial result (§10.7).
- **Geometry functions throw** on programmer error (invalid line count,
  unsupported clef) because those are bugs, not data problems.
- **Renderers never throw** on missing optional data — a glyph without
  anchors renders without an anchor offset.
- The public API returns `{ svg, diagnostics }`, never a bare string, so a
  caller always has the option to surface problems.

### 18.5 Future extensibility — without a plugin API

§2.4 deliberately **cancelled** v1's plugin-system phase: designing an
extension API before any concrete extension exists produces the wrong API.
Extensibility is instead a property of the module boundaries themselves.
Concretely, here is how each realistic future extension lands:

| Future need | How it's added | Files touched |
|---|---|---|
| A new notehead shape | It is already a SMuFL glyph name — add it to the mapping table (§9.7) | config only, **zero code** |
| A different drum kit layout | Override `config.drums.mapping` (§13.3) | config only, **zero code** |
| A new barline type | Add to the `BarlineType` union + one `case` building it from existing stroke kinds | `geometry/barline.ts` only |
| A new clef | One call to the internal `clef()` helper with its reference pitch | `geometry/clef.ts` only |
| A fourth beam style | One new branch in the beam draw function; geometry is shared | `render/beam.ts` only |
| A different SMuFL font | Add its metadata JSON + a font-id parameter; glyph *names* are font-independent by design (§7.2) | `glyphs/` only |
| A new input format (e.g. MEI) | Write a parser producing a `Score`; **nothing downstream changes**, because §4.1's pipeline only ever consumes `core/` | new `parser/mei/` only |
| A new output format | Consume the layout result; **nothing upstream changes** | new `export/` file only |
| Score editing (a real future direction) | The `Score` tree is plain immutable data — an editor would produce new `Score` values and re-render. No engine change needed to *support* editing; the editor is a separate application |

**The invariant that makes all of this work** is §4.1's one-directional
pipeline: every layer depends only on the layer before it, so a new
front-end (parser) or back-end (exporter) plugs in at the edges without
disturbing the middle. That is worth more than a plugin registry.

If a genuine third-party extension use case appears later, a formal plugin
API can be designed *then*, informed by what that extension actually needs.

---

## 19. Known Limitations (accepted, documented, not hidden)

1. **Tenor and soprano clef key signatures are not implemented** — they
   throw a named error. Tenor's sharps follow a genuinely different shape
   that could not be verified with confidence; a silently wrong key signature
   is worse than a refusal. Closing this needs an explicit line-by-line
   source for tenor, verified the way treble/bass/alto were.
2. **Cross-staff beaming is not supported** (piano passages where a beam
   spans both staves). Deferred as rare and expensive.
3. **Microtonal accidentals** are not rendered, though SMuFL has the glyphs.
4. **Durations finer than a 128th note** produce non-integer ticks at
   `TICKS_PER_QUARTER = 480`. Legal but inexact; vanishingly rare in practice.
5. **MIDI format 2** files are rejected with a diagnostic.
6. **SMPTE-division MIDI files** are rejected with a diagnostic.
7. **Tablature is a data-model citizen but not a rendered one** — a 6-line
   staff draws, fret numbers do not.
8. **No MusicXML export.**
9. **Notation cannot be inferred from MIDI alone** — a MIDI-only input
   renders with default spelling, single voice, and inferred beaming, and
   this is documented behaviour, not a bug. Full notation requires MusicXML.

---

## 20. Acceptance Criteria

The engine is "done" for its intended purpose when all of the following hold:

**Correctness**
1. A drum-kit MusicXML, a piano MusicXML, and a vocal-with-lyrics MusicXML
   each render every note at the correct staff position with the correct
   notehead — using the **same code path** (§4.3).
2. The same short piece exported from MuseScore, Sibelius, Finale, Dorico,
   and Guitar Pro renders equivalently from all five (§10.8).
3. A MIDI file's tempo map drives wall-clock timing such that a 10-minute
   piece has < 1 ms round-trip conversion error (§12.2).
4. Multi-voice measures (drum hands/feet, piano LH/RH, SATB) render with
   correct stem directions and no rest collisions.
5. A malformed MusicXML still renders its parseable portion and reports
   diagnostics rather than throwing.

**Customisation**
6. Ink colour, background, and per-element colour overrides can be changed on
   an already-rendered score without re-parsing.
7. The score can be resized to any width × height, including a pure-scale
   resize that provably performs no re-layout.
8. Notehead mapping, beam style, bar-number display, and layout mode are all
   changeable via config alone.

**Engineering**
9. `npm run verify` passes clean from a fresh clone.
10. Rendering is deterministic — identical input yields byte-identical SVG.
11. Every performance target in §18.1 is met on a 100-measure score.
12. Every module in §6–§17 has the tests its section specifies.

---

## 21. Technical Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **Engraving rules turn out to need far more special cases than expected** (rest placement, accidental stacking, beam slopes each have decades of convention behind them) | High | Medium | Accept "good, not Dorico-grade" as the bar. Every rule lives in one place with its source cited, so refining one is cheap. Snapshot tests catch regressions when refining |
| R2 | **Real-world MusicXML diverges more than the spec suggests** | High | High | §10.8's multi-program corpus is built *before* the parser is finished, not after. Every divergence found becomes a fixture, permanently |
| R3 | **MIDI↔XML note matching fails on files that aren't from the same export** | Medium | Medium | Four-strategy fallback (§13.2) ending in "keep both, warn" — never silently drop |
| R4 | **Layout performance on large orchestral scores** | Medium | Medium | §18.1 budgets; the resize fast-path (§16.3) means the common interactive case never re-lays-out at all. Profile before optimising |
| R5 | **Skyline collision avoidance produces ugly-but-legal results** | Medium | Low | It is *correct* first (no overlaps) and *pretty* second. `drawSkyline` debug overlay makes tuning tractable |
| R6 | **Scope creep back toward "clone MuseScore"** | Medium | High | §1.1 non-goals and §19 limitations are explicit and are meant to be pointed at. §2.4 already deleted four v1 items on these grounds |
| R7 | **Font licensing** | Low | Medium | Bravura is SIL OFL 1.1; attribution is committed in `src/glyphs/data/SOURCES.md`. Any added font needs the same check |
| R8 | **Bravura metadata URL breaks** (it already required a release tag rather than a branch to fetch) | Low | Low | The metadata is **committed to the repo**, not fetched at build time. Documented in `Doc/phase-05-*.md` |

---

## 22. Implementation Roadmap

Numbering continues from the phases already built — **completed phases are
not renumbered**, so existing `Doc/` records and commit history stay valid.

### Stage 0 — Foundation `[COMPLETE]`

| Phase | What | Status |
|---|---|---|
| 1 | Folder structure | ✅ |
| 2 | Toolchain (TS strict, esbuild, ESLint, Prettier) | ✅ |
| 3 | Core data model | ✅ |
| 4 | Duration/tick math | ✅ |
| 5 | SMuFL glyph table (real Bravura data) | ✅ |
| 6 | SVG primitives (staff-space coordinates) | ✅ |
| 7 | Config schema | ✅ |
| 8 | Test harness (unit + snapshot) | ✅ |

### Stage 1 — Staff furniture `[COMPLETE]`

| Phase | What | Status |
|---|---|---|
| 9 | Staff (1–6 lines) | ✅ |
| 10 | Clefs (8 types) | ✅ |
| 11 | Key signatures (treble/bass/alto; tenor/soprano deferred) | ✅ |
| 12 | Time signatures (numeric/common/cut/additive) | ✅ |
| 13 | Barlines (7 types) + bar-number logic | ✅ |

### Stage 2 — Minimum notes (§9.6–§9.11) `[COMPLETE]`

| Phase | What | Status |
|---|---|---|
| 14 | Ledger lines | ✅ |
| 15 | Noteheads + the mapping system | ✅ |
| 16 | Stems (incl. per-voice forced direction) | ✅ |
| 17 | Flags | ✅ |
| 18 | Rests (incl. whole/half special placement) | ✅ |
| 19 | Accidentals (incl. the draw-or-not state machine and stacking) | ✅ |

### Stage 3 — **First vertical slice** ← the key correction from v1 (§2.2) `[COMPLETE]`

| Phase | What | Status |
|---|---|---|
| 20 | MusicXML parser v1 (§10.3) — enough for a single-voice score | ✅ |
| 21 | Naive single-system layout + `renderFromMusicXML()` end to end | ✅ |
| 22 | **Milestone: a real simple `.musicxml` file renders correctly.** Everything after this point is validated against real files from day one | ✅ |

### Stage 4 — Rhythm and structure `[IN PROGRESS — 23 of 29]`

| Phase | What | Status |
|---|---|---|
| 23 | Beam grouping (by time-signature beat structure, with override) | ✅ |
| 24 | Beam geometry + the three styles (straight / flat / curved) | |
| 25 | Multi-voice per staff + voice collision and rest separation | |
| 26 | Ties | |
| 27 | Slurs | |
| 28 | Tuplets | |
| 29 | Grand staff / multi-part systems | |

### Stage 5 — Expression

| Phase | What |
|---|---|
| 30 | Articulations and ornaments |
| 31 | Dynamics, hairpins, tempo marks, rehearsal marks |
| 32 | Lyrics |
| 33 | Chord symbols |
| 34 | Grace notes |

### Stage 6 — Full import

| Phase | What |
|---|---|
| 35 | MusicXML parser v2 (§10.4) — every element the renderer now supports |
| 36 | `.mxl` support + `<score-timewise>` conversion |
| 37 | Cross-software compatibility corpus and fixes (§10.8) |
| 38 | Diagnostics and partial-render hardening (§10.7) |

### Stage 7 — MIDI and timing ← entirely absent from v1 (§2.1)

| Phase | What |
|---|---|
| 39 | Standard MIDI File parser (§11) |
| 40 | Timing engine: tempo map, tick↔seconds, measure/beat (§12) |
| 41 | Drum mapping table + GM defaults (§13.3) |
| 42 | MIDI↔MusicXML alignment (§13.1–§13.2) |

### Stage 8 — Real layout

| Phase | What |
|---|---|
| 43 | Spacing algorithm (§14), replacing Phase 21's naive layout |
| 44 | Skyline collision avoidance (§15) |
| 45 | Scroll layout (§16.1) |
| 46 | Page layout + system/page breaking (§16.2) |
| 47 | Arbitrary W×H resize, incl. the O(1) pure-scale fast path (§16.3) |

### Stage 9 — Playback surface

| Phase | What |
|---|---|
| 48 | Position API + event stream (§17.1) |
| 49 | Cursor, both modes (§17.2) |

### Stage 10 — Polish and delivery

| Phase | What |
|---|---|
| 50 | Full theming API — unify every config section (§8) |
| 51 | Debug overlays and diagnostics surface (§18.3) |
| 52 | Export: SVG, PNG, PDF (§3, §16.2) |
| 53 | Performance pass against §18.1's budgets |
| 54 | Public API surface + generated reference docs into `docs/` |

### Sequencing rules

- Stages 2→3 must not be reordered: the vertical slice (Stage 3) is what
  validates every assumption made in Stage 2.
- Stage 7 (MIDI) is independent of Stages 4–6 and may run in parallel if
  convenient — it touches no rendering code.
- Stage 8 replaces Phase 21's deliberately naive layout. Phase 21 exists to
  be thrown away; do not over-build it.
- Stage 9 depends on Stage 8 (it needs real x-positions) and Stage 7 (it
  needs real times).
- **Every phase follows the established working rule:** implement → run
  `npm run verify` clean → write the `Doc/phase-NN-*.md` record (what was
  written / how to modify / how to revert) → commit → push.

---

## 23. Document Maintenance

- **This file is authoritative.** When reality and this document disagree,
  fix whichever is wrong — but do not leave them disagreeing.
- `Doc/PLAN-v1-historical.md` is **historical reference only** and should not
  be edited further.
- `Doc/phase-NN-*.md` records remain the per-phase source of truth for *what
  was actually built and how to change or revert it*; this file is the source
  of truth for *architecture and intent*.
- When a phase completes, update its row in §22 and, if the module's
  specification changed during implementation, update its section in §6–§17
  to match what was actually built.
