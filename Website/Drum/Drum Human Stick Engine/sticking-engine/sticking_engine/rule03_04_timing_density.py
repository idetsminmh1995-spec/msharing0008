"""
rule03_04_timing_density.py

RULE 3 — MUSICAL TIME, BEAT & SUBDIVISION ANALYSIS
Purpose: Establish the musical clock and structural time context used by
every downstream rule. Principle: "Musical time and physical time remain
distinct but explicitly linked."

RULE 4 — DENSITY, SPACING & TEMPORAL PRESSURE
Purpose: Measure local event density and the physical pressure created by
short inter-event gaps. Principle: "Density is contextual; note count alone
never defines difficulty."

Grouped in one file because both are pure, stateless analytics over the same
DrumEvent[] + tempo/time-signature context, and both only ever *read* Rule 1/2
output — never mutate it.
"""

from __future__ import annotations
from typing import List
from bisect import bisect_right

from .datamodel import (
    DrumEvent, TimingContext, DensityContext, TempoPoint, TimeSignaturePoint
)

SUBDIVISION_GRID = 16  # 16th-note resolution; adjustable per song if needed


def _bpm_at(t: float, tempo_map: List[TempoPoint]) -> float:
    idx = bisect_right([tp.time_seconds for tp in tempo_map], t) - 1
    idx = max(0, idx)
    return tempo_map[idx].bpm


def _time_signature_at(t: float, ts_map: List[TimeSignaturePoint]):
    idx = bisect_right([ts.time_seconds for ts in ts_map], t) - 1
    idx = max(0, idx)
    return ts_map[idx]


def analyze_timing(events: List[DrumEvent], tempo_map: List[TempoPoint],
                    ts_map: List[TimeSignaturePoint]) -> List[TimingContext]:
    """RULE 3 entry point."""
    out: List[TimingContext] = []
    # Track cumulative musical position using the (possibly changing) tempo.
    # For simplicity/determinism we integrate beats from t=0 using the tempo
    # map's piecewise-constant bpm segments (matches Rule 1's own conversion).
    for ev in events:
        bpm = _bpm_at(ev.time_seconds, tempo_map)
        ts = _time_signature_at(ev.time_seconds, ts_map)
        seconds_per_beat = 60.0 / bpm

        # Integrate beats-since-last-tempo-change-point for accuracy.
        beats_elapsed = 0.0
        last_t, last_bpm = 0.0, tempo_map[0].bpm
        for tp in tempo_map:
            if tp.time_seconds >= ev.time_seconds:
                break
            beats_elapsed += (tp.time_seconds - last_t) / (60.0 / last_bpm)
            last_t, last_bpm = tp.time_seconds, tp.bpm
        beats_elapsed += (ev.time_seconds - last_t) / (60.0 / last_bpm)

        beats_per_measure = ts.numerator * (4.0 / ts.denominator)
        measure = int(beats_elapsed // beats_per_measure)
        beat_in_measure = beats_elapsed % beats_per_measure
        beat = int(beat_in_measure)
        frac = beat_in_measure - beat
        subdivision_index = round(frac * SUBDIVISION_GRID)

        # Beat strength: downbeat=1.0, other beats scale down, off-grid weakest.
        if beat == 0 and subdivision_index == 0:
            strength = 1.0
        elif subdivision_index == 0:
            strength = 0.7
        elif subdivision_index % (SUBDIVISION_GRID // 4) == 0:
            strength = 0.4
        else:
            strength = 0.15

        is_syncopated = strength <= 0.4 and subdivision_index != 0

        out.append(TimingContext(
            event_id=ev.event_id,
            measure=measure,
            beat=beat,
            subdivision_index=subdivision_index,
            subdivision_grid=SUBDIVISION_GRID,
            beat_strength=strength,
            is_syncopated=is_syncopated,
            seconds_per_beat=seconds_per_beat,
        ))
    return out


def analyze_density(events: List[DrumEvent], window_s: float = 0.5,
                     burst_gap_s: float = 0.09) -> List[DensityContext]:
    """RULE 4 entry point."""
    times = [ev.time_seconds for ev in events]
    out: List[DensityContext] = []
    n = len(events)
    for i, ev in enumerate(events):
        t = ev.time_seconds
        lo = bisect_right(times, t - window_s / 2)
        hi = bisect_right(times, t + window_s / 2)
        local_count = hi - lo
        local_rate = local_count / window_s if window_s > 0 else 0.0

        gap_before = t - times[i - 1] if i > 0 else float("inf")
        gap_after = times[i + 1] - t if i < n - 1 else float("inf")

        simultaneous = sum(1 for e2 in events if abs(e2.time_seconds - t) < 1e-4)

        in_burst = gap_before < burst_gap_s or gap_after < burst_gap_s

        # Tempo-adjusted physical pressure: ratio of demanded rate to a
        # nominal comfortable single-limb rate (~8 Hz), clipped for sanity.
        comfortable_hz = 8.0
        pressure = min(4.0, local_rate / comfortable_hz)

        out.append(DensityContext(
            event_id=ev.event_id,
            local_events_per_second=local_rate,
            gap_before_seconds=0.0 if gap_before == float("inf") else gap_before,
            gap_after_seconds=0.0 if gap_after == float("inf") else gap_after,
            simultaneous_count=simultaneous,
            in_burst=in_burst,
            tempo_adjusted_pressure=pressure,
        ))
    return out
