# Drum Sticking Engine — Audit and Follow-up Plan

**Audit scope:** compare the Python reference in `Drum/sticking-engine/sticking_engine/` with the browser TypeScript port in `Drum/sticking-engine-ts/src/`, and compare both against `original_rules/Rule_*.md`. This is a source-level audit; parity between the two implementations does not prove that both satisfy every original rule. The current TypeScript suite has end-to-end golden coverage but little direct coverage of intermediate rule contracts.

## Completed in this work

- **Repeat-aware score bridge:** the drum-video page now expands written drum events using notation-engine performance entries. Repeated measures play at each performance occurrence; written events outside the selected playback plan (such as an unplayed volta ending) are omitted. The adapter preserves within-measure tempo changes. Covered by `sticking-engine-ts/test/unit/repeat-adapter.test.js` and a smoke test using the real `repeat-voltas.musicxml` RepeatPlan.
- **Rule 09 SNARE_RIM correction:** GM note 40 maps to `SNARE_RIM`, which is now treated as rim-capable by both Python and TypeScript. At the accent threshold it produces `rim_shot`, not generic `accent`; below the threshold it remains an ordinary single. Direct tests are in the Python `tests/test_rule09_technique.py` and TypeScript `test/unit/rule09-technique.test.js`.
- **Browser delivery:** `website/assets/sticking-engine.js` is rebuilt from the TypeScript distribution bundle and the drum page cache key is updated.

## Prioritized work still open

### 1. Make recovery and physical feasibility gate assignments — high priority

Rules 06, 10, and 25 are not connected as their contracts imply. The solver calculates available time from the previous action rather than Rule 10's ready time; when no reachable candidate exists it can still produce a best-effort assignment; and Rule 25 does not validate target travel/reachability. A physically impossible passage may therefore reach output if it does not also violate the current rate/collision checks.

**Next:** make Rule 10 readiness part of candidate feasibility, reject or explicitly repair impossible assignments, and test the non-collision unreachable-travel case end to end. Do not infer a numeric maximum reach distance: the rule text does not specify one.

### 2. Make solver state commit atomic with validation — high priority

Rule 39 requires validation/repair before authoritative commit. The current solver commits selected limb and memory state before the engine runs Rule 25; fallback selections are included, and no rollback after rejection/repair is evident.

**Next:** keep search-window state speculative through validation, then commit only the accepted/repaired result; add tests proving a rejected or repaired branch cannot mutate authoritative state.

### 3. Improve simultaneous limb/body-resource coordination — moderate priority

Rule 11 groups simultaneous events, but the fixed foot contribution is added equally to every manual-hand option. Foot reachability therefore cannot change hand ranking, and shared-body-resource coupling is not represented.

**Next:** evaluate simultaneous hand/foot combinations together and test cases where a foot assignment changes the best feasible hand pair.

### 4. Correct musical timing and density context — moderate priority

Rules 03–04 share several spec-level omissions. The timing module returns per-event `TimingContext` but no specified `MusicalTimeline`; measure numbering across time-signature changes divides all elapsed beats by only the active signature. Density does not consume timing context or calculate tempo-adjusted pressure; it uses local rate divided by a fixed 8 Hz.

**Next:** define the `MusicalTimeline` API, accumulate complete measures across signature segments, and specify/test the intended tempo-adjusted density formula.

### 5. Fix memory counting and decide cross-run memory scope — moderate priority

Rules 20/31/33 memory updates each n-gram size once from only the final batch suffix, so earlier completed n-grams in a committed batch can be missed. The memory retains limb sequences/event IDs rather than the specified multi-scale musical/physical context, and the engine does not retrieve accumulated memory for later runs. A separate within-solve motif prior exists; it is not cross-run memory.

**Next:** count every newly completed n-gram in a batch, add tests for repeated motifs within one batch, then decide whether cross-run retrieval and the broader memory model are product requirements.

### 6. Expand technique alternatives and humanization — moderate priority

