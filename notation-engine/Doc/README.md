# Notation Engine — Doc folder

**Rule (never skipped): every time code is written for the Notation Engine,
a matching doc file goes in this folder in the same turn — what was written,
and how to change/revert it.** One doc file per unit of work, named after
the phase/feature it covers, so this folder stays a running record of the
whole engine's build history, not just the plan (`../PLAN.md`) for what's
*intended*.

## Where the specification lives

- **[`../PLAN.md`](../PLAN.md)** — the **authoritative** architecture and
  specification (v2). Read this before writing any code.
- **[`./STATUS.md`](./STATUS.md)** — what is built vs not built right now,
  with the remaining phases numbered. Start here to pick the next piece of
  work.
- [`./PLAN-v1-historical.md`](./PLAN-v1-historical.md) — the v1 roadmap,
  superseded, kept here as a read-only historical reference.
- **This folder** — the per-phase build record: what was actually written,
  how to change it, how to revert it. `../PLAN.md` is the source of truth
  for *intent*; these files are the source of truth for *what exists*.

## Index

| Doc file | Covers |
|---|---|
| [`phase-01-folder-structure.md`](./phase-01-folder-structure.md) | Phase 1 folder skeleton (`src/`, `test/`, `docs/`) |
| [`phase-02-toolchain.md`](./phase-02-toolchain.md) | Phase 2 toolchain (TypeScript, esbuild, ESLint, Prettier) |
| [`phase-03-core-data-model.md`](./phase-03-core-data-model.md) | Phase 3 core data model (`Pitch`, `Note`, `Chord`, `Voice`, `Measure`, `Part`, `Score`) |
| [`phase-04-duration-tick-math.md`](./phase-04-duration-tick-math.md) | Phase 4 duration/tick math (dots, tuplets, divisions conversion) |
| [`phase-05-smufl-glyph-table.md`](./phase-05-smufl-glyph-table.md) | Phase 5 SMuFL glyph table (real Bravura data, `getGlyph`/engraving defaults) |
| [`phase-06-svg-primitives.md`](./phase-06-svg-primitives.md) | Phase 6 SVG primitives layer (line/path/rect/text/group, staff-space coordinates) |
| [`phase-07-config-schema.md`](./phase-07-config-schema.md) | Phase 7 config schema (`EngineConfig`, `resolveConfig`, 7 reserved sections) |
| [`phase-08-testing-harness.md`](./phase-08-testing-harness.md) | Phase 8 testing harness (`node --test`, snapshot compare, Phase 3-7 tests formalized) |
| [`phase-09-staff-lines.md`](./phase-09-staff-lines.md) | Standalone pre-Phase-1 quick-demo staff renderer (superseded by real Phase 9 below, but still wired into the drum-video app) |
| [`phase-09-staff-stave-rendering.md`](./phase-09-staff-stave-rendering.md) | Real Phase 9: staff geometry + rendering in `src/geometry`/`src/render`, 1-6 line support |
| [`phase-10-clef-engine.md`](./phase-10-clef-engine.md) | Phase 10 clef engine (treble/bass/alto/tenor/soprano/8va/8vb/percussion/tab, `staffPositionForPitch`) |
| [`phase-11-key-signature-engine.md`](./phase-11-key-signature-engine.md) | Phase 11 key signature engine (circle-of-fifths positions per clef, cancellation naturals; tenor/soprano a documented gap) |
| [`phase-12-time-signature-engine.md`](./phase-12-time-signature-engine.md) | Phase 12 time signature engine (numeric/common/cut/additive meters, real digit-width spacing) |
| [`phase-13-barline-engine.md`](./phase-13-barline-engine.md) | Phase 13 barline engine (all 7 barline types, bar-number display logic) |
| [`phase-14-ledger-lines.md`](./phase-14-ledger-lines.md) | Phase 14 ledger lines (any clef/line-count, real Bravura extension) |
| [`phase-15-noteheads.md`](./phase-15-noteheads.md) | Phase 15 notehead selection (XML > config > duration default, unified drum/pitched key) |
| [`phase-16-stems.md`](./phase-16-stems.md) | Phase 16 stems (forced/XML/automatic direction, anchor-attached length) |
| [`phase-17-flags.md`](./phase-17-flags.md) | Phase 17 flags (unbeamed-only rule, direction-aware glyph selection) |
| [`phase-18-rests.md`](./phase-18-rests.md) | Phase 18 rests (whole/half special-case placement, per-voice offset) |
| [`phase-19-accidentals.md`](./phase-19-accidentals.md) | Phase 19 accidentals (draw-or-not state machine, chord stacking) |
| [`phase-20-musicxml-parser-v1.md`](./phase-20-musicxml-parser-v1.md) | Phase 20 MusicXML parser v1 (traversal model, chord-tick bug fix) |
| [`phase-21-render-from-musicxml.md`](./phase-21-render-from-musicxml.md) | Phase 21 renderFromMusicXml (naive layout, first vertical slice) |
| [`phase-22-milestone-vertical-slice.md`](./phase-22-milestone-vertical-slice.md) | Phase 22 milestone checkpoint (closed on Phase 21's evidence; Stage 3 complete) |
| [`phase-23-beam-grouping.md`](./phase-23-beam-grouping.md) | Phase 23 beam grouping (wrote the missing §9.12 spec first, then implemented it) |
| [`phase-24-beam-geometry.md`](./phase-24-beam-geometry.md) | Phase 24 beam geometry (3 styles, slope clamping; fixed a real beam-overlap bug) |
| [`abc-make-notes-visible.md`](./abc-make-notes-visible.md) | **A+B+C corrective work** — percussion support, committed bundle + font, web app rewired to the real engine |
| [`phase-25-multi-voice.md`](./phase-25-multi-voice.md) | Phase 25 multi-voice (forced stem direction, rest separation; fixes the reported hand/foot stem bug) |
| [`phase-26-ties.md`](./phase-26-ties.md) | Phase 26 ties (tapered lens shape, side-opposite-stem rule, wired end to end) |
| [`phase-27-slurs.md`](./phase-27-slurs.md) | Phase 27 slurs (whole-span side rule; geometry built, not yet wired -- parsing is v2 scope) |
| [`phase-28-tuplets.md`](./phase-28-tuplets.md) | Phase 28 tuplets (bracket-needed rule, stem-side placement; geometry built, not yet wired) |
| [`phase-29-grand-staff-multi-part.md`](./phase-29-grand-staff-multi-part.md) | Phase 29 grand staff/multi-part (brace rule, system stacking; geometry built, not yet wired) |
| [`phase-30-articulations-ornaments.md`](./phase-30-articulations-ornaments.md) | Phase 30 articulations (opposite-stem, marcato exception) + ornaments (always above); not yet wired |
| [`phase-31-dynamics-hairpins-tempo-rehearsal.md`](./phase-31-dynamics-hairpins-tempo-rehearsal.md) | Phase 31 dynamics + hairpins (built), tempo/rehearsal marks (placement only, text rendering deferred) |
| [`phase-32-lyrics.md`](./phase-32-lyrics.md) | Phase 32 lyrics (real hyphen/elision glyphs, extender line; syllable text deferred) |
| [`phase-33-chord-symbols.md`](./phase-33-chord-symbols.md) | Phase 33 chord symbols (real csym accidental + 5 quality glyphs; root letter deferred) |
| [`phase-34-grace-notes.md`](./phase-34-grace-notes.md) | Phase 34 grace notes (real precomposed acciaccatura/appoggiatura glyphs -- no text-font gap here) |
| [`phase-09-staff-lines.md`](./phase-09-staff-lines.md) | Quick-demo 5-line staff renderer (`quick-demo/staff.ts`) |

## Convention for each doc file

Every doc file answers three questions for the code it covers:
1. **What was written** — the file(s), the functions/exports, what each one
   does.
2. **How to modify it** — for each config/parameter, what changing it does
   and where in the code that happens.
3. **How to revert/remove it** — which files to delete and which other
   files reference it (so removing it cleanly doesn't leave dangling
   references, the way the old VexFlow engine's removal needed care).
