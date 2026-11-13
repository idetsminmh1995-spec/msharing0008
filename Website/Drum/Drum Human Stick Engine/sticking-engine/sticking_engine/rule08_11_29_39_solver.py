"""
rule08_11_29_39_solver.py

RULE 8 — STICKING SEQUENCE CONTINUITY
Principle: "Sequence quality outranks isolated note quality; use lookahead
and commit horizons." Core Process names the things a sequence score must
weigh: "continuity, future preparation, repeated patterns, crossing cost,
ending/starting hand, and sequence stability."

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

All four limbs are solved in ONE pass. Solving the hands first and then
asking where the feet went would satisfy none of Rule 11 -- the hands
would be choosing without knowing that a kick lands on the same beat.
"""

from __future__ import annotations
import math
from typing import List, Dict, Tuple, Optional
from itertools import permutations

from .datamodel import (
    DrumEvent, Limb, DrummerState, SequenceDecision, LimbState,
    StickingCandidate, EventRoleContext,
)
from .rule06_reachability import (
    neutral_position, check_reachability,
    HAND_MAX_SPEED_MPS, FOOT_MAX_SPEED_MPS,
)
from .rule07_hand_candidates import (
    generate_hand_candidates, is_two_handed_stream, MANUAL_LIMBS,
)
from .rule34_grammar import generate_pattern_candidates

SIMULTANEITY_EPSILON_S = 0.004
DEFAULT_WINDOW = 12
DEFAULT_BEAM_WIDTH = 6

# --- Rule 8 sequence weights ------------------------------------------
# These score a whole hypothesis, which is the part Rule 8 exists for. A
# plain sum of per-note scores is still isolated-note reasoning no matter
# how many notes are in it; these terms only have a value once you can
# see the sequence.
#
# Changing hands in the middle of a time-keeping stream.
STREAM_SWITCH_PENALTY = 0.90
# Playing the same under-stream voice (the backbeat) with a different hand
# from the one already used for it in this window.
VOICE_INCONSISTENCY_PENALTY = 0.45
# Matching a sticking this drummer has already used for the same shape.
MOTIF_REUSE_BONUS = 0.35
# Asking one limb to travel between two targets in a hurry. This is the
# "future preparation" half of Rule 8's Core Process, and it is the reason
# a fast fill comes out as singles: giving the next note to the other hand
# doubles the time this one has to get where it is going. Rule 6 already
# rejects what is impossible; this scores what is merely rushed.
PREPARATION_PENALTY = 2.0
# How much of the gap a stroke may spend travelling before it counts as
# rushed. A third leaves room to lift, drop and rebound -- below that a
# drummer is scrambling, even though the note still lands.
COMFORTABLE_TRAVEL_FRACTION = 0.33

# --- Rule 34 grammar --------------------------------------------------
# Shortest run of free single notes worth offering a rudiment for. Below
# this it is a figure inside a groove, not a fill with a shape.
MIN_GRAMMAR_RUN = 4
# What a NAMED pattern is worth per note over an arbitrary one that scores
# the same, before Rule 34's own prior_weight scales it down for the less
# ordinary rudiments. A prior, so it only decides near ties -- a rudiment
# that is physically worse still loses.
GRAMMAR_PRIOR_PER_NOTE = 0.08


def _group_simultaneous(events: List[DrumEvent]) -> List[List[DrumEvent]]:
    """Rule 11: group events that are close enough in time to be physically
    simultaneous, so they can be solved jointly rather than independently.

    Hands AND feet: a kick on the same beat as a hi-hat note is part of
    the same instant of coordination even though no hand can play it."""
    groups: List[List[DrumEvent]] = []
    for ev in events:
        if groups and abs(ev.time_seconds - groups[-1][0].time_seconds) < SIMULTANEITY_EPSILON_S:
            groups[-1].append(ev)
        else:
            groups.append([ev])
    return groups


def _role_for(roles: Optional[Dict[str, EventRoleContext]], event: DrumEvent) -> EventRoleContext:
    if roles is None:
        return EventRoleContext(event_id=event.event_id)
    return roles.get(event.event_id, EventRoleContext(event_id=event.event_id))


def _motif_key(group: List[DrumEvent], roles: Optional[Dict[str, EventRoleContext]]) -> str:
    """RULE 33: a normalized fingerprint of what this instant ASKS FOR.

    Instruments plus whether each one is keeping time -- not the hands,
    which are the answer, and not the clock time, which never repeats.
    Two instants with the same key are the same drumming problem, so the
    sticking that solved one is a prior for the other.
    """
    parts = []
    for ev in sorted(group, key=lambda e: e.instrument.value):
        role = _role_for(roles, ev)
        parts.append(f"{ev.instrument.value}{'*' if role.in_ostinato else ''}")
    return "+".join(parts)


