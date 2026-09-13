# Build Status — what is done, what is not

**Purpose:** one page answering "what's actually built?" and "what's next?".
§A–§E track the numbered phases; **§F tracks the follow-ups raised by the
A+B+C corrective work** (making notes actually visible in the web app).
Numbering is **`PLAN.md` §22's phase numbering** — deliberately not a second
numbering system. Say a number from §B below and that's the phase to build.

**Last audited:** against the code in `src/` and the 267-test suite,
after Phase 29 (end of Stage 4).

---

## A. DONE — Phases 1–34 ✅ (Stage 2, 3, 4 & 5 complete)

All of these are implemented, tested, and have a `Doc/phase-NN-*.md` record.
`npm run verify` passes 300/300 across them.

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

**Public API today:** 137 exports from `dist/notation-engine.js`.

---

## B. NOT DONE — Phases 35–54

Nothing below exists in `src/` yet. Each line links to the `PLAN.md` section
that specifies it.

### Stage 5 — Expression
| # | Phase | Spec |
|---|---|---|

### Stage 6 — Full import
| # | Phase | Spec |
|---|---|---|
| **35** | MusicXML parser v2 — every element the renderer supports | §10.4 |
| **36** | `.mxl` (zipped) support + `<score-timewise>` conversion | §10.5 |
| **37** | Cross-software compatibility corpus and fixes | §10.8 |
| **38** | Diagnostics and partial-render hardening | §10.7 |

### Stage 7 — MIDI and timing ← the whole area v1 was missing
| # | Phase | Spec |
|---|---|---|
| **39** | Standard MIDI File parser | §11 |
| **40** | Timing engine: tempo map, tick↔seconds, measure/beat | §12 |
| **41** | Drum mapping table + GM defaults | §13.3 |
| **42** | MIDI ↔ MusicXML alignment | §13.1–§13.2 |

### Stage 8 — Real layout
| # | Phase | Spec |
|---|---|---|
| **43** | Spacing algorithm (replaces Phase 21's naive layout) | §14 |
| **44** | Skyline collision avoidance | §15 |
| **45** | Scroll layout | §16.1 |
| **46** | Page layout + system/page breaking | §16.2 |
| **47** | Arbitrary W×H resize + O(1) pure-scale fast path | §16.3 |

### Stage 9 — Playback surface
| # | Phase | Spec |
|---|---|---|
| **48** | Position API + event stream | §17.1 |
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

- **C2 — Config sections are declared but unused.** Phase 7 reserved all 7
  `EngineConfig` sections, but only the ones whose modules exist are read by
  anything. `noteheadMapping`, `beam`, `cursor` and most of `layout` are
  inert until Phases 15/24/49/45-47 land. This is by design (§8.2), not a
  bug — but don't mistake "the option exists" for "the option does anything".

- **C3 — `numeratorDisplay` additive meters render but aren't parsed.**
  Phase 12 can *draw* `3+2+2`, but nothing reads it from a file yet; that
  arrives with the parser (Phase 20/35).

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

- **`src/cursor/`, `src/theme/`, `src/plugins/`** — empty Phase-1
  placeholders whose concepts v2 moved or deferred. Each README says where
  the concept went. No code belongs in them.

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
| **F1** | **Drum notehead shapes are wrong.** A hi-hat/cymbal renders as a round notehead instead of an ✕. | The most visible remaining defect on a real drum chart. The hard part is already done — the parser now captures each note's `instrumentId`, and Phase 15's `selectNoteheadGlyphName` already supports per-note shape overrides. What's missing is the table connecting the two. | Phase 35 (percussion), or a small standalone item |
| **F2** | **No drum instrument → staff-position mapping.** Positions come straight from the file's own `<display-step>`/`<display-octave>`. | Fine for a well-formed file, but a file that omits them (or uses a different convention) has nothing to fall back on. Needs the GM percussion table. | Phase 41 (drum mapping) |
| **F3** | **`.mxl` (zipped MusicXML) still rejected.** The app shows a clear error rather than opening it. | Many programs export `.mxl` by default, so a user's first file may well be one. | Phase 36 |
| **F4** | **No visual/browser-level test.** Every test asserts on SVG markup, which is exactly why the missing-font blocker (#4 in the A+B+C doc) went unnoticed for so long. | A markup-only suite structurally cannot catch "the glyphs are correct but nothing can draw them." | Stage 10 (Phase 53), or sooner if another font-class bug appears |
| **F5** | **`quick-demo/` is now dead code.** Referenced by nothing since the rewiring. | Harmless, but it's the last thing still claiming to be "the notation renderer" to a casual reader. | Trivial cleanup, any time |
| **F6** | **The app's notation is still decorative.** It renders below the video canvas; it is not composited into the exported frames, and there's no cursor/playback sync. | This is what the drum-video project actually needs the engine *for*. | Stage 8 + Stage 9 (Phases 43–49) |

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
