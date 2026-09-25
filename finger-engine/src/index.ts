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
 * PHASE 0 (foundations) is what exists here: the data model,
 * geometry, tuning and string-numbering conversions, tempo, seeded
 * RNG, the timeline contract and the core validator. The input
 * adapters, the solver and the motion planner are Phases 1-3 and are
 * deliberately absent -- the plan says one phase at a time.
 */
export { DEFAULTS, configHash, mergeConfig } from './defaults.js';
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
