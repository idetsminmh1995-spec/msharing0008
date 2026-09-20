"""
datamodel.py
============
Implements RULE 27 (Unified Performance Data Model, Event Graph & Data Contract)
and RULE 38 (Class, Interface & Data Schema Specification).

Every object that flows through the engine is a typed, explicit dataclass.
Source data (SourceMidiEvent) is immutable once created. Derived data always
carries a reference back to the source_id it came from, so every decision
stays traceable (Rule 27 Core Principle: "One source of truth; explicit
references; immutable source data; traceable derived data.").

Units are explicit everywhere:
    time_seconds : float seconds, absolute, from playback start
    time_ticks   : int MIDI ticks (raw)
    velocity     : int 0-127 (MIDI convention)
    position     : (x, y) meters in a 2D "drummer-frame" plane (top-down)
"""

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Optional, List, Dict, Any, Tuple
import itertools

_id_counter = itertools.count(1)


def new_id(prefix: str) -> str:
    """Generate a stable, monotonic, human-readable ID. (Rule 27: stable source IDs)"""
    return f"{prefix}_{next(_id_counter):08d}"


# ---------------------------------------------------------------------------
# Enums (Rule 38: explicit enums instead of raw strings/ints wherever a fixed
# vocabulary exists)
# ---------------------------------------------------------------------------

class Hand(Enum):
    RIGHT = "R"
    LEFT = "L"

    def other(self) -> "Hand":
        return Hand.LEFT if self is Hand.RIGHT else Hand.RIGHT


class Foot(Enum):
    RIGHT = "RF"
    LEFT = "LF"


class Limb(Enum):
    """Unified limb identity used by Rule 11 (four-limb coordination)."""
    RIGHT_HAND = "RH"
    LEFT_HAND = "LH"
    RIGHT_FOOT = "RF"
    LEFT_FOOT = "LF"


class Instrument(Enum):
    KICK = "kick"
    SNARE = "snare"
    SNARE_RIM = "snare_rim"
    SNARE_CROSS_STICK = "snare_cross_stick"
    HIHAT_CLOSED = "hihat_closed"
    HIHAT_OPEN = "hihat_open"
    HIHAT_PEDAL = "hihat_pedal"
    HIHAT_BELL = "hihat_bell"
    RIDE = "ride"
    RIDE_BELL = "ride_bell"
    CRASH_1 = "crash_1"
    CRASH_2 = "crash_2"
    TOM_HIGH = "tom_high"
    TOM_MID = "tom_mid"
    TOM_LOW = "tom_low"
    FLOOR_TOM = "floor_tom"
    UNKNOWN = "unknown"


class StrokeType(Enum):
    """Rule 9 / Rule 34 vocabulary of articulations."""
    SINGLE = "single"
    DOUBLE = "double"           # 2nd note of a double-stroke
    ACCENT = "accent"
    GHOST = "ghost"
    FLAM = "flam"
    DRAG = "drag"
    RIM_SHOT = "rim_shot"
    CROSS_STICK = "cross_stick"
    CHOKE = "choke"             # crash/hihat choke
    BELL = "bell"
    OPEN = "open"
    CLOSED = "closed"


class PatternRole(Enum):
    """Rule 5 classification vocabulary."""
    GROOVE = "groove"
    FILL = "fill"
    TRANSITION = "transition"
    BREAK = "break"
    ENDING = "ending"
    OSTINATO = "ostinato"
    LINEAR = "linear"
    UNKNOWN = "unknown"


class ValidationSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


# ---------------------------------------------------------------------------
# Rule 1 — SourceMidiEvent (immutable source truth)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class SourceMidiEvent:
    """Rule 1 output. Immutable, lossless representation of one raw note-on."""
    source_id: str
    time_seconds: float
    time_ticks: int
    channel: int
    note: int
    velocity: int
    track_name: str = ""

    def __post_init__(self):
        if not (0 <= self.velocity <= 127):
            raise ValueError(f"velocity out of MIDI range: {self.velocity}")


@dataclass(frozen=True)
class TempoPoint:
    time_seconds: float
    time_ticks: int
    bpm: float


@dataclass(frozen=True)
class TimeSignaturePoint:
    time_seconds: float
    time_ticks: int
    numerator: int
    denominator: int


@dataclass
class NormalizedMidiData:
    """Rule 1 primary output container."""
    events: List[SourceMidiEvent]
    tempo_map: List[TempoPoint]
    time_signature_map: List[TimeSignaturePoint]
    ticks_per_beat: int
    malformed_event_count: int = 0


# ---------------------------------------------------------------------------
# Rule 2 — DrumEvent (instrument / surface / target mapping)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Target:
    """A physical point on the kit. Position is meters, top-down, drummer-frame:
    x: negative = drummer's left, positive = drummer's right
    y: distance away from the drummer's chest
    """
    instrument: Instrument
    x: float
    y: float
    height: float = 0.0
    radius: float = 0.12  # playable radius in meters
    preferred_limb: Optional[Limb] = None  # e.g. hihat pedal -> LEFT_FOOT
    is_foot_target: bool = False


