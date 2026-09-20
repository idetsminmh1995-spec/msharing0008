"""
rule05_pattern.py — RULE 5: PATTERN, GROOVE, FILL & PHRASE CLASSIFICATION

Purpose: Identify the musical role and structural context of each event group.
Principle: "Classification is probabilistic and contextual; labels guide
later decisions but do not force them." -> role_confidence is always < 1.0
except for the most obvious cases, and nothing downstream is allowed to treat
a PatternContext as a hard constraint (only later rules use it as a *bias*).
"""

from __future__ import annotations
from typing import List
from .datamodel import DrumEvent, TimingContext, DensityContext, PatternContext, PatternRole, Instrument, new_id

MELODIC_TOMS = {Instrument.TOM_HIGH, Instrument.TOM_MID, Instrument.TOM_LOW, Instrument.FLOOR_TOM}
GROOVE_KEEPERS = {Instrument.HIHAT_CLOSED, Instrument.HIHAT_OPEN, Instrument.RIDE, Instrument.RIDE_BELL}


def classify_patterns(events: List[DrumEvent], timing: List[TimingContext],
                       density: List[DensityContext],
                       measure_group_size: int = 1) -> List[PatternContext]:
    """RULE 5 entry point.

    Segments by measure, then scores each measure's dominant behavior:
      - groove: driven mostly by a repeating hihat/ride pulse + kick/snare
      - fill: dominated by toms and/or high density with few groove-keeper hits
      - break: a measure with very few events relative to neighbors
      - ostinato: same instrument repeating at near-uniform spacing
    """
    by_id = {e.event_id: e for e in events}
    tim_by_id = {t.event_id: t for t in timing}

    # group by measure
    measures: dict[int, List[DrumEvent]] = {}
    for ev in events:
        m = tim_by_id[ev.event_id].measure // measure_group_size
        measures.setdefault(m, []).append(ev)

    measure_counts = {m: len(evs) for m, evs in measures.items()}
    avg_count = (sum(measure_counts.values()) / len(measure_counts)) if measure_counts else 0

    out: List[PatternContext] = []
    section_id = new_id("section")  # single section for simple/demo inputs;
    # a full song-structure detector could split this further using Rule 5's
    # own density/silence heuristics without changing this contract.

    for m, evs in measures.items():
        phrase_id = new_id("phrase")
        tom_hits = sum(1 for e in evs if e.instrument in MELODIC_TOMS)
        groove_hits = sum(1 for e in evs if e.instrument in GROOVE_KEEPERS)
        count = len(evs)

        if count == 0:
            role, conf = PatternRole.BREAK, 0.9
        elif avg_count > 0 and count < 0.35 * avg_count:
            role, conf = PatternRole.BREAK, 0.6
        elif tom_hits >= max(2, int(0.4 * count)) and groove_hits < 0.2 * count:
            role, conf = PatternRole.FILL, 0.65
        elif groove_hits >= 0.4 * count:
            role, conf = PatternRole.GROOVE, 0.7
        else:
            role, conf = PatternRole.UNKNOWN, 0.4

        for ev in evs:
            out.append(PatternContext(
                event_id=ev.event_id,
                phrase_id=phrase_id,
                section_id=section_id,
                role=role,
                role_confidence=conf,
            ))
    return out