def _motif_value(group: List[DrumEvent], assignment: List[Tuple[DrumEvent, Limb, float]]) -> str:
    """The limb answer for a motif key, in the key's own instrument order
    so the two are comparable."""
    limb_of = {ev.event_id: limb for ev, limb, _ in assignment}
    ordered = sorted(group, key=lambda e: e.instrument.value)
    return " ".join(limb_of[ev.event_id].value for ev in ordered if ev.event_id in limb_of)


def _apply_decision(state: DrummerState, event: DrumEvent, limb: Limb,
                     role: Optional[EventRoleContext] = None) -> None:
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

    # Rule 8/30: the first note of a stream decides whose stream it is,
    # and every later note reads that back rather than re-deciding. This
    # is the state that makes a hand STAY on the hi-hat.
    if role is not None and role.in_ostinato and limb in MANUAL_LIMBS:
        state.ostinato_lead_hand.setdefault(role.ostinato_id, limb)


def _available_time(state: DrummerState, limb: Limb, event_time: float) -> float:
    last_t = state.limbs[limb].last_action_time_s
    if last_t < -900:
        return 999.0  # nothing played yet on this limb: unconstrained start
    return max(0.0, event_time - last_t)


def _solve_group_candidates(group: List[DrumEvent], state: DrummerState,
                             roles: Optional[Dict[str, EventRoleContext]] = None
                             ) -> List[Tuple[List[Tuple[DrumEvent, Limb, float]], float]]:
    """Rule 11: for a simultaneous group, return joint (assignment, score)
    options across ALL FOUR limbs, ensuring no limb is asked to play two
    targets at once.

    Feet are not scored against hands: a kick target declares its own
    preferred limb (Rule 2 kit geometry) and no hand can reach it, so the
    feet contribute a fixed part of every option rather than multiplying
    the search. What matters for Rule 11 is that they are in the SAME
    option, so the hand choice is made with the whole instant in view.
    """
    foot_events = [ev for ev in group if ev.target.is_foot_target]
    manual = [ev for ev in group if not ev.target.is_foot_target]

    foot_part: List[Tuple[DrumEvent, Limb, float]] = []
    for ev in foot_events:
        limb = ev.target.preferred_limb
        avail = _available_time(state, limb, ev.time_seconds)
        reach = check_reachability(limb, state.limbs[limb], ev.target, avail, ev.event_id)
        foot_part.append((ev, limb, 0.0 if reach.reachable else -5.0))
    foot_score = sum(s for _, _, s in foot_part)

    def finish(options: List[Tuple[List[Tuple[DrumEvent, Limb, float]], float]]):
        if not foot_part:
            return options
        return [(assignment + foot_part, score + foot_score) for assignment, score in options]

    if not manual:
        return finish([([], 0.0)])

    if len(manual) == 1:
        ev = manual[0]
        role = _role_for(roles, ev)
        avail = {l: _available_time(state, l, ev.time_seconds) for l in MANUAL_LIMBS}
        cands = generate_hand_candidates(ev, state, avail, role)
        options = []
        for c in cands:
            if c.reachable:
                options.append(([(ev, c.limb, c.score)], c.score))
        if not options:
            # No reachable hand at all: best-effort fallback so the pipeline
            # never crashes; Rule 25 validation will flag this as an error.
            best = max(cands, key=lambda c: c.score)
            options = [([(ev, best.limb, best.score)], best.score)]
        return finish(options)

    if len(manual) == 2:
        options = []
        for perm in permutations(MANUAL_LIMBS, 2):
            assignment = []
            total = 0.0
            ok = True
            for ev, limb in zip(manual, perm):
                role = _role_for(roles, ev)
                avail = _available_time(state, limb, ev.time_seconds)
                cands = generate_hand_candidates(ev, state, {limb: avail}, role)
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
            assignment = [(manual[0], Limb.RIGHT_HAND, -5.0), (manual[1], Limb.LEFT_HAND, -5.0)]
            options = [(assignment, -10.0)]
        return finish(options)

    # More than 2 truly-simultaneous manual events: physically impossible for
    # a 2-handed drummer. Best-effort: alternate hands across the group and
    # let Rule 25 raise validation errors for the unplayable excess.
    assignment = []
    total = 0.0
    for i, ev in enumerate(manual):
        limb = MANUAL_LIMBS[i % 2]
        assignment.append((ev, limb, -2.0))
        total -= 2.0
    return finish([(assignment, total)])