@dataclass(frozen=True)
class DrumEvent:
    """Rule 2 primary output. One musical percussion event with a resolved target."""
    event_id: str
    source_id: str
    time_seconds: float
    instrument: Instrument
    target: Target
    velocity: int
    is_playable: bool = True
    mapping_notes: str = ""


# ---------------------------------------------------------------------------
# Rule 3/4 — TimingContext / DensityContext
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class TimingContext:
    event_id: str
    measure: int
    beat: int
    subdivision_index: int
    subdivision_grid: int          # e.g. 16 for 16th-note grid
    beat_strength: float           # 0..1, 1 = downbeat
    is_syncopated: bool
    seconds_per_beat: float


@dataclass(frozen=True)
class DensityContext:
    event_id: str
    local_events_per_second: float
    gap_before_seconds: float
    gap_after_seconds: float
    simultaneous_count: int
    in_burst: bool
    tempo_adjusted_pressure: float  # 0..1+, >1 = physically demanding


# ---------------------------------------------------------------------------
# Rule 5 — Pattern / Phrase / Section context
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class PatternContext:
    event_id: str
    phrase_id: str
    section_id: str
    role: PatternRole
    role_confidence: float


# ---------------------------------------------------------------------------
# Rule 6 — Reachability
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ReachabilityResult:
    limb: Limb
    event_id: str
    reachable: bool
    distance_m: float
    required_travel_time_s: float
    available_time_s: float
    safety_margin_s: float
    crosses_body: bool
    reason: str = ""


# ---------------------------------------------------------------------------
# Rule 7/8/34 — Sticking candidates & sequences
# ---------------------------------------------------------------------------

@dataclass
class StickingCandidate:
    """Rule 7 output: one viable (limb, event) proposal, pre-sequence-solve."""
    event_id: str
    limb: Limb
    score: float                    # higher = better, soft preference
    reachable: bool
    crosses_body: bool
    source_rule: str = "rule07"
    tags: List[str] = field(default_factory=list)


@dataclass
class StickingPatternCandidate:
    """Rule 34 output: a multi-event hand-pattern proposal (e.g. a rudiment)."""
    pattern_name: str
    limb_sequence: List[Limb]
    event_ids: List[str]
    grammar_tags: List[str] = field(default_factory=list)


@dataclass
class SequenceDecision:
    """Rule 8/29/30 committed decision for one event: which limb plays it."""
    event_id: str
    limb: Limb
    sequence_cost: float
    alternatives_considered: int
    lookahead_window: int


# ---------------------------------------------------------------------------
# Rule 9 — Stroke technique
# ---------------------------------------------------------------------------

@dataclass
class StrokeCandidate:
    event_id: str
    limb: Limb
    stroke_type: StrokeType
    score: float
    requires_previous_stroke_at: Optional[str] = None  # e.g. flam grace note


@dataclass
class TechniquePlan:
    event_id: str
    limb: Limb
    stroke_type: StrokeType
    dynamic_level: float  # 0..1 normalized loudness used for motion amplitude


# ---------------------------------------------------------------------------
# Rule 10/13-19 — Recovery / Motion / Impact / Body (simplified physical layer)
# ---------------------------------------------------------------------------

@dataclass
class RecoveryPlan:
    event_id: str
    limb: Limb
    rebound_height_m: float
    ready_time_s: float             # absolute time limb is ready for next action
    prepared_for_event_id: Optional[str] = None


@dataclass
class MotionKeyframe:
    time_seconds: float
    limb: Limb
    position: Tuple[float, float, float]   # x, y, z meters (z = height)
    phase: str  # "prep" | "travel" | "impact" | "rebound" | "recover"


@dataclass
class MotionPlan:
    event_id: str
    limb: Limb
    keyframes: List[MotionKeyframe]
    peak_velocity_mps: float
    feasible: bool
    rejection_reason: str = ""


@dataclass
class ImpactEvent:
    event_id: str
    limb: Limb
    time_seconds: float
    instrument: Instrument
    impact_velocity_mps: float
    rebound_height_m: float


@dataclass
class BodyState:
    """Rule 17 simplified whole-body state: torso rotation + center-of-mass shift."""
    time_seconds: float
    torso_rotation_deg: float
    com_offset_m: Tuple[float, float]


# ---------------------------------------------------------------------------
# Rule 18/24 — Human timing / sync
# ---------------------------------------------------------------------------

@dataclass
class HumanTimingContext:
    event_id: str
    scheduled_time_s: float
    performed_time_s: float
    microtiming_offset_ms: float
    instrument_bias_ms: float


@dataclass
class SyncState:
    max_drift_ms: float
    resynced: bool
    last_check_time_s: float


# ---------------------------------------------------------------------------
# Rule 19 — Animation timeline
# ---------------------------------------------------------------------------

