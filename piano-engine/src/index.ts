/**
 * piano-engine — the keyboard under the music.
 *
 * Built as a browser bundle (`PianoEngine`) so a page can draw the
 * stage without a build step of its own, and kept free of any notion
 * of a score: notes arrive as MIDI numbers in seconds, with a hand
 * attached, and this draws them.
 */
export {
  KEYBOARD_RANGES,
  KEYBOARD_SIZES,
  isBlackKey,
  keyboardGeometry,
  keyboardRange,
  pressedAt,
  whiteKeyCount,
} from './keyboard.js';
export {
  DEFAULT_COLORS,
  DEFAULT_LEAD_SECONDS,
  fallingBars,
  handColor,
  keyboardBox,
  renderKeyboardSvg,
  renderPianoStage,
  resolveColors,
  stageShapes,
} from './stage.js';
export type {
  FallingBar,
  Hand,
  KeyboardSize,
  PianoColors,
  PianoKey,
  PianoNote,
  PianoStageOptions,
  StageShape,
} from './types.js';
