/**
 * colors.ts — the palette, and the one rule about it.
 *
 * Its own file because two drawings need it and neither should own
 * it: the neck asks what colour its wood is, and the little hand in
 * the legend asks what colour each finger is. With the palette living
 * in one of them, the other would have to import the whole drawing to
 * read four hex values.
 */
import { modelColors } from './instrument.js';
import type { Finger, GuitarColors, Instrument } from './types.js';

/**
 * The finger colours are the ones on the hand: index red, middle
 * blue, ring green, little yellow.
 *
 * They are FIXED rather than pickable, because their whole job is to
 * be learnt once -- a viewer who has seen the hand knows what red
 * means for the rest of the video, and for the next video too. Four
 * colours anyone can re-pick is four colours nobody can learn.
 */
export const FINGER_COLORS = {
  index: '#E8352B',
  middle: '#2B5BE8',
  ring: '#1FA04A',
  little: '#F2C200',
} as const;

/**
 * The default guitar: a maple-necked electric.
 *
 * Light board, black dots, a white scratchplate and three single
 * coils -- the instrument most people picture when they hear
 * "electric guitar", and the one the page opens on.
 */
export const DEFAULT_COLORS: GuitarColors = {
  board: '#D9AE6B',
  boardDark: '#B0813F',
  boardEdge: '#6B4A22',
  neckWood: '#E3BE80',
  neckWoodDark: '#B98C4A',
  binding: '#F2E6CE',
  fretWire: '#F0ECE6',
  fretShadow: 'rgba(0,0,0,0.42)',
  nut: '#F5EEDF',
  inlay: '#2E2018',
  inlayEdge: 'rgba(0,0,0,0.4)',
  string: '#E4DACA',
  stringShine: 'rgba(255,255,255,0.75)',
  fretNumber: 'rgba(255,255,255,0.34)',
  headstock: '#D9AE6B',
  headstockEdge: '#8A6430',
  peg: '#E0DCD5',
  pegPost: '#A8A29A',
  stringLabel: '#F1E7DC',
  stringLabelInk: '#20130D',
  body: '#171717',
  bodyEdge: '#000000',
  bodyBurst: '#2A0F0A',
  bodyCentre: '#3A3A3A',
  pickguard: '#F3F0E6',
  pickguardEdge: '#BEB8A8',
  soundhole: '#140B07',
  rosette: '#C9A227',
  pickup: '#EFE8D6',
  pickupPole: '#9A958C',
  hardware: '#D6D1CA',
  hardwareDark: '#6E6963',
  knob: '#F0EBE1',
  pick: '#F7F4F0',
  unassigned: '#F7F4F0',
  open: '#9AA6B2',
  ...FINGER_COLORS,
  background: 'none',
};

export { ACOUSTIC_COLORS, SINGLE_CUT_COLORS } from './instrument.js';

export function instrumentColors(instrument: Instrument | undefined): Partial<GuitarColors> {
  return modelColors(instrument);
}

export function resolveColors(
  colors?: Partial<GuitarColors>,
  instrument?: Instrument,
): GuitarColors {
  return { ...DEFAULT_COLORS, ...instrumentColors(instrument), ...(colors ?? {}) };
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
