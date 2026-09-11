# Build Status — what is done, what is not

**Purpose:** one page answering "what's actually built?" and "what's next?".
Numbering is **`PLAN.md` §22's phase numbering** — deliberately not a second
numbering system. Say a number from §B below and that's the phase to build.

**Last audited:** against the code in `src/` and the 89-test suite, at the
commit that added this file.

---

## A. DONE — Phases 1–15 ✅

All of these are implemented, tested, and have a `Doc/phase-NN-*.md` record.
`npm run verify` passes 112/112 across them.

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

**Public API today:** 70 exports from `dist/notation-engine.js`.

---

## B. NOT DONE — Phases 16–54

Nothing below exists in `src/` yet. Each line links to the `PLAN.md` section
that specifies it.

### Stage 2 — Minimum note rendering
| # | Phase | Spec |
|---|---|---|
| **16** | Stems (incl. per-voice forced direction) | §9.8 |
| **17** | Flags | §9.9 |
| **18** | Rests (incl. whole/half special placement) | §9.10 |
| **19** | Accidentals (draw-or-not state machine + stacking) | §9.11 |

### Stage 3 — First vertical slice ← the milestone that de-risks everything after it
| # | Phase | Spec |
|---|---|---|
| **20** | MusicXML parser v1 — enough for a single-voice score | §10.3 |
| **21** | Naive single-system layout + `renderFromMusicXML()` end to end | §16 |
| **22** | **Milestone: a real `.musicxml` file renders correctly** | §20 |

### Stage 4 — Rhythm and structure
| # | Phase | Spec |
|---|---|---|
| **23** | Beam grouping (by beat structure, with override) | §9 |
| **24** | Beam geometry + 3 styles (straight / flat / curved) | §9 |
| **25** | Multi-voice per staff + voice collision / rest separation | §15 |
| **26** | Ties | §9 |
| **27** | Slurs | §9 |
| **28** | Tuplets | §9 |
| **29** | Grand staff / multi-part systems | §16 |

### Stage 5 — Expression
| # | Phase | Spec |
|---|---|---|
| **30** | Articulations and ornaments | §9 |
| **31** | Dynamics, hairpins, tempo marks, rehearsal marks | §9 |
| **32** | Lyrics | §9 |
| **33** | Chord symbols | §9 |
| **34** | Grace notes | §9 |

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
everything else in Phases 1–15 complies as-is.

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
