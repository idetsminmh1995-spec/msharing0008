/**
 * strings.ts — fretted-instrument string data and tab arithmetic.
 *
 * Three things a tab staff cannot be drawn without, and one convention
 * that is easy to get backwards.
 *
 * **Open-string pitches are the WRITTEN pitches, not the sounding
 * ones.** For most fretted instruments the two are the same: an electric
 * guitar has no transposition (its octave is carried by an 8vb treble
 * clef), so its strings are listed at the pitches they sound, 40 to 64.
 * An electric bass does transpose — its lowest string is written E2 (40)
 * although it sounds E1 (28). `writtenPitchFor` reconciles the two, and
 * it is the difference between a bass fingering that is right and one
 * that is an octave out.
 *
 * **String 1 is the HIGHEST string**, matching how a player counts them,
 * so the top line of a tab staff is string 1. `stringIndexFromLowest`
 * converts to a lowest-first index for the finger engines.
 *
 * The pitches are standard tuning practice; the fret arithmetic follows
 * from the definition of a fret as one semitone.
 */

import type { DefaultsSource } from './sources.js';

export const STRING_DATA_SOURCE: DefaultsSource = {
  source: 'tunings',
  symbol: 'standard tuning',
  what: 'open-string pitches and fret counts for fretted instruments',
};

export const FRET_SOURCE: DefaultsSource = {
  source: 'tunings',
  symbol: 'equal temperament',
  what: 'a fret is one semitone, so fret = written pitch - open string',
};

export interface StringData {
  /** This engine's own stable id, e.g. `electric-guitar`. */
  readonly id: string;
  readonly name: string;
  /** How many frets the instrument has. */
  readonly frets: number;
  /**
   * Open-string WRITTEN pitches, lowest first — the order an instrument
   * is described in. String 1 is the highest; see `stringIndexFromLowest`.
   */
  readonly openStrings: readonly number[];
  /** The clef a concert-pitch score uses, as a `clefs.ts` id. */
  readonly concertClef?: string;
  /** The clef a transposed score uses, as a `clefs.ts` id. */
  readonly transposingClef?: string;
  /** Semitones the written pitch is above the sounding one, negative. */
  readonly transposeChromatic: number;
}

/**
 * The fretted instruments this engine plays: guitars, basses, ukuleles,
 * mandolin and banjos, all in standard tuning.
 */
