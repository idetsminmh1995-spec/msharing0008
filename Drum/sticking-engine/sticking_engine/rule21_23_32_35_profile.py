"""
rule21_23_32_35_profile.py

RULE 21 — PERFORMANCE INTENT & EXPRESSIVE TARGETING
Principle: "Intent shapes preferences; it cannot override physical or
musical validity."

RULE 22 — DRUMMER STYLE & PLAYING IDENTITY
Principle: "Style is a prior and identity layer, not a hard constraint."

RULE 23 — FATIGUE, LOAD & PHYSICAL SUSTAINABILITY
Principle: "Fatigue modifies preferences and capacity; it does not excuse
impossible timing."

RULE 32 — DRUMMER PROFILE CALIBRATION, LEARNING & ADAPTIVE PARAMETER SYSTEM
Principle: "Learning is gradual, confidence-weighted, context-tagged and
subordinate to explicit user constraints." Profile Hierarchy:
`BaseProfile -> LearnedProfile -> Song/Section adjustment -> Intent ->
Fatigue/State -> EffectiveProfile`.

RULE 35 — GENRE, PLAYING SYSTEM & DRUMMING IDIOM ADAPTATION
Idiom Principle: Genre is a weighted prior.
`Genre x Style x Intent x Memory x State` shapes preference while
`PhysicalValidity` remains a hard boundary elsewhere (Rules 6/13-18).

All five rules are grouped here because they are exactly the five layers of
the SAME profile-blending pipeline described in Rule 32's hierarchy; none of
them may touch physical feasibility, only the *soft* scoring parameters that
Rule 7/9's scoring functions read.
"""

from __future__ import annotations
import copy
import dataclasses
from typing import Dict
from .datamodel import (
    DrummerStyleProfile, PerformanceIntentContext, FatigueState,
    LearnedDrummerProfile, IdiomContext, Limb, Hand, StrokeType, TechniquePlan
)

# ---------------------------------------------------------------------------
# RULE 23 — Fatigue tracking
# ---------------------------------------------------------------------------

STROKE_LOAD = {
    StrokeType.GHOST: 0.3, StrokeType.SINGLE: 1.0, StrokeType.DOUBLE: 0.8,
    StrokeType.ACCENT: 1.6, StrokeType.RIM_SHOT: 1.7, StrokeType.CROSS_STICK: 1.1,
    StrokeType.FLAM: 1.4, StrokeType.DRAG: 1.2, StrokeType.CHOKE: 1.8,
    StrokeType.BELL: 1.2, StrokeType.OPEN: 1.3, StrokeType.CLOSED: 1.0,
}
FATIGUE_DECAY_PER_SECOND = 0.15  # recovers while a limb is idle
FATIGUE_CAP = 10.0


def update_fatigue(fatigue: FatigueState, limb: Limb, technique: TechniquePlan,
                    event_time: float) -> FatigueState:
    """RULE 23 entry point. Called once per committed decision."""
    idle = max(0.0, event_time - fatigue.time_seconds)
    decay = idle * FATIGUE_DECAY_PER_SECOND
    for l in fatigue.limb_load:
        fatigue.limb_load[l] = max(0.0, fatigue.limb_load[l] - decay)
    load = STROKE_LOAD.get(technique.stroke_type, 1.0) * (0.6 + 0.8 * technique.dynamic_level)
    fatigue.limb_load[limb] = min(FATIGUE_CAP, fatigue.limb_load[limb] + load)
    fatigue.time_seconds = event_time
    return fatigue


def fatigue_adjusted_style(style: DrummerStyleProfile, fatigue: FatigueState,
                            dominant_limb: Limb) -> DrummerStyleProfile:
    """RULE 23: fatigue nudges soft preferences (never hard physics). A tired
    non-dominant hand increases dominance bias and lowers its own max rate;
    it never claims an impossible stroke is possible."""
    adjusted = copy.copy(style)
    # Use the average load across hands as a simple global fatigue signal.
    hand_load = (fatigue.load_for(Limb.RIGHT_HAND) + fatigue.load_for(Limb.LEFT_HAND)) / 2.0
    fatigue_frac = min(1.0, hand_load / FATIGUE_CAP)
    adjusted.dominance_bias = style.dominance_bias + 0.10 * fatigue_frac
    adjusted.max_single_hand_rate_hz = style.max_single_hand_rate_hz * (1.0 - 0.15 * fatigue_frac)
    return adjusted


