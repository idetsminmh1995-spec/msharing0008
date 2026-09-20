"""
rule02_mapping.py — RULE 2: INSTRUMENT, SURFACE & TARGET MAPPING

Purpose: Map MIDI events to canonical drum instruments, playable surfaces,
and physical targets.

Core Principle: "Mapping is deterministic and configurable; mapping does not
choose the hand or final stroke." -> This module NEVER decides Hand/Limb.
It only resolves *what* was hit and *where* it physically is.
"""

from __future__ import annotations
from typing import Dict, List
from dataclasses import dataclass, field

from .datamodel import (
    Instrument, Target, Limb, DrumEvent, SourceMidiEvent, new_id
)

# General MIDI Percussion Key Map (channel 10 / index 9) -> Instrument
GM_DRUM_MAP: Dict[int, Instrument] = {
    35: Instrument.KICK,
    36: Instrument.KICK,
    37: Instrument.SNARE_CROSS_STICK,
    38: Instrument.SNARE,
    39: Instrument.SNARE_CROSS_STICK,   # hand clap approximated as cross-stick surface
    40: Instrument.SNARE_RIM,
    41: Instrument.FLOOR_TOM,
    42: Instrument.HIHAT_CLOSED,
    43: Instrument.FLOOR_TOM,
    44: Instrument.HIHAT_PEDAL,
    45: Instrument.TOM_LOW,
    46: Instrument.HIHAT_OPEN,
    47: Instrument.TOM_LOW,
    48: Instrument.TOM_MID,
    49: Instrument.CRASH_1,
    50: Instrument.TOM_HIGH,
    51: Instrument.RIDE,
    52: Instrument.CRASH_2,
    53: Instrument.RIDE_BELL,
    55: Instrument.CRASH_1,
    57: Instrument.CRASH_2,
    59: Instrument.RIDE,
}


@dataclass
class DrumMappingProfile:
    """Configurable kit geometry: canonical drummer-frame top-down layout in
    meters. x: + = right of drummer, y: distance forward. Values approximate
    a standard 5-piece kit and are intentionally easy to override per-song.
    """
    note_map: Dict[int, Instrument] = field(default_factory=lambda: dict(GM_DRUM_MAP))
    targets: Dict[Instrument, Target] = field(default_factory=lambda: {
        Instrument.KICK:               Target(Instrument.KICK, 0.0, 0.35, is_foot_target=True, preferred_limb=Limb.RIGHT_FOOT, radius=0.20),
        Instrument.HIHAT_PEDAL:        Target(Instrument.HIHAT_PEDAL, -0.55, 0.30, is_foot_target=True, preferred_limb=Limb.LEFT_FOOT, radius=0.15),
        Instrument.SNARE:              Target(Instrument.SNARE, -0.05, 0.30, radius=0.17),
        Instrument.SNARE_RIM:          Target(Instrument.SNARE_RIM, -0.05, 0.30, radius=0.17),
        Instrument.SNARE_CROSS_STICK:  Target(Instrument.SNARE_CROSS_STICK, -0.05, 0.30, radius=0.17),
        Instrument.HIHAT_CLOSED:       Target(Instrument.HIHAT_CLOSED, -0.45, 0.32, radius=0.18),
        Instrument.HIHAT_OPEN:         Target(Instrument.HIHAT_OPEN, -0.45, 0.32, radius=0.18),
        Instrument.HIHAT_BELL:         Target(Instrument.HIHAT_BELL, -0.45, 0.28, radius=0.10),
        Instrument.TOM_HIGH:           Target(Instrument.TOM_HIGH, 0.10, 0.45, height=0.05, radius=0.16),
        Instrument.TOM_MID:            Target(Instrument.TOM_MID, 0.35, 0.48, height=0.05, radius=0.16),
        Instrument.TOM_LOW:            Target(Instrument.TOM_LOW, 0.55, 0.45, height=0.0, radius=0.17),
        Instrument.FLOOR_TOM:          Target(Instrument.FLOOR_TOM, 0.62, 0.20, height=-0.1, radius=0.19),
        Instrument.RIDE:               Target(Instrument.RIDE, 0.70, 0.40, height=0.15, radius=0.20),
        Instrument.RIDE_BELL:          Target(Instrument.RIDE_BELL, 0.70, 0.40, height=0.15, radius=0.08),
        Instrument.CRASH_1:            Target(Instrument.CRASH_1, -0.35, 0.55, height=0.20, radius=0.20),
        Instrument.CRASH_2:            Target(Instrument.CRASH_2, 0.45, 0.60, height=0.20, radius=0.20),
    })

    def resolve(self, note: int) -> Instrument:
        return self.note_map.get(note, Instrument.UNKNOWN)

    def target_for(self, instrument: Instrument) -> Target:
        if instrument in self.targets:
            return self.targets[instrument]
        # Deterministic fallback: unknown instruments are placed at the snare
        # position rather than silently dropped, and flagged non-playable.
        return Target(Instrument.UNKNOWN, -0.05, 0.30, radius=0.17)


def map_events(source_events: List[SourceMidiEvent], profile: DrumMappingProfile) -> List[DrumEvent]:
    """RULE 2 entry point."""
    out: List[DrumEvent] = []
    for se in source_events:
        instrument = profile.resolve(se.note)
        target = profile.target_for(instrument)
        playable = instrument != Instrument.UNKNOWN
        out.append(DrumEvent(
            event_id=new_id("evt"),
            source_id=se.source_id,
            time_seconds=se.time_seconds,
            instrument=instrument,
            target=target,
            velocity=se.velocity,
            is_playable=playable,
            mapping_notes="" if playable else f"unmapped note {se.note}",
        ))
    return out
