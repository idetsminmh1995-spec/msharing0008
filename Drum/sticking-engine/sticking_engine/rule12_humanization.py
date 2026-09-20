"""
rule12_humanization.py — RULE 12: CONTROLLED HUMAN VARIATION & NON-ROBOTIC
BEHAVIOR

Purpose: Add bounded, context-aware variation without destroying identity or
correctness.

Core Principle: "Variation comes after validity and candidate generation;
randomness never repairs impossible behavior." -> this module runs strictly
AFTER Rule 8/29 has already produced a physically valid committed sequence.
It only nudges microtiming/velocity within the style profile's configured
range, using a deterministic (seeded) RNG so runs are reproducible (Rule 26).
"""

from __future__ import annotations
import hashlib
import random
from dataclasses import dataclass
from typing import List

from .datamodel import DrummerStyleProfile, HumanTimingContext


def _deterministic_rng(seed: int, event_id: str) -> random.Random:
    """Every event gets its own reproducible sub-stream, derived from the
    global seed + event_id, so re-running with the same seed always produces
    identical results (Rule 26 Determinism requirement) regardless of solve
    order or parallelism."""
    h = hashlib.sha256(f"{seed}:{event_id}".encode()).hexdigest()
    return random.Random(int(h[:16], 16))


# Instrument/limb-independent nominal bias: humans tend to play slightly
# ahead of or behind the grid depending on articulation; kept tiny and bounded.
MAX_MICROTIMING_MS = 8.0
MAX_VELOCITY_JITTER = 6


def humanize_timing(event_id: str, scheduled_time_s: float, style: DrummerStyleProfile,
                     seed: int, instrument_bias_ms: float = 0.0) -> HumanTimingContext:
    """RULE 12 entry point for timing. Bounded by style.variation_amount and
    the hard MAX_MICROTIMING_MS ceiling — never large enough to threaten
    Rule 6/13's physical feasibility, only enough to avoid a quantized,
    robotic grid."""
    rng = _deterministic_rng(seed, event_id + ":time")
    bound_ms = MAX_MICROTIMING_MS * style.variation_amount
    offset_ms = rng.uniform(-bound_ms, bound_ms) + instrument_bias_ms
    performed = scheduled_time_s + (offset_ms / 1000.0)
    return HumanTimingContext(
        event_id=event_id,
        scheduled_time_s=scheduled_time_s,
        performed_time_s=performed,
        microtiming_offset_ms=offset_ms,
        instrument_bias_ms=instrument_bias_ms,
    )


def humanize_velocity(event_id: str, base_velocity: int, style: DrummerStyleProfile,
                       seed: int) -> int:
    """RULE 12 entry point for dynamics. Clipped to valid MIDI range."""
    rng = _deterministic_rng(seed, event_id + ":vel")
    bound = MAX_VELOCITY_JITTER * style.variation_amount
    jitter = rng.uniform(-bound, bound)
    return max(1, min(127, round(base_velocity + jitter)))


def pick_among_near_ties(candidates: List[tuple], seed: int, key_event_id: str,
                          epsilon: float = 0.02):
    """Rule 12's 'select among near-optimal valid alternatives' behavior.
    `candidates` is a list of (item, score) already sorted best-first.
    If the top candidates are within epsilon of each other, pick among them
    deterministically instead of always taking the single greedy best — this
    is what keeps repeated identical passages from looking robotically
    identical every single time, while never picking a worse-than-tied option.
    """
    if not candidates:
        return None
    best_score = candidates[0][1]
    tied = [c for c in candidates if best_score - c[1] <= epsilon]
    if len(tied) == 1:
        return tied[0][0]
    rng = _deterministic_rng(seed, key_event_id + ":tie")
    return rng.choice(tied)[0]
