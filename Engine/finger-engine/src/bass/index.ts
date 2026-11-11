/**
 * index.ts — the bass engine's front door (Plan Part 01 §3).
 *
 * Phase B0 only. What is here is everything the engine needs to know
 * BEFORE it decides a single fingering: which instrument the part is
 * for, which octave it is written in, and how a bass neck measures.
 * `analyzeBass` arrives with Phase B1; there is deliberately no stub
 * of it here, because a function that returns an empty timeline is
 * harder to notice than one that does not exist.
 *
 * [README rule 8] `bass/` never imports from `guitar/`. Everything
 * both need lives in `core/`.
 */
export { BASS_DEFAULTS } from './defaults.js';
export type { BassDefaults } from './defaults.js';
export {
  BASS_SCALES,
  BASS_STRING_SPREAD,
  BASS_TUNINGS,
  bassBottomPitch,
  bassFretDistanceMm,
  bassFretWidthMm,
  bassGeometry,
  bassInstrument,
  bassTopPitch,
  firstFretWithin,
  shapeSpanMm,
} from './instrument.js';
export type { BassInstrumentOptions, BassScaleId, BassTuningId } from './instrument.js';
export { decideOctave, octaveFromRange, octaveFromTab } from './octave.js';
export type {
  OctaveDecision,
  OctaveInput,
  OctaveSource,
  RangeOptions,
  TabbedNote,
} from './octave.js';
export { instrumentFromSuggestion, outOfRange, suggestBassInstrument } from './suggest.js';
export type { BassSuggestion, SuggestOptions } from './suggest.js';
