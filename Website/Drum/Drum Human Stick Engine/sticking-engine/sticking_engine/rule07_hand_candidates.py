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
from typing import List, Dict, Optional
from .datamodel import (
    DrumEvent, Limb, StickingCandidate, DrummerState, DrummerStyleProfile,
    EventRoleContext, PatternRole
)
from .rule06_reachability import check_reachability, neutral_position

MANUAL_LIMBS = [Limb.RIGHT_HAND, Limb.LEFT_HAND]

# --- role weights -----------------------------------------------------
# All of these are BIASES. Rule 7's Core Principle is explicit that hand
# preference is never a hard rule, so none of them is large enough to
# outrank Rule 6's reachable=False, which is the only hard rejection.
#
# The lead-hand bonus is deliberately the largest soft term in the whole
# engine, because on a time-keeping stream it describes what a drummer
# actually does. A hi-hat pattern is ONE arm moving continuously; the
# alternation term below, left to itself, turns it into two arms taking
# turns, which is both wrong and -- once the other hand is also needed
# for the backbeat -- physically ridiculous.
OSTINATO_LEAD_BONUS = 1.20
# What the OTHER hand gets for covering a note that lands while a stream
# is running. Smaller than the lead bonus: the stream's hand being busy
# is a strong hint, not a law, and a fill that interrupts the hi-hat
# should still be free to use either hand.
OSTINATO_OFF_HAND_BONUS = 0.60


def is_two_handed_stream(role: EventRoleContext, style: DrummerStyleProfile) -> bool:
    """Is this stream too fast for one hand to hold?

    The single consumer of style.max_single_hand_rate_hz, and the line
    between "the right hand rides the hi-hat" and "both hands share it".
    Shared with Rule 8's sequence scoring so the two cannot disagree
    about which kind of stream they are looking at.
    """
    return (
        role.in_ostinato
        and style.max_single_hand_rate_hz > 0
        and role.ostinato_rate_hz > style.max_single_hand_rate_hz
    )


def _lead_hand_for(role: EventRoleContext, state: DrummerState,
                    dominant_limb: Limb) -> Limb:
    """Which hand is holding this stream.

    Once a stream's first note is committed the answer is recorded in
    state (Rule 39), and every later note of that stream reads it back --
    that is what makes the hand STAY. Before then the dominant hand is
    the prior, which is why an ordinary right-handed groove ends up with
    the right hand on the hi-hat without anyone hard-coding that.
    """
    return state.ostinato_lead_hand.get(role.ostinato_id, dominant_limb)


def generate_hand_candidates(event: DrumEvent, state: DrummerState,
                              available_time_by_limb: Dict[Limb, float],
                              role: Optional[EventRoleContext] = None) -> List[StickingCandidate]:
    """RULE 7 entry point for ONE manual (hand-playable) event.

    available_time_by_limb: time in seconds each hand has, from its last
    committed action, until this event's time (Rule 4/6 supply this window).

    role: Rule 5's classification of what this note is FOR. Optional, and
    a missing one scores exactly as this function did before roles
    existed -- dominance plus alternation -- so a caller that has no
    Rule 5 output is not silently given a worse answer.
    """
    style = state.style
    candidates: List[StickingCandidate] = []
    if role is None:
        role = EventRoleContext(event_id=event.event_id)

    dominant_limb = Limb.RIGHT_HAND if style.dominant_hand.value == "R" else Limb.LEFT_HAND

    # A stream faster than one hand can sustain is not a one-hand stream.
    # This is the only place style.max_single_hand_rate_hz is consulted,
    # and it is what makes 16ths at speed come out as two-handed while
    # 8ths stay on the lead hand -- the same distinction a drummer makes.
    two_handed_ostinato = is_two_handed_stream(role, style)
    holds_stream = role.in_ostinato and not two_handed_ostinato
    # A note that is NOT part of the stream but sounds while one runs:
    # the backbeat under a hi-hat pattern.
    under_stream = role.ostinato_active and not role.in_ostinato
    lead_limb = _lead_hand_for(role, state, dominant_limb) if role.ostinato_active else None
    # Alternation is a statement about ONE musical line. It belongs to
    # fills, and to a stream so fast that both hands have to share it --
    # and nowhere else. Applying it to a one-hand stream flips the hand
    # every note; applying it between a hi-hat and a snare compares two
    # voices that have nothing to do with each other.
    alternation_applies = (not holds_stream) and (not under_stream)

    for limb in MANUAL_LIMBS:
        limb_state = state.limbs[limb]
        avail = available_time_by_limb.get(limb, 999.0)
        reach = check_reachability(limb, limb_state, event.target, avail, event.event_id,
                                    style.max_single_hand_rate_hz)

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
        if limb == dominant_limb:
            score += style.dominance_bias
            tags.append("dominant")

        # --- Rule 5 role (the musical job this note is doing) ----------
        if holds_stream:
            # Keeping time. One hand owns the stream and does not hand it
            # back note by note.
            if limb == lead_limb:
                score += OSTINATO_LEAD_BONUS
                tags.append("ostinato_lead")
            else:
                tags.append("ostinato_off_lead")
        elif under_stream:
            # A backbeat, kick-accent or accent landing underneath a
            # running stream: the stream's hand is already committed, so
            # this belongs to the other one.
            if limb != lead_limb:
                score += OSTINATO_OFF_HAND_BONUS
                tags.append("under_ostinato")
        elif two_handed_ostinato:
            tags.append("ostinato_two_handed")

        # Alternation preference: prefer the hand that did NOT play last,
        # scaled by the profile's alternation_preference (Rule 22).
        #
        # See `alternation_applies`: skipped on a one-hand stream and on
        # the notes underneath it, kept for fills and for a stream fast
        # enough that both hands must share it -- which is the one place
        # a hi-hat SHOULD alternate.
        last_limb = state.memory.recent_limb_sequence[-1] if state.memory.recent_limb_sequence else None
        if last_limb is not None and alternation_applies:
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
