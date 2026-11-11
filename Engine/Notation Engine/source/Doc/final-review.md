# Final end-to-end review

**When:** after Phase 54, with `PLAN.md` §22's roadmap complete (Phases
1–54, Stages 0–10, Integration Passes A–Q).

**Result:** `npm run verify` clean, 807/807 tests. **Four real bugs
found and fixed**, three of them visible on the user's own files. One
documentation sweep. Two honest gaps confirmed as still open.

## 0. How it was reviewed

Not by re-reading the code and nodding at it. Four passes, in this order,
each chosen because it can find something the others structurally cannot:

1. **Claim-vs-code sweep.** Every `[TODO]`, "not yet", "still hardcoded"
   and "not implemented" in `PLAN.md`, checked against what the code
   actually does now.
2. **Code smell scan.** `TODO`/`FIXME`/`HACK`/`@ts-ignore`/`any` across
   all 128 source files. **Zero hits** — every match was prose in a
   comment.
3. **Real files, measured.** All five of the user's own MusicXML files
   (drum, piano, two guitar, one mixed) rendered, then *measured*
   numerically — bounding boxes, cursor-vs-notehead distance, viewBox
   containment — rather than eyeballed. Eyeballing found the symptoms;
   measuring found the causes and proved the fixes.
4. **Real browser.** The same files screenshotted in headless Chromium,
   and the actual drum page driven end to end with a file loaded.

Passes 3 and 4 are where every bug came from. Pass 1 found only stale
prose. Pass 2 found nothing, which is itself worth recording.

## 1. The bugs

### 1.1 A key signature drawn on staves that have no key

The user's guitar file drew an **F♯ on its TAB staff**. A tab staff says
which fret, not which pitch, so an accidental in front of it means
nothing; a percussion staff has no key at all.

`mapClef` falls back to `keySigClefName: 'treble'` for both clefs so that
`keySignatureAccidentals` does not throw — which stopped the *error* and
started drawing the *wrong thing*. No test looked at a tab staff's
header, so nothing caught it.

Fixed with a new `ClefDefinition.takesKeySignature`. It is deliberately
**not** `positionsByPitch`: a percussion clef *does* position by pitch
(it maps `<unpitched>` display-step/octave through treble's own reference
line), so that predicate would have left the bug in place on drum staves
— which is the one instrument this project cares most about.

### 1.2 The playback cursor pointed 4.5 staff spaces away from its note

The worst of the four, because playback sync is what the engine exists
for.

`MEASURE_HEADER_ALLOWANCE` is a constant `6.0`. A real header is not:
clef (3) + four sharps (4.5) + time signature (2.5) + the leading 0.5 =
**10.5**. The note-drawing pass alone compensated, with a local
`Math.max(layout.x + allowance, cursorX)` — so the notes were always in
the right place. The tempo mark, the `<direction>` placement and
`positionToX` all kept using the bare constant.

On the user's own E-major score, `positionToX` reported **x=6.00 for a
note drawn at x=10.5**.

Fixed by giving every measure its **real** header width, computed once
after system placement by the same rules the draw loop uses, and
maximised across every part and staff — because all parts share one
horizontal timeline, so a percussion part (no key signature, after §1.1)
and a piano part in four sharps must still start their notes at the same
x. The constant survives as a *floor*, so nothing that already fitted
moved and **no snapshot changed**.

Measured drift across all five of the user's files, before and after:

| File | Before | After |
|---|---|---|
| `Untitled_score5` (4 sharps) | 4.50 | **0.000** |
| the other four | 0.00 | 0.000 |

This also fixed the visible symptom that led to it: the tempo mark was
being drawn **on top of** the key signature.

### 1.3 Clicking exactly on a notehead seeked to the note before it

`xToPosition` undoes an addition `positionToX` made, so an exact hit came
back a few ulps short of the note's own position and floored to the
previous one. A 1e-9 tolerance — a hundred-millionth of a notehead —
fixes it. Found because the new regression test asserted the two are
exact inverses at a real note's x, which nothing had asserted before.

### 1.4 The grand-staff brace was drawn above the music

