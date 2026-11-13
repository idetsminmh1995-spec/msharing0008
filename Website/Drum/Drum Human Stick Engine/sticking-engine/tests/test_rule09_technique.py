import unittest

from sticking_engine.datamodel import (
    DrumEvent,
    DrummerStyleProfile,
    Instrument,
    Limb,
    StrokeType,
    Target,
)
from sticking_engine.rule09_technique import select_technique


class SnareRimTechniqueTests(unittest.TestCase):
    def make_event(self, velocity):
        target = Target(instrument=Instrument.SNARE_RIM, x=0.0, y=0.0)
        return DrumEvent(
            event_id="rim-test",
            source_id="source-rim-test",
            time_seconds=0.0,
            instrument=Instrument.SNARE_RIM,
            target=target,
            velocity=velocity,
        )

    def test_accent_velocity_on_snare_rim_selects_rim_shot(self):
        plan = select_technique(
            self.make_event(100),
            Limb.RIGHT_HAND,
            DrummerStyleProfile(),
            same_limb_prev_time=None,
        )
        self.assertEqual(plan.stroke_type, StrokeType.RIM_SHOT)

    def test_below_accent_threshold_on_snare_rim_remains_single(self):
        plan = select_technique(
            self.make_event(90),
            Limb.RIGHT_HAND,
            DrummerStyleProfile(),
            same_limb_prev_time=None,
        )
        self.assertEqual(plan.stroke_type, StrokeType.SINGLE)


if __name__ == "__main__":
    unittest.main()
