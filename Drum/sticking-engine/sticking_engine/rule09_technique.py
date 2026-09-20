"""
rule09_technique.py — RULE 9: STROKE TECHNIQUE & ARTICULATION SELECTION

Purpose: Choose plausible stroke techniques for each selected hand assignment.

Core Principle: "Technique is constrained by timing, physical state, and
next-stroke preparation."
"""

from __future__ import annotations
from typing import List, Optional
from .datamodel import (
    DrumEvent, Limb, StrokeType, StrokeCandidate, TechniquePlan,
    DrummerStyleProfile, Instrument
)

RIM_CAPABLE = {Instrument.SNARE}
CHOKE_CAPABLE = {Instrument.CRASH_1, Instrument.CRASH_2, Instrument.HIHAT_OPEN}


def select_technique(event: DrumEvent, limb: Limb, style: DrummerStyleProfile,
                      same_limb_prev_time: Optional[float],
                      is_first_of_double: bool = False) -> TechniquePlan:
    """RULE 9 entry point. Deterministic technique selection based on:
      - velocity thresholds (ghost/accent) from the style profile
      - instrument capability (rim shot / cross-stick / choke only where valid)
      - inter-onset interval for the SAME limb (drives single vs double-stroke
        articulation when the same hand must repeat quickly)
    """
    velocity = event.velocity
    dynamic_level = velocity / 127.0

    if event.instrument == Instrument.SNARE_CROSS_STICK:
        stroke = StrokeType.CROSS_STICK
    elif event.instrument in CHOKE_CAPABLE and velocity >= style.accent_velocity_threshold:
        stroke = StrokeType.CHOKE
    elif event.instrument in RIM_CAPABLE and velocity >= style.accent_velocity_threshold:
        stroke = StrokeType.RIM_SHOT
    elif event.instrument in (Instrument.HIHAT_BELL, Instrument.RIDE_BELL):
        stroke = StrokeType.BELL
    elif event.instrument == Instrument.HIHAT_OPEN:
        stroke = StrokeType.OPEN
    elif velocity <= style.ghost_note_velocity_threshold:
        stroke = StrokeType.GHOST
    elif velocity >= style.accent_velocity_threshold:
        stroke = StrokeType.ACCENT
    else:
        stroke = StrokeType.SINGLE

    # If the same limb played very recently (fast repeat), this note is
    # physically more like the 2nd stroke of a double than a fresh single.
    if same_limb_prev_time is not None:
        dt = event.time_seconds - same_limb_prev_time
        if dt < (1.0 / style.max_single_hand_rate_hz) and stroke == StrokeType.SINGLE:
            stroke = StrokeType.DOUBLE

    return TechniquePlan(
        event_id=event.event_id, limb=limb, stroke_type=stroke,
        dynamic_level=dynamic_level,
    )
