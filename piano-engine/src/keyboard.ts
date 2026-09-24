/**
 * keyboard.ts — where the keys are.
 *
 * Pure geometry, in the box it is given. It is exported because two
 * different renderers need the SAME answer: the page draws the stage
 * as SVG, and the video engine paints the moving parts straight onto
 * a canvas. Two copies of this maths would drift, and a lit key that
 * sits a pixel left of its own key is exactly the kind of thing
 * nobody notices until it is in a published video.
 */
import type { Hand, KeyboardSize, PianoKey, PianoNote } from './types.js';

/**
 * The four sizes, as the ranges those instruments really have.
 *
 * 88 is the full piano, A0 to C8. The others are the common cut-downs,
 * and they are NOT simply the middle of the piano: a 61 starts on a C,
 * a 73 and a 76 start on an E. Getting this wrong puts every note on
 * the wrong key by a few semitones, which looks like the engine cannot
 * read the score.
 */
export const KEYBOARD_RANGES: Readonly<Record<KeyboardSize, { first: number; last: number }>> = {
  61: { first: 36, last: 96 }, // C2 - C7
  73: { first: 28, last: 100 }, // E1 - E7
  76: { first: 28, last: 103 }, // E1 - G7
  88: { first: 21, last: 108 }, // A0 - C8
};

export const KEYBOARD_SIZES: readonly KeyboardSize[] = [61, 73, 76, 88];

/** The five black keys of every octave, as semitones above C. */
const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);

export function isBlackKey(midi: number): boolean {
  return BLACK_PITCH_CLASSES.has(((midi % 12) + 12) % 12);
}

export function keyboardRange(size: KeyboardSize): {
  first: number;
  last: number;
} {
  return KEYBOARD_RANGES[size] ?? KEYBOARD_RANGES[88];
}

/** How wide a black key is, as a fraction of a white one. */
const BLACK_WIDTH = 0.62;
/** How far down the keyboard a black key reaches. */
const BLACK_HEIGHT = 0.62;

/**
 * Every key of a keyboard, laid out left to right in a box.
 *
 * White keys share the width equally; a black key straddles the line
 * between the two whites it sits between. Black keys come LAST in the
 * list so that drawing it in order paints them over the whites, which
 * is the order a piano is built in.
 */
export function keyboardGeometry(
  size: KeyboardSize,
  box: { x?: number; y?: number; width: number; height: number },
): readonly PianoKey[] {
  const { first, last } = keyboardRange(size);
  const originX = box.x ?? 0;
  const originY = box.y ?? 0;

  const whites: number[] = [];
  for (let midi = first; midi <= last; midi++) {
    if (!isBlackKey(midi)) whites.push(midi);
  }
  if (whites.length === 0 || !(box.width > 0) || !(box.height > 0)) return [];

  const whiteWidth = box.width / whites.length;
  const whiteX = new Map<number, number>();
  whites.forEach((midi, index) => whiteX.set(midi, originX + index * whiteWidth));

  const keys: PianoKey[] = [];
  for (const midi of whites) {
    keys.push({
      midi,
      black: false,
      x: whiteX.get(midi) ?? originX,
      y: originY,
      width: whiteWidth,
      height: box.height,
    });
  }

  const blackWidth = whiteWidth * BLACK_WIDTH;
  for (let midi = first; midi <= last; midi++) {
    if (!isBlackKey(midi)) continue;
    // The white key on its right: a black key is drawn centred on the
    // join between that key and the one before it.
    const rightWhite = whiteX.get(midi + 1);
    if (rightWhite === undefined) continue;
    keys.push({
      midi,
      black: true,
      x: rightWhite - blackWidth / 2,
      y: originY,
      width: blackWidth,
      height: box.height * BLACK_HEIGHT,
    });
  }
  return keys;
}

/** The white keys of a size, which is what decides how wide a key is. */
export function whiteKeyCount(size: KeyboardSize): number {
  const { first, last } = keyboardRange(size);
  let count = 0;
  for (let midi = first; midi <= last; midi++) {
    if (!isBlackKey(midi)) count++;
  }
  return count;
}

/**
 * Which keys are down at a moment, and which hand is holding them.
 *
 * A key held by both hands reads as the RIGHT hand, because that is
 * the part a viewer is usually following; one key cannot show two
 * colours, and picking silently is better than drawing one twice.
 */
export function pressedAt(notes: readonly PianoNote[], seconds: number): ReadonlyMap<number, Hand> {
  const down = new Map<number, Hand>();
  for (const note of notes) {
    if (note.startSeconds > seconds || note.endSeconds <= seconds) continue;
    if (note.hand === 'right' || !down.has(note.midi)) down.set(note.midi, note.hand);
  }
  return down;
}
