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
