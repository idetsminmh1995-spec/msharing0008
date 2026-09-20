/**
 * datamodel.ts — RULE 27 (Unified Performance Data Model, Event Graph &
 * Data Contract) and RULE 38 (Class, Interface & Data Schema
 * Specification).
 *
 * A direct port of the Python `datamodel.py`. Two deliberate
 * translations, both chosen so the two implementations can be compared
 * rather than merely resemble each other:
 *
 * - **Python enums become string-literal unions**, with the SAME string
 *   values the Python's `.value` carries (`"RH"`, `"hihat_closed"`,
 *   `"rim_shot"`). Parity output is compared as JSON, so the values
 *   have to match; and a union costs nothing at runtime where a class
 *   would.
 * - **Dataclasses become interfaces plus explicit factory functions**
 *   for the ones with defaults. `frozen=True` dataclasses map to
 *   `readonly` fields; the mutable ones (DrummerState, FatigueState)
 *   stay mutable, because the solver's whole commit discipline depends
 *   on there being exactly one authoritative object to mutate.
 *
 * Units are explicit everywhere, as in the Python:
 *     timeSeconds : float seconds, absolute, from playback start
 *     timeTicks   : int MIDI ticks (raw)
 *     velocity    : int 0-127 (MIDI convention)
 *     position    : (x, y) meters in a 2D "drummer-frame" plane (top-down)
 */

export type Hand = 'R' | 'L';
export const HANDS: readonly Hand[] = ['R', 'L'];
export function otherHand(hand: Hand): Hand {
  return hand === 'R' ? 'L' : 'R';
}

export type Limb = 'RH' | 'LH' | 'RF' | 'LF';
/** Declaration order matters: it is the Python enum's order, and several dicts are built by iterating it. */
export const LIMBS: readonly Limb[] = ['RH', 'LH', 'RF', 'LF'];

export type Instrument =
  | 'kick'
  | 'snare'
  | 'snare_rim'
  | 'snare_cross_stick'
  | 'hihat_closed'
  | 'hihat_open'
  | 'hihat_pedal'
  | 'hihat_bell'
  | 'ride'
  | 'ride_bell'
  | 'crash_1'
  | 'crash_2'
  | 'tom_high'
  | 'tom_mid'
  | 'tom_low'
  | 'floor_tom'
  | 'unknown';

/** Rule 9 / Rule 34 vocabulary of articulations. */
export type StrokeType =
  | 'single'
  | 'double'
  | 'accent'
  | 'ghost'
  | 'flam'
  | 'drag'
  | 'rim_shot'
  | 'cross_stick'
  | 'choke'
  | 'bell'
  | 'open'
  | 'closed';

/** Rule 5 classification vocabulary. */
export type PatternRole =
  'groove' | 'fill' | 'transition' | 'break' | 'ending' | 'ostinato' | 'linear' | 'unknown';

export type ValidationSeverity = 'info' | 'warning' | 'error';

/** A 3D point in the drummer frame: x, y, z(height), all meters. */
export type Point3 = readonly [number, number, number];

// ---------------------------------------------------------------------------
// Rule 1 — SourceMidiEvent (immutable source truth)
// ---------------------------------------------------------------------------

export interface SourceMidiEvent {
  readonly sourceId: string;
  readonly timeSeconds: number;
  readonly timeTicks: number;
  readonly channel: number;
  readonly note: number;
  readonly velocity: number;
  readonly trackName: string;
}

export interface TempoPoint {
  readonly timeSeconds: number;
  readonly timeTicks: number;
  readonly bpm: number;
}

export interface TimeSignaturePoint {
  readonly timeSeconds: number;
  readonly timeTicks: number;
  readonly numerator: number;
  readonly denominator: number;
}

export interface NormalizedMidiData {
  readonly events: readonly SourceMidiEvent[];
  readonly tempoMap: readonly TempoPoint[];
  readonly timeSignatureMap: readonly TimeSignaturePoint[];
  readonly ticksPerBeat: number;
  readonly malformedEventCount: number;
}

// ---------------------------------------------------------------------------
// Rule 2 — DrumEvent (instrument / surface / target mapping)
// ---------------------------------------------------------------------------

/**
 * A physical point on the kit, in meters, top-down, drummer-frame:
 * x negative = the drummer's left, positive = their right;
 * y = distance away from the drummer's chest.
 */
export interface Target {
  readonly instrument: Instrument;
  readonly x: number;
  readonly y: number;
  readonly height: number;
  /** Playable radius in meters. */
  readonly radius: number;
  /** e.g. the hi-hat pedal is the left foot's. */
  readonly preferredLimb?: Limb;
  readonly isFootTarget: boolean;
}

