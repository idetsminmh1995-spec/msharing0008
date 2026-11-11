# Integration M — the three defects a real drum chart exposed

**Not a numbered phase.** Prompted by the user loading their own drum
MusicXML into the deployed web app and sending a screenshot of the result.
Everything numbered 1–47 was built and wired by then; this is what that
screenshot showed anyway.

**Status:** complete. `npm run verify` clean (653 tests), and the result
was checked in a real headless Chromium, not only in markup.

## Why a screenshot found what 646 tests did not

Two of the three defects below are **placement** bugs and one was a
**deployment** bug. The test suite asserts on SVG markup, which was
correct in all three cases: the right glyphs, at coordinates the tests
agreed with. `STATUS.md` §F4 predicted exactly this ("a markup-only suite
structurally cannot catch 'the glyphs are correct but nothing can draw
them'"). This pass therefore also added a real browser check to the loop.

---

## 1. The deployed site served no music font

**Symptom:** every notehead, clef, rest and time-signature digit rendered
as an empty box. The staff lines, stems and beams — which are `<line>`
elements, not glyphs — drew perfectly, which is what made the screenshot
look so strange.

**Cause:** the engine emits `font-family="Bravura"` on every glyph. The
old `web-preview/canvas-preview.html` carried a matching `@font-face`;
the `website/` build never did, and `website/` is the only directory
Cloudflare serves. So the browser had the right characters and nothing to
draw them with. This is blocker #4 from `abc-make-notes-visible.md`
recurring in a new place.

**Fix:** `website/assets/fonts/Bravura.woff2` (+ its SIL OFL licence) is
now committed alongside the bundle, and `website/video-create/drum/`
declares the `@font-face` and preloads it. `font-display: block` so the
notation waits for the real glyphs instead of flashing boxes first.

**Not fixed here:** the other eight instrument pages have no notation
rendering at all yet, so they need no font; they will need this same rule
the moment they get one.

---

## 2. Every chord broke its beam (§9.13)

**Symptom:** 62 stray eighth-note flags scattered through a 32-measure
drum chart, in places the file itself had written `<beam>` elements for.

**Cause:** `renderBeamGroup` accepted `readonly Note[]`. The caller
therefore classified a chord as unbeamable — the same bucket as a rest —
so every chord broke the run it sat in. §9.13 recorded this as a scope
limit, but on a drum chart it is not an edge case: **hi-hat struck with
snare IS a chord**, and the count matched exactly — 62 chords carrying a
beam hint, 62 flags drawn.

**Fix:** `renderChordHeadsPart` was extracted from `renderChord` (the
chord-shaped counterpart of `renderNoteheadPart`), and `renderBeamGroup`
now takes `readonly (Note | Chord)[]`. A chord in a beam group needs two
different positions, which is why the function grew a `BeamMember` shape:

- the **beam** position is the notehead nearest the beam, which the beam
  must clear;
- the **attach** position is the far notehead, where the stem starts, so
  a chord's stem spans the whole chord and still lands exactly on the
  (possibly sloped) beam.

For a plain note all of these collapse to the single position it already
used, which is why every pre-existing snapshot stayed byte-identical.

**Result on the user's file:** 62 flags → **0**.

---

## 3. The tempo mark was drawn through the notes (§9.21)

**Symptom:** `♩ = 120` overlapping the first beat's beam and stems.

**Cause:** Integration D placed the mark a fixed 2.5sp above the staff's
top LINE. That is not the same as above the staff's *content*: stems,
beams and flags get there first. On a drum chart the hi-hat line is the
top line, so the mark landed inside the note area every time. Measured on
this project's own fixture: the mark sat at y=1.50 while the first note's
stem ran 3.56 → 0.50 **at the same x**.

**Fix:** `measureNorthExtent` reports how far above its top line a
measure's content actually reaches, and the mark clears that instead.
A deliberate over-estimate — every note is treated as if it carried an up
stem and a beam — because the alternative is duplicating
`resolveStemDirection`'s whole priority chain in a second place.
Over-clearing by a staff space is invisible; colliding with a beam is not.

Clearing the content is only half the job: the mark then needs somewhere
to *be*. `tempoTopPadding` is computed score-wide and folded into
`staffBottomY` and `systemHeight`, so every staff of every system shifts
down together and no mark is clipped off the top. A score with no tempo
marks gets a padding of exactly zero, which is what keeps every other
fixture byte-identical.

**Result:** on the drum chart the mark now sits at y=2.00 with the
highest beam at y=4.00 — two staff spaces of clearance, where before it
was a staff space *below* the beam.

---

## How to modify

| Want to change | Where |
|---|---|
| Tempo-mark clearance above the content | `TEMPO_MARK_GAP` (1.5sp) in `render-from-musicxml.ts` |
| How much room the mark itself is given | `TEMPO_MARK_HEIGHT` (2.0sp) |
| How tall a stem+beam is assumed to be | `STEM_AND_BEAM_ALLOWANCE` |
| The web font | `website/assets/fonts/` + the `@font-face` rule in the drum page |

## How to revert

- **Font:** delete `website/assets/fonts/` and the `@font-face`/preload
  lines. The notation goes back to boxes in every browser.
- **Chords in beams:** narrow `renderBeamGroup` back to `readonly Note[]`
  and restore the caller's `kind === 'note'` filters.
  `renderChordHeadsPart` is a pure extraction and is worth keeping.
- **Tempo clearance:** set the mark's y back to `topStaffY - 2.5`, drop
  `measureNorthExtent`/`tempoTopPadding`, and use `STAFF_BOTTOM_Y` in
  place of `staffBottomY`.

Tests: `test/unit/beam-chord-tempo-clearance.test.js`. The tempo-mark
snapshot (`render-from-musicxml-tempo-mark.snap`) was regenerated, since
the placement genuinely changed.
