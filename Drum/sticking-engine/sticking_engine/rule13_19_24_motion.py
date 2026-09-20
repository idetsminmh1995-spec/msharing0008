"""
rule13_19_24_motion.py

Groups the physical/animation layer, Rules 13-19 and 24, because they form
one continuous pipeline over the SAME committed sticking/technique decisions:

RULE 13 — WHOLE-LIMB MOTION PLANNING
  Principle: "Motion must preserve continuity, timing feasibility, and
  physical plausibility." + Physical Continuity: never teleport / snap to a
  neutral pose / invent impossible acceleration.

RULE 14 — JOINT KINEMATICS, IK/FK & RIG REALIZATION
  Principle: "Rig realization cannot change the high-level performance
  decision." (Here: a simplified single-point-per-limb model stands in for a
  full IK rig; `apply_rig_envelope` is the seam where a real rig solver would
  plug in without touching Rule 8/9's decisions.)

RULE 15 — IMPACT, CONTACT & REBOUND PHYSICS
  Principle: "Impact timing and identity remain traceable to the originating
  PerformanceEvent."

RULE 16 — POST-IMPACT RECOVERY & TRANSITION
  Principle: "Recovery is continuous and stateful; no automatic return to a
  default pose." (Next motion plan always starts exactly where this one's
  rebound keyframe ends.)

RULE 17 — WHOLE-BODY BALANCE, POSTURE & COMPENSATION
  Principle: "Body movement is a consequence of limb actions ... not
  decorative animation."

RULE 18 — HUMAN TIMING, MICROTIMING & PHYSICAL TIME
  Principle: "Human timing is shaped, bounded, and reproducible; physics
  cannot be violated for feel." Motion start time is derived FROM physical
  travel-time requirements, never allowed to start after the limb was ready.

RULE 19 — ANIMATION TIMELINE ASSEMBLY
  Principle: "Animation executes the performance decision; it does not
  reinterpret sticking."

RULE 24 — AUDIO-ANIMATION SYNCHRONIZATION
  Principle: "One authoritative clock; audio and animation follow the solved
  performance rather than re-deciding it."
"""

from __future__ import annotations
import math
from typing import List, Tuple, Dict
from .datamodel import (
    Limb, TechniquePlan, RecoveryPlan, MotionPlan, MotionKeyframe, ImpactEvent,
    BodyState, AnimationEvent, AnimationTimeline, HumanTimingContext, SyncState,
    Instrument, StrokeType,
)
from .rule06_reachability import HAND_MAX_SPEED_MPS, FOOT_MAX_SPEED_MPS

PREP_LIFT_M = 0.08  # how high a limb lifts before an accented approach


def build_motion_plan(event_id: str, limb: Limb, technique: TechniquePlan,
                       prev_position: Tuple[float, float, float],
                       target_position: Tuple[float, float, float],
                       human_timing: HumanTimingContext,
                       limb_ready_time_s: float) -> MotionPlan:
    """RULE 13/14/18 entry point.

    Physical Continuity is enforced directly: motion cannot start before
    `limb_ready_time_s` (previous recovery's promise, Rule 10/16), and travel
    time is derived from real distance / max speed (Rule 6's same model), so
    an impossible instantaneous jump is structurally impossible to emit here.
    """
    is_foot = limb in (Limb.RIGHT_FOOT, Limb.LEFT_FOOT)
    max_speed = FOOT_MAX_SPEED_MPS if is_foot else HAND_MAX_SPEED_MPS
    distance = math.dist(prev_position[:2], target_position[:2])
    travel_time = distance / max_speed if max_speed > 0 else 0.0

    impact_time = human_timing.performed_time_s
    motion_start = impact_time - travel_time

    feasible = True
    rejection = ""
    if motion_start < limb_ready_time_s - 1e-6:
        # Not enough physical time even after Rule 6 pre-filtering (can occur
        # after Rule 12's timing jitter). Rule 18: physics wins over feel —
        # clamp motion_start to the earliest physically honest time and let
        # Rule 25 downgrade/flag the humanization rather than silently
        # violating continuity.
        motion_start = limb_ready_time_s
        feasible = False
        rejection = "motion_start clamped to limb_ready_time_s after humanization"

    lift = PREP_LIFT_M * (0.5 + technique.dynamic_level)
    prep_z = prev_position[2] + lift if not is_foot else prev_position[2]

    keyframes = [
        MotionKeyframe(motion_start, limb, prev_position, "prep"),
        MotionKeyframe(motion_start + travel_time * 0.35,
                       limb, (prev_position[0], prev_position[1], prep_z), "travel"),
        MotionKeyframe(impact_time, limb, target_position, "impact"),
    ]

    return MotionPlan(
        event_id=event_id, limb=limb, keyframes=keyframes,
        peak_velocity_mps=max_speed, feasible=feasible, rejection_reason=rejection,
    )


