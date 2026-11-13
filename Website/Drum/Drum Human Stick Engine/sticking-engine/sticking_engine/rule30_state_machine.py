"""
rule30_state_machine.py — RULE 30: PERFORMANCE STATE MACHINE & CONTINUOUS
DRUMMER STATE

Purpose: Represent the drummer as a continuous physical, musical, energetic
and cognitive state.

Core Principle: "A drummer is not a list of isolated hits; every action
changes the state from which the next action emerges."

State Transition: `State(t) + PerformanceEvent(t) + Context(t) -> State(t+1)`;
simultaneous event groups are committed atomically.
"""

from __future__ import annotations
from typing import List
from .datamodel import DrummerState, StateTransition


class DrummerStateMachine:
    """Thin, explicit wrapper around DrummerState that gives the rest of the
    engine an atomic, rollback-capable transition API (Rule 39's commit
    discipline depends on this existing at the state layer, not just in the
    solver)."""

    def __init__(self, initial_state: DrummerState):
        self.state = initial_state
        self._history: List[DrummerState] = []

    def checkpoint(self) -> None:
        """Push a rollback point. Cheap because DrummerState is a plain,
        deep-copyable dataclass tree (Rule 27/38 contract: no hidden global
        state, nothing un-serializable hanging off it)."""
        self._history.append(self.state.snapshot())

    def rollback(self) -> None:
        if not self._history:
            raise RuntimeError("no checkpoint to roll back to")
        self.state = self._history.pop()

    def commit(self, new_state: DrummerState, event_ids: List[str], rule_id: str = "rule30"
               ) -> StateTransition:
        """RULE 30 entry point. The ONLY sanctioned way authoritative state
        changes outside of `checkpoint`/`rollback`. `new_state` must already
        be a fully-resolved, validated speculative state (typically the
        output of Rule 29's solve_window)."""
        transition = StateTransition(
            from_time_s=self.state.time_seconds,
            to_time_s=new_state.time_seconds,
            event_ids=list(event_ids),
            rule_id=rule_id,
        )
        self.state = new_state
        return transition