def _is_free_single(group: List[DrumEvent],
                     roles: Optional[Dict[str, EventRoleContext]]) -> bool:
    """One hand-note, with no time-keeping stream running under it.

    That is what a fill is made of, and it is where a drummer's rudiment
    vocabulary applies. Inside a groove the hands are already spoken for,
    so a rudiment would be proposing something the music has no room for.
    """
    manual = [ev for ev in group if not ev.target.is_foot_target]
    if len(manual) != 1:
        return False
    return not _role_for(roles, manual[0]).ostinato_active


def _fill_run_length(groups: List[List[DrumEvent]], start: int,
                      roles: Optional[Dict[str, EventRoleContext]]) -> int:
    """How many consecutive groups from `start` form one free run."""
    n = 0
    while start + n < len(groups) and _is_free_single(groups[start + n], roles):
        n += 1
    return n


def _score_limb_for(event: DrumEvent, limb: Limb, state: DrummerState,
                     roles: Optional[Dict[str, EventRoleContext]]
                     ) -> Optional[float]:
    """This limb's Rule 7 score for this event, or None if Rule 6 says it
    cannot be done. None is a hard rejection, never a bad score."""
    avail = _available_time(state, limb, event.time_seconds)
    cands = generate_hand_candidates(event, state, {limb: avail}, _role_for(roles, event))
    cand = next((c for c in cands if c.limb == limb), None)
    if cand is None or not cand.reachable:
        return None
    return cand.score


def _assign_feet_in(group: List[DrumEvent], state: DrummerState
                     ) -> List[Tuple[DrumEvent, Limb, float]]:
    out: List[Tuple[DrumEvent, Limb, float]] = []
    for ev in group:
        if not ev.target.is_foot_target:
            continue
        limb = ev.target.preferred_limb
        avail = _available_time(state, limb, ev.time_seconds)
        reach = check_reachability(limb, state.limbs[limb], ev.target, avail, ev.event_id)
        out.append((ev, limb, 0.0 if reach.reachable else -5.0))
    return out


def _grammar_options(run: List[List[DrumEvent]], state: DrummerState,
                      roles: Optional[Dict[str, EventRoleContext]]
                      ) -> List[Tuple[List[Tuple[DrumEvent, Limb, float]], float]]:
    """RULE 34, finally connected: the technique library proposes whole
    hand-patterns for a fill, and the solver picks among them.

    "Generate != Select". This function only generates -- every option it
    returns, rudiment or not, is scored by the same Rule 7/8 machinery as
    everything else, and a rudiment that does not fit loses. A template
    any of whose notes Rule 6 rejects is dropped outright rather than
    scored badly, because Rule 34 may not force a physically invalid
    pattern.

    The last option is always the free one -- the per-note best, owing
    nothing to the library -- so the vocabulary can never trap the solver
    into a shape when plain singles are simply better.
    """
    manual = [ev for group in run for ev in group if not ev.target.is_foot_target]
    event_ids = [ev.event_id for ev in manual]
    options: List[Tuple[List[Tuple[DrumEvent, Limb, float]], float]] = []

    def walk(limb_for) -> Optional[Tuple[List[Tuple[DrumEvent, Limb, float]], float]]:
        """Replay one hypothesis on a speculative state (Rule 39) so each
        note is scored in the state its predecessors actually left."""
        st = state.snapshot()
        assignment: List[Tuple[DrumEvent, Limb, float]] = []
        total = 0.0
        index = 0
        for group in run:
            for ev, limb, sc in _assign_feet_in(group, st):
                assignment.append((ev, limb, sc))
                total += sc
                _apply_decision(st, ev, limb, _role_for(roles, ev))
            for ev in group:
                if ev.target.is_foot_target:
                    continue
                limb = limb_for(index, ev, st)
                if limb is None:
                    return None
                score = _score_limb_for(ev, limb, st, roles)
                if score is None:
                    return None
                assignment.append((ev, limb, score))
                total += score
                _apply_decision(st, ev, limb, _role_for(roles, ev))
                index += 1
        return assignment, total

    for pattern in generate_pattern_candidates(event_ids):
        walked = walk(lambda i, ev, st, seq=pattern.limb_sequence: seq[i])
        if walked is None:
            continue            # Rule 6 said no; the library does not argue
        assignment, total = walked
        options.append((
            assignment,
            total + GRAMMAR_PRIOR_PER_NOTE * len(event_ids) * pattern.prior_weight,
        ))

    def best_free(i, ev, st):
        avail = {l: _available_time(st, l, ev.time_seconds) for l in MANUAL_LIMBS}
        cands = [c for c in generate_hand_candidates(ev, st, avail, _role_for(roles, ev))
                 if c.reachable]
        if not cands:
            return None
        return max(cands, key=lambda c: (c.score, c.limb.value)).limb

    free = walk(best_free)
    if free is not None:
        options.append(free)
    return options


