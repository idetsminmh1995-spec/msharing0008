/**
 * colors.ts — the palette, and the one rule about it.
 *
 * Its own file because two drawings need it and neither should own
 * it: the marks on the neck ask what colour a finger is, and the
 * little hand in the legend asks the same. With the palette living in
 * one of them, the other would have to import the whole drawing to
 * read four hex values.
 */
import type { Finger, GuitarColors } from './types.js';

/**
 * The finger colours are the ones on the hand: thumb amber, index
 * red, middle blue, ring green, little pink.
 *
 * They are FIXED rather than pickable, because their whole job is to
 * be learnt once -- a viewer who has seen the hand knows what red
 * means for the rest of the video, and for the next video too. Four
 * colours anyone can re-pick is four colours nobody can learn.
 *
 * Four of them are read off the page's own drawing of the hand, to
 * the hex. The legend is what teaches the code, so a mark that is a
 * shade off the digit it is naming is a mark that has to be worked
 * out rather than recognised -- and the little finger was YELLOW
 * here until that drawing arrived with a pink one. The thumb's amber
 * is the engine's own, picked to sit apart from the other four at a
 * glance; it is one line here to change.
 */
export const FINGER_COLORS = {
  thumb: '#FFC93C',
  index: '#FF725F',
  middle: '#6EB2FF',
  ring: '#3FE489',
  little: '#FF7DE4',
} as const;

/**
 * What is left of the palette, now that the guitar is a picture.
 *
 * The engine used to draw an instrument out of shapes and gradients,
 * and most of this file was the wood, the binding, the hardware and
 * the sunburst on the body. None of that is drawn any more: the page
 * hands over a drawing of a real guitar and the engine puts the
 * PLAYING on top of it. What is left is the ink.
 */
export const DEFAULT_COLORS: GuitarColors = {
  fretNumber: 'rgba(255,255,255,0.34)',
  pick: '#F7F4F0',
  unassigned: '#F7F4F0',
  open: '#9AA6B2',
  ...FINGER_COLORS,
  background: 'none',
};

export function resolveColors(colors?: Partial<GuitarColors>): GuitarColors {
  return { ...DEFAULT_COLORS, ...(colors ?? {}) };
}

/**
 * The colour a finger is drawn in.
 *
 * An unanswered note is NOT given a finger's colour: it gets its own,
 * so a video never says "little finger" about a note nobody has
 * decided yet.
 */
export function fingerColor(finger: Finger | undefined, colors: GuitarColors): string {
  switch (finger) {
    case 0:
      return colors.open;
    case 'T':
      return colors.thumb;
    case 1:
      return colors.index;
    case 2:
      return colors.middle;
    case 3:
      return colors.ring;
    case 4:
      return colors.little;
    default:
      return colors.unassigned;
  }
}

/** The names, in the order a hand has them. Exported so a page's legend and this engine agree. */
export const FINGER_NAMES: Readonly<Record<1 | 2 | 3 | 4, string>> = {
  1: 'Index',
  2: 'Middle',
  3: 'Ring',
  4: 'Little',
};