export const STRING_DATA: readonly StringData[] = [
  {
    id: 'electric-guitar',
    name: 'Electric Guitar',
    frets: 24,
    openStrings: [40, 45, 50, 55, 59, 64],
    concertClef: 'treble8vb',
    transposingClef: 'treble8vb',
    transposeChromatic: 0,
  },
  {
    id: 'guitar-steel',
    name: 'Acoustic Guitar',
    frets: 20,
    openStrings: [40, 45, 50, 55, 59, 64],
    concertClef: 'treble8vb',
    transposingClef: 'treble8vb',
    transposeChromatic: 0,
  },
  {
    id: 'guitar-nylon',
    name: 'Classical Guitar',
    frets: 19,
    openStrings: [40, 45, 50, 55, 59, 64],
    concertClef: 'treble8vb',
    transposingClef: 'treble8vb',
    transposeChromatic: 0,
  },
  {
    id: 'baritone-guitar',
    name: 'Baritone Guitar',
    frets: 19,
    openStrings: [35, 40, 45, 50, 54, 59],
    concertClef: 'treble8vb',
    transposingClef: 'treble8vb',
    transposeChromatic: 0,
  },
  {
    id: '7-string-guitar',
    name: '7-string Guitar',
    frets: 19,
    openStrings: [35, 40, 45, 50, 55, 59, 64],
    concertClef: 'treble8vb',
    transposingClef: 'treble8vb',
    transposeChromatic: 0,
  },
  {
    id: '12-string-guitar',
    name: '12-string Guitar',
    frets: 21,
    openStrings: [40, 45, 50, 55, 59, 64],
    concertClef: 'treble8vb',
    transposingClef: 'treble8vb',
    transposeChromatic: 0,
  },
  {
    id: 'bass-guitar',
    name: 'Bass Guitar',
    frets: 24,
    openStrings: [40, 45, 50, 55],
    concertClef: 'bass8vb',
    transposingClef: 'bass',
    transposeChromatic: -12,
  },
  {
    id: 'electric-bass',
    name: 'Electric Bass',
    frets: 24,
    openStrings: [40, 45, 50, 55],
    concertClef: 'bass8vb',
    transposingClef: 'bass',
    transposeChromatic: -12,
  },
  {
    id: 'acoustic-bass',
    name: 'Acoustic Bass',
    frets: 24,
    openStrings: [40, 45, 50, 55],
    concertClef: 'bass8vb',
    transposingClef: 'bass',
    transposeChromatic: -12,
  },
  {
    id: 'fretless-electric-bass',
    name: 'Fretless Electric Bass',
    frets: 24,
    openStrings: [28, 33, 38, 43],
    concertClef: 'bass8vb',
    transposingClef: 'bass',
    transposeChromatic: -12,
  },
  {
    id: '5-string-electric-bass',
    name: '5-str. Electric Bass',
    frets: 24,
    openStrings: [35, 40, 45, 50, 55],
    concertClef: 'bass8vb',
    transposingClef: 'bass',
    transposeChromatic: -12,
  },
  {
    id: '5-string-electric-bass-high-c',
    name: '5-str. Electric Bass (high C/tenor)',
    frets: 24,
    openStrings: [40, 45, 50, 55, 60],
    concertClef: 'bass8vb',
    transposingClef: 'bass',
    transposeChromatic: -12,
  },
  {
    id: '6-string-electric-bass',
    name: '6-str. Electric Bass',
    frets: 24,
    openStrings: [35, 40, 45, 50, 55, 60],
    concertClef: 'bass8vb',
    transposingClef: 'bass',
    transposeChromatic: -12,
  },
  {
    id: 'ukulele',
    name: 'Ukulele',
    frets: 18,
    openStrings: [67, 60, 64, 69],
    concertClef: 'treble',
    transposingClef: 'treble',
    transposeChromatic: 0,
  },
  {
    id: 'ukulele-low-g',
    name: 'Ukulele (low G)',
    frets: 18,
    openStrings: [55, 60, 64, 69],
    concertClef: 'treble',
    transposingClef: 'treble',
    transposeChromatic: 0,
  },
  {
    id: 'baritone-ukulele',
    name: 'Baritone Ukulele',
    frets: 18,
    openStrings: [50, 55, 59, 64],
    concertClef: 'treble8vb',
    transposingClef: 'treble8vb',
    transposeChromatic: 0,
  },
  {
    id: 'tenor-ukulele',
    name: 'Tenor Ukulele',
    frets: 18,
    openStrings: [67, 60, 64, 69],
    concertClef: 'treble',
    transposingClef: 'treble',
    transposeChromatic: 0,
  },
  {
    id: 'mandolin',
    name: 'Mandolin',
    frets: 24,
    openStrings: [55, 62, 69, 76],
    concertClef: 'treble',
    transposingClef: 'treble',
    transposeChromatic: 0,
  },
  {
    id: 'banjo',
    name: 'Banjo',
    frets: 19,
    openStrings: [67, 50, 55, 59, 62],
    concertClef: 'treble8vb',
    transposingClef: 'treble8vb',
    transposeChromatic: 0,
  },
  {
    id: 'tenor-banjo',
    name: 'Tenor Banjo',
    frets: 19,
    openStrings: [48, 55, 62, 69],
    concertClef: 'treble8vb',
    transposingClef: 'treble8vb',
    transposeChromatic: 0,
  },
  {
    id: 'irish-tenor-banjo',
    name: 'Irish Tenor Banjo',
    frets: 19,
    openStrings: [43, 50, 57, 64],
    concertClef: 'treble8vb',
    transposingClef: 'treble8vb',
    transposeChromatic: 0,
  },
];

const BY_ID = new Map(STRING_DATA.map((s) => [s.id, s]));

/** One instrument's string data by id. */
export function stringData(id: string): StringData | undefined {
  return BY_ID.get(id);
}

/**
 * The index of a string counted from the lowest (1-based) in a
 * highest-first list — i.e. the position of that string in
 * `openStrings`, which is lowest-first.
 */
