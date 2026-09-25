/**
 * finger-engine — the Guitar Human Finger Engine.
 *
 * It decides, the way a guitarist would, which string, fret and
 * finger plays every note, and writes a keyframe timeline the SVG
 * fretboard draws. It renders nothing itself.
 *
 * Built to `docs/finger-engine/GUITAR_FINGER_ENGINE_PLAN.md`. Every
 * rule in the code carries the plan's own ID in a comment, so a
 * future change to the plan can be traced to the code that
 * implements it.
 *
 * PHASES 0 AND 1 are what exists here. Phase 0 is the foundation --
 * the data model, geometry, the string-numbering conversions, tempo,
 * the seeded RNG, the timeline contract and the core validator. Phase
 * 1 is single-note lines played end to end: the input adapters, the
 * left-hand solver, the picking hand and the motion planner, so a
 * melody comes out as moving dots with pick strokes.
 *
 * Chords and barres (Phase 2), and the techniques -- hammer-on,
 * pull-off, slide, bend, fingerstyle (Phase 3) -- are deliberately
 * absent: the plan builds one phase at a time and each one is
 * approved before the next begins.
 */
export { DEFAULTS, configHash, mergeConfig } from './defaults.js';

// ---- the public API the plan names (01 §4) --------------------------
export { analyzeGuitar, resolveInstrument } from './guitar/index.js';
export type { AnalyzeOptions } from './guitar/index.js';
export { fromNotationEngine } from './input/notation-engine/adapter.js';
export type {
  NotationAdapterOptions,
  NotationAdapterResult,
  NotationMeasureLike,
  NotationNoteLike,
  NotationPartLike,
  NotationPlaybackLike,
  NotationScoreLike,
  NotationVoiceLike,
} from './input/notation-engine/adapter.js';
export { TICKS_PER_QUARTER, guitarParts, parseMusicXml } from './input/musicxml/parse.js';
export type { MusicXmlParseResult } from './input/musicxml/parse.js';
export { guitarTracks, parseMidi } from './input/midi/parse.js';
export type { MidiParseResult } from './input/midi/parse.js';
export { normalizePart } from './input/normalize.js';
export type { NormalizedPart, NormalizeConfig } from './input/normalize.js';

// ---- the pieces, for tests and for the debug view -------------------
export { buildStages } from './guitar/stages.js';
export type { SolveStage, StageConfig } from './guitar/stages.js';
export {
  expandStage,
  handConfigKey,
  placementsFor,
  relaxationFor,
  stateKey,
} from './guitar/candidates.js';
export {
  allowedFingers,
  handPosition,
  infeasibleReason,
  placementDistanceMm,
  spanKey,
  spanLimit,
} from './guitar/left-hand-rules.js';
export type { LeftHandConfig, SpanLimit } from './guitar/left-hand-rules.js';
export {
  pitchesReturningSoon,
  staticFeatures,
  transitionCost,
  transitionFeatures,
} from './guitar/left-hand-cost.js';
export type { CostContext, CostWeights, SolverConfig } from './guitar/left-hand-cost.js';
export type { BaseVariant, GuitarState, VariantCache } from './guitar/candidates.js';
export {
  beatTicksAt,
  isLegatoTarget,
  pickEvents,
  resolveMode,
  subdivisionOfBeat,
} from './guitar/right-hand/pick.js';
export { leadSeconds, planMotion, travelSeconds } from './guitar/motion/planner.js';
export type { MotionConfig, HumanizeConfig, PlannerResult } from './guitar/motion/planner.js';
export { confidenceFrom, reasonsFor } from './guitar/reasons.js';
export { validateGuitar } from './guitar/validate-guitar.js';
export { mergeByKey, pruneBeam } from './core/solver/beam.js';
export { solveStages } from './core/solver/viterbi.js';
export type { StageSolution, StageSolverInput } from './core/solver/viterbi.js';
export { buildDebugReport, report } from './debug/report.js';
export type { DebugNote, DebugReport } from './debug/report.js';
export {
  childNamed,
  childNumber,
  childText,
  childrenNamed,
  descendants,
  parseXml,
} from './input/musicxml/xml.js';
export type { XmlNode } from './input/musicxml/xml.js';
export type { DeepPartial, EngineConfig } from './defaults.js';

export {
  fingertipDistanceMm,
  fingertipPoint,
  fingertipXMm,
  fretDistanceMm,
  fretWidthMm,
  spanMm,
  stringSpacingMm,
  stringYMm,
} from './core/geometry.js';
export type { FingertipPoint, GeometryConfig } from './core/geometry.js';

export { jitter, makeRng } from './core/rng.js';
export { bpmAt, tempoMap, tickToSeconds } from './core/tempo.js';
export type { TempoMap, TempoSegment } from './core/tempo.js';

export {
  STANDARD_TUNING,
  TUNING_PRESETS,
  internalStringToMusicXml,
  internalStringToRenderer,
  musicXmlStringToInternal,
  notationEngineStringToInternal,
  openPitch,
  pitchAt,
  pitchRange,
  placementsForPitch,
  staffTuningLineToInternal,
} from './core/tuning.js';

export {
  ENGINE_NAME,
  ENGINE_VERSION,
  FINGER_KEYS,
  TIMELINE_SCHEMA,
  TIMELINE_SCHEMA_VERSION,
  emptyFingerTracks,
  fingerKey,
  techniqueNames,
} from './core/timeline-schema.js';
export type {
  EngineWarning,
  FingerKey,
  FingerKeyframe,
  FingerTimeline,
  HandKeyframe,
  RightHandEvent,
  TimelineBarre,
  TimelineNote,
} from './core/timeline-schema.js';

export { checkKeyframes, checkPitches, checkSchema, validateCore } from './core/validate-core.js';
export type { ValidationIssue, ValidationResult } from './core/validate-core.js';

export type {
  Barre,
  BendSpec,
  Fret,
  HandConfig,
  InstrumentSpec,
  LHFinger,
  NoteEvent,
  ParsedPart,
  Placement,
  RHFinger,
  Stage,
  StringIndex,
  Technique,
  TechniqueLink,
  TimeSignatureChange,
} from './core/types.js';

/** The instrument the defaults describe, as a ready-made spec. */
export function defaultInstrument(): import('./core/types.js').InstrumentSpec {
  const { instrument } = DEFAULTS_REF;
  return {
    kind: 'guitar',
    numStrings: instrument.numStrings,
    tuning: [...instrument.tuning],
    capo: instrument.capo,
    numFrets: instrument.numFrets,
    scaleLengthMm: instrument.scaleLengthMm,
    nutSpacingMm: instrument.nutSpacingMm,
    bridgeSpacingMm: instrument.bridgeSpacingMm,
  };
}

import { DEFAULTS as DEFAULTS_REF } from './defaults.js';