def sequence_score(decisions: List[SequenceDecision], events_by_id: Dict[str, DrumEvent],
                    roles: Optional[Dict[str, EventRoleContext]],
                    base_state: DrummerState) -> float:
    """RULE 8: score the hypothesis AS A SEQUENCE.

    Everything here is invisible to per-note scoring by construction --
    each term needs two or more decisions to have a value at all. That is
    what "sequence quality outranks isolated note quality" has to mean in
    code; a sum of per-note scores is still per-note reasoning.
    """
    if not decisions:
        return 0.0

    ordered = sorted(decisions, key=lambda d: (events_by_id[d.event_id].time_seconds, d.event_id))
    score = 0.0

    # --- continuity: one hand per time-keeping stream -----------------
    last_limb_on_stream: Dict[str, Limb] = dict(base_state.ostinato_lead_hand)
    for d in ordered:
        role = _role_for(roles, events_by_id[d.event_id])
        if not role.in_ostinato or d.limb not in MANUAL_LIMBS:
            continue
        if is_two_handed_stream(role, base_state.style):
            # A stream both hands are sharing is SUPPOSED to change hands.
            # Charging it the continuity penalty would forbid the only way
            # it can physically be played.
            continue
        previous = last_limb_on_stream.get(role.ostinato_id)
        if previous is not None and previous != d.limb:
            score -= STREAM_SWITCH_PENALTY
        last_limb_on_stream[role.ostinato_id] = d.limb

    # --- future preparation: do not rush one limb between targets -----
    # Invisible per note by construction: the cost of giving this note to
    # a limb is entirely about where that limb was and when.
    last_on_limb: Dict[Limb, Tuple[float, float, float, float]] = {}
    for limb, ls in base_state.limbs.items():
        if ls.last_action_time_s > -900:
            last_on_limb[limb] = (ls.last_action_time_s, ls.position[0], ls.position[1], 0.0)
    for d in ordered:
        ev = events_by_id[d.event_id]
        previous = last_on_limb.get(d.limb)
        if previous is not None:
            prev_t, prev_x, prev_y, _ = previous
            gap = ev.time_seconds - prev_t
            if gap > 0:
                distance = math.hypot(ev.target.x - prev_x, ev.target.y - prev_y)
                speed = FOOT_MAX_SPEED_MPS if ev.target.is_foot_target else HAND_MAX_SPEED_MPS
                strain = (distance / speed) / gap if speed > 0 else 0.0
                if strain > COMFORTABLE_TRAVEL_FRACTION:
                    score -= PREPARATION_PENALTY * (strain - COMFORTABLE_TRAVEL_FRACTION)
        last_on_limb[d.limb] = (ev.time_seconds, ev.target.x, ev.target.y, 0.0)

    # --- stability: the backbeat is the same hand every time ----------
    # Only under a running stream. Through a fill the hi-hat has stopped,
    # the hands are free, and insisting one voice keeps one hand there
    # would forbid ordinary rudiments.
    hand_by_voice: Dict[str, Limb] = {}
    for d in ordered:
        ev = events_by_id[d.event_id]
        role = _role_for(roles, ev)
        if role.in_ostinato or not role.ostinato_active or d.limb not in MANUAL_LIMBS:
            continue
        previous = hand_by_voice.get(ev.instrument.value)
        if previous is not None and previous != d.limb:
            score -= VOICE_INCONSISTENCY_PENALTY
        hand_by_voice[ev.instrument.value] = d.limb

    return score


