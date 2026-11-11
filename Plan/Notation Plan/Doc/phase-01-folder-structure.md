# Phase 1 — Repo & Folder Structure

**Status:** complete, matches PLAN.md Phase 1 exactly.

## 1. What was written

Created the full folder skeleton the rest of the plan builds into:

```
notation-engine/
  src/
    core/       parser/     geometry/   render/    layout/
    cursor/     theme/      config/     glyphs/    export/    plugins/
  test/
    fixtures/   visual/
  docs/
```

Every one of those 14 folders got a `README.md` placeholder (since git
doesn't track empty directories, and a bare `.gitkeep` wouldn't explain
anything). Each README states, in one short paragraph: what belongs in that
folder, which PLAN.md phase(s) it corresponds to, and confirms nothing real
has been written there yet.

`docs/` (lowercase, from the plan's Phase 1 listing) and `Doc/` (this folder,
capitalized, created earlier at the user's request) are two **different**
things and both are kept:
- `Doc/` — hand-written build history: this file, `phase-09-staff-lines.md`,
  and everything that follows the "what was written / how to modify /
  how to revert" convention from `Doc/README.md`.
- `docs/` — reserved for Phase 50's *generated* API reference (built from
  the engine's TypeScript types once there are types to generate from).

`notation-engine/quick-demo/` and `notation-engine/PLAN.md` are unaffected —
the quick-demo intentionally sits outside `src/` since it was explicitly a
throwaway proof-of-concept (see `phase-09-staff-lines.md`), not the real
Phase 9 implementation.

## 2. How to modify it

- **Renaming/adding a folder** — just create it and add its own
  `README.md` following the same one-paragraph pattern (purpose + PLAN.md
  phase reference). Update the folder-tree diagram in `PLAN.md`'s Phase 1
  section to match, so the plan never drifts out of sync with reality.
- **`docs/` vs `Doc/` naming** — if this still reads as confusing later,
  the cleanest fix would be renaming `Doc/` to something more distinct (e.g.
  `CHANGES/` or `history/`) — flag this to revisit once real Phase 2+ code
  exists and the two folders' contents actually diverge.

## 3. How to revert/remove it

Delete the 14 folders (and their README.md files) listed above. Nothing
else in the repo references them yet — no code, no build config, no other
doc — since Phase 2 (toolchain) and beyond haven't been built.