# ---------------------------------------------------------------------------
# RULE 32 — Learned profile calibration
# ---------------------------------------------------------------------------

class ProfileCalibrator:
    """RULE 32 primary object. Aggregates evidence from PerformanceMemory
    (Rule 20/31) into a slowly-updated LearnedDrummerProfile using a bounded
    exponential moving average, so a handful of outlier passages cannot
    whiplash the drummer's identity."""

    def __init__(self, ema_alpha: float = 0.05):
        self.ema_alpha = ema_alpha
        self.learned = LearnedDrummerProfile()

    def observe(self, chosen_dominant: bool, crossed: bool) -> None:
        a = self.ema_alpha
        target_dom = 1.0 if chosen_dominant else 0.0
        target_cross = 1.0 if crossed else 0.0
        self.learned.observed_dominance_bias = (
            (1 - a) * self.learned.observed_dominance_bias + a * (0.3 * target_dom)
        )
        self.learned.observed_crossing_aversion = (
            (1 - a) * self.learned.observed_crossing_aversion + a * (1.0 - target_cross)
        )
        self.learned.sample_count += 1
        self.learned.confidence = min(0.95, self.learned.sample_count / (self.learned.sample_count + 50))


def build_effective_style(base: DrummerStyleProfile, learned: LearnedDrummerProfile,
                           intent: PerformanceIntentContext, fatigue: FatigueState,
                           idiom: IdiomContext) -> DrummerStyleProfile:
    """RULE 32 Profile Hierarchy, applied in the documented order:
    BaseProfile -> LearnedProfile -> Song/Section(idiom) -> Intent -> Fatigue
    -> EffectiveProfile. Confidence gates how much the learned layer counts.
    """
    eff = copy.copy(base)

    # LearnedProfile layer (confidence-weighted blend toward observed stats)
    c = learned.confidence
    eff.dominance_bias = (1 - c) * eff.dominance_bias + c * learned.observed_dominance_bias
    eff.crossing_aversion = (1 - c) * eff.crossing_aversion + c * learned.observed_crossing_aversion

    # Idiom (Rule 35) layer: bounded multiplicative weighting
    for field_name, multiplier in idiom.weighting.items():
        if hasattr(eff, field_name):
            current = getattr(eff, field_name)
            bounded_mult = max(0.5, min(1.5, multiplier))
            setattr(eff, field_name, current * bounded_mult)

    # Intent (Rule 21) layer: higher energy/intensity -> more willing to cross
    # and vary; groove_commitment pulls alternation preference up.
    eff.crossing_aversion *= (1.0 - 0.2 * intent.intensity)
    eff.variation_amount = min(1.0, eff.variation_amount + 0.3 * intent.fill_freedom)
    eff.alternation_preference = min(1.0, eff.alternation_preference + 0.15 * intent.groove_commitment)

    # Fatigue (Rule 23) layer applied last, closest to "physical now".
    dominant_limb = Limb.RIGHT_HAND if base.dominant_hand == Hand.RIGHT else Limb.LEFT_HAND
    eff = fatigue_adjusted_style(eff, fatigue, dominant_limb)

    return eff


# ---------------------------------------------------------------------------
# RULE 35 — Genre idiom presets
# ---------------------------------------------------------------------------

IDIOM_PRESETS: Dict[str, Dict[str, float]] = {
    "rock":   {"alternation_preference": 1.1, "crossing_aversion": 1.0},
    "metal":  {"alternation_preference": 1.3, "crossing_aversion": 0.9, "dominance_bias": 0.9},
    "jazz":   {"alternation_preference": 0.85, "crossing_aversion": 0.8, "variation_amount": 1.3},
    "funk":   {"alternation_preference": 1.0, "crossing_aversion": 0.85, "variation_amount": 1.2},
    "latin":  {"alternation_preference": 0.9, "crossing_aversion": 0.75},
    "generic": {},
}


def make_idiom_context(genre: str) -> IdiomContext:
    """RULE 35 entry point."""
    weighting = IDIOM_PRESETS.get(genre.lower(), {})
    return IdiomContext(genre=genre, weighting=dict(weighting))
