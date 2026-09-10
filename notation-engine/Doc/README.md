# Notation Engine — Doc folder

**Rule (never skipped): every time code is written for the Notation Engine,
a matching doc file goes in this folder in the same turn — what was written,
and how to change/revert it.** One doc file per unit of work, named after
the phase/feature it covers, so this folder stays a running record of the
whole engine's build history, not just the plan (`../PLAN.md`) for what's
*intended*.

## Index

| Doc file | Covers |
|---|---|
| [`phase-01-folder-structure.md`](./phase-01-folder-structure.md) | Phase 1 folder skeleton (`src/`, `test/`, `docs/`) |
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
