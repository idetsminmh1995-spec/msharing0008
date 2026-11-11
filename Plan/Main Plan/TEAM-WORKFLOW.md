# Main Plan — Multi-Contributor Team Workflow

This document controls how multiple people or agents work in `msharing0008` at the same time. It is subordinate to `Plan/Main Plan/ARCHITECTURE.md` and applies to every Engine, website route, asset bundle, test, and plan document.

## 1. Non-negotiable principles

1. **Plan before implementation.** A contributor must identify the owning plan, affected contract, files, tests, and acceptance criteria before changing code.
2. **One canonical source.** Work in `Engine/` or the canonical shared website module. Never patch a generated browser bundle as the primary implementation.
3. **One decision owner.** Each cross-engine contract has one owner. Contributors may propose changes, but a contract is not changed by two people independently.
4. **Small, reviewable slices.** One change should have one purpose. Do not combine a notation geometry fix, a page refactor, and a deployment change in one commit unless the plan explicitly requires the atomic change.
5. **Evidence is part of the work.** A feature is not complete when code exists; it is complete when tests, generated assets, status, and plan evidence agree.
6. **Do not overwrite another contributor's work.** Rebase or merge remote changes before pushing. Never force-push shared `main`.
7. **Keep the app runnable.** A partially migrated route must remain behind its old working boundary or an explicit feature flag; do not leave a page half-converted.

## 2. Work ownership

| Area | Primary owner | Consult before changing |
|---|---|---|
| MusicXML/MXL parser, engraving, playback | Notation Plan / Notation Engine | Notation maintainers and all page owners consuming playback |
| Video encoding, audio, muxing | Video Plan / Video Engine | All export route owners |
| Shared page lifecycle and state | Main Plan / website host layer | Every route owner |
| Asset gate, loader, report, cache | Main Plan / shared website assets | Worker/R2 and route owners |
| Piano keyboard presentation | Piano Plan | Piano Hand owner when hand mode is affected |
| Piano physical hand/GLB/IK | Piano Hand Plan | Piano page owner and 3D asset owner |
| Guitar/fretboard presentation | Guitar Plan | Finger owner when fingering contract changes |
| Finger candidate assignment | Finger Plan | Guitar/Piano owners consuming the plan |
| Drum sticking/performance | Drum Plan | Notation and Drum page owners |
| Metronome timing/design | Metronome Plan | Notation and Video owners |
| Cloudflare Pages/Worker/R2 | Main Plan deployment owner | Security and route owners |
| CI/release scripts | Main Plan release owner | All package owners |

If ownership is unclear, stop at the plan stage and record an owner in the work item. Do not resolve unclear ownership by editing the same file from multiple branches.

## 3. Plan hierarchy

The repository uses four levels of planning:

- **Main Plan:** cross-engine contracts, team rules, release order, CI, deployment, and conflicts between plans.
- **Engine Plan:** behavior and roadmap for one engine.
- **Integration record:** one completed change, defect, experiment, or evidence result.
- **Work item:** the current small implementation slice with an owner, files, tests, and acceptance criteria.

A lower-level plan may not silently contradict a higher-level contract. If it must, update Main Plan first or mark the lower-level item as blocked.

## 4. Work item format

Every non-trivial task should be recorded in the relevant plan or issue using this format:

```text
ID: MAIN-/NOTATION-/VIDEO-/PIANO-/...
Title:
Owner:
Reviewer:
Status: proposed | ready | in-progress | blocked | review | verified | released
Scope:
Out of scope:
Canonical files:
Contracts affected:
Dependencies:
Tests/evidence required:
Rollback or recovery:
Plan links:
```

A task is `ready` only when its owner, scope, affected files, dependencies, and acceptance evidence are known. A task is `blocked` when another contributor or external service must act; record the blocker instead of making an undocumented workaround.

## 5. File ownership and collision control

Before starting work, run `git status`, inspect recent commits, and identify whether another active task touches the same files. The high-collision files are:

- `website/assets/instrument-video-core.js`
- `website/assets/video-asset-gate.js`
- `website/assets/video-export-stability.js`
- `website/assets/video-engine.js` or its canonical `Engine/video-engine/` source
- `website/video-create/*/index.html`
- `Engine/notation-engine/src/render-from-musicxml.ts`
- committed bundles under `website/assets/`
- shared plan indexes and status documents

If two tasks need the same high-collision file, split the work into ordered checkpoints or assign one owner to integrate both changes. Do not maintain two competing rewrites of a shared module.

Generated files are changed only through the documented build/sync path. If a generated bundle must be committed, the source commit and generated output must be in the same logical change and the bundle stamp must be updated.