def apply_rig_envelope(plan: MotionPlan) -> MotionPlan:
    """RULE 14 seam: a full IK/FK solver would retarget `plan.keyframes` onto
    joint angles here. The single-point model already respects the same
    physical envelope Rule 6 checked, so this stage is a structural pass-
    through — kept as an explicit function so a real rig can be dropped in
    without touching any decision-layer code."""
    return plan


def compute_impact(plan: MotionPlan, instrument: Instrument, technique: TechniquePlan
                    ) -> ImpactEvent:
    """RULE 15 entry point."""
    impact_kf = next(k for k in plan.keyframes if k.phase == "impact")
    rebound = 0.02 + 0.10 * technique.dynamic_level
    return ImpactEvent(
        event_id=plan.event_id, limb=plan.limb, time_seconds=impact_kf.time_seconds,
        instrument=instrument, impact_velocity_mps=plan.peak_velocity_mps,
        rebound_height_m=rebound,
    )


def append_recovery_keyframe(plan: MotionPlan, recovery: RecoveryPlan) -> MotionPlan:
    """RULE 16 entry point: extend the motion plan with the rebound/recover
    phase promised by Rule 10, so the NEXT motion plan can legitimately start
    from here rather than from an invented neutral pose."""
    impact_kf = next(k for k in plan.keyframes if k.phase == "impact")
    rebound_pos = (impact_kf.position[0], impact_kf.position[1],
                   impact_kf.position[2] + recovery.rebound_height_m)
    plan.keyframes.append(MotionKeyframe(recovery.ready_time_s, plan.limb, rebound_pos, "rebound"))
    return plan


def compute_body_state(time_s: float, active_limb_positions: Dict[Limb, Tuple[float, float, float]]
                        ) -> BodyState:
    """RULE 17 entry point: cheap-but-principled whole-body compensation
    derived purely from where the limbs currently are (never independently
    animated)."""
    if not active_limb_positions:
        return BodyState(time_s, 0.0, (0.0, 0.0))
    xs = [p[0] for p in active_limb_positions.values()]
    ys = [p[1] for p in active_limb_positions.values()]
    mean_x = sum(xs) / len(xs)
    mean_y = sum(ys) / len(ys)
    torso_rotation = max(-18.0, min(18.0, mean_x * 22.0))
    com_offset = (mean_x * 0.05, (mean_y - 0.3) * 0.03)
    return BodyState(time_s, torso_rotation, com_offset)


def assemble_timeline(motion_plans: List[MotionPlan], technique_by_event: Dict[str, TechniquePlan]
                       ) -> AnimationTimeline:
    """RULE 19 entry point. Pure assembly — no new decisions are made here."""
    events = []
    for plan in motion_plans:
        tech = technique_by_event.get(plan.event_id)
        stroke = tech.stroke_type if tech else StrokeType.SINGLE
        start = plan.keyframes[0].time_seconds
        end = plan.keyframes[-1].time_seconds
        events.append(AnimationEvent(
            event_id=plan.event_id, limb=plan.limb, start_time_s=start,
            end_time_s=end, keyframes=plan.keyframes, stroke_type=stroke,
        ))
    duration = max((e.end_time_s for e in events), default=0.0)
    return AnimationTimeline(events=events, duration_s=duration)


def check_audio_animation_sync(timeline: AnimationTimeline) -> SyncState:
    """RULE 24 entry point. Because impact time IS the authoritative clock
    that both the audio scheduler and the animation timeline read from
    (rather than two independently-tracked clocks), structural drift is zero
    by construction; this function exists as the explicit place a real-time
    runtime (Rule 26) would monitor device-latency drift."""
    return SyncState(max_drift_ms=0.0, resynced=True, last_check_time_s=timeline.duration_s)