export function target(
  instrument: Instrument,
  x: number,
  y: number,
  options: {
    height?: number;
    radius?: number;
    preferredLimb?: Limb;
    isFootTarget?: boolean;
  } = {},
): Target {
  return {
    instrument,
    x,
    y,
    height: options.height ?? 0.0,
    radius: options.radius ?? 0.12,
    ...(options.preferredLimb !== undefined ? { preferredLimb: options.preferredLimb } : {}),
    isFootTarget: options.isFootTarget ?? false,
  };
}

export interface DrumEvent {
  readonly eventId: string;
  readonly sourceId: string;
  readonly timeSeconds: number;
  readonly instrument: Instrument;
  readonly target: Target;
  readonly velocity: number;
  readonly isPlayable: boolean;
  readonly mappingNotes: string;
}

// ---------------------------------------------------------------------------
// Rule 3/4 — TimingContext / DensityContext
// ---------------------------------------------------------------------------

export interface TimingContext {
  readonly eventId: string;
  readonly measure: number;
  readonly beat: number;
  readonly subdivisionIndex: number;
  /** e.g. 16 for a 16th-note grid. */
  readonly subdivisionGrid: number;
  /** 0..1, 1 = downbeat. */
  readonly beatStrength: number;
  readonly isSyncopated: boolean;
  readonly secondsPerBeat: number;
}

export interface DensityContext {
  readonly eventId: string;
  readonly localEventsPerSecond: number;
  readonly gapBeforeSeconds: number;
  readonly gapAfterSeconds: number;
  readonly simultaneousCount: number;
  readonly inBurst: boolean;
  /** 0..1+, >1 = physically demanding. */
  readonly tempoAdjustedPressure: number;
}

// ---------------------------------------------------------------------------
// Rule 5 — Pattern / Phrase / Section context
// ---------------------------------------------------------------------------

export interface PatternContext {
  readonly eventId: string;
  readonly phraseId: string;
  readonly sectionId: string;
  readonly role: PatternRole;
  readonly roleConfidence: number;
}

// ---------------------------------------------------------------------------
// Rule 6 — Reachability
// ---------------------------------------------------------------------------

export interface ReachabilityResult {
  readonly limb: Limb;
  readonly eventId: string;
  readonly reachable: boolean;
  readonly distanceM: number;
  readonly requiredTravelTimeS: number;
  readonly availableTimeS: number;
  readonly safetyMarginS: number;
  readonly crossesBody: boolean;
  readonly reason: string;
}

// ---------------------------------------------------------------------------
// Rule 7/8/34 — Sticking candidates & sequences
// ---------------------------------------------------------------------------

/** Rule 7 output: one viable (limb, event) proposal, pre-sequence-solve. */
export interface StickingCandidate {
  readonly eventId: string;
  readonly limb: Limb;
  /** Higher = better. A soft preference, never a gate. */
  readonly score: number;
  readonly reachable: boolean;
  readonly crossesBody: boolean;
  readonly sourceRule: string;
  readonly tags: readonly string[];
}

/** Rule 34 output: a multi-event hand-pattern proposal (e.g. a rudiment). */
export interface StickingPatternCandidate {
  readonly patternName: string;
  readonly limbSequence: readonly Limb[];
  readonly eventIds: readonly string[];
  readonly grammarTags: readonly string[];
}

/** Rule 8/29/30 committed decision for one event: which limb plays it. */
export interface SequenceDecision {
  readonly eventId: string;
  readonly limb: Limb;
  readonly sequenceCost: number;
  readonly alternativesConsidered: number;
  readonly lookaheadWindow: number;
}

// ---------------------------------------------------------------------------
// Rule 9 — Stroke technique
// ---------------------------------------------------------------------------

export interface TechniquePlan {
  readonly eventId: string;
  readonly limb: Limb;
  readonly strokeType: StrokeType;
  /** 0..1 normalized loudness, used for motion amplitude. */
  readonly dynamicLevel: number;
}

// ---------------------------------------------------------------------------
// Rule 10/13-19 — Recovery / Motion / Impact / Body
// ---------------------------------------------------------------------------

export interface RecoveryPlan {
  readonly eventId: string;
  readonly limb: Limb;
  readonly reboundHeightM: number;
  /** Absolute time the limb is ready for its next action. */
  readonly readyTimeS: number;
  readonly preparedForEventId?: string;
}

export type MotionPhase = 'prep' | 'travel' | 'impact' | 'rebound' | 'recover';

export interface MotionKeyframe {
  readonly timeSeconds: number;
  readonly limb: Limb;
  readonly position: Point3;
  readonly phase: MotionPhase;
}

