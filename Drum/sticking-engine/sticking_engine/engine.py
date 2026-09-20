"""
engine.py

RULE 27 — UNIFIED PERFORMANCE DATA MODEL, EVENT GRAPH & DATA CONTRACT
  (implemented in datamodel.py; this file is the orchestrator that produces
  the single UnifiedPerformance / FinalValidatedPerformance object)

RULE 28 — ENGINE MODULE ARCHITECTURE & RULE ORCHESTRATION
  Principle: "Orchestrator owns when; specialized modules own what/how;
  circular hidden dependencies are forbidden." -> `Engine.run()` below is
  the ONLY place that decides call order; every rule module it calls is a
  pure function or a small explicit class with no import back into engine.py.

RULE 36 — END-TO-END PERFORMANCE SOLVER & FINAL DRUMMER BEHAVIOR INTEGRATION
  End-to-End Loop: "Perceive -> Understand -> Remember -> Predict -> Generate
  -> Simulate -> Decide -> Move -> Impact -> Recover -> Adapt -> Continue."
  `Engine.run()` follows exactly this order.

RULE 37 — ENGINE IMPLEMENTATION SPECIFICATION, CLASS MODEL & INTER-MODULE
INTERFACES
  Ownership Rule: "One decision, one owner, one source of truth."
    - Rule 7/8/11/29 solver owns HAND assignment.
    - Rule 9 owns TECHNIQUE.
    - Rule 10/13-19 own MOTION/RECOVERY.
    - Rule 25 owns VALIDATION/APPROVAL.
  Engine never re-derives a decision another module already owns.

RULE 38 — CLASS, INTERFACE & DATA SCHEMA SPECIFICATION
  (implemented in datamodel.py: typed dataclasses, explicit units, explicit
  Candidate/Decision/Plan/Result/Context/State distinctions.)

RULE 40 — SOLVER PERFORMANCE, CACHING, PARALLELISM & REAL-TIME OPTIMIZATION
  Optimization Rule: "Cache stable work, reject impossible candidates early,
  parallelize only read-only/speculative work ... keep correctness invariant
  across FAST/HIGH modes." -> `mode="FAST"` uses a narrower beam/window;
  `mode="HIGH"` widens both. Both paths run the exact same functions, so
  results only differ in search thoroughness, never in code path.
"""

from __future__ import annotations
from typing import List, Optional, Dict
from dataclasses import dataclass

from .datamodel import (
    Instrument, Limb, DrumEvent, DrummerState, DrummerStyleProfile,
    PerformanceIntentContext, FatigueState, PerformanceEvent, new_id,
    FinalValidatedPerformance,
)
from .rule01_input import parse_midi_file, from_note_list
from .rule02_mapping import DrumMappingProfile, map_events
from .rule03_04_timing_density import analyze_timing, analyze_density
from .rule05_pattern import classify_patterns, role_contexts
from .rule06_reachability import neutral_position
from .rule08_11_29_39_solver import solve_sticking
from .rule09_technique import select_technique
from .rule10_recovery import plan_recovery
from .rule12_humanization import humanize_timing, humanize_velocity
from .rule13_19_24_motion import (
    build_motion_plan, apply_rig_envelope, compute_impact,
    append_recovery_keyframe, compute_body_state, assemble_timeline,
    check_audio_animation_sync,
)
from .rule20_31_33_memory import PerformanceMemory
from .rule21_23_32_35_profile import (
    update_fatigue, ProfileCalibrator, build_effective_style, make_idiom_context,
)
from .rule25_validation import validate_and_repair
from .rule30_state_machine import DrummerStateMachine


# ---------------------------------------------------------------------------
# RULE 40 — search-effort presets (same code path, different thoroughness)
# ---------------------------------------------------------------------------
SEARCH_PRESETS = {
    "FAST": {"window_size": 6, "beam_width": 3},
    "HIGH": {"window_size": 14, "beam_width": 8},
}


@dataclass
class EngineConfig:
    """RULE 37/38: the engine's one explicit configuration surface. Nothing
    inside Engine.run() reads ambient/global config — everything flows
    through this object."""
    style: DrummerStyleProfile
    intent: PerformanceIntentContext
    genre: str = "generic"
    seed: int = 42
    mode: str = "HIGH"          # "FAST" | "HIGH" (Rule 40)
    drum_channel: Optional[int] = None
    mapping_profile: Optional[DrumMappingProfile] = None


