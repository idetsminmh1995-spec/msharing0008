"""
rule08_11_29_39_solver.py

RULE 8 — STICKING SEQUENCE CONTINUITY
Principle: "Sequence quality outranks isolated note quality; use lookahead
and commit horizons."

RULE 11 — FOUR-LIMB COORDINATION & SIMULTANEOUS EVENT SOLVING
Principle: "Hands and feet do not solve independently when simultaneous or
mechanically coupled."

RULE 29 — PERFORMANCE SOLVING PIPELINE, LOOKAHEAD WINDOW & ITERATIVE SOLVER
Principle: "Look far, commit near; current decisions depend on future
preparation and sequence quality." Solver Pattern: "Lookahead > current-only
reasoning; speculative state > destructive mutation; near-term commit >
whole-song premature locking."

RULE 39 — PERFORMANCE EXECUTION LOOP, EVENT SOLVING CYCLE & STATE COMMIT
PIPELINE
Commit Rule: "Search branches are speculative. Only validated selections
mutate authoritative state. Rollback uses explicit snapshots or state deltas."

These four rules are implemented together because they are one algorithm:
a windowed beam search (Rule 29) that jointly resolves simultaneous limb
conflicts (Rule 11), scores whole hypotheses rather than single notes
(Rule 8), and only ever mutates the *real* DrummerState at an explicit
commit point after a window is solved (Rule 39).
"""

from __future__ import annotations
from typing import List, Dict, Tuple
from itertools import permutations

from .datamodel import (
    DrumEvent, Limb, DrummerState, SequenceDecision, LimbState, StickingCandidate
)
from .rule06_reachability import neutral_position
from .rule07_hand_candidates import generate_hand_candidates, MANUAL_LIMBS

SIMULTANEITY_EPSILON_S = 0.004
DEFAULT_WINDOW = 12
DEFAULT_BEAM_WIDTH = 6


def _group_simultaneous(events: List[DrumEvent]) -> List[List[DrumEvent]]:
    """Rule 11: group events that are close enough in time to be physically
    simultaneous, so they can be solved jointly rather than independently."""
    groups: List[List[DrumEvent]] = []
    for ev in events:
        if groups and abs(ev.time_seconds - groups[-1][0].time_seconds) < SIMULTANEITY_EPSILON_S:
            groups[-1].append(ev)
        else:
            groups.append([ev])
    return groups


def _apply_decision(state: DrummerState, event: DrumEvent, limb: Limb) -> None:
    """The ONLY place limb state is mutated during search (on a *cloned*
    speculative state, never the authoritative one — see solve_window)."""
    ls = state.limbs[limb]
    ls.position = (event.target.x, event.target.y, event.target.height)
    ls.last_event_id = event.event_id
    ls.last_action_time_s = event.time_seconds
    ls.ready_time_s = event.time_seconds  # refined later by Rule 10 recovery
    state.memory.recent_limb_sequence.append(limb)
    state.memory.recent_event_ids.append(event.event_id)
    if len(state.memory.recent_limb_sequence) > 64:
        state.memory.recent_limb_sequence.pop(0)
        state.memory.recent_event_ids.pop(0)


def _available_time(state: DrummerState, limb: Limb, event_time: float) -> float:
    last_t = state.limbs[limb].last_action_time_s
    if last_t < -900:
        return 999.0  # nothing played yet on this limb: unconstrained start
    return max(0.0, event_time - last_t)