## 6. Branch, commit, and push protocol

The shared `main` branch must remain releasable. Contributors should work on a task branch or isolated worktree when the environment supports it. Before opening review:

```text
git fetch origin main
git rebase origin/main
run affected verification
inspect git diff and git diff --check
```

Commit messages should describe one outcome, for example:

```text
fix(notation): keep drum accent above beamed stem
docs(main): define route ownership and release gates
refactor(web): move audio gate into shared core
```

A commit that changes a public contract must include the corresponding test and plan/status update, or link to the follow-up work item that blocks release. Never use `git push --force` on shared `main`.

## 7. Handoff protocol

A contributor handing work to another person must leave:

1. the current commit or branch name;
2. a short summary of what changed;
3. files intentionally changed and files intentionally untouched;
4. tests run and their results;
5. known failures or environment limitations;
6. the next safe command or next decision required;
7. whether generated bundles or docs still need synchronization.

A handoff is incomplete if the next person must infer whether a failing test is expected, whether a file is generated, or whether an API contract changed.

## 8. Review gates

### Gate A — plan review

Before implementation, confirm ownership, scope, dependencies, collision risk, and acceptance evidence. For cross-engine work, the Main Plan owner must confirm the contract impact.

### Gate B — implementation review

Check that the change is in the canonical source, public API changes are typed/documented, errors are explicit, and no second parser/timeline/gate/export path was introduced.

### Gate C — verification review

Run the smallest affected tests first, then the package verification, then the website/browser checks required by the work item. Check source/bundle parity and `git diff --check`.

### Gate D — release review

Confirm plan/status/evidence updates, asset stamps, deployment configuration, rollback point, and clean repository status. Only then merge or push to `main`.

## 9. Conflict resolution

When contributors disagree about behavior, do not settle by whichever branch was pushed last. Record the alternatives, affected contracts, test evidence, and decision owner in an integration record. Prefer the smallest behavior that preserves existing consumers. If the decision changes a shared contract, update Main Plan and the affected Engine Plans in the same change.

When a rebase conflict occurs, preserve both sides until the owning contributor reviews the semantic merge. A conflict in generated bundles should be resolved by rebuilding from canonical source, not by manually editing minified or bundled output.

## 10. Status vocabulary

Every plan and major feature must use one of these labels:

- **Proposed:** described but not accepted for implementation.
- **Ready:** owner, scope, dependencies, and acceptance checks exist.
- **In progress:** implementation is actively changing.
- **Blocked:** waiting on a dependency, decision, asset, or environment.
- **Implemented:** code exists and focused tests pass.
- **Verified:** required package/browser/evidence checks pass.
- **Released:** merged, bundled, stamped, deployed, and smoke-tested.
- **Experimental:** available only behind an explicit flag or non-production path.
- **Disabled:** intentionally unavailable in the UI.
- **Legacy:** retained for history or compatibility, not part of the current product contract.

Do not mark a feature `complete` without saying whether it is implemented, verified, or released.

## 11. Cross-engine change checklist

For any change crossing two or more engines, the owner must answer:

- Which data contract crosses the boundary?
- Which engine owns the data and which engine only consumes it?
- Are units and coordinate systems explicit?
- Is timing derived from the Notation playback contract rather than reconstructed?
- Does preview use the same state as export?
- Which generated bundles change?
- Which route/browser tests prove the integration?
- What is the rollback behavior?

The change is blocked until the answers are recorded in the relevant plan or integration record.

## 12. Parallel work sequence

The safest order for parallel development is:

```text
Main Plan contract decision
        ↓
engine-specific plan/task split
        ↓
independent engine implementation
        ↓
shared adapter/integration checkpoint
        ↓
bundle synchronization
        ↓
route/browser verification
        ↓
documentation and release evidence
```

Do not let several contributors independently modify a shared adapter while engine work is still changing its public contract. Stabilize the producer contract first, then integrate consumers.

## 13. Minimum handoff message

Use this compact format when handing work to another contributor:

```text
Task: <ID and title>
Status: <status>
Commit: <hash>
Changed: <files>
Not changed: <important files>
Verified: <commands and pass/fail>
Known issues: <none or exact issue>
Next action: <one safe next step>
Needs decision: <yes/no and decision>
```

## 14. Team Definition of Done

A multi-contributor change is done only when the owning plan is updated, the canonical source is clear, the affected public contract is documented, focused tests pass, generated bundles are synchronized, route/browser evidence is recorded when applicable, the handoff/review information is complete, and the branch can be rebased onto current `main` without unresolved conflicts.
