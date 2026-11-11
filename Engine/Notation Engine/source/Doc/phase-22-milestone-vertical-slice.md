# Phase 22 — Milestone: A Real `.musicxml` File Renders Correctly

**Status:** ✅ **closed.** This is a checkpoint, not a coding phase — its
one-line criterion ("a real simple `.musicxml` file renders correctly")
was already fully satisfied and verified during Phase 21's own work.
Nothing new was written for this phase; this document exists to record
*why* it's closed and point at the exact evidence, so "is Stage 3 done?"
has a clear, checkable answer rather than an implicit assumption.

## 1. What "correctly" was actually checked against

Not "it didn't crash" — every claim below was hand-traced against the
specific formula from the phase that defined it, using real
`.musicxml` fixture files parsed with a real `DOMParser` (jsdom), not
synthetic/mocked data:

| Claim | Evidence | Phase whose formula it matches |
|---|---|---|
| The treble clef glyph is correct | `gClef` → `U+E050` | Phase 10 |
| The time signature's digits are correct | `4/4` → two `timeSig4` (`U+E084`) glyphs | Phase 12 |
| Every note's staff position is correct | C4/D4/E4/F4 → y = 9/8.5/8/7.5 (bottomY=8 + `staffPositionForPitch`'s treble values 1/0.5/0/−0.5) | Phase 10 |
| Notehead fill selection is duration-aware | The half note gets the OPEN `noteheadHalf`, not `noteheadBlack` | Phase 15 |
| Rest placement is duration-aware | The half rest sits exactly at `middleLineY(5)` | Phase 18 |
| Stem attachment is anchor-based | One stem's attach/end Y matches Phase 16's `stemUpSE` anchor formula to the decimal | Phase 16 |
| A chord renders as ONE musical object, not N separate notes | 3-note chord → 3 noteheads at one shared X, ONE shared stem sized to the outermost note | Phases 3, 16, 19 |
| Multi-voice never silently drops a voice | `<backup>`-based 2-voice file → **5** total noteheads (4+1), not 4 | Phase 20 (parser) confirmed to survive Phase 21 (rendering) too |
| Malformed input degrades gracefully | All 10 real fixtures (including Phase 20's deliberately malformed ones) render without throwing; a non-`score-partwise` document still returns a valid SVG plus a diagnostic | Phases 20, 21 |

Full detail and the exact numbers for each row are in
[`phase-21-render-from-musicxml.md`](./phase-21-render-from-musicxml.md)
§2 — this file doesn't repeat them, only indexes them against this
milestone's specific criterion.

## 2. What this milestone does NOT claim

This is deliberately the **narrow** Stage 3 milestone (`PLAN.md`'s own
one-line description), not the full-engine `§20` Acceptance Criteria
list. In particular, none of the following are claimed yet, and each has
its own later phase:

- Drum/vocal MusicXML, or the same piece from 5 different programs (§20
  items 1–2) — that's the v2 parser + cross-software corpus, Phase
  35–37.
- Deterministic byte-identical re-renders, formally tested (§20 item 10)
  — not yet asserted as a test, though nothing in Phase 21's code is
  aware of wall-clock time or randomness, so it's expected to already
  hold; Stage 10's polish phases are where this gets a real test.
- Performance targets (§20 item 11) — no measurement has been taken yet;
  Stage 10 (Phase 53).
- Config-driven customisation of the rendered output (§20 items 6–8) —
  Phase 21 hardcodes ink color, background, and font family as constants
  rather than reading them from `EngineConfig`; Phase 50 (full theming)
  wires this up.

## 3. What "everything after this point is validated against real files"
means going forward

Every phase from Stage 4 onward should, where practical, include at
least one assertion against a real rendered fixture (as Phase 21's tests
already do), not only synthetic unit-level geometry checks — Stage 3's
whole purpose (the "key correction from v1," per `PLAN.md` §2.2) was
making sure the engine's assumptions get checked against real files
early, rather than only at Phase 39-of-50 the way v1's plan would have.

## 4. How to revert/remove it

Nothing to delete — this file is a record of a checkpoint, not a
description of code. If Stage 3's milestone criterion is ever found not
to actually hold (a regression), fix the regression and update this
file's evidence table rather than deleting it.
