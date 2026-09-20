# RULE MAP — which file implements which of Rules 1–40

Every rule from `Sticking_Engine_Rules_01-40_41-files.zip` is implemented.
Related rules that form one algorithm or one data layer are grouped into a
single module (documented in that file's own docstring), rather than split
into 40 near-empty files.

| Rule(s) | Title | Module |
|---|---|---|
| 1 | Input / MIDI Preparation | `sticking_engine/rule01_input.py` |
| 2 | Instrument, Surface & Target Mapping | `sticking_engine/rule02_mapping.py` |
| 3, 4 | Musical Time & Beat Analysis / Density, Spacing & Temporal Pressure | `sticking_engine/rule03_04_timing_density.py` |
| 5 | Pattern, Groove, Fill & Phrase Classification | `sticking_engine/rule05_pattern.py` |
| 6 | Physical Reachability & Target Access | `sticking_engine/rule06_reachability.py` |
| 7 | Hand Candidate Generation | `sticking_engine/rule07_hand_candidates.py` |
| 8, 11, 29, 39 | Sticking Sequence Continuity / Four-Limb Coordination / Lookahead Solver / Execution & Commit Pipeline | `sticking_engine/rule08_11_29_39_solver.py` |
| 9 | Stroke Technique & Articulation Selection | `sticking_engine/rule09_technique.py` |
| 10 | Recovery & Next-Stroke Preparation | `sticking_engine/rule10_recovery.py` |
| 12 | Controlled Human Variation & Non-Robotic Behavior | `sticking_engine/rule12_humanization.py` |
| 13, 14, 15, 16, 17, 18, 19, 24 | Whole-Limb Motion / IK-FK Rig / Impact Physics / Post-Impact Recovery / Balance / Human Timing / Animation Timeline / Audio-Animation Sync | `sticking_engine/rule13_19_24_motion.py` |
| 20, 31, 33 | Performance Memory / Multi-Scale Pattern Learning / Motif Fingerprinting | `sticking_engine/rule20_31_33_memory.py` |
| 21, 22, 23, 32, 35 | Performance Intent / Drummer Style / Fatigue / Profile Calibration / Genre Idiom | `sticking_engine/rule21_23_32_35_profile.py` |
| 25 | Final Validation, Quality Gate & Repair | `sticking_engine/rule25_validation.py` |
| 26 | Performance Runtime & Deterministic Reproduction | `sticking_engine/rule26_runtime.py` |
| 27, 38 | Unified Performance Data Model / Class & Schema Specification | `sticking_engine/datamodel.py` |
| 28, 36, 37, 38, 40 | Engine Module Architecture / End-to-End Solver / Implementation Spec / Schema / Solver Optimization & Caching | `sticking_engine/engine.py` |
| 30 | Performance State Machine & Continuous Drummer State | `sticking_engine/rule30_state_machine.py` (state object itself lives in `datamodel.DrummerState`) |
| 34 | Advanced Sticking Grammar & Technique Library | `sticking_engine/rule34_grammar.py` |

## Design choices worth knowing

- **Grouping, not skipping.** Rules that describe one continuous algorithm
  or one data layer in the source spec (e.g. Rules 13–19+24's physical/
  animation pipeline, or Rules 8/11/29/39's search-and-commit solver) are
  implemented together because splitting them into separate files would
  have meant passing the same state back and forth for no real separation
  of concerns. Each module's docstring quotes the exact "Core Principle"
  line(s) from the rule file(s) it implements, so you can check the mapping
  yourself against the original 40 `.md` files.

- **"Sticking" is the deliverable; full 3D biomechanics is stubbed but
  wired correctly.** Rules 13–19 describe a full IK/FK rig and whole-body
  animation system. This implementation models limb motion as single 3D
  points (`MotionKeyframe`) with realistic travel-time/velocity physics,
  rather than a full skeletal rig — because you asked for a **sticking
  engine**, and a real character rig is a separate (and much larger)
  project that would plug into `rule13_19_24_motion.apply_rig_envelope()`
  without touching any decision logic. Everything upstream of that (the
  actual hand assignment, technique, timing, and recovery — the "sticking"
  part) is fully real, not stubbed.

- **Hard vs. soft rules.** Per Rules 6/7/8/12, physical impossibility
  (`ReachabilityResult.reachable = False`) is always a hard rejection.
  Everything else (dominance, alternation, crossing aversion, genre,
  fatigue, intent) is a *score*, never a filter — matching the "Candidate
  Logic" and "Idiom Principle" language repeated across the rule files.

- **Determinism (Rule 26/38/40).** All randomness (`rule12_humanization.py`)
  is derived from `seed + event_id` via SHA-256, so the same seed always
  reproduces the same performance, independent of solve order.