def _solve_group_candidates(group: List[DrumEvent], state: DrummerState
                             ) -> List[Tuple[List[Tuple[DrumEvent, Limb, float]], float]]:
    """Rule 11: for a simultaneous group, return joint (assignment, score)
    options, ensuring no limb is asked to play two targets at once.
    """
    if len(group) == 1:
        ev = group[0]
        avail = {l: _available_time(state, l, ev.time_seconds) for l in MANUAL_LIMBS}
        cands = generate_hand_candidates(ev, state, avail)
        options = []
        for c in cands:
            if c.reachable:
                options.append(([(ev, c.limb, c.score)], c.score))
        if not options:
            # No reachable hand at all: best-effort fallback so the pipeline
            # never crashes; Rule 25 validation will flag this as an error.
            best = max(cands, key=lambda c: c.score)
            options = [([(ev, best.limb, best.score)], best.score)]
        return options

    if len(group) == 2:
        options = []
        for perm in permutations(MANUAL_LIMBS, 2):
            assignment = []
            total = 0.0
            ok = True
            for ev, limb in zip(group, perm):
                avail = _available_time(state, limb, ev.time_seconds)
                cands = generate_hand_candidates(ev, state, {limb: avail})
                cand = next((c for c in cands if c.limb == limb), None)
                if cand is None or not cand.reachable:
                    ok = False
                    break
                assignment.append((ev, limb, cand.score))
                total += cand.score
            if ok:
                options.append((assignment, total))
        if not options:
            # Physically impossible (both hands can't reach both targets in
            # time): best-effort fallback, flagged downstream by Rule 25.
            assignment = [(group[0], Limb.RIGHT_HAND, -5.0), (group[1], Limb.LEFT_HAND, -5.0)]
            options = [(assignment, -10.0)]
        return options

    # More than 2 truly-simultaneous manual events: physically impossible for
    # a 2-handed drummer. Best-effort: alternate hands across the group and
    # let Rule 25 raise validation errors for the unplayable excess.
    assignment = []
    total = 0.0
    for i, ev in enumerate(group):
        limb = MANUAL_LIMBS[i % 2]
        assignment.append((ev, limb, -2.0))
        total -= 2.0
    return [(assignment, total)]


def solve_window(groups: List[List[DrumEvent]], base_state: DrummerState,
                  beam_width: int = DEFAULT_BEAM_WIDTH
                  ) -> Tuple[List[SequenceDecision], DrummerState]:
    """RULE 29 core: beam search across one lookahead window of simultaneity
    groups. RULE 39 discipline: all work here happens on *cloned* speculative
    states (`state.snapshot()`); the caller commits only the winning branch.
    """
    beam: List[Tuple[DrummerState, List[SequenceDecision], float]] = [
        (base_state.snapshot(), [], 0.0)
    ]

    for group in groups:
        new_beam: List[Tuple[DrummerState, List[SequenceDecision], float]] = []
        for state, decisions, score in beam:
            options = _solve_group_candidates(group, state)
            for assignment, group_score in options:
                st2 = state.snapshot()
                new_decisions = list(decisions)
                for ev, limb, note_score in assignment:
                    _apply_decision(st2, ev, limb)
                    new_decisions.append(SequenceDecision(
                        event_id=ev.event_id, limb=limb,
                        sequence_cost=-note_score,
                        alternatives_considered=len(options),
                        lookahead_window=len(groups),
                    ))
                new_beam.append((st2, new_decisions, score + group_score))
        new_beam.sort(key=lambda x: -x[2])
        beam = new_beam[:beam_width]

    best_state, best_decisions, _ = beam[0]
    return best_decisions, best_state


def solve_sticking(manual_events: List[DrumEvent], state: DrummerState,
                    window_size: int = DEFAULT_WINDOW,
                    beam_width: int = DEFAULT_BEAM_WIDTH
                    ) -> List[SequenceDecision]:
    """RULE 29 orchestration entry point: roll a lookahead window across the
    whole manual-event stream, solving and COMMITTING (Rule 39) one window at
    a time so state always reflects only validated, real decisions.
    """
    if not manual_events:
        return []

    groups = _group_simultaneous(manual_events)
    all_decisions: List[SequenceDecision] = []

    i = 0
    while i < len(groups):
        window = groups[i:i + window_size]
        decisions, resolved_state = solve_window(window, state, beam_width)
        # --- COMMIT POINT (Rule 39): only now does authoritative state change ---
        for limb in Limb:
            state.limbs[limb] = resolved_state.limbs[limb]
        state.memory = resolved_state.memory
        all_decisions.extend(decisions)
        i += window_size

    return all_decisions


def assign_feet(foot_events: List[DrumEvent], state: DrummerState) -> List[SequenceDecision]:
    """RULE 11 (feet side): kick/hihat-pedal targets already declare their
    preferred_limb (Rule 2 kit geometry), so feet do not need candidate
    scoring — they need conflict + timing feasibility checks only.
    """
    from .rule06_reachability import check_reachability
    decisions: List[SequenceDecision] = []
    for ev in foot_events:
        limb = ev.target.preferred_limb
        avail = _available_time(state, limb, ev.time_seconds)
        reach = check_reachability(limb, state.limbs[limb], ev.target, avail, ev.event_id)
        _apply_decision(state, ev, limb)
        decisions.append(SequenceDecision(
            event_id=ev.event_id, limb=limb,
            sequence_cost=0.0 if reach.reachable else 5.0,
            alternatives_considered=1, lookahead_window=1,
        ))
    return decisions