class Engine:
    """RULE 28 orchestrator. Owns *when* each rule module runs; owns nothing
    about *what* each decision is."""

    def __init__(self, config: Optional[EngineConfig] = None):
        self.config = config or EngineConfig(
            style=DrummerStyleProfile(), intent=PerformanceIntentContext()
        )
        self.memory = PerformanceMemory()
        self.calibrator = ProfileCalibrator()

    # -- RULE 36 End-to-End Loop -------------------------------------------
    def run(self, midi_path: Optional[str] = None,
            note_list: Optional[List[dict]] = None) -> FinalValidatedPerformance:
        cfg = self.config
        preset = SEARCH_PRESETS.get(cfg.mode, SEARCH_PRESETS["HIGH"])

        # ---- Perceive (Rule 1) ----
        if midi_path is not None:
            normalized = parse_midi_file(midi_path, drum_channel=cfg.drum_channel)
        elif note_list is not None:
            normalized = from_note_list(note_list)
        else:
            raise ValueError("Engine.run requires midi_path or note_list")

        # ---- Understand (Rules 2-5) ----
        mapping_profile = cfg.mapping_profile or DrumMappingProfile()
        drum_events: List[DrumEvent] = map_events(normalized.events, mapping_profile)
        drum_events = [e for e in drum_events if e.is_playable]
        drum_events.sort(key=lambda e: e.time_seconds)

        timing_ctx = analyze_timing(drum_events, normalized.tempo_map, normalized.time_signature_map)
        density_ctx = analyze_density(drum_events)
        pattern_ctx = classify_patterns(drum_events, timing_ctx, density_ctx)
        # RULE 5 -> RULE 7/8. What each note is FOR is an input to the
        # sticking, not a report about it: it is what tells the solver that
        # a run of hi-hat notes is one hand keeping time rather than a
        # series of unrelated notes to alternate across.
        roles = role_contexts(pattern_ctx)

        # ---- Remember / Predict (Rules 20/31/32/35 setup) ----
        idiom = make_idiom_context(cfg.genre)
        effective_style = build_effective_style(
            cfg.style, self.calibrator.learned, cfg.intent, FatigueState(), idiom
        )

        state = DrummerState(style=effective_style, intent=cfg.intent)
        for limb, ls in state.limbs.items():
            ls.position = neutral_position(limb)
            ls.last_action_time_s = -999.0
            ls.ready_time_s = -999.0

        sm = DrummerStateMachine(state)

        # ---- Generate / Simulate / Decide (Rules 6-12, 29, 39) ----
        # RULE 11: all four limbs in ONE solve. Splitting the hands from the
        # feet and concatenating afterwards would mean the hands choose
        # without knowing a kick lands on the same beat, which is precisely
        # what Rule 11's Core Principle rules out.
        all_decisions = solve_sticking(
            drum_events, sm.state,
            window_size=preset["window_size"], beam_width=preset["beam_width"],
            roles=roles,
        )

        self.memory.record_committed(all_decisions)
        decision_by_event = {d.event_id: d for d in all_decisions}
        event_by_id: Dict[str, DrumEvent] = {e.event_id: e for e in drum_events}

        # ---- Move / Impact / Recover (Rules 9-10, 13-19, 23-24) ----
        # Deterministic time-ordered replay: the solver already fixed WHICH
        # limb plays WHAT; this pass owns HOW (technique/motion), touching
        # nothing the solver decided (Rule 37 Ownership Rule).
        replay_position = {l: neutral_position(l) for l in Limb}
        replay_ready_time = {l: -999.0 for l in Limb}
        replay_last_time = {l: None for l in Limb}
        fatigue = FatigueState()

        ordered = sorted(all_decisions, key=lambda d: event_by_id[d.event_id].time_seconds)

        performance_events: List[PerformanceEvent] = []
        motion_plans = []
        technique_by_event = {}
        body_states = []

        for decision in ordered:
            ev = event_by_id[decision.event_id]
            limb = decision.limb

            technique = select_technique(
                ev, limb, effective_style, replay_last_time[limb]
            )
            technique_by_event[ev.event_id] = technique

            recovery = plan_recovery(ev.time_seconds, limb, technique)

            human_timing = humanize_timing(
                ev.event_id, ev.time_seconds, effective_style, cfg.seed
            )
            humanized_velocity = humanize_velocity(
                ev.event_id, ev.velocity, effective_style, cfg.seed
            )

            target_pos = (ev.target.x, ev.target.y, ev.target.height)
            plan = build_motion_plan(
                ev.event_id, limb, technique, replay_position[limb], target_pos,
                human_timing, replay_ready_time[limb],
            )
            plan = apply_rig_envelope(plan)
            plan = append_recovery_keyframe(plan, recovery)
            motion_plans.append(plan)

            impact = compute_impact(plan, ev.instrument, technique)

            fatigue = update_fatigue(fatigue, limb, technique, ev.time_seconds)

            replay_position[limb] = (ev.target.x, ev.target.y, ev.target.height + recovery.rebound_height_m)
            replay_ready_time[limb] = recovery.ready_time_s
            replay_last_time[limb] = ev.time_seconds

            active_positions = {l: p for l, p in replay_position.items()}
            body_states.append(compute_body_state(ev.time_seconds, active_positions))

            is_dominant_hand = (
                limb in (Limb.RIGHT_HAND, Limb.LEFT_HAND)
                and limb.value == (effective_style.dominant_hand.value + "H")
            )
            # NOTE: body-crossing is scored inside Rule 7's candidate search
            # (StickingCandidate.crosses_body) but a committed SequenceDecision
            # does not carry that tag forward; `crossed=False` is a safe
            # default here and the interface leaves room to thread the real
            # flag through SequenceDecision in a future revision.
            self.calibrator.observe(chosen_dominant=is_dominant_hand, crossed=False)

            performance_events.append(PerformanceEvent(
                event_id=ev.event_id,
                source_id=ev.source_id,
                time_seconds=human_timing.performed_time_s,
                limb=limb,
                instrument=ev.instrument,
                stroke_type=technique.stroke_type,
                velocity=humanized_velocity,
                microtiming_offset_ms=human_timing.microtiming_offset_ms,
                dynamic_level=technique.dynamic_level,
                rule_trace=["rule08/29", "rule09", "rule10", "rule12", "rule13-19"],
            ))

        # ---- Assemble timeline (Rule 19) & sync (Rule 24) ----
        timeline = assemble_timeline(motion_plans, technique_by_event)
        check_audio_animation_sync(timeline)

        # ---- Validate & repair (Rule 25) ----
        validation = validate_and_repair(performance_events)

        # ---- Continue (Rule 26 will pick this up at playback time) ----
        return FinalValidatedPerformance(
            events=performance_events,
            animation=timeline,
            validation=validation,
            duration_s=timeline.duration_s,
            seed=cfg.seed,
        )
