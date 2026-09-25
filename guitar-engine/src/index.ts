/**
 * guitar-engine — the neck under the music.
 *
 * Built as a browser bundle (`GuitarEngine`) so a page can draw the
 * fretboard without a build step of its own, and kept free of any
 * notion of a score: notes arrive as a string, a fret and a finger, in
 * seconds, and this draws them.
 *
 * WHICH finger plays a note is not decided here. A score that writes a
 * fingering has already answered it; where one does not, that is the
 * Human Finger Engine's question, and this engine draws whatever it is
 * told -- including "nobody has said", which has its own colour.
 */
export {
  DEFAULT_FIRST_FRET,
  DEFAULT_LAST_FRET,
  DEFAULT_STRINGS,
  fretCenter,
  fretRange,
  fretWidth,
  boardHalfAt,
  fretWires,
  guitarLayout,
  inlayFrets,
  positionsAt,
  STANDARD_TUNING,
  stringCount,
  stringHalfAt,
  stringLines,
  stringName,
  stringYAt,
  tuningFor,
} from './fretboard.js';
export {
  ACOUSTIC_COLORS,
  SINGLE_CUT_COLORS,
  DEFAULT_COLORS,
  FINGER_COLORS,
  FINGER_NAMES,
  fingerColor,
  fretboardShapes,
  instrumentColors,
  markShapes,
  pickShapes,
  renderFretboard,
  renderGuitarStage,
  resolveColors,
  stageShapes,
} from './stage.js';
export { handShapes, renderHand } from './hand.js';
export type { HandOptions } from './hand.js';
export type {
  Finger,
  FretWire,
  FretboardOptions,
  GuitarColors,
  GuitarNote,
  GuitarStageOptions,
  Instrument,
  LivePosition,
  PickMark,
  StageShape,
  StringLine,
} from './types.js';
