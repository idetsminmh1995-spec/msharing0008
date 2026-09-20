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
from .datamodel import (
    DrumEvent, TimingContext, DensityContext, PatternContext, PatternRole,
    EventRoleContext, Instrument, new_id,
)

MELODIC_TOMS = {Instrument.TOM_HIGH, Instrument.TOM_MID, Instrument.TOM_LOW, Instrument.FLOOR_TOM}
GROOVE_KEEPERS = {Instrument.HIHAT_CLOSED, Instrument.HIHAT_OPEN, Instrument.RIDE, Instrument.RIDE_BELL}

# Which instruments are the SAME physical surface under one hand. A groove
# that opens the hi-hat on the "and" has not changed instrument as far as
# the drummer's right arm is concerned, and neither has a ride pattern that
# hits the bell -- so both belong to one ostinato stream, not two.
OSTINATO_SURFACES = {
    Instrument.HIHAT_CLOSED: "hihat",
    Instrument.HIHAT_OPEN: "hihat",
    Instrument.RIDE: "ride",
    Instrument.RIDE_BELL: "ride",
}

# A stream has to actually be a stream. Three hi-hat notes is a figure;
# four evenly-spaced ones is a drummer keeping time.
MIN_OSTINATO_EVENTS = 4
# How far a gap may drift from the stream's base gap and still be the same
# stream, as a fraction of that gap. Human input and quantized MusicXML both
# land well inside this.
OSTINATO_GAP_TOLERANCE = 0.15
# A stream may skip notes -- a hi-hat that rests for one eighth is still
# the same hi-hat pattern -- but a gap of more than this many base gaps is
# a new stream, not a hole in the old one.
OSTINATO_MAX_GAP_MULTIPLE = 4


def find_ostinato_runs(events: List[DrumEvent]) -> List[List[DrumEvent]]:
    """RULE 5: find the time-keeping streams.

    An ostinato run is a maximal sequence of events on ONE surface
    (see OSTINATO_SURFACES) whose spacing stays on one grid. The base
    gap is the run's smallest gap; every later gap has to be a near-
    integer multiple of it, which lets a pattern skip a note without
    ending the run but stops two unrelated crash hits from being called
    a stream.

    Returns runs in time order. Events not in any run are simply absent,
    which is the honest answer -- most of a fill is not an ostinato.
    """
    by_surface: dict[str, List[DrumEvent]] = {}
    for ev in events:
        surface = OSTINATO_SURFACES.get(ev.instrument)
        if surface is not None:
            by_surface.setdefault(surface, []).append(ev)

    runs: List[List[DrumEvent]] = []
    for surface in sorted(by_surface):            # deterministic order
        stream = sorted(by_surface[surface], key=lambda e: (e.time_seconds, e.event_id))
        current: List[DrumEvent] = []
        base_gap = 0.0
        for ev in stream:
            if not current:
                current = [ev]
                base_gap = 0.0
                continue
            gap = ev.time_seconds - current[-1].time_seconds
            if gap <= 0.0:
                # A flam or a double-stop on the same surface: not a new
                # grid position, so it cannot define or break the run.
                current.append(ev)
                continue
            if base_gap <= 0.0:
                current.append(ev)
                base_gap = gap
                continue
            multiple = gap / base_gap
            nearest = round(multiple)
            fits = (
                1 <= nearest <= OSTINATO_MAX_GAP_MULTIPLE
                and abs(multiple - nearest) <= OSTINATO_GAP_TOLERANCE * nearest
            )
            if fits:
                current.append(ev)
                # A gap shorter than the base means the real grid is finer
                # than the run's first two notes suggested.
                if gap < base_gap:
                    base_gap = gap
            else:
                if len(current) >= MIN_OSTINATO_EVENTS:
                    runs.append(current)
                current = [ev]
                base_gap = 0.0
        if len(current) >= MIN_OSTINATO_EVENTS:
            runs.append(current)

    runs.sort(key=lambda r: (r[0].time_seconds, r[0].event_id))
    return runs


def _base_gap(run: List[DrumEvent]) -> float:
    gaps = [
        run[i].time_seconds - run[i - 1].time_seconds
        for i in range(1, len(run))
        if run[i].time_seconds - run[i - 1].time_seconds > 0.0
    ]
    return min(gaps) if gaps else 0.0


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

    # Ostinato identity, computed across the whole piece rather than per
    # measure: a hi-hat pattern does not restart because a bar line went
    # past, and a hand that is holding it does not let go either.
    ostinato_of: dict[str, tuple[str, int, float]] = {}
    ostinato_spans: List[tuple[float, float, float]] = []
    for run in find_ostinato_runs(events):
        run_id = new_id("ost")
        gap = _base_gap(run)
        rate = (1.0 / gap) if gap > 0 else 0.0
        for index, ev in enumerate(run):
            ostinato_of[ev.event_id] = (run_id, index, rate)
        ostinato_spans.append((run[0].time_seconds, run[-1].time_seconds, gap))

    def ostinato_running_at(t: float) -> bool:
        """Is a stream in progress at this instant? Its own start and end
        count, plus one base gap of grace at each end so the note that
        begins a bar under a hi-hat still sees the hi-hat."""
        for start, end, gap in ostinato_spans:
            if start - gap - 1e-9 <= t <= end + gap + 1e-9:
                return True
        return False

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
            found = ostinato_of.get(ev.event_id)
            if found is not None:
                run_id, index, rate = found
                # The measure is still a groove; THIS note's own role in it
                # is to keep time. Confidence is the measure's, because the
                # classification is no more certain than its context.
                out.append(PatternContext(
                    event_id=ev.event_id, phrase_id=phrase_id,
                    section_id=section_id, role=PatternRole.OSTINATO,
                    role_confidence=conf, ostinato_id=run_id,
                    ostinato_index=index, ostinato_rate_hz=rate,
                    ostinato_active=True,
                ))
            else:
                out.append(PatternContext(
                    event_id=ev.event_id, phrase_id=phrase_id,
                    section_id=section_id, role=role, role_confidence=conf,
                    ostinato_active=ostinato_running_at(ev.time_seconds),
                ))
    return out


def role_contexts(patterns: List[PatternContext]) -> dict[str, EventRoleContext]:
    """RULE 5 -> RULE 7/8 hand-off, keyed by event id.

    An explicit context object rather than a shared mutable structure,
    per every rule file's Implementation Contract ("no hidden global
    state").
    """
    return {
        p.event_id: EventRoleContext(
            event_id=p.event_id,
            role=p.role,
            role_confidence=p.role_confidence,
            ostinato_id=p.ostinato_id,
            ostinato_index=p.ostinato_index,
            ostinato_rate_hz=p.ostinato_rate_hz,
            ostinato_active=p.ostinato_active,
        )
        for p in patterns
    }
