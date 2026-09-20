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
| 11 (four limbs) | — solved in ONE pass by `rule08_11_29_39_solver.solve_sticking`; `assign_feet` remains a public entry point but the engine does not use it, because solving feet apart from hands is what Rule 11 forbids | `sticking_engine/rule08_11_29_39_solver.py` |
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
  fatigue, intent, the ostinato lead-hand bonus) is a *score*, never a
  filter — matching the "Candidate Logic" and "Idiom Principle" language
  repeated across the rule files.

  Rule 6 rejects on two grounds, not one. Travel time is the obvious
  one. The second is the **stroke-rate ceiling**: a limb striking the
  same surface travels no distance at all, so without a rate limit the
  model would let one hand play a drum at any speed. That ceiling is
  what decides whether a hi-hat pattern is one hand riding it or two
  hands sharing it.

- **The lead hand (Rules 5 → 7 → 8).** The single most important thing
  a sticking engine has to know about a groove is that a time-keeping
  stream — a hi-hat or ride running at a steady rate — is *one arm
  moving continuously*, not a series of notes to alternate across.

  Rule 5 finds those streams (`find_ostinato_runs`) and names them;
  Rule 7 scores keeping the lead hand on one; Rule 8 penalizes
  switching mid-stream; and the notes that land underneath a stream —
  the backbeat — prefer the *other* hand, because the stream's hand is
  busy. The lead hand itself is never assigned by Rule 5: it is
  recorded in `DrummerState.ostinato_lead_hand` at the commit point,
  which is what makes the hand stay put for the length of the stream.

  Without this the engine alternates R/L through a hi-hat pattern and
  then has to cross the hands on every backbeat — physically absurd,
  and the reason this layer exists.

- **Alternation is not the default.** It applies to fills, and to a
  stream fast enough that both hands must share it. It does *not* apply
  to a one-hand stream, and it does not apply between two independent
  voices: "the hand that did not play last" says nothing musical about
  a snare when the last note was a hi-hat.

- **Rule 34's vocabulary is actually reachable.** A run of free single
  notes with no stream under it is a fill, and the solver asks Rule 34
  for whole hand-patterns rather than deciding it note by note. Every
  template is scored by the same Rule 7/8 machinery as anything else,
  any template Rule 6 rejects is dropped rather than scored badly, and
  a free per-note option is always among the choices — so the library
  proposes and the solver disposes, which is Rule 34's "Generate !=
  Select" in code rather than only in a docstring.

- **Sequence terms are the ones per-note scoring cannot see.** Rule 8
  says sequence quality outranks isolated note quality, and a sum of
  per-note scores is still isolated-note reasoning. `sequence_score`
  therefore only holds terms that need two or more decisions to have a
  value at all: stream continuity, voice stability under a stream, and
  future preparation (how rushed a limb is between two targets). The
  last is why a fast fill comes out as singles — handing the next note
  to the other hand doubles the time this one has to travel.

- **Determinism (Rule 26/38/40).** All randomness (`rule12_humanization.py`)
  is derived from `seed + event_id` via SHA-256, so the same seed always
  reproduces the same performance, independent of solve order.
