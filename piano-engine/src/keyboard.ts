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
import type { Hand, KeyRange, KeyboardSize, KeyboardSpan, PianoKey, PianoNote } from './types.js';

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

/**
 * The twelve note names, sharps throughout.
 *
 * Sharps and not flats because a keyboard has no key signature: the
 * black key between D and E is one key, and a learner looking for it on
 * the instrument is looking for "the one above D". Which of its two
 * names the SCORE uses is the score's business, and the notation engine
 * answers that; this is the name of a key.
 */
const NOTE_NAMES: readonly string[] = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

/**
 * What a key is called: 'D', 'D#', or with `octave`, 'C4'.
 *
 * The octave is MIDI's own, where 60 is C4 -- the convention every
 * piano app and every teacher uses, and the one already written on the
 * keyboard's own C keys.
 */
export function noteName(midi: number, options?: { readonly octave?: boolean }): string {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12] ?? '';
  if (options?.octave !== true) return name;
  return `${name}${Math.floor(midi / 12) - 1}`;
}

/** How many white keys lie between two MIDI numbers, both ends counted. */
export function whiteKeysBetween(first: number, last: number): number {
  let count = 0;
  for (let midi = first; midi <= last; midi += 1) if (!isBlackKey(midi)) count += 1;
  return count;
}

/**
 * The nearest white key at or outside a MIDI number.
 *
 * A keyboard that starts or ends on a black key is not a keyboard --
 * the black would hang off the end with nothing under it -- so every
 * window is snapped to whites before it is drawn.
 */
export function whiteOutward(midi: number, direction: -1 | 1): number {
  let m = midi;
  for (let i = 0; i < 3 && isBlackKey(m); i += 1) m += direction;
  return m;
}

export function keyboardRange(size: KeyboardSize): {
  first: number;
  last: number;
} {
  return KEYBOARD_RANGES[size] ?? KEYBOARD_RANGES[88];
}

/** A whole instrument or a window onto one, as the two notes it runs between. */
export function spanRange(span: KeyboardSpan): KeyRange {
  return typeof span === 'number' ? keyboardRange(span) : span;
}

/**
 * The stretch of keyboard a piece actually uses, for a frame too narrow
 * to show a whole one.
 *
 * Whole OCTAVES, C to B, and never fewer than two of them. Three
 * reasons, and the first is the one that matters: a keyboard that
 * started in the middle of an octave would have its C in a different
 * place for every piece, and the C is the one landmark a learner has.
 * Second, a window that hugged the notes exactly would jump about
 * between pieces that are nearly the same. Third, two octaves is the
 * least that still looks like a piano rather than like a row of
 * switches.
 *
 * Clamped to the instrument, so the window is always keys that exist.
 */
export function rangeForNotes(
  notes: readonly PianoNote[],
  options: { readonly size?: KeyboardSize; readonly minOctaves?: number } = {},
): KeyRange {
  const whole = keyboardRange(options.size ?? 88);
  if (notes.length === 0) return whole;

  const lowest = Math.min(...notes.map((note) => note.midi));
  const highest = Math.max(...notes.map((note) => note.midi));
  // Out to the C at or below the lowest note, and the B at or above the
  // highest: whole octaves, so every C sits where a C sits.
  let first = Math.floor(lowest / 12) * 12;
  let last = Math.floor(highest / 12) * 12 + 11;

  const minOctaves = Math.max(1, options.minOctaves ?? 2);
  // Grown a whole octave at a time, alternating sides, so a piece that
  // sits in one octave comes out centred rather than hard against one
  // end of its own window.
  let growUpward = true;
  while ((last + 1 - first) / 12 < minOctaves) {
    if (growUpward && last + 12 <= whole.last) last += 12;
    else if (first - 12 >= whole.first) first -= 12;
    else if (last + 12 <= whole.last) last += 12;
    else break;
    growUpward = !growUpward;
  }

  return { first: Math.max(whole.first, first), last: Math.min(whole.last, last) };
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
  size: KeyboardSpan,
  box: { x?: number; y?: number; width: number; height: number },
): readonly PianoKey[] {
  // A size names a whole instrument; a range names a stretch of one.
  // The hands design shows a stretch, because 88 keys across a phone
  // screen are four millimetres wide and the hands on them are specks.
  const { first, last } = spanRange(size);
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
export function whiteKeyCount(size: KeyboardSpan): number {
  const { first, last } = spanRange(size);
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
