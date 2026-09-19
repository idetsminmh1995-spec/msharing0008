# Build Status — what is done, what is not

**Purpose:** one page answering "what's actually built?" and "what's next?".
§A–§E track the numbered phases; **§F tracks the follow-ups raised by the
A+B+C corrective work** (making notes actually visible in the web app).
Numbering is **`PLAN.md` §22's phase numbering** — deliberately not a second
numbering system. Say a number from §B below and that's the phase to build.

**Last audited:** against the code in `src/` and the **670-test** suite,
after Phase 48 (§17.1's playback position API + event stream). Stages
0-8 are complete and every phase numbered 1-47 is built AND wired;
Stage 9 (Phases 48-49) is now half done -- Phase 48 built, Phase 49
(cursor) next.

---

## A. DONE — Phases 1–47 ✅ (Stages 0 through 8 complete) + Integration Passes A–L

All of these are implemented, tested, and have a `Doc/phase-NN-*.md` record.
`npm run verify` passes **653/653** across them.

| # | Phase | What exists | Record |
|---|---|---|---|
| 1 | Folder structure | `src/{core,glyphs,config,geometry,render}` + `test/{unit,visual,helpers}` | [`phase-01`](./phase-01-folder-structure.md) |
| 2 | Toolchain | TS 5.9.3 strict + extra flags, esbuild, ESLint flat config, Prettier, `npm run verify` | [`phase-02`](./phase-02-toolchain.md) |
| 3 | Core data model | `Pitch` (pitched\|unpitched union), `Duration`, `Note`, `Rest`, `Chord`, `Voice`, `Measure`, `Part`, `Score` | [`phase-03`](./phase-03-core-data-model.md) |
| 4 | Duration/tick math | `TICKS_PER_QUARTER`=480, dots, tuplets, XML divisions ↔ ticks, `durationTypeAndDotsFromTicks` | [`phase-04`](./phase-04-duration-tick-math.md) |
| 5 | SMuFL glyph table | Real Bravura 1.38 data (2,940 glyph names, 3,262 bboxes, 590 anchor sets), `getGlyph`, `getEngravingDefault` | [`phase-05`](./phase-05-smufl-glyph-table.md) |
| 6 | SVG primitives | `svgLine/Path/Rect/Text/Group/GlyphText`, `createSvgDocument`, staff-space coordinates, XML escaping | [`phase-06`](./phase-06-svg-primitives.md) |
| 7 | Config schema | `EngineConfig` (7 sections), `DEFAULT_CONFIG`, `resolveConfig()` | [`phase-07`](./phase-07-config-schema.md) |
| 8 | Test harness | `node --test`, `loadEngine()`, `matchSnapshot()`, 6 visual snapshots | [`phase-08`](./phase-08-testing-harness.md) |
| 9 | Staff | `computeStaffGeometry(n)` any line count, `renderStaff` | [`phase-09`](./phase-09-staff-stave-rendering.md) |
| 10 | Clefs | 8 clefs, `staffPositionForPitch`, `renderClef` | [`phase-10`](./phase-10-clef-engine.md) |
| 11 | Key signatures | `keySignatureAccidentals`, `cancellationNaturals`, `renderKeySignature` — **partial, see §C1** | [`phase-11`](./phase-11-key-signature-engine.md) |
| 12 | Time signatures | numeric / common / cut / additive, real digit widths, `renderTimeSignature` | [`phase-12`](./phase-12-time-signature-engine.md) |
| 13 | Barlines | all 7 types, `shouldShowBarNumber`, `renderBarline`, `renderBarNumber` | [`phase-13`](./phase-13-barline-engine.md) |
| 14 | Ledger lines | `computeLedgerLines` (any line count), real Bravura extension/thickness | [`phase-14`](./phase-14-ledger-lines.md) |
| 15 | Noteheads + mapping | `selectNoteheadGlyphName` (XML > config > duration default), unified pitched/unpitched key | [`phase-15`](./phase-15-noteheads.md) |
| 16 | Stems | `resolveStemDirection` (forced > XML > automatic), anchor-attached `renderStem` | [`phase-16`](./phase-16-stems.md) |
| 17 | Flags | `needsFlag` (unbeamed-only), direction-aware `flagGlyphName`/`renderFlag` | [`phase-17`](./phase-17-flags.md) |
| 18 | Rests | `defaultRestY` (whole/half special-cased), `restY` with per-voice offset | [`phase-18`](./phase-18-rests.md) |
| 19 | Accidentals | draw-or-not state machine, `assignAccidentalColumns` stacking | [`phase-19`](./phase-19-accidentals.md) |
| 20 | MusicXML parser v1 | `parseMusicXml` (traversal, chord grouping, diagnostics), real fixture tests | [`phase-20`](./phase-20-musicxml-parser-v1.md) |
| 21 | Naive layout + `renderFromMusicXml` | Fixed-width measures, full Phase 9-19 pipeline wired end to end | [`phase-21`](./phase-21-render-from-musicxml.md) |
| 22 | Milestone checkpoint | Closed on Phase 21's evidence -- see the evidence table | [`phase-22`](./phase-22-milestone-vertical-slice.md) |
| 23 | Beam grouping | `groupBeams` (simple/compound meter, override), wrote the missing §9.12 spec first | [`phase-23`](./phase-23-beam-grouping.md) |
| 24 | Beam geometry | `computeBeamShape` (straight/flat/curved, 1.0sp clamp), wired end to end; fixed a beam-overlap bug | [`phase-24`](./phase-24-beam-geometry.md) |
| 25 | Multi-voice per staff | Forced stem direction + rest separation, wired end to end (fixes the reported hand/foot bug); notehead-offset geometry built but not yet wired | [`phase-25`](./phase-25-multi-voice.md) |
| 26 | Ties | Tapered lens shape (Bezier), side-opposite-stem rule, wired end to end (same-voice/same-measure/non-beamed/non-chord) | [`phase-26`](./phase-26-ties.md) |
| 27 | Slurs | Whole-span side rule (`slurSide`), same Bezier primitive as ties; geometry built, not wired (parsing is v2 scope) | [`phase-27`](./phase-27-slurs.md) |
| 28 | Tuplets | `tupletBracketNeeded`, stem-side placement (opposite ties/slurs); geometry built, not wired (parsing is v2 scope) | [`phase-28`](./phase-28-tuplets.md) |
| 29 | Grand staff / multi-part | Brace rule + `computeSystemLayout` vertical stacking; geometry built, not wired (needs <staves> parsing + render-loop restructure) | [`phase-29`](./phase-29-grand-staff-multi-part.md) |
| 30 | Articulations + ornaments | `articulationSide` (opposite-stem, marcato exception), `ornamentGlyphName` (always above); geometry built, not wired | [`phase-30`](./phase-30-articulations-ornaments.md) |
| 31 | Dynamics/hairpins/tempo/rehearsal | Dynamics+hairpins built (real glyphs, scalable wedge); tempo/rehearsal marks placement-only (text rendering deferred) | [`phase-31`](./phase-31-dynamics-hairpins-tempo-rehearsal.md) |
| 32 | Lyrics | Real hyphen/elision glyphs + extender line built; syllable text rendering deferred (needs a text-font system) | [`phase-32`](./phase-32-lyrics.md) |
| 33 | Chord symbols | Real `csym` accidental + 5 quality glyphs built; root letter/bass note deferred (needs a text-font system) | [`phase-33`](./phase-33-chord-symbols.md) |
| 34 | Grace notes | Real precomposed acciaccatura/appoggiatura glyphs (no text-font gap this time) | [`phase-34`](./phase-34-grace-notes.md) |
| 35 | MusicXML parser v2 (Tier 1) | midi-instrument/notehead/grace/tuplet-ratio/stem/accidental parsed + wired; 2 real bugs found+fixed | [`phase-35`](./phase-35-musicxml-parser-v2.md) |
| 35 | **MusicXML parser v2 (Tier 2/3) — completion** | Every remaining §10.4 element: `<notations>` (slur/tuplet/articulations/ornaments/fermata), `<beam>`, `<lyric>`, `<harmony>`, `<direction>` (dynamics/wedge/words/rehearsal), `<print>`, `<sound tempo>`. Also closed §C3 (additive meters -- a real silent wrong-meter bug) and §10.8's explicit-`<beam>` divergence | [`phase-35-tier23`](./phase-35-musicxml-parser-v2-tier23.md) |
| 36 | `.mxl` + score-timewise | Both confirmed byte-identical to partwise/uncompressed rendering; wired into the web app | [`phase-36`](./phase-36-mxl-timewise.md) |
| 37 | Cross-software corpus | 7 §10.8 divergences covered by real fixtures; fixed a real `<tied>`-only-tie bug | [`phase-37`](./phase-37-cross-software-corpus.md) |
| 38 | Diagnostics hardening | Fixed 2 real crash bugs (`.mxl` throwing, zero-divisions) + a real test-coverage gap; dynamic code-coverage check | [`phase-38`](./phase-38-diagnostics-hardening.md) |
| 39 | Standard MIDI File parser | VLQ, running status, note-on-zero, tempo/timesig/keysig meta events, 480-tick normalization; never throws | [`phase-39`](./phase-39-midi-parser.md) |
| 40 | Timing engine | Anti-drift TempoMap (precompute-once), tick<->seconds, tick<->measure/beat; passes required 10-min drift test | [`phase-40`](./phase-40-timing-engine.md) |
| 41 | Drum mapping table + GM defaults | Default GM table for the standard kit; wired into rendering via <instrument>-to-GM parsing (real notehead/position/stem) | [`phase-41`](./phase-41-drum-mapping.md) |
| 42 | MIDI↔MusicXML alignment | 4-tier matching cascade (exact/tolerance/ordinal/unmatched); real end-to-end fixture pair confirmed | [`phase-42`](./phase-42-midi-musicxml-alignment.md) |
| — | **Integration A** (not a numbered phase) | Grand staff wired end to end (`<staves>`, per-staff clefs, brace, continuous barline) + fixed clef glyphs being drawn on the wrong line | [`integration-a`](./integration-a-grand-staff.md) |
| — | **Integration B** (not a numbered phase) | Every part renders (guitar tab part no longer dropped); per-staff line counts from `<staff-lines>` (tab = 6) | [`integration-b`](./integration-b-multi-part.md) |
| — | **Integration C** (not a numbered phase) | Tab fret numbers drawn on their own string lines (multi-digit, open strings); no text-font system needed | [`integration-c`](./integration-c-tab-frets.md) |
| — | **Integration D** (not a numbered phase) | Tempo marks (dotted-quarter-equals-BPM) assembled from real glyphs, drawn above the staff; no text-font system needed | [`integration-d`](./integration-d-tempo-marks.md) |
| 43 | Spacing algorithm | Full §14 algorithm (reference duration, log-scale proportional spacing, min-distance, justification); WIRED into rendering by Integration E | [`phase-43`](./phase-43-spacing-algorithm.md) |
| 44 | Skyline collision avoidance | Full §15 algorithm; found+fixed a real staff-distance formula bug while testing; grand-staff distance WIRED into rendering by Integration F | [`phase-44`](./phase-44-skyline-collision-avoidance.md) |
| — | **Integration E** (not a numbered phase) | Wired Phase 43's spacing into rendering (real content-driven note positions, replacing fixed-width layout); found+fixed a real chord-exclusion bug while testing | [`integration-e`](./integration-e-spacing-wiring.md) |
| — | **Integration F** (not a numbered phase) | Wired Phase 44's skyline into grand-staff distance (content-aware gap, confirmed growing from 8 to 16 on real crossing-hands content) | [`integration-f`](./integration-f-skyline-wiring.md) |
| 45 | Scroll layout | Full §16.1 mode (computeScrollLayout), formalizing + wiring what the renderer already did since Integration E; zero regressions from the extraction | [`phase-45`](./phase-45-scroll-layout.md) |
| 46 | Page layout (system + page breaking) | Full §16.2 algorithm; found+fixed a real single-measure justification gap in Phase 43's own justifySystem; not yet wired into rendering | [`phase-46`](./phase-46-page-layout.md) |
| — | **Integration G** (not a numbered phase) | Tempo mark display/positioning fixes, in two rounds (equals-sign spacing, vertical clearance, measure-width awareness, and a real x-formula inconsistency found by testing against the user's own real file) -- prompted by user-reported screenshots | [`integration-g`](./integration-g-tempo-mark-fixes.md) |
| 47 | Arbitrary resize | Full §16.3 O(1) pure-scale fast path; directly usable on any rendered SVG today (no wiring pass needed) | [`phase-47`](./phase-47-arbitrary-resize.md) |
| — | **Integration H** (not a numbered phase) | §9.19 articulations + §9.20 ornaments drawn, including §9.19's marcato-always-above exception; fermata parsed but deliberately not drawn (§9 has no placement section for it) | [`integration-h`](./integration-h-articulations-ornaments.md) |
| — | **Integration I** (not a numbered phase) | §9.16 slurs + §9.17 tuplets drawn, via a span pass over anchors captured as each event renders; found+fixed a latent beam-group index/x misalignment | [`integration-i`](./integration-i-slur-tuplet-wiring.md) |
| — | **Integration J** (not a numbered phase) | §9.21 dynamics + hairpins drawn, including wedges spanning several measures; explicit `placement` honoured | [`integration-j`](./integration-j-dynamics-hairpins.md) |
| — | **Integration K** (not a numbered phase) | §9.14 multi-voice notehead-collision offsetting wired -- completes Phase 25's last unwired piece | [`integration-k`](./integration-k-voice-collision.md) |
| — | **Integration M** (not a numbered phase) | The three defects a real drum chart exposed: the deployed site served no music font (every glyph a box), every chord broke its beam (62 stray flags on a 32-measure chart), and the tempo mark was drawn through the notes. Verified in a real headless Chromium, not only in markup | [`integration-m`](./integration-m-drum-chart-defects.md) |
| — | **Integration L** (not a numbered phase) | §16.2 page mode wired (completes Phase 46, and Stage 8) + **fixed parts laying themselves out independently**, so a score finally shares ONE horizontal timeline; also de-quadratic-ed the per-measure lookups | [`integration-l`](./integration-l-page-layout-and-score-wide-spacing.md) |
| — | **Integration N** (not a numbered phase) | Corrected the GM drum table's snare (1 full staff-space) and hi-hat (half a staff-space) default positions, verified against a real drum-lesson file's own 100%-consistent encoding | [`integration-n`](./integration-n-drum-position-corrections.md) |
| — | **Integration O** (not a numbered phase) | Closed §9.8's deferred stem-shortening gap -- a forced direction pointing away from the middle for a note outside the staff now shortens toward the 2.5sp floor instead of staying at a fixed 3.5sp | [`integration-o`](./integration-o-stem-shortening.md) |
| — | **Integration P** (not a numbered phase) | Beam line endpoints were computed from each note's raw x instead of its actual stem-attach x (the notehead glyph's own anchor offset) -- a beamed group's last stem fell just short of the beam, appearing disconnected | [`integration-p`](./integration-p-beam-endpoint-anchor.md) |
| — | **Integration Q** (not a numbered phase) | A `<barline location="left">` was drawn at its measure's right edge instead of its left -- a whole measure late; real files commonly write a repeat-begin this way | [`integration-q`](./integration-q-barline-location.md) |
| 48 | Playback position API + event stream | Full §17.1 (`positionToX`/`xToPosition`/`getEventStream`/`resolvePosition`), wired into `renderFromMusicXml`'s own result from the exact layout that produced its SVG; deletes the superseded `src/cursor/` placeholder | [`phase-48`](./phase-48-playback-position-api.md) |

**Public API today:** 219 exports from `dist/notation-engine.js`.

---

## B. NOT DONE — Phases 49–54

Nothing below exists in `src/` yet. Each line links to the `PLAN.md` section
that specifies it. **Everything numbered 1–48 is done** (see §A); these six
are the rest of Stage 9 and all of Stage 10.

### Stage 9 — Playback surface
| # | Phase | Spec |
|---|---|---|
| **49** | Cursor, both sync modes | §17.2 |

### Stage 10 — Polish and delivery
| # | Phase | Spec |
|---|---|---|
| **50** | Full theming API — unify every config section | §8 |
| **51** | Debug overlays and diagnostics surface | §18.3 |
| **52** | Export: SVG, PNG, PDF | §3, §16.2 |
| **53** | Performance pass against the §18.1 budgets | §18.1 |
| **54** | Public API surface + generated reference docs | §22 |

---

## C. Partially done / known gaps inside "done" phases

These sit inside phases marked ✅ above. They are real gaps, deliberately
left rather than guessed at — each is documented at the point it was found.

- **C1 — Key signatures: tenor and soprano clefs (Phase 11).**
  `keySignatureAccidentals()` **throws** for `'tenor'`, `'soprano'`,
  `'percussion'` and `'tab'` instead of returning a wrong answer. Tenor's
  sharps follow a genuinely different shape (not a uniform offset of
  treble's), confirmed by multiple sources including VexFlow's own hardcoded
  exception array. Closing it needs an explicit line-by-line source, then the
  same verification process treble/bass/alto got. See
  [`phase-11`](./phase-11-key-signature-engine.md) §4 and `PLAN.md` §19.

- **C2 — Most config sections are still declared but unread.** Integration L
  made `renderFromMusicXml` accept a `PartialEngineConfig`, but it honours
  only `layout.mode`, `page` and `spacing`. `colors`, `noteheadMapping`,
  `beam`, `barNumbers`, `keySignature`, `drums` and `cursor` are still
  hardcoded constants inside the renderer. Unifying every section is
  **Phase 50**'s own job (§8, Stage 10) — until then, don't mistake "the
  option exists" for "the option does anything".

- **C3 — CLOSED.** Additive meters are now parsed *and* drawn. This turned
  out to be a real bug rather than a missing feature: `<beats>3+2+2</beats>`
  went through `Number.parseInt`, which stops at the `+`, so every 7/8 file
  written the common way silently parsed as **3/8** — wrong meter, wrong
  beaming, and a spurious `MEASURE_OVERRUN` on every measure. See
  [`phase-35-tier23`](./phase-35-musicxml-parser-v2-tier23.md).

### Audited against the v2 plan — findings and resolution

The built phases were re-audited against `PLAN.md` v2 (not against v1, which
they were written to). Two mismatches were found and **both are now fixed**;
everything else in Phases 1–19 complies as-is.

| Finding | Resolution |
|---|---|
| `PLAN.md` §4.1's dependency list said "geometry knows core and glyphs; render knows geometry". Reality: `geometry → {core, glyphs, config}` and `render → {geometry, glyphs}`. Both actual shapes are *correct* — measuring needs glyph metrics, and rendering needs the glyph character — the plan's list was simply out of date | **Plan fixed.** §4.1 now carries an exact per-module dependency table, verified against the code, plus the reasoning for why both modules legitimately read `glyphs/` |
| `textWidth()` and its glyph-lookup helpers lived in `render/time-signature.ts`, but they are pure measurement with no SVG output — which §5's "geometry computes, render draws" rule puts in `geometry/` | **Code fixed.** Moved to `geometry/time-signature.ts` as `textWidth`, `charAdvance`, `glyphForTimeSigChar`, `glyphNameForTimeSigChar`; the renderer now consumes them instead of duplicating the bbox arithmetic. Public API unchanged for `textWidth`; snapshots byte-identical, 89/89 still pass |

Verified clean in the same audit: no module branches on instrument type
(§4.3); no output-affecting iteration over unordered maps, so determinism
(§4.4) holds; the `core/` data structures match §6.1 exactly; the staff-space
coordinate convention and the `SMUFL_STAFF_SPACES_PER_EM = 4` constant match
§4.2; every `geometry/X.ts` has its matching `render/X.ts` per §5.

Not a defect: `EngineConfig`'s `[TODO]` sections from §8.2 (`spacing`,
`staves`, `page`, `fonts`, `drums`, `debug`) are absent by design — §8.2 says
each lands with its own module.

### Fifth audit round — prompted by a screenshot of the real app

The user loaded their own drum MusicXML into the deployed site and sent a
screenshot. Everything numbered 1–47 was built and wired; the screenshot
showed boxes. Three defects, all now fixed, all in
[`integration-m`](./integration-m-drum-chart-defects.md):

| Finding | Resolution |
|---|---|
| **The deployed site served no Bravura font** (§F7 below, raised in the fourth round and now closed). Staff lines, stems and beams drew perfectly — they are `<line>` elements — while every glyph was an empty box | **Fixed.** `website/assets/fonts/Bravura.woff2` is committed and the drum page declares `@font-face` + preload |
| **Every chord broke its beam.** `renderBeamGroup` took `readonly Note[]`, so the caller classified a chord as unbeamable — the same bucket as a rest. §9.13 recorded this as a scope limit, but a drum chart's hi-hat-plus-snare IS a chord: 62 chords carried a `<beam>` hint and 62 stray flags were drawn, an exact match | **Fixed.** `renderChordHeadsPart` extracted; `renderBeamGroup` now takes `(Note \| Chord)[]` and distinguishes the notehead the beam must clear from the one the stem attaches to. 62 flags → 0 |
| **The tempo mark was drawn through the notes.** Integration D placed it a fixed 2.5sp above the top staff LINE, which on a chart whose notes sit on that line is below the beams — measured: mark at y=1.50, stem running 3.56→0.50 at the same x | **Fixed.** `measureNorthExtent` clears the measure's real content, and `tempoTopPadding` gives the mark somewhere to be without clipping. Now 2 staff spaces above the highest beam |

**Process change this round:** a markup-only suite structurally cannot
catch a missing font or a mark drawn behind a beam, which is what §F4 has
said since the A+B+C work. Renders are now checked in a real headless
Chromium (Playwright, already in the image) before a rendering change is
called done.

### Fourth audit round, after Integrations H–L

Three real defects found while wiring Phases 25/27/28/30/31/46, each now
fixed with a regression test in
`test/unit/bugfixes-phase47-review.test.js` (or its integration's own file):

| Finding | Resolution |
|---|---|
| **Every part laid itself out independently.** Measure widths and x positions were computed per part, so a part with a busy measure 1 put its barline at x=25.8 while another part's whole-note measure 1 ended at x=9. Two parts of one score simply did not line up — contradicting §9.18's "the same horizontal measure positions shared down the system" and §14's one-shared-axis rule, and making page mode impossible | **Fixed.** The horizontal layout is computed **once for the whole score**, from every part's voices combined, before the part loop. Both parts now use identical barline positions, in scroll and page mode alike |
| **`<beats>3+2+2</beats>` parsed as 3.** See §C3 above | **Fixed** in `parser/musicxml/attributes.ts`; the numeric total and the written form are now separate |
| **Unpitched chord members were skipped by the skyline's staff-distance estimate.** `worstCaseStaffExtent` handled unpitched notes in its single-note branch but its chord branch tested `p.kind === 'pitched'` and dropped everything else. A drum chart legitimately writes kick+hi-hat as one chord, so on a multi-staff percussion part every chord contributed nothing and the staves stayed at the minimum distance | **Fixed** by extracting `staffPositionOfNote`, used by both branches — §4.3's "no code path branches on is-this-a-drum" invariant, applied to the one place that still did |

Also found and fixed while wiring: `renderBeamGroup`'s caller derived its
member notes and their x positions from two separately-filtered lists, so any
non-note group member would have shifted every following note onto the wrong
x. Not currently reachable, which is exactly why it was worth fixing before
it became reachable.

Also done in the same pass, for §18.1's sake: three linear `.find()` scans
that ran once per measure per part were replaced with indexes built once —
they made a full render quadratic in measure count.

### Second audit round, after Phases 14–17

Re-ran the same audit after Phases 14–17 landed. Three more findings, all
fixed immediately:

| Finding | Resolution |
|---|---|
| `render/flag.ts` imported `DurationType` directly from `core/duration.js` (type-only, zero runtime cost, but still a `render → core` edge the §4.1 table added last round explicitly forbids) | **Code fixed.** `geometry/flag.ts` now re-exports `DurationType`; `render/flag.ts` imports it from there instead. Same non-conflicting-re-export situation as Phase 13's `BarNumberDisplay` |
| `geometry/ledger-line.ts`'s `topLine = -(numLines - 1)` has the exact shape of the two already-fixed −0 bugs (Phase 9, Phase 16). At `numLines=1` it evaluates to −0. It doesn't currently escape into any returned value (only used in a comparison and as a subtraction base, both of which normalize away from −0), so it isn't a live defect — but left as a third differently-styled instance of an identical, already-recognized shape | **Code fixed** for consistency with the other two, before it could become a real bug under some future refactor |
| `PLAN.md` §9.6–§9.9 still said `[TODO]` and Stage 2's roadmap table had no status column, even though Phases 14–17 were done | **Plan fixed.** All four marked `[BUILT]`; Stage 2 gained a `[IN PROGRESS — 14–17 of 19]` header and a Status column with ✅ on the four done rows, matching Stage 0/1's own pattern exactly |

Also reconfirmed clean in this round: the full `§4.1` dependency table now
holds with zero exceptions (`render` imports only `{geometry, glyphs}`);
every `geometry/X.ts` from Phases 14–17 has its matching `render/X.ts`; no
new instrument branching or unordered-iteration-affecting-output crept in.

---

## D. Outside the engine (not part of any phase number)

- **`quick-demo/`** — a throwaway pre-Phase-1 staff-line proof of concept,
  compiled separately and wired into the drum-video app at
  `web-preview/canvas-preview.html`. It is **not** part of `src/`, shares no
  code with it, and is superseded by Phase 9. See
  [`phase-09-staff-lines.md`](./phase-09-staff-lines.md). Safe to delete once
  the real engine renders something the app can use.

- **`src/theme/`, `src/plugins/`** — empty Phase-1 placeholders whose
  concepts v2 moved or deferred. Each README says where the concept
  went. No code belongs in them. (`src/cursor/`, the third such
  placeholder, was deleted by Phase 48 once its real home, `src/playback/`,
  existed — exactly what its own README said to do.)

---

## E. How to use this file

1. Pick a number from §B.
2. Build it per its `PLAN.md` section.
3. `npm run verify` must pass clean.
4. Write `Doc/phase-NN-*.md` (what was written / how to modify / how to
   revert).
5. Commit, push, and move that row from §B to §A here.

---

## F. Raised by the A+B+C work — not yet done

The A+B+C corrective work (see
[`abc-make-notes-visible.md`](./abc-make-notes-visible.md)) made notes
**appear** in the web app. It did not make everything about them
**correct**. These are the specific follow-ups it raised, in the order
they'd sensibly be tackled:

| # | Item | Why it matters | Belongs to |
|---|---|---|---|
| ~~**F1**~~ | ~~Drum notehead shapes are wrong~~ — **CLOSED by Phase 41.** A hi-hat/cymbal renders as a real ✕ (`noteheadXBlack`); verified on the project's own `Drum_Lesson_5.musicxml`, which draws 186 of them. | — | done |
| ~~**F2**~~ | ~~No drum instrument → staff-position mapping~~ — **CLOSED by Phase 41.** `<midi-instrument>`/`<midi-unpitched>` resolves to a GM number, which drives position, notehead shape and stem direction from `DEFAULT_DRUM_MAPPING_TABLE`. | — | done |
| ~~**F3**~~ | ~~`.mxl` still rejected~~ — **CLOSED by Phase 36**, and wired into the web app's upload path. | — | done |
| **F4** | **No visual/browser-level test in the automated suite.** Integration M now drives a real headless Chromium by hand before calling a rendering change done — which is how §F7 and two placement bugs were finally caught — but that check is not yet part of `npm run verify`. | A markup-only suite structurally cannot catch "the glyphs are correct but nothing can draw them." The manual browser step closes the hole in practice; automating it closes it permanently. | Stage 10 (Phase 53) |
| **F5** | **`quick-demo/` is now dead code.** Referenced by nothing since the rewiring. | Harmless, but it's the last thing still claiming to be "the notation renderer" to a casual reader. | Trivial cleanup, any time |
| **F6** | **The app's notation is still decorative.** It renders in the video preview panel, but it is not composited into exported frames and there is no cursor/playback sync. | This is what the drum-video project actually needs the engine *for*. Stage 8 is now complete, so what remains is **Stage 9 (Phases 48–49)** plus Phase 52's PNG export. | Stage 9 + Phase 52 |
| ~~**F7**~~ | ~~The deployed website does not serve the Bravura font~~ — **CLOSED by Integration M**, after the user's own screenshot showed exactly the predicted result: every glyph an empty box. `website/assets/fonts/Bravura.woff2` is committed and the drum page declares `@font-face` + preload. | — | done |

**None of these are regressions** — F1/F2/F3 are documented scope
boundaries from Phases 20/35/36, F6 is simply later-stage work not yet
reached. They're listed here so "what's left to make the app actually
good?" has a written answer rather than living in memory.

---

## G. Standing instruction from the user (2026-09-12)

Drum notation now renders with correct stem directions (Phase 25), but
the **overall visual style is not yet what the user wants**. Rather than
iterating on style now, the user asked to **defer all visual/stylistic
rework to one final pass, once every planned phase (through Phase 54) is
built** — at that point, review everything end to end and rewrite/restyle
as needed with the full picture in view, rather than repeatedly restyling
piecemeal as each new phase changes what's possible.

**Until that final pass:** keep building phases in order; keep noting any
deferred/incomplete piece in this file (§F, and each phase's own
`Doc/phase-NN-*.md`) exactly as already practiced, so nothing gets
forgotten by the time that final review happens. Do not treat "the drum
notation doesn't look right yet" as a signal to stop and restyle now —
that is expected and already accounted for.
