"""
rule26_runtime.py — RULE 26: PERFORMANCE RUNTIME, PLAYBACK STATE &
DETERMINISTIC REPRODUCTION

Purpose: Execute approved performance data with a single authoritative clock
and reproducible state.

Core Principle: "Runtime faithfully executes solved performance; no hidden
re-sticking or random decision-making."

Implementation Contract: inputs/intermediate state/outputs explicit; no
hidden global state, implicit random choices, or silent downstream
re-decisions. Determinism: reproducible from explicit seeds/versions.
"""

from __future__ import annotations
from typing import List, Optional
from .datamodel import FinalValidatedPerformance, PerformanceEvent


class PerformanceRuntime:
    """RULE 26 primary object. Purely a *reader/player* of an already-solved
    FinalValidatedPerformance — it never calls back into Rules 1-25/29-40 to
    re-decide anything, satisfying the 'no hidden re-sticking' principle."""

    def __init__(self, performance: FinalValidatedPerformance):
        if not performance.validation.approved:
            raise ValueError("cannot construct a runtime from an unapproved performance (Rule 25 gate)")
        self.performance = performance
        self.playhead_s: float = 0.0
        self.playing: bool = False
        self._events_sorted: List[PerformanceEvent] = sorted(
            performance.events, key=lambda e: e.time_seconds
        )

    def play(self) -> None:
        self.playing = True

    def pause(self) -> None:
        self.playing = False

    def seek(self, time_s: float) -> None:
        self.playhead_s = max(0.0, min(self.performance.duration_s, time_s))

    def events_between(self, t0: float, t1: float) -> List[PerformanceEvent]:
        """Deterministic query used by a real-time host to pull exactly the
        events due in a frame window — same seed/version always returns the
        same slice."""
        return [e for e in self._events_sorted if t0 <= e.time_seconds < t1]

    def advance(self, dt_s: float) -> List[PerformanceEvent]:
        if not self.playing:
            return []
        t0 = self.playhead_s
        t1 = min(self.performance.duration_s, self.playhead_s + dt_s)
        due = self.events_between(t0, t1)
        self.playhead_s = t1
        return due

    def export_summary(self) -> dict:
        return {
            "engine_version": self.performance.engine_version,
            "seed": self.performance.seed,
            "duration_s": self.performance.duration_s,
            "event_count": len(self.performance.events),
            "validation_issues": len(self.performance.validation.issues),
        }
