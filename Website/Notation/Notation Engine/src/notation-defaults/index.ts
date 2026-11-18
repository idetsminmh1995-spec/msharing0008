/**
 * notation-defaults/ — this engine's own notation data.
 *
 * Everything the renderer needs that is DATA rather than algorithm lives
 * here: which glyph draws a clef, which line a drum sits on, how much
 * room a quarter note gets, the open strings of a guitar. It is this
 * project's own expression of public facts (General MIDI, SMuFL,
 * MusicXML, standard tunings) plus the house engraving decisions, with
 * the source of each value named beside it.
 *
 * See `sources.ts` for where every value comes from and `README.md` for
 * how to use it and how to add to it.
 */

export { PUBLIC_SOURCES, sourceUrl } from './sources.js';
export type { PublicSource, PublicSourceId, DefaultsSource, Confidence } from './sources.js';

export {
  CLEF_TABLE,
  clefById,
  clefForMusicXml,
  CLEF_TABLE_SOURCE,
  CLEF_PITCH_SOURCE,
} from './clefs.js';
export type { ClefDefinition, ClefStaffGroup } from './clefs.js';

export {
  absStep,
  lineForPitch,
  staffPositionFromLine,
  lineFromStaffPosition,
  staffPositionForPitch,
  needsLedgerLines,
  pitchedClefs,
  ABS_STEP_SOURCE,
  REL_STEP_SOURCE,
  LEDGER_LINE_SOURCE,
} from './staff-position.js';

export {
  NOTEHEAD_GROUPS,
  MUSICXML_NOTEHEAD_TO_GROUP,
  noteheadGlyph,
  groupForMusicXmlNotehead,
  NOTEHEAD_GROUP_SOURCE,
  MUSICXML_NOTEHEAD_SOURCE,
} from './noteheads.js';
export type { NoteheadGroup, NoteheadType } from './noteheads.js';

export {
  STANDARD_DRUM_KIT,
  drumKitEntry,
  applyDrumOverrides,
  DRUM_KIT_SOURCE,
  DRUM_NOTATION_SOURCE,
} from './drum-kit.js';
export type { DrumKitEntry, DrumKitOverride, DrumKitOverrides, StemDirection } from './drum-kit.js';

export {
  STRING_DATA,
  stringData,
  stringIndexFromLowest,
  writtenPitchFor,
  fretFor,
  GUITAR_TUNINGS,
  tuningsForStrings,
  STAFF_TYPES,
  STRING_DATA_SOURCE,
  FRET_SOURCE,
} from './strings.js';
export type { StringData, TuningPreset, StaffTypePreset } from './strings.js';

export {
  ENGRAVING_STYLE,
  SPATIUM_MM,
  STYLE_SOURCE,
  BEAM_SPACING_SOURCE,
} from './engraving-style.js';

export {
  QUARTER_NOTE_SPACE,
  durationStretch,
  eventSpace,
  segmentStretch,
  segmentSpace,
  positions,
  SPACING_SOURCE,
  SEGMENT_STRETCH_SOURCE,
} from './spacing-law.js';
export type { SpacingSegment, SegmentOptions } from './spacing-law.js';

export { drumMapping } from './adapters.js';
