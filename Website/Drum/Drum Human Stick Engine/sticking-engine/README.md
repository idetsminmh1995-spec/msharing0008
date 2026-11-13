# sticking_engine

A drum **sticking engine**: give it MIDI (or a plain note list), and it
solves which limb (right hand / left hand / right foot / left foot) plays
every note, what technique/articulation each stroke uses, and reasonable
recovery/motion timing — implementing all 40 rules from
`Sticking_Engine_Rules_01-40_41-files.zip`.

See `RULE_MAP.md` for exactly which file implements which rule(s).

## Install

```bash
pip install mido --break-system-packages   # only external dependency
```

## Quick start

```bash
python3 demo.py                                   # built-in synthetic beat
python3 demo.py my_song.mid --genre jazz --seed 7  # your own MIDI file
```

Or from Python:

```python
from sticking_engine import Engine, EngineConfig
from sticking_engine.datamodel import DrummerStyleProfile, PerformanceIntentContext, Hand
from sticking_engine import notation

engine = Engine(EngineConfig(
    style=DrummerStyleProfile(dominant_hand=Hand.RIGHT),
    intent=PerformanceIntentContext(energy=0.7, intensity=0.6),
    genre="rock",       # rock | metal | jazz | funk | latin | generic
    seed=42,
    mode="HIGH",        # "FAST" (narrow search) or "HIGH" (wide search)
))

performance = engine.run(midi_path="my_song.mid")   # or note_list=[{...}, ...]

notation.print_table(performance)
notation.to_json(performance, "out.json")

for ev in performance.events:
    print(ev.time_seconds, ev.limb.value, ev.instrument.value, ev.stroke_type.value)
```

### Plain note-list input (no MIDI file needed)

```python
notes = [
    {"time": 0.0, "note": 36, "velocity": 105},   # kick
    {"time": 0.0, "note": 42, "velocity": 90},    # hihat closed
    {"time": 0.25, "note": 42, "velocity": 85},
    {"time": 0.5,  "note": 38, "velocity": 110},  # snare
    {"time": 0.75, "note": 42, "velocity": 85},
]
performance = engine.run(note_list=notes)
```

MIDI note numbers follow the General MIDI drum map (36=kick, 38=snare,
42=closed hihat, 46=open hihat, 49=crash, etc.) — see
`sticking_engine/rule02_mapping.py` (`GM_DRUM_MAP`) for the full table, and
`DrumMappingProfile` if you want to override note mappings or kit geometry
(e.g. a different snare/hihat physical layout) for a specific song or kit.

## Configuring the drummer

- `DrummerStyleProfile` — dominant hand, crossing aversion, alternation
  preference, ghost/accent velocity thresholds, max stroke rate, variation
  amount. `max_single_hand_rate_hz` is a real physical limit, not a
  preference: it is enforced in `rule06_reachability.py` and it is what
  decides whether a fast hi-hat pattern stays on one hand or gets shared
  between two.
- `PerformanceIntentContext` — energy, intensity, groove commitment, fill
  freedom (these bias scoring; they never override physical feasibility).
- `genre` — applies a bounded weighting preset from
  `rule21_23_32_35_profile.IDIOM_PRESETS` (Rule 35).
- `mode` — `"FAST"` uses a narrower beam/lookahead window (Rule 40),
  `"HIGH"` searches more thoroughly. Same code path either way.
- `seed` — every run with the same seed reproduces identical timing/velocity
  micro-variation (Rule 12/26 determinism).

## What "correct" means here

- **A groove is held by one hand.** A hi-hat or ride running at a steady
  rate is one arm moving continuously, so the engine keeps one hand on
  it and gives the backbeat underneath to the other. It only splits the
  stream between two hands when it is faster than one hand can strike
  (`max_single_hand_rate_hz`). A drummer does not alternate R/L through
  an eighth-note hi-hat, and neither does this.

  Rule 5 finds the streams, Rule 7 scores staying on one, Rule 8
  penalizes switching mid-stream, and the hand that took a stream is
  recorded in `DrummerState.ostinato_lead_hand` at the commit point so
  it stays put.

- **A fill has a shape.** A run of free single notes with no stream
  under it is handed to Rule 34's rudiment library whole, rather than
  decided note by note, so fills come out as singles, doubles or
  paradiddles rather than an arbitrary string of hands. The library
  proposes; the solver still picks, and a plain per-note answer is
  always among the options.

- **Hands and feet are solved together.** One pass over all four limbs
  (Rule 11), not hands-then-feet, so a hand choice is made knowing what
  the kick is doing on the same beat.

- **Hard physical limits are never violated.** A hand assignment is only
  ever offered if it can physically reach the target in the available time
  (`rule06_reachability.py`). If literally nothing is reachable (e.g. a
  genuinely impossible 3-note simultaneous chord for two hands), the engine
  degrades gracefully and flags it via `performance.validation.issues`
  rather than silently producing nonsense.
- **`performance.validation.approved`** tells you whether the final,
  humanized, timing-jittered result passed all checks (no two notes on one
  limb faster than physically possible, no double-booked limb at the same
  instant, valid velocities). If a check fails, a bounded local repair pass
  runs automatically (Rule 25) before you ever see the result.
- **Nothing is random by default in a harmful way.** All variation is
  derived from `seed`, so results are reproducible, and it only ever
  nudges timing/velocity within small configured bounds — it never
  "repairs" a physically invalid choice with randomness (Rule 12).

## Project layout

```
sticking_engine/
  datamodel.py                     Rules 27, 38 — typed data contracts
  rule01_input.py                  Rule 1  — MIDI parsing
  rule02_mapping.py                Rule 2  — instrument/kit mapping
  rule03_04_timing_density.py      Rules 3, 4
  rule05_pattern.py                Rule 5
  rule06_reachability.py           Rule 6
  rule07_hand_candidates.py        Rule 7
  rule08_11_29_39_solver.py        Rules 8, 11, 29, 39 — the actual solver
  rule09_technique.py              Rule 9
  rule10_recovery.py               Rule 10
  rule12_humanization.py           Rule 12
  rule13_19_24_motion.py           Rules 13–19, 24 — motion/animation/sync
  rule20_31_33_memory.py           Rules 20, 31, 33 — memory & motifs
  rule21_23_32_35_profile.py       Rules 21, 22, 23, 32, 35
  rule25_validation.py             Rule 25
  rule26_runtime.py                Rule 26
  rule30_state_machine.py          Rule 30
  rule34_grammar.py                Rule 34 — rudiment/pattern library
  engine.py                        Rules 28, 36, 37, 40 — orchestrator
  notation.py                      (helper, not a numbered rule) text/JSON export
demo.py                            runnable example
RULE_MAP.md                        full rule -> file traceability table
```

## Known simplifications (see RULE_MAP.md "Design choices")

Rules 13–19 describe a full IK/FK skeletal rig and whole-body animation
system; this engine models each limb as a single moving point with real
travel-time/velocity physics rather than a full 3D character rig, since a
rig is a separate large subsystem that plugs into
`rule13_19_24_motion.apply_rig_envelope()` without touching any decision
logic. Everything about the actual **sticking** decision — hand
assignment, technique, timing, recovery — is fully implemented, not stubbed.
