/**
 * pianoGeometry.ts — a real piano, in millimetres.
 *
 * `piano-engine/src/keyboard.ts` already lays a keyboard out, and this
 * is NOT a replacement for it. That one divides whatever box a page
 * gives it and answers in drawing units, which is exactly right for
 * drawing. This one answers in millimetres of a real instrument,
 * because the questions a hand asks cannot be put any other way: can
 * finger 5 reach that key without the hand leaving this one, how far
 * does a thumb travel passing under, how high does a finger have to
 * lift to clear a black key. A fraction of a box cannot answer any of
 * them, and the answer changes if the video is a different size.
 *
 * The two agree on the things they share -- which keys exist, and which
 * are black -- because those come from the same arithmetic, and the
 * renderer maps millimetres onto whatever box the page drew.
 *
 *
 * WHERE THE NUMBERS COME FROM
 *
 * The one measurement everything else follows from is the octave span,
 * which is standardised: seven white keys to 165mm, so a white key is
 * 23.571mm wide. Every other dimension here is a standard acoustic
 * piano's, and each says what it is below rather than sitting as a bare
 * number.
 *
 * ONE SIMPLIFICATION, STATED. A real piano's black keys are not evenly
 * spaced: within each group they sit slightly off the line between
 * their white neighbours, so that the white keys' tails come out usable
 * widths. This models them CENTRED on that line instead. The error is
 * about a millimetre, it is the same model `piano-engine` draws, and
 * the two matching matters more here than a millimetre does -- a hand
 * drawn over a key it is not on is worse than a hand on a key that is
 * a millimetre off. `BLACK_KEY_OFFSETS` is where the real offsets would
 * go, and nothing else would have to change.
 */

import type { PianoKey3D } from '../core/types.js';

/** Seven white keys to an octave, the span every piano is built to. */
export const OCTAVE_SPAN_MM = 165;
export const WHITE_KEY_WIDTH_MM = OCTAVE_SPAN_MM / 7;

/** Front edge to the fallboard: the whole playing surface of a white key. */
export const WHITE_KEY_DEPTH_MM = 150;

/**
 * A black key is narrower and shorter, and it stands proud.
 *
 * The rise is what makes a black key a different thing to reach: a
 * finger going to one has to clear 11mm that is not there over a white
 * key, and a thumb passing under has to get below it.
 */
export const BLACK_KEY_WIDTH_MM = 11;
export const BLACK_KEY_DEPTH_MM = 95;
export const BLACK_KEY_RISE_MM = 11;

/** How far a key travels when it is pressed all the way down. */
export const KEY_DIP_MM = 10;

/**
 * Where each black key sits relative to the line between its white
 * neighbours, in millimetres, positive to the right.
 *
 * All zero: the simplification this file's header states. They are
 * named rather than absent so that filling them in is a change to a
 * table and not a change to the geometry.
 */
export const BLACK_KEY_OFFSETS: Readonly<Record<number, number>> = {
  1: 0, // C#
  3: 0, // D#
  6: 0, // F#
  8: 0, // G#
  10: 0, // A#
};

/** The five black keys of every octave, as semitones above C. */
const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);

export function isBlackKey(midi: number): boolean {
  return BLACK_PITCH_CLASSES.has(pitchClass(midi));
}

export function pitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

/**
 * The instruments this engine knows, as the ranges they really have.
 *
 * The same four `piano-engine` draws, and the same first/last notes --
 * a 61 starts on a C, a 73 and a 76 on an E, and getting that wrong
 * puts every note a few semitones off its key.
 */
export const KEYBOARD_RANGES: Readonly<Record<number, { first: number; last: number }>> = {
  61: { first: 36, last: 96 },
  73: { first: 28, last: 100 },
  76: { first: 28, last: 103 },
  88: { first: 21, last: 108 },
};

export type KeyboardSize = 61 | 73 | 76 | 88;

export interface KeyboardRange {
  readonly first: number;
  readonly last: number;
}

