"""
rule06_reachability.py — RULE 6: PHYSICAL REACHABILITY & TARGET ACCESS

Purpose: Determine which limbs and hand states can physically reach a target
within the available time.

Core Principle: "Physical feasibility is a hard boundary; unreachable actions
are rejected rather than visually faked."

This module computes, for a (limb, target, available_time) triple, whether
the movement is physically possible given a simple-but-real kinematic model:
travel time = distance / max_speed, with a required safety margin. It also
flags body-crossing (right hand traveling into left-of-body space or vice
versa), which Rule 7 uses as a soft cost, not itself a hard rejection unless
combined with insufficient time.
"""

from __future__ import annotations
import math
from typing import Tuple
from .datamodel import Limb, Target, ReachabilityResult, LimbState

# Simple biomechanical constants (meters, seconds) — deliberately conservative
# and easy to override via a config object if a project needs a different rig.
HAND_MAX_SPEED_MPS = 4.2      # fast drumstick-tip travel speed between hits
FOOT_MAX_SPEED_MPS = 2.0
SAFETY_MARGIN_S = 0.012       # minimum slack required beyond bare travel time
HAND_NEUTRAL_X = {Limb.RIGHT_HAND: 0.30, Limb.LEFT_HAND: -0.30}
HAND_NEUTRAL_Y = 0.30
FOOT_NEUTRAL_X = {Limb.RIGHT_FOOT: 0.0, Limb.LEFT_FOOT: -0.55}


def _distance(p1: Tuple[float, float, float], p2: Tuple[float, float]) -> float:
    return math.hypot(p1[0] - p2[0], p1[1] - p2[1])


def _crosses_body(limb: Limb, from_x: float, to_x: float) -> bool:
    """A hand 'crosses' when it must travel past the body midline (x=0) to
    the opposite side from where it naturally sits."""
    if limb == Limb.RIGHT_HAND:
        return to_x < -0.05
    if limb == Limb.LEFT_HAND:
        return to_x > 0.05
    return False


def check_reachability(limb: Limb, limb_state: LimbState, target: Target,
                        available_time_s: float, event_id: str) -> ReachabilityResult:
    """RULE 6 entry point for a single (limb, target) evaluation."""
    is_foot = limb in (Limb.RIGHT_FOOT, Limb.LEFT_FOOT)
    if is_foot and not target.is_foot_target:
        return ReachabilityResult(limb, event_id, False, 0.0, 0.0,
                                   available_time_s, 0.0, False,
                                   reason="foot cannot play a hand-only surface")
    if (not is_foot) and target.is_foot_target:
        return ReachabilityResult(limb, event_id, False, 0.0, 0.0,
                                   available_time_s, 0.0, False,
                                   reason="hand cannot play a foot-only surface")

    from_pos = limb_state.position
    distance = _distance(from_pos, (target.x, target.y))
    max_speed = FOOT_MAX_SPEED_MPS if is_foot else HAND_MAX_SPEED_MPS
    travel_time = distance / max_speed if max_speed > 0 else float("inf")

    crosses = (not is_foot) and _crosses_body(limb, from_pos[0], target.x)

    reachable = (available_time_s - travel_time) >= SAFETY_MARGIN_S or available_time_s <= 0
    # available_time_s <= 0 happens for the very first event of a performance
    # (nothing to compare against yet); Rule 7 treats these as free starts.
    margin = available_time_s - travel_time

    reason = "" if reachable else (
        f"insufficient time: needs {travel_time*1000:.1f}ms, "
        f"has {available_time_s*1000:.1f}ms"
    )

    return ReachabilityResult(
        limb=limb, event_id=event_id, reachable=reachable, distance_m=distance,
        required_travel_time_s=travel_time, available_time_s=available_time_s,
        safety_margin_s=margin, crosses_body=crosses, reason=reason,
    )


def neutral_position(limb: Limb) -> Tuple[float, float, float]:
    """Rest position for a limb that has not yet played anything."""
    if limb in (Limb.RIGHT_HAND, Limb.LEFT_HAND):
        return (HAND_NEUTRAL_X[limb], HAND_NEUTRAL_Y, 0.15)
    return (FOOT_NEUTRAL_X[limb], 0.0, 0.0)
