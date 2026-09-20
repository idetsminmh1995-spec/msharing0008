"""
rule07_hand_candidates.py — RULE 7: HAND CANDIDATE GENERATION

Purpose: Generate viable hand assignments for manual events before sequence
optimization.

Core Principle: "Hand preference is a bias, not a hard rule; future targets
must influence candidate quality."

Candidate Logic (shared with Rules 8-12): hard physical impossibilities are
rejected outright (Rule 6 reachable=False); soft preferences are scored;
multiple valid alternatives are kept alive for Rule 8/29's sequence solver.
"""

from __future__ import annotations
from typing import List, Dict
from .datamodel import (
    DrumEvent, Limb, StickingCandidate, DrummerState, DrummerStyleProfile
)
from .rule06_reachability import check_reachability, neutral_position

MANUAL_LIMBS = [Limb.RIGHT_HAND, Limb.LEFT_HAND]


def generate_hand_candidates(event: DrumEvent, state: DrummerState,
                              available_time_by_limb: Dict[Limb, float]) -> List[StickingCandidate]:
    """RULE 7 entry point for ONE manual (hand-playable) event.

    available_time_by_limb: time in seconds each hand has, from its last
    committed action, until this event's time (Rule 4/6 supply this window).
    """
    style = state.style
    candidates: List[StickingCandidate] = []

    for limb in MANUAL_LIMBS:
        limb_state = state.limbs[limb]
        avail = available_time_by_limb.get(limb, 999.0)
        reach = check_reachability(limb, limb_state, event.target, avail, event.event_id)

        if not reach.reachable:
            # Hard physical impossibility -> rejected, not scored (Rule 6).
            candidates.append(StickingCandidate(
                event_id=event.event_id, limb=limb, score=float("-inf"),
                reachable=False, crosses_body=reach.crosses_body,
                tags=["unreachable"],
            ))
            continue

        score = 0.0
        tags: List[str] = []

        # Dominance bias (Rule 22 style profile)
        dominant_limb = Limb.RIGHT_HAND if style.dominant_hand.value == "R" else Limb.LEFT_HAND
        if limb == dominant_limb:
            score += style.dominance_bias
            tags.append("dominant")

        # Alternation preference: prefer the hand that did NOT play last,
        # scaled by the profile's alternation_preference (Rule 22).
        last_limb = state.memory.recent_limb_sequence[-1] if state.memory.recent_limb_sequence else None
        if last_limb is not None:
            if limb != last_limb:
                score += 0.25 * style.alternation_preference
            else:
                score -= 0.25 * style.alternation_preference
                tags.append("repeat_hand")

        # Crossing aversion: penalize crossing proportional to profile setting.
        if reach.crosses_body:
            score -= style.crossing_aversion * 0.4
            tags.append("crossing")

        # Prefer positions close to current hand (economy of motion).
        score -= 0.05 * reach.distance_m

        # Prefer generous timing margin (keeps future options open).
        score += min(0.15, reach.safety_margin_s * 0.5)

        candidates.append(StickingCandidate(
            event_id=event.event_id, limb=limb, score=score,
            reachable=True, crosses_body=reach.crosses_body, tags=tags,
        ))

    return candidates
