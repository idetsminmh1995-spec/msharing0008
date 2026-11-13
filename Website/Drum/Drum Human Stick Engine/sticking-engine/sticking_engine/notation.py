"""
notation.py — convenience export helpers (not a numbered rule).

Turns a FinalValidatedPerformance into human-readable sticking notation
(R/L per hand event) and a simple JSON-serializable dict, for quick
inspection, debugging, or feeding into another tool.
"""

from __future__ import annotations
import json
from typing import Dict, Any
from .datamodel import FinalValidatedPerformance, Limb


def to_sticking_line(performance: FinalValidatedPerformance, instrument_filter=None) -> str:
    """Return a single-line R/L/RF/LF sticking string in time order."""
    events = sorted(performance.events, key=lambda e: e.time_seconds)
    if instrument_filter:
        events = [e for e in events if e.instrument in instrument_filter]
    return " ".join(e.limb.value for e in events)


def to_dict(performance: FinalValidatedPerformance) -> Dict[str, Any]:
    return {
        "duration_s": performance.duration_s,
        "seed": performance.seed,
        "engine_version": performance.engine_version,
        "approved": performance.validation.approved,
        "validation_issues": [
            {"severity": i.severity.value, "code": i.code, "message": i.message, "event_id": i.event_id}
            for i in performance.validation.issues
        ],
        "events": [
            {
                "event_id": e.event_id,
                "time_seconds": round(e.time_seconds, 4),
                "limb": e.limb.value,
                "instrument": e.instrument.value,
                "stroke_type": e.stroke_type.value,
                "velocity": e.velocity,
                "microtiming_offset_ms": round(e.microtiming_offset_ms, 2),
                "dynamic_level": round(e.dynamic_level, 3),
            }
            for e in sorted(performance.events, key=lambda ev: ev.time_seconds)
        ],
    }


def to_json(performance: FinalValidatedPerformance, path: str) -> None:
    with open(path, "w") as f:
        json.dump(to_dict(performance), f, indent=2)


def print_table(performance: FinalValidatedPerformance, limit: int = 40) -> None:
    events = sorted(performance.events, key=lambda e: e.time_seconds)
    print(f"{'time':>8} {'limb':>4} {'instrument':<16} {'stroke':<10} {'vel':>4}")
    for e in events[:limit]:
        print(f"{e.time_seconds:8.3f} {e.limb.value:>4} {e.instrument.value:<16} "
              f"{e.stroke_type.value:<10} {e.velocity:4d}")
    if len(events) > limit:
        print(f"... ({len(events) - limit} more events)")
