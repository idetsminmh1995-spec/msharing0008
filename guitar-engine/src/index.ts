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
  boardEdgesAt,
  guitarLayout,
  inlayFrets,
  photoPlacement,
  positionsAt,
  stageHeightFor,
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
  CLASSICAL_COLORS,
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
export {
  ACOUSTIC_DRAWN,
  CLASSICAL_DRAWN,
  ELECTRIC_DRAWN,
  PHOTOS,
  guitarPhoto,
  photoFretCount,
  photoNamed,
} from './photo.js';
export type { GuitarPhotograph, PhotoMeasurements } from './photo.js';
export { HAND_PICTURE, handPicture, handShapes, renderHand } from './hand.js';
export type { HandOptions } from './hand.js';
export type { PhotoPlacement } from './fretboard.js';
export type {
  Finger,
  HandPicture,
  Picking,
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