export interface MotionPlan {
  readonly eventId: string;
  readonly limb: Limb;
  readonly keyframes: MotionKeyframe[];
  readonly peakVelocityMps: number;
  readonly feasible: boolean;
  readonly rejectionReason: string;
}

export interface ImpactEvent {
  readonly eventId: string;
  readonly limb: Limb;
  readonly timeSeconds: number;
  readonly instrument: Instrument;
  readonly impactVelocityMps: number;
  readonly reboundHeightM: number;
}

/** Rule 17's simplified whole-body state: torso rotation + centre-of-mass shift. */
export interface BodyState {
  readonly timeSeconds: number;
  readonly torsoRotationDeg: number;
  readonly comOffsetM: readonly [number, number];
}

// ---------------------------------------------------------------------------
// Rule 18/24 — Human timing / sync
// ---------------------------------------------------------------------------

export interface HumanTimingContext {
  readonly eventId: string;
  readonly scheduledTimeS: number;
  readonly performedTimeS: number;
  readonly microtimingOffsetMs: number;
  readonly instrumentBiasMs: number;
}

export interface SyncState {
  readonly maxDriftMs: number;
  readonly resynced: boolean;
  readonly lastCheckTimeS: number;
}

// ---------------------------------------------------------------------------
// Rule 19 — Animation timeline
// ---------------------------------------------------------------------------

export interface AnimationEvent {
  readonly eventId: string;
  readonly limb: Limb;
  readonly startTimeS: number;
  readonly endTimeS: number;
  readonly keyframes: readonly MotionKeyframe[];
  readonly strokeType: StrokeType;
}

export interface AnimationTimeline {
  readonly events: readonly AnimationEvent[];
  readonly durationS: number;
}

// ---------------------------------------------------------------------------
// Rule 20/31/33 — Memory / motifs
// ---------------------------------------------------------------------------

export interface MemoryContext {
  recentLimbSequence: Limb[];
  recentStrokeTypes: StrokeType[];
  recentEventIds: string[];
}

export interface PatternFingerprint {
  readonly fingerprint: string;
  readonly length: number;
  occurrences: number;
}

export interface MotifCandidate {
  readonly fingerprint: string;
  readonly limbSequence: readonly Limb[];
  readonly confidence: number;
}

// ---------------------------------------------------------------------------
// Rule 21/22/23/32/35 — Intent / Style / Fatigue / Learning / Idiom
// ---------------------------------------------------------------------------

export interface PerformanceIntentContext {
  energy: number;
  intensity: number;
  grooveCommitment: number;
  fillFreedom: number;
}

export function performanceIntent(
  overrides: Partial<PerformanceIntentContext> = {},
): PerformanceIntentContext {
  return {
    energy: 0.5,
    intensity: 0.5,
    grooveCommitment: 0.7,
    fillFreedom: 0.5,
    ...overrides,
  };
}

export interface DrummerStyleProfile {
  name: string;
  dominantHand: Hand;
  /** Score bonus for the dominant hand. */
  dominanceBias: number;
  /** 0..1, higher = avoids crossing more. */
  crossingAversion: number;
  /** 0..1, higher = prefers strict alternation. */
  alternationPreference: number;
  /** Physical stroke-rate ceiling per hand. */
  maxSingleHandRateHz: number;
  ghostNoteVelocityThreshold: number;
  accentVelocityThreshold: number;
  /** 0..1, used by Rule 12. */
  variationAmount: number;
}

export function drummerStyle(overrides: Partial<DrummerStyleProfile> = {}): DrummerStyleProfile {
  return {
    name: 'default',
    dominantHand: 'R',
    dominanceBias: 0.15,
    crossingAversion: 0.6,
    alternationPreference: 0.5,
    maxSingleHandRateHz: 14.0,
    ghostNoteVelocityThreshold: 50,
    accentVelocityThreshold: 100,
    variationAmount: 0.15,
    ...overrides,
  };
}

export interface FatigueState {
  limbLoad: Record<Limb, number>;
  timeSeconds: number;
}

export function fatigueState(): FatigueState {
  const limbLoad = {} as Record<Limb, number>;
  for (const limb of LIMBS) limbLoad[limb] = 0.0;
  return { limbLoad, timeSeconds: 0.0 };
}

export function loadFor(fatigue: FatigueState, limb: Limb): number {
  return fatigue.limbLoad[limb] ?? 0.0;
}

/** Rule 32 output: slowly-updated statistics, bounded and confidence-weighted. */
export interface LearnedDrummerProfile {
  observedDominanceBias: number;
  observedCrossingAversion: number;
  sampleCount: number;
  confidence: number;
}

export function learnedProfile(): LearnedDrummerProfile {
  return {
    observedDominanceBias: 0.15,
    observedCrossingAversion: 0.6,
    sampleCount: 0,
    confidence: 0.0,
  };
}