Rule 09 now recognizes `SNARE_RIM`, but still returns one `TechniquePlan`; it does not retain scored alternatives or generate the specified grace/flam candidates. Rule 12's near-tie random chooser is unused by the active solver, which selects the first best branch, and active humanization adjusts timing/velocity but not technique.

**Next:** define the candidate/sequence-solver boundary for alternatives, then add flam/grace and technique-variation tests if those behaviors are intended to affect committed output.

### 7. Specify a real reach envelope — moderate priority; requirements needed

Rule 06 currently uses planar XY distance divided by a fixed limb speed plus safety margin. There is no hard reach-distance envelope or directional accessibility check, and target height/radius do not affect reachability. The rule text provides no numeric thresholds.

**Next:** decide and document physical assumptions (including whether height and playable radius matter) before implementing a threshold; add boundary tests from that agreed contract.

### 8. Carry fatigue into decisions and future runs — moderate priority

Rule 23 fatigue is accumulated during post-solve replay after the effective style has been built from a fresh zeroed state; it neither affects decisions in that run nor carries into a later run. Style adjustment averages hand load and excludes foot/movement/body load.

**Next:** define the lifetime and persistence of drummer fatigue state, then test that fatigue measurably influences a later eligible decision without breaking deterministic replay.

### 9. Complete pattern classification and adaptive search — moderate/lower priority

Rule 05 currently classifies measures as break/fill/groove/unknown and detected streams as ostinato; transition/ending/linear categories are not implemented, and `DensityContext` is accepted but unused. Missing timing context also differs: Python raises while TypeScript silently skips the event. Rule 29 uses fixed-size lookahead windows rather than adaptive windows.

**Next:** define which omitted classifications are required downstream, normalize missing-context behavior, and treat adaptive window sizing as a separately benchmarked solver change.

### 10. Treat motion, performance output, and audio sync as a separate scope — moderate priority

Rules 13–19/24 remain simplified in both implementations: motion feasibility uses XY only; infeasible plans may retain the original impact time and are not rejected by the engine; impact/recovery are approximations; timeline assembly emits per-limb events only; and sync reports zero drift/resynced without device-latency monitoring.

**Next:** specify the consumer and output contract first. Keep full IK/FK character-rig rendering in its documented separate-renderer scope.

### 11. Close lower-impact API/parity details and direct-test gaps

- Rule 01 TypeScript source events are `readonly` by type but not frozen at runtime; Python source events are frozen dataclasses.
- Rule 25 has an issue-list parity edge for same-limb timestamps `-0.00001` and `+0.00001`: Python's rounded numeric keys collide while JavaScript's fixed-width strings preserve signed zero. Both reject the audited example, so the observed difference is diagnostic ordering/content, not approval.
- Rule 30 TypeScript snapshots copy the `motifStickings` map but retain mutable limb-array values by reference; Python deep-copies the state. The production engine also bypasses the state-machine `commit` API in both languages.
- Most rules lack direct tests for intermediate contexts, candidate scores, memory, recovery, motion, runtime, profile, and grammar behavior. Existing golden tests compare whole-engine outputs for seven note-list fixtures and cannot establish all such contracts.

**Next:** add direct tests alongside fixes, prioritizing feasibility/recovery/atomic commit, simultaneous coordination, Rule 09, timing contexts, memory batches, and snapshot/rollback behavior.

## Intentional scope boundaries (not newly discovered defects)

- The TypeScript Rule 01 path accepts note lists; parsing `.mid` is explicitly left to the Python reference. Any future TypeScript adapter should use notation-engine's existing MIDI parser and promise equivalent, not byte-identical, behavior.
- A full IK/FK skeletal drummer rig is outside the sticking port and belongs to the separate renderer.
- Rule 34's current generator is a fixed library of nine R/L templates; its missing ghost/flam/linear/hybrid grammars are shared scope gaps, not TypeScript-only divergence.

## Verification note

After the repeat adapter and SNARE_RIM fix, the TypeScript package verification passed with 59 tests (typecheck, lint, format check, and Python golden parity included). The Python reference demo was also run using its documented `mido` dependency in a temporary virtual environment. This confirms the current changes and test setup; it does not claim the open items above are fixed.