export function stringIndexFromLowest(stringFromLowest: number, stringCount: number): number {
  return stringCount - stringFromLowest;
}

/**
 * The WRITTEN pitch of a sounding pitch on this instrument.
 *
 * For an electric bass (transpose -12) a sounding E1 (28) is written E2
 * (40), and 40 - 40 = fret 0 on the open low string.
 */
export function writtenPitchFor(data: StringData, soundingPitch: number): number {
  return soundingPitch - data.transposeChromatic;
}

/**
 * The fret a WRITTEN pitch lands on, on one string (1 = lowest), or
 * undefined where it does not reach.
 */
export function fretFor(
  data: StringData,
  writtenPitch: number,
  stringFromLowest: number,
): number | undefined {
  const open = data.openStrings[stringFromLowest - 1];
  if (open === undefined) return undefined;
  const fret = writtenPitch - open;
  return fret < 0 || fret > data.frets ? undefined : fret;
}

export interface TuningPreset {
  /** How many strings it is for. */
  readonly strings: number;
  readonly name: string;
  /** Open-string written pitches, lowest first. */
  readonly pitches: readonly number[];
}

/**
 * Named guitar tunings this engine offers: standard first in each string
 * count, then the common alternates (drop tunings, open tunings, and the
 * half/whole-step-down sets).
 */
export const GUITAR_TUNINGS: readonly TuningPreset[] = [
  { strings: 5, name: 'Standard', pitches: [40, 45, 50, 55, 59] },
  { strings: 5, name: 'Hi C', pitches: [40, 45, 50, 55, 60] },
  { strings: 5, name: 'Baritone', pitches: [36, 43, 50, 57, 64] },
  { strings: 5, name: 'Open G', pitches: [43, 50, 55, 59, 62] },
  { strings: 6, name: 'Standard', pitches: [40, 45, 50, 55, 59, 64] },
  { strings: 6, name: 'Tune down 1/2 step', pitches: [39, 44, 49, 54, 58, 63] },
  { strings: 6, name: 'Tune down 1 step', pitches: [38, 43, 48, 53, 57, 62] },
  { strings: 6, name: 'Tune down 2 step', pitches: [36, 41, 46, 51, 55, 60] },
  { strings: 6, name: 'Dropped D', pitches: [38, 45, 50, 55, 59, 64] },
  { strings: 6, name: 'Dropped D tune down 1/2 step', pitches: [37, 44, 49, 54, 58, 63] },
  { strings: 6, name: 'Dropped D Variant', pitches: [38, 45, 50, 55, 57, 64] },
  { strings: 6, name: 'Double Dropped D', pitches: [38, 45, 50, 55, 59, 62] },
  { strings: 6, name: 'Dropped C', pitches: [36, 43, 48, 53, 57, 62] },
  { strings: 6, name: 'Dropped E', pitches: [40, 47, 52, 57, 61, 66] },
  { strings: 6, name: 'Dropped B', pitches: [35, 42, 47, 52, 56, 61] },
  { strings: 6, name: 'Baritone', pitches: [35, 40, 45, 50, 54, 59] },
  { strings: 6, name: 'Open C', pitches: [36, 43, 48, 55, 60, 64] },
  { strings: 6, name: 'Open Cm', pitches: [36, 43, 48, 55, 60, 63] },
  { strings: 6, name: 'Open C6', pitches: [36, 43, 48, 55, 57, 64] },
  { strings: 6, name: 'Open CM7', pitches: [36, 43, 52, 55, 59, 64] },
  { strings: 6, name: 'Open D', pitches: [38, 45, 50, 54, 57, 62] },
  { strings: 6, name: 'Open Dm', pitches: [38, 45, 50, 53, 57, 62] },
  { strings: 6, name: 'Open D5', pitches: [38, 45, 50, 50, 57, 62] },
  { strings: 6, name: 'Open D6', pitches: [38, 45, 50, 54, 59, 62] },
  { strings: 6, name: 'Open Dsus4', pitches: [38, 45, 50, 55, 57, 62] },
  { strings: 6, name: 'Open E', pitches: [40, 47, 52, 56, 59, 64] },
  { strings: 6, name: 'Open Em', pitches: [40, 47, 52, 55, 59, 64] },
  { strings: 6, name: 'Open Esus11', pitches: [40, 45, 52, 55, 59, 64] },
  { strings: 6, name: 'Open F', pitches: [41, 45, 48, 53, 60, 65] },
  { strings: 6, name: 'Open G', pitches: [38, 43, 50, 55, 59, 62] },
  { strings: 6, name: 'Open Gm', pitches: [38, 43, 50, 55, 58, 62] },
  { strings: 6, name: 'Open Gsus4', pitches: [38, 43, 50, 55, 60, 62] },
  { strings: 6, name: 'Open G6', pitches: [38, 43, 50, 55, 59, 64] },
  { strings: 6, name: 'Open A', pitches: [40, 45, 52, 57, 61, 64] },
  { strings: 6, name: 'Open Am', pitches: [40, 45, 52, 57, 60, 64] },
  { strings: 6, name: 'Dobro Open G', pitches: [43, 47, 50, 55, 59, 62] },
  { strings: 6, name: 'Lute or Vihuela', pitches: [40, 45, 50, 54, 59, 64] },
  { strings: 6, name: 'Nashville', pitches: [52, 57, 62, 67, 59, 64] },
  { strings: 7, name: 'Standard', pitches: [35, 40, 45, 50, 55, 59, 64] },
  { strings: 7, name: 'Drop D', pitches: [33, 38, 45, 50, 55, 59, 64] },
  { strings: 7, name: 'Tune down 1/2 step', pitches: [34, 39, 44, 49, 54, 58, 63] },
  { strings: 7, name: 'Tune down 1 step', pitches: [33, 38, 43, 48, 53, 57, 62] },
  { strings: 7, name: 'Tune down 2 step', pitches: [31, 36, 41, 46, 51, 55, 60] },
  { strings: 8, name: 'Standard', pitches: [30, 35, 40, 45, 50, 55, 59, 64] },
  { strings: 8, name: 'Tune down 1/2 step', pitches: [29, 34, 39, 44, 49, 54, 58, 63] },
  { strings: 8, name: 'Tune down 1 step', pitches: [28, 33, 38, 43, 48, 53, 57, 62] },
  { strings: 8, name: 'Tune down 2 step', pitches: [27, 32, 36, 41, 46, 51, 55, 60] },
  { strings: 9, name: 'Standard', pitches: [25, 30, 35, 40, 45, 50, 55, 59, 64] },
  { strings: 10, name: 'Standard', pitches: [30, 32, 34, 36, 40, 45, 57, 62, 67, 76] },
  { strings: 10, name: 'Baroque', pitches: [45, 47, 48, 50, 52, 57, 62, 67, 71, 76] },
];