def solve_window(groups: List[List[DrumEvent]], base_state: DrummerState,
                  beam_width: int = DEFAULT_BEAM_WIDTH,
                  roles: Optional[Dict[str, EventRoleContext]] = None
                  ) -> Tuple[List[SequenceDecision], DrummerState]:
    """RULE 29 core: beam search across one lookahead window of simultaneity
    groups. RULE 39 discipline: all work here happens on *cloned* speculative
    states (`state.snapshot()`); the caller commits only the winning branch.
    """
    events_by_id: Dict[str, DrumEvent] = {
        ev.event_id: ev for group in groups for ev in group
    }

    beam: List[Tuple[DrummerState, List[SequenceDecision], float]] = [
        (base_state.snapshot(), [], 0.0)
    ]

    index = 0
    while index < len(groups):
        # A run of free single notes is a FILL, and a fill has a shape.
        # Hand it to Rule 34 whole rather than deciding it note by note.
        run_length = _fill_run_length(groups, index, roles)
        use_grammar = run_length >= MIN_GRAMMAR_RUN
        if use_grammar:
            segment = groups[index:index + run_length]
            motif_key = "run:" + "|".join(_motif_key(g, roles) for g in segment)
            segment_events = [ev for g in segment for ev in g]
            index += run_length
        else:
            segment = [groups[index]]
            motif_key = _motif_key(groups[index], roles)
            segment_events = list(groups[index])
            index += 1

        new_beam: List[Tuple[DrummerState, List[SequenceDecision], float]] = []
        for state, decisions, score in beam:
            options = (
                _grammar_options(segment, state, roles) if use_grammar
                else _solve_group_candidates(segment[0], state, roles)
            )
            if not options:
                options = _solve_group_candidates(segment[0], state, roles)
            for assignment, group_score in options:
                st2 = state.snapshot()
                new_decisions = list(decisions)
                for ev, limb, note_score in assignment:
                    _apply_decision(st2, ev, limb, _role_for(roles, ev))
                    new_decisions.append(SequenceDecision(
                        event_id=ev.event_id, limb=limb,
                        sequence_cost=-note_score,
                        alternatives_considered=len(options),
                        lookahead_window=len(groups),
                    ))
                # RULE 33: does this answer match what the drummer already
                # played for the same shape? A prior, never a requirement --
                # the bonus can always be outweighed, which is how Rule 33's
                # "keep novelty as a valid alternative" stays true.
                motif_bonus = 0.0
                remembered = st2.motif_stickings.get(motif_key)
                value = _motif_value(segment_events, assignment)
                if remembered is not None and " ".join(l.value for l in remembered) == value:
                    motif_bonus = MOTIF_REUSE_BONUS
                st2.motif_stickings.setdefault(
                    motif_key, [limb for _, limb, _ in assignment]
                )
                new_beam.append((st2, new_decisions, score + group_score + motif_bonus))
        # RULE 8: rank whole hypotheses, not the running per-note total.
        new_beam.sort(key=lambda x: -(
            x[2] + sequence_score(x[1], events_by_id, roles, base_state)
        ))
        beam = new_beam[:beam_width]

    best_state, best_decisions, _ = beam[0]
    return best_decisions, best_state


def solve_sticking(events: List[DrumEvent], state: DrummerState,
                    window_size: int = DEFAULT_WINDOW,
                    beam_width: int = DEFAULT_BEAM_WIDTH,
                    roles: Optional[Dict[str, EventRoleContext]] = None
                    ) -> List[SequenceDecision]:
    """RULE 29 orchestration entry point: roll a lookahead window across the
    whole event stream, solving and COMMITTING (Rule 39) one window at a
    time so state always reflects only validated, real decisions.

    Takes ALL events, hands and feet together (Rule 11).
    """
    if not events:
        return []

    ordered = sorted(events, key=lambda e: (e.time_seconds, e.event_id))
    groups = _group_simultaneous(ordered)
    all_decisions: List[SequenceDecision] = []

    i = 0
    while i < len(groups):
        window = groups[i:i + window_size]
        decisions, resolved_state = solve_window(window, state, beam_width, roles)
        # --- COMMIT POINT (Rule 39): only now does authoritative state change ---
        for limb in Limb:
            state.limbs[limb] = resolved_state.limbs[limb]
        state.memory = resolved_state.memory
        state.ostinato_lead_hand = resolved_state.ostinato_lead_hand
        state.motif_stickings = resolved_state.motif_stickings
        all_decisions.extend(decisions)
        i += window_size

    return all_decisions


def assign_feet(foot_events: List[DrumEvent], state: DrummerState) -> List[SequenceDecision]:
    """RULE 11 (feet alone).

    Kept as a public entry point for callers that genuinely have only
    foot events to place. The engine does NOT use it -- solving the feet
    apart from the hands is exactly what Rule 11's Core Principle
    forbids, so `solve_sticking` takes all four limbs at once.
    """
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