Found during Phase 52 and recorded here for completeness (fixed there,
see `phase-52-export.md` §5). Bravura's brace sits entirely *above* its
own origin, and `renderBrace` anchored it at the system's **top**, so the
brace ran upward out of the system — and in page mode landed each
system's brace on the **previous page**. Invisible in the SVG snapshots,
which record the transform rather than where the ink lands.

## 2. What the review did NOT find

Worth stating, because a review that only lists problems implies the rest
was not checked:

- **No `any`, no `@ts-ignore`, no `TODO`/`FIXME`/`HACK`** anywhere in
  `src/` (128 files, 13,624 lines).
- **No content clipped by the viewBox** on any of the five real files —
  checked numerically, per file, against every drawn element's measured
  extent.
- **No non-info diagnostics** on any of the five files. The 27 infos on
  `Untitled_score5` are all `UNMATCHED_SLUR`, and that file genuinely
  does write every slur across a barline (a documented Phase 26 scope
  limit, not a defect).
- **The brace, stems, ledger lines, ties, chords, rests, beams, tuplets,
  repeat barlines and drum notehead shapes** all verified against the
  numbers on real files, not just by eye. The piano brace, for instance,
  measured exactly top-staff-top-line to bottom-staff-bottom-line.

## 3. Documentation sweep

`PLAN.md` carried claims that the code had outgrown. All corrected:

| Claim | Reality |
|---|---|
| `playback/ [TODO]` | Built in Phases 48–49 |
| "§15 is itself still `[TODO]`" | Built, and wired by Integration F |
| "89 tests across 12 suites" | 807 across 153 |
| "Integration/corpus tests `[TODO]`" | `cross-software-corpus.test.js` exists and passes |
| Tablature listed as unrendered, twice | Integration C draws fret numbers |
| "Tenor and soprano key signatures not implemented" | Phase 54 closed tenor |
| §4.1's dependency table missing four modules | `timing/`, `drums/`, `playback/`, `debug/`, `export/` added |
| Source/test trees missing `debug/`, `export/`, `perf/` | Added |

## 4. Gaps confirmed as still open

Both are deliberate, documented, and better left open than guessed at:

- **Soprano-clef key signatures** (`STATUS.md` §C1). No source consulted
  describes the shape, and the construction that produced tenor's is
  genuinely ambiguous for soprano. Degrades to a warning and a render
  complete except for that one signature.
- **`<part-group>` bracket grouping** across different instruments is not
  parsed, so several separate parts stack without a bracket. A brace for
  one part's own multiple staves is unaffected and works.

`STATUS.md` §F6 — "the app's notation is still decorative" — is no longer
an engine gap: Phase 48's position API, Phase 49's cursor and Phase 52's
PNG export are all built and verified. What remains is host-side wiring
in `website/`.

## 5. One improvement to the web app

`video-create/drum/index.html` called `parseMusicXml(xmlText)` and then
`renderFromMusicXml(xmlText)` — **parsing the same file twice**. Phase 53
measured parsing at ~80% of a render's cost and built
`renderParsedMusicXml` precisely for this. The page now parses once and
renders from that result, halving the work on every upload.

Verified by driving the real page in headless Chromium with the user's
own `Drum_Lesson_5.musicxml`: the green confirmation box, "32 measures
loaded", BPM 120, Time 4/4, and the notation itself all correct.

## 6. New tests

| File | Tests | Covers |
|---|---|---|
| `test/unit/header-width.test.js` | 8 | §1.2 and §1.3 — real header width, cursor alignment on five fixtures and in page mode, `xToPosition` as an exact inverse, tempo-mark clearance |
| `test/unit/key-signature.test.js` | +3 | §1.1 — tab and percussion draw none, an ordinary staff still does |
| `test/fixtures/musicxml/wide-key-signature.musicxml` | — | Four sharps + a tempo mark: the combination that makes all of §1.2 visible at once |

One of these caught a trap in itself worth recording: the first version
of `wide-key-signature.musicxml` had a `--` inside an XML comment, which
is illegal, so the file did not parse — and the drift test passed by
measuring an **empty** render. `worstCursorDrift` now asserts the score
produced events at all before believing its own answer.