/** Every preset for a given string count. */
export function tuningsForStrings(strings: number): readonly TuningPreset[] {
  return GUITAR_TUNINGS.filter((t) => t.strings === strings);
}

export interface StaffTypePreset {
  /** This engine's own stable id for the staff type. */
  readonly id: string;
  readonly group: 'standard' | 'percussion' | 'tab';
  readonly lines: number;
  /**
   * The gap between two staff lines, in staff spaces. A tab staff's lines
   * are one and a half times as far apart as a standard staff's — the
   * single biggest reason a tab staff drawn with evenly spaced lines does
   * not look right.
   */
  readonly lineDistance: number;
}

/** The staff presets this engine draws for. */
export const STAFF_TYPES: readonly StaffTypePreset[] = [
  { id: 'standard', group: 'standard', lines: 5, lineDistance: 1 },
  { id: 'percussion-1', group: 'percussion', lines: 1, lineDistance: 1 },
  { id: 'percussion-2', group: 'percussion', lines: 2, lineDistance: 1 },
  { id: 'percussion-3', group: 'percussion', lines: 3, lineDistance: 1 },
  { id: 'percussion-5', group: 'percussion', lines: 5, lineDistance: 1 },
  { id: 'tab-4', group: 'tab', lines: 4, lineDistance: 1.5 },
  { id: 'tab-5', group: 'tab', lines: 5, lineDistance: 1.5 },
  { id: 'tab-6', group: 'tab', lines: 6, lineDistance: 1.5 },
  { id: 'tab-7', group: 'tab', lines: 7, lineDistance: 1.5 },
];
