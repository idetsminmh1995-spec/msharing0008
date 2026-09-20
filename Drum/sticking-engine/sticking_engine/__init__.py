"""
sticking_engine — a Rules-1-through-40 human drummer performance solver.

Quick start:

    from sticking_engine import Engine, EngineConfig
    from sticking_engine.datamodel import DrummerStyleProfile, PerformanceIntentContext

    engine = Engine(EngineConfig(
        style=DrummerStyleProfile(),
        intent=PerformanceIntentContext(),
        genre="rock",
        seed=42,
        mode="HIGH",
    ))
    performance = engine.run(midi_path="my_beat.mid")

    for ev in performance.events:
        print(ev.time_seconds, ev.limb.value, ev.instrument.value, ev.stroke_type.value)

See RULE_MAP.md in the project root for exactly which module implements which
of the 40 source rules.
"""

from .engine import Engine, EngineConfig
from . import datamodel

__all__ = ["Engine", "EngineConfig", "datamodel"]
__version__ = "1.0.0"
