/**
 * musescore/ — MuseScore's own notation data, re-expressed.
 *
 * See `provenance.ts` for what this layer is, where every number came
 * from, and the licensing position. See `README.md` in this folder for
 * how to use it and how to add to it.
 *
 * Nothing here is imported by the renderer. It is a reference and an
 * opt-in: `adapters.ts` turns it into this engine's own config shapes
 * for a host that wants MuseScore's answers instead of the engine's.
 */

export { MUSESCORE_REVISION, blobUrl } from './provenance.js';
export type { MuseScoreSource, Confidence } from './provenance.js';

export {
  MUSESCORE_CLEFS,
  museScoreClef,
  museScoreClefForMusicXml,
  CLEF_TABLE_SOURCE,
  STAFF_POSITION_SOURCE,
  MUSICXML_CLEF_SOURCE,
} from './clefs.js';
export type { MuseScoreClef, MuseScoreStaffGroup } from './clefs.js';

export {
  absStep,
  museScoreLine,
  museScoreStaffPosition,
  staffPositionFromLine,
  lineFromStaffPosition,
  needsLedgerLines,
  pitchedClefs,
  ABS_STEP_SOURCE,
  REL_STEP_SOURCE,
  LEDGER_LINE_SOURCE,
} from './staff-position.js';

export {
  MUSESCORE_NOTEHEAD_GROUPS,
  MUSICXML_NOTEHEAD_TO_GROUP,
  museScoreNoteheadGlyph,
  museScoreGroupForMusicXmlNotehead,
  NOTEHEAD_GROUP_SOURCE,
  NOTEHEAD_ENUM_SOURCE,
  MUSICXML_NOTEHEAD_SOURCE,
} from './noteheads.js';
export type { MuseScoreNoteheadGroup, MuseScoreHeadType } from './noteheads.js';

export { MUSESCORE_DRUMSET, museScoreDrum, DRUMSET_SOURCE, DRUM_NAME_SOURCE } from './drumset.js';
export type { MuseScoreDrum, MuseScoreStemDirection } from './drumset.js';

export {
  MUSESCORE_STRING_DATA,
  MUSESCORE_GUITAR_TUNINGS,
  MUSESCORE_STAFF_TYPES,
  museScoreStringData,
  museScoreTuningsForStrings,
  stringIndexFromLowest,
  writtenPitchFor,
  fretFor,
  STRING_DATA_SOURCE,
  STRING_INDEX_SOURCE,
  TUNING_PRESET_SOURCE,
  TAB_STAFF_SOURCE,
} from './strings.js';
export type {
  MuseScoreStringData,
  MuseScoreTuningPreset,
  MuseScoreStaffTypePreset,
} from './strings.js';

export { MUSESCORE_STYLE, STYLE_SOURCE, BEAM_SPACING_SOURCE } from './style.js';

export {
  QUARTER_NOTE_SPACE,
  museScoreDurationStretch,
  museScoreEventSpace,
  museScoreSegmentStretch,
  museScoreSegmentSpace,
  museScorePositions,
  SPACING_SOURCE,
  SEGMENT_STRETCH_SOURCE,
} from './spacing.js';
export type { MuseScoreSegment, MuseScoreSegmentOptions } from './spacing.js';

export {
  NOTEHEAD_GROUP_TO_SHAPE,
  noteheadForDrum,
  stemDirectionForDrum,
  drumMappingFromMuseScore,
  drumVoicesFromMuseScore,
} from './adapters.js';

export { applyDrumOverrides } from './overrides.js';
export type { DrumOverride, MuseScoreOverrides } from './overrides.js';
