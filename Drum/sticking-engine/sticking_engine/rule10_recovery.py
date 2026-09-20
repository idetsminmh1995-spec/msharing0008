"""
rule10_recovery.py — RULE 10: RECOVERY & NEXT-STROKE PREPARATION

Purpose: Treat recovery as a first-class part of the current stroke rather
than a reset to neutral.

Core Principle: "No-reset principle: every stroke ends in a state that
prepares the next stroke."
"""

from __future__ import annotations
from typing import Optional
from .datamodel import TechniquePlan, StrokeType, RecoveryPlan, Limb

# Approximate recovery durations (seconds) by articulation — a ghost note
# rebounds almost immediately, an accented rim shot needs a fuller recovery
# arc before the limb is genuinely ready for a demanding next hit.
RECOVERY_TIME_BY_STROKE = {
    StrokeType.GHOST: 0.020,
    StrokeType.SINGLE: 0.035,
    StrokeType.DOUBLE: 0.018,   # already mid-bounce; short extra recovery
    StrokeType.ACCENT: 0.055,
    StrokeType.RIM_SHOT: 0.060,
    StrokeType.CROSS_STICK: 0.045,
    StrokeType.FLAM: 0.045,
    StrokeType.DRAG: 0.040,
    StrokeType.CHOKE: 0.070,
    StrokeType.BELL: 0.045,
    StrokeType.OPEN: 0.050,
    StrokeType.CLOSED: 0.035,
}


def plan_recovery(event_time: float, limb: Limb, technique: TechniquePlan,
                   next_event_id: Optional[str] = None) -> RecoveryPlan:
    """RULE 10 entry point. `ready_time_s` feeds directly back into Rule 6's
    available-time calculation for whatever this limb plays next, so recovery
    cost is never silently ignored by later reachability checks."""
    base = RECOVERY_TIME_BY_STROKE.get(technique.stroke_type, 0.035)
    # Harder dynamics -> slightly higher rebound -> marginally longer recovery.
    recovery_time = base * (0.8 + 0.4 * technique.dynamic_level)
    rebound_height = 0.02 + 0.10 * technique.dynamic_level

    return RecoveryPlan(
        event_id=technique.event_id,
        limb=limb,
        rebound_height_m=rebound_height,
        ready_time_s=event_time + recovery_time,
        prepared_for_event_id=next_event_id,
    )
