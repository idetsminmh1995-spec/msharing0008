"""
rule25_validation.py — RULE 25: FINAL VALIDATION, QUALITY GATE & REPAIR

Purpose: Determine whether the complete performance is safe, coherent, and
ready for runtime.

Core Principle: "No runtime execution before approval; repair escalates from
local to global only as needed."
"""

from __future__ import annotations
from typing import List, Dict
from .datamodel import (
    PerformanceEvent, ValidationIssue, ValidationResult, ValidationSeverity, Limb
)

MIN_SAME_LIMB_INTERVAL_S = 1.0 / 22.0  # above ~22 Hz a single limb is not humanly possible


def validate_performance(events: List[PerformanceEvent]) -> ValidationResult:
    """RULE 25 entry point. Runs a battery of structural checks over the
    final committed event list and returns issues plus an approve/reject
    verdict. Nothing here silently rewrites decisions — repair (below) is a
    separate, explicit, logged step."""
    issues: List[ValidationIssue] = []
    by_limb: Dict[Limb, List[PerformanceEvent]] = {}
    for ev in sorted(events, key=lambda e: e.time_seconds):
        by_limb.setdefault(ev.limb, []).append(ev)

    # 1) Same-limb superhuman-rate check
    for limb, evs in by_limb.items():
        for a, b in zip(evs, evs[1:]):
            dt = b.time_seconds - a.time_seconds
            if 0 <= dt < MIN_SAME_LIMB_INTERVAL_S:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.ERROR, code="SUPERHUMAN_RATE",
                    message=f"{limb.value} plays two notes {dt*1000:.1f}ms apart "
                            f"(min {MIN_SAME_LIMB_INTERVAL_S*1000:.1f}ms)",
                    event_id=b.event_id, rule_id="rule25",
                ))

    # 2) Duplicate-time-same-limb check (two events assigned to one limb at
    #    the exact same instant -> physically impossible one-limb collision)
    seen_time_limb = {}
    for ev in events:
        key = (ev.limb, round(ev.time_seconds, 4))
        if key in seen_time_limb:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR, code="LIMB_COLLISION",
                message=f"{ev.limb.value} assigned two simultaneous events",
                event_id=ev.event_id, rule_id="rule25",
            ))
        seen_time_limb[key] = ev.event_id

    # 3) Negative/degenerate duration sanity
    for ev in events:
        if ev.velocity <= 0 or ev.velocity > 127:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.WARNING, code="VELOCITY_RANGE",
                message=f"velocity {ev.velocity} out of expected range",
                event_id=ev.event_id, rule_id="rule25",
            ))

    approved = not any(i.severity is ValidationSeverity.ERROR for i in issues)
    return ValidationResult(issues=issues, approved=approved)


def repair_superhuman_rate(events: List[PerformanceEvent]) -> List[PerformanceEvent]:
    """Local repair for the SUPERHUMAN_RATE case: nudge the later event's
    microtiming forward just enough to be physically possible, rather than
    re-running the whole solver (Rule 25: "repair escalates from local to
    global only as needed")."""
    by_limb: Dict[Limb, List[PerformanceEvent]] = {}
    for ev in events:
        by_limb.setdefault(ev.limb, []).append(ev)

    repaired_ids = {}
    for limb, evs in by_limb.items():
        evs.sort(key=lambda e: e.time_seconds)
        for i in range(1, len(evs)):
            dt = evs[i].time_seconds - evs[i - 1].time_seconds
            if 0 <= dt < MIN_SAME_LIMB_INTERVAL_S:
                shift = MIN_SAME_LIMB_INTERVAL_S - dt
                repaired_ids[evs[i].event_id] = evs[i].time_seconds + shift

    if not repaired_ids:
        return events

    out = []
    for ev in events:
        if ev.event_id in repaired_ids:
            ev = PerformanceEvent(
                event_id=ev.event_id, source_id=ev.source_id,
                time_seconds=repaired_ids[ev.event_id], limb=ev.limb,
                instrument=ev.instrument, stroke_type=ev.stroke_type,
                velocity=ev.velocity, microtiming_offset_ms=ev.microtiming_offset_ms,
                dynamic_level=ev.dynamic_level,
                rule_trace=ev.rule_trace + ["rule25:repair_superhuman_rate"],
            )
        out.append(ev)
    return out


def validate_and_repair(events: List[PerformanceEvent], max_passes: int = 3
                         ) -> ValidationResult:
    """RULE 25 orchestration: validate, repair locally, re-validate, up to a
    bounded number of passes so repair can never loop forever."""
    current = events
    for _ in range(max_passes):
        result = validate_performance(current)
        if result.approved:
            return result
        if any(i.code == "SUPERHUMAN_RATE" for i in result.issues):
            current = repair_superhuman_rate(current)
            continue
        return result  # non-repairable issue types: surface as-is
    return validate_performance(current)