export function keyboardRange(size: KeyboardSize | KeyboardRange): KeyboardRange {
  if (typeof size === 'number') return KEYBOARD_RANGES[size] ?? KEYBOARD_RANGES[88]!;
  return size;
}

/**
 * How many white keys lie strictly below a MIDI note, counted from C-1
 * (MIDI 0), with a black key folded onto the white key below it.
 *
 * This is the ruler the whole file measures x with: white keys are the
 * only evenly-spaced thing on a piano, so every position is "how many
 * white keys from the end", and a black key's own x is then an offset
 * from the boundary between two of them.
 */
export function whiteIndex(midi: number): number {
  const WHITES_BELOW: readonly number[] = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
  const octave = Math.floor(midi / 12);
  return octave * 7 + (WHITES_BELOW[pitchClass(midi)] ?? 0);
}

/** The lowest MIDI note at or above `midi` that is a white key -- a black key's right-hand neighbour. */
function whiteAbove(midi: number): number {
  return isBlackKey(midi) ? midi + 1 : midi;
}

export interface KeyboardGeometryOptions {
  readonly size?: KeyboardSize | KeyboardRange;
  /**
   * Where the instrument's left edge sits on the x axis, in mm.
   *
   * 0 by default, so x reads as "millimetres from the bottom of this
   * keyboard". A renderer showing a window onto a larger instrument
   * sets it so that x stays comparable between the two.
   */
  readonly originX?: number;
}

/**
 * Every key of the instrument, left to right, whites then blacks.
 *
 * Whites first for the same reason a piano is built that way: anything
 * painting them in order gets the blacks over the whites. The list is a
 * fact about the instrument and does not depend on any drawing, so it
 * is worth computing once and keeping -- `keyPosition.ts` indexes it.
 */
export function keyboardGeometry3D(options: KeyboardGeometryOptions = {}): readonly PianoKey3D[] {
  const { first, last } = keyboardRange(options.size ?? 88);
  const originX = options.originX ?? 0;
  const firstWhiteIndex = whiteIndex(whiteAbove(first));

  const whites: PianoKey3D[] = [];
  const blacks: PianoKey3D[] = [];

  for (let midi = first; midi <= last; midi++) {
    if (isBlackKey(midi)) {
      // Centred on the boundary between the two whites it sits between,
      // which is the right-hand one's left edge.
      const boundary = originX + (whiteIndex(midi + 1) - firstWhiteIndex) * WHITE_KEY_WIDTH_MM;
      const offset = BLACK_KEY_OFFSETS[pitchClass(midi)] ?? 0;
      blacks.push({
        midi,
        x: boundary - BLACK_KEY_WIDTH_MM / 2 + offset,
        y: BLACK_KEY_RISE_MM,
        // Flush with the white keys at the BACK, not the front: a black
        // key is short at the player's end, which is the whole reason a
        // thumb can sit in front of one.
        z: WHITE_KEY_DEPTH_MM - BLACK_KEY_DEPTH_MM,
        width: BLACK_KEY_WIDTH_MM,
        depth: BLACK_KEY_DEPTH_MM,
        isBlack: true,
      });
    } else {
      whites.push({
        midi,
        x: originX + (whiteIndex(midi) - firstWhiteIndex) * WHITE_KEY_WIDTH_MM,
        y: 0,
        z: 0,
        width: WHITE_KEY_WIDTH_MM,
        depth: WHITE_KEY_DEPTH_MM,
        isBlack: false,
      });
    }
  }
  return [...whites, ...blacks];
}

/** How wide the whole instrument is, in millimetres. */
export function keyboardWidthMm(size: KeyboardSize | KeyboardRange = 88): number {
  const { first, last } = keyboardRange(size);
  return whiteKeyCount({ first, last }) * WHITE_KEY_WIDTH_MM;
}

export function whiteKeyCount(size: KeyboardSize | KeyboardRange = 88): number {
  const { first, last } = keyboardRange(size);
  let count = 0;
  for (let midi = first; midi <= last; midi++) {
    if (!isBlackKey(midi)) count++;
  }
  return count;
}