export interface IdiomContext {
  readonly genre: string;
  readonly weighting: Readonly<Record<string, number>>;
}

// ---------------------------------------------------------------------------
// Rule 25 — Validation
// ---------------------------------------------------------------------------

export interface ValidationIssue {
  readonly severity: ValidationSeverity;
  readonly code: string;
  readonly message: string;
  readonly eventId?: string;
  readonly ruleId: string;
}

export interface ValidationResult {
  readonly issues: readonly ValidationIssue[];
  readonly approved: boolean;
}

export function validationErrors(result: ValidationResult): readonly ValidationIssue[] {
  return result.issues.filter((i) => i.severity === 'error');
}

// ---------------------------------------------------------------------------
// Rule 30 — Continuous drummer state
// ---------------------------------------------------------------------------

export interface LimbState {
  limb: Limb;
  position: Point3;
  lastEventId?: string;
  lastActionTimeS: number;
  readyTimeS: number;
}

/** Rule 30's primary object. Mutated only through an explicit commit (Rule 39). */
export interface DrummerState {
  timeSeconds: number;
  limbs: Record<Limb, LimbState>;
  fatigue: FatigueState;
  memory: MemoryContext;
  style: DrummerStyleProfile;
  intent: PerformanceIntentContext;
}

export function drummerState(
  overrides: { style?: DrummerStyleProfile; intent?: PerformanceIntentContext } = {},
): DrummerState {
  const limbs = {} as Record<Limb, LimbState>;
  for (const limb of LIMBS) {
    limbs[limb] = { limb, position: [0.0, 0.0, 0.0], lastActionTimeS: -999.0, readyTimeS: 0.0 };
  }
  return {
    timeSeconds: 0.0,
    limbs,
    fatigue: fatigueState(),
    memory: { recentLimbSequence: [], recentStrokeTypes: [], recentEventIds: [] },
    style: overrides.style ?? drummerStyle(),
    intent: overrides.intent ?? performanceIntent(),
  };
}

/**
 * Rule 39's explicit state snapshot, for rollback and for the solver's
 * speculative branches.
 *
 * Deep for everything the search mutates (limb positions, the memory
 * lists, fatigue) and SHALLOW for style and intent, which no rule
 * mutates during a solve -- the Python uses `copy.deepcopy` and would
 * copy those too, but copying them changes nothing observable and the
 * beam search calls this once per branch per group, which is the
 * hottest line in the engine.
 */
export function snapshotState(state: DrummerState): DrummerState {
  const limbs = {} as Record<Limb, LimbState>;
  for (const limb of LIMBS) {
    const ls = state.limbs[limb];
    limbs[limb] = {
      limb: ls.limb,
      position: ls.position,
      ...(ls.lastEventId !== undefined ? { lastEventId: ls.lastEventId } : {}),
      lastActionTimeS: ls.lastActionTimeS,
      readyTimeS: ls.readyTimeS,
    };
  }
  const limbLoad = {} as Record<Limb, number>;
  for (const limb of LIMBS) limbLoad[limb] = state.fatigue.limbLoad[limb];
  return {
    timeSeconds: state.timeSeconds,
    limbs,
    fatigue: { limbLoad, timeSeconds: state.fatigue.timeSeconds },
    memory: {
      recentLimbSequence: [...state.memory.recentLimbSequence],
      recentStrokeTypes: [...state.memory.recentStrokeTypes],
      recentEventIds: [...state.memory.recentEventIds],
    },
    style: state.style,
    intent: state.intent,
  };
}

export interface StateTransition {
  readonly fromTimeS: number;
  readonly toTimeS: number;
  readonly eventIds: readonly string[];
  readonly ruleId: string;
}

// ---------------------------------------------------------------------------
// Rule 26/36 — Final performance & runtime
// ---------------------------------------------------------------------------

/**
 * Rule 27's canonical fully-solved event: the single source of truth
 * every later stage (runtime, export, visualization) reads from.
 */
export interface PerformanceEvent {
  readonly eventId: string;
  readonly sourceId: string;
  readonly timeSeconds: number;
  readonly limb: Limb;
  readonly instrument: Instrument;
  readonly strokeType: StrokeType;
  readonly velocity: number;
  readonly microtimingOffsetMs: number;
  readonly dynamicLevel: number;
  readonly ruleTrace: readonly string[];
}

export interface FinalValidatedPerformance {
  readonly events: readonly PerformanceEvent[];
  readonly animation: AnimationTimeline;
  readonly validation: ValidationResult;
  readonly durationS: number;
  readonly seed: number;
  readonly engineVersion: string;
}