@dataclass
class AnimationEvent:
    event_id: str
    limb: Limb
    start_time_s: float
    end_time_s: float
    keyframes: List[MotionKeyframe]
    stroke_type: StrokeType


@dataclass
class AnimationTimeline:
    events: List[AnimationEvent]
    duration_s: float


# ---------------------------------------------------------------------------
# Rule 20/31/33 — Memory / motifs
# ---------------------------------------------------------------------------

@dataclass
class MemoryContext:
    recent_limb_sequence: List[Limb]
    recent_stroke_types: List[StrokeType]
    recent_event_ids: List[str]


@dataclass
class PatternFingerprint:
    fingerprint: str          # normalized string key, e.g. "R L R L R R L R"
    length: int
    occurrences: int = 0


@dataclass
class MotifCandidate:
    fingerprint: str
    limb_sequence: List[Limb]
    confidence: float


# ---------------------------------------------------------------------------
# Rule 21/22/23/32/35 — Intent / Style / Fatigue / Learning / Idiom
# ---------------------------------------------------------------------------

@dataclass
class PerformanceIntentContext:
    energy: float = 0.5          # 0..1
    intensity: float = 0.5       # 0..1
    groove_commitment: float = 0.7
    fill_freedom: float = 0.5


@dataclass
class DrummerStyleProfile:
    name: str = "default"
    dominant_hand: Hand = Hand.RIGHT
    dominance_bias: float = 0.15      # score bonus for dominant hand
    crossing_aversion: float = 0.6    # 0..1, higher = avoids crossing more
    alternation_preference: float = 0.5  # 0..1, higher = prefers strict alternation
    max_single_hand_rate_hz: float = 14.0  # physical stroke-rate ceiling per hand
    ghost_note_velocity_threshold: int = 50
    accent_velocity_threshold: int = 100
    variation_amount: float = 0.15    # 0..1, used by Rule 12


@dataclass
class FatigueState:
    limb_load: Dict[Limb, float] = field(default_factory=lambda: {l: 0.0 for l in Limb})
    time_seconds: float = 0.0

    def load_for(self, limb: Limb) -> float:
        return self.limb_load.get(limb, 0.0)


@dataclass
class LearnedDrummerProfile:
    """Rule 32 output: slowly-updated statistics, bounded & confidence-weighted."""
    observed_dominance_bias: float = 0.15
    observed_crossing_aversion: float = 0.6
    sample_count: int = 0
    confidence: float = 0.0


@dataclass
class IdiomContext:
    genre: str = "generic"
    weighting: Dict[str, float] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Rule 25 — Validation
# ---------------------------------------------------------------------------

@dataclass
class ValidationIssue:
    severity: ValidationSeverity
    code: str
    message: str
    event_id: Optional[str] = None
    rule_id: str = ""


@dataclass
class ValidationResult:
    issues: List[ValidationIssue]
    approved: bool

    def errors(self) -> List[ValidationIssue]:
        return [i for i in self.issues if i.severity is ValidationSeverity.ERROR]


# ---------------------------------------------------------------------------
# Rule 30 — Continuous drummer state
# ---------------------------------------------------------------------------

@dataclass
class LimbState:
    limb: Limb
    position: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    last_event_id: Optional[str] = None
    last_action_time_s: float = -999.0
    ready_time_s: float = 0.0


@dataclass
class DrummerState:
    """Rule 30 primary object. Mutated only through commit() (Rule 39)."""
    time_seconds: float = 0.0
    limbs: Dict[Limb, LimbState] = field(
        default_factory=lambda: {l: LimbState(limb=l) for l in Limb}
    )
    fatigue: FatigueState = field(default_factory=FatigueState)
    memory: MemoryContext = field(
        default_factory=lambda: MemoryContext([], [], [])
    )
    style: DrummerStyleProfile = field(default_factory=DrummerStyleProfile)
    intent: PerformanceIntentContext = field(default_factory=PerformanceIntentContext)

    def snapshot(self) -> "DrummerState":
        """Rule 39: explicit state snapshot for rollback support."""
        import copy
        return copy.deepcopy(self)


@dataclass
class StateTransition:
    from_time_s: float
    to_time_s: float
    event_ids: List[str]
    rule_id: str = "rule30"


# ---------------------------------------------------------------------------
# Rule 26/36 — Final performance & runtime
# ---------------------------------------------------------------------------

@dataclass
class PerformanceEvent:
    """Rule 27's canonical fully-solved event: the single source of truth that
    every later stage (runtime, export, visualization) reads from."""
    event_id: str
    source_id: str
    time_seconds: float
    limb: Limb
    instrument: Instrument
    stroke_type: StrokeType
    velocity: int
    microtiming_offset_ms: float
    dynamic_level: float
    rule_trace: List[str] = field(default_factory=list)


@dataclass
class FinalValidatedPerformance:
    events: List[PerformanceEvent]
    animation: AnimationTimeline
    validation: ValidationResult
    duration_s: float
    seed: int = 0
    engine_version: str = "1.0.0"
