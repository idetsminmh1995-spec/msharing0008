/**
 * strings.ts -- MuseScore's fretted-instrument data.
 *
 * Three things a tab staff cannot be drawn without, and one convention
 * that is easy to get backwards.
 *
 * **The string pitches are in the instrument's TRANSPOSED domain, not
 * its sounding one.** For most fretted instruments the two are the
 * same thing: an electric guitar has no transposition at all -- its
 * octave is carried by an 8vb treble CLEF, not by a transposition --
 * so its strings are listed at the pitches they sound, 40 to 64. An
 * electric bass does have one (`transposeChromatic -12`), and its
 * lowest string is listed at 40 (E2) although it sounds E1 (28).
 * MuseScore's `fret()` reconciles the two by adding `-transpose` to
 * whatever pitch it is given before subtracting the string, so an open
 * low E is fret 0 on either instrument. `writtenPitchFor` below is
 * that one line, and it is the difference between a bass fingering
 * that is right and one that is a whole octave out.
 *
 * **String 0 is the HIGHEST string.** MuseScore stores the table from
 * lowest pitch upward but indexes it from the other end
 * (`m_stringTable[strings - string - 1]`), so string 0 is the top line
 * of the tab staff -- the thin E on a guitar. This project's own finger
 * engines number from the lowest string instead; `stringIndexFromLowest`
 * is the one place that difference is written down.
 */

import type { MuseScoreSource } from './provenance.js';

export const STRING_DATA_SOURCE: MuseScoreSource = {
  path: 'share/instruments/instruments.xml',
  symbol: '<Instrument><StringData>',
  what: 'open-string pitches and fret count per fretted instrument',
};

export const STRING_INDEX_SOURCE: MuseScoreSource = {
  path: 'src/engraving/dom/stringdata.cpp',
  symbol: 'StringData::fret() / StringData::convertPitch()',
  what: 'the reversed string index, and that a fret is (pitch - transpose) - openString',
};

export const TUNING_PRESET_SOURCE: MuseScoreSource = {
  path: 'share/instruments/string_tunings_presets.json',
  symbol: '"guitars" family',
  what: 'the named alternate tunings MuseScore offers for guitars',
};

export const TAB_STAFF_SOURCE: MuseScoreSource = {
  path: 'src/engraving/dom/stafftype.cpp',
  symbol: 'StaffType::initStaffTypes()',
  what: 'line count and line distance for every standard, percussion and tab staff preset',
};

export interface MuseScoreStringData {
  /** MuseScore's own instrument id, so a row can be found in instruments.xml. */
  readonly id: string;
  readonly name: string;
  /** How many frets the instrument has. */
  readonly frets: number;
  /**
   * Open-string WRITTEN pitches, lowest first -- the order
   * instruments.xml lists them in. MuseScore's own string INDEX counts
   * from the other end; see `stringIndexFromLowest`.
   */
  readonly openStrings: readonly number[];
  /** The clef a concert-pitch score uses, in MuseScore's clef names. */
  readonly concertClef?: string;
  /** The clef a transposed score uses. */
  readonly transposingClef?: string;
  /** Semitones the written pitch is above the sounding one, negative. */
  readonly transposeChromatic: number;
}

/**
 * The fretted instruments this project plays: guitars, basses, ukuleles,
 * mandolin and banjos. MuseScore's catalogue is far longer; the rest is
 * cited rather than copied, and `instruments.xml` is one `git show`
 * away for anything that needs adding.
 */
export const MUSESCORE_STRING_DATA: readonly MuseScoreStringData[] = [
  {
    id: 'electric-guitar',
    name: 'Electric Guitar',
    frets: 24,
    openStrings: [40, 45, 50, 55, 59, 64],
    concertClef: 'G8vb',
    transposingClef: 'G8vb',
    transposeChromatic: 0,
  },
  {
    id: 'guitar-steel',
    name: 'Acoustic Guitar',
    frets: 20,
    openStrings: [40, 45, 50, 55, 59, 64],
    concertClef: 'G8vb',
    transposingClef: 'G8vb',
    transposeChromatic: 0,
  },
  {
    id: 'guitar-nylon',
    name: 'Classical Guitar',
    frets: 19,
    openStrings: [40, 45, 50, 55, 59, 64],
    concertClef: 'G8vb',
    transposingClef: 'G8vb',
    transposeChromatic: 0,
  },
  {
    id: 'baritone-guitar',
    name: 'Baritone Guitar',
    frets: 19,
    openStrings: [35, 40, 45, 50, 54, 59],
    concertClef: 'G8vb',
    transposingClef: 'G8vb',
    transposeChromatic: 0,
  },
  {
    id: '7-string-guitar',
    name: '7-string Guitar',
    frets: 19,
    openStrings: [35, 40, 45, 50, 55, 59, 64],
    concertClef: 'G8vb',
    transposingClef: 'G8vb',
    transposeChromatic: 0,
  },
  {
    id: '12-string-guitar',
    name: '12-string Guitar',
    frets: 21,
    openStrings: [40, 45, 50, 55, 59, 64],
    concertClef: 'G8vb',
    transposingClef: 'G8vb',
    transposeChromatic: 0,
  },
  {
    id: 'bass-guitar',
    name: 'Bass Guitar',
    frets: 24,
    openStrings: [40, 45, 50, 55],
    concertClef: 'F8vb',
    transposingClef: 'F',
    transposeChromatic: -12,
  },
  {
    id: 'electric-bass',
    name: 'Electric Bass',
    frets: 24,
    openStrings: [40, 45, 50, 55],
    concertClef: 'F8vb',
    transposingClef: 'F',
    transposeChromatic: -12,
  },
  {
    id: 'acoustic-bass',
    name: 'Acoustic Bass',
    frets: 24,
    openStrings: [40, 45, 50, 55],
    concertClef: 'F8vb',
    transposingClef: 'F',
    transposeChromatic: -12,
  },
  {
    id: 'fretless-electric-bass',
    name: 'Fretless Electric Bass',
    frets: 24,
    openStrings: [28, 33, 38, 43],
    concertClef: 'F8vb',
    transposingClef: 'F',
    transposeChromatic: -12,
  },
  {
    id: '5-string-electric-bass',
    name: '5-str. Electric Bass',
    frets: 24,
    openStrings: [35, 40, 45, 50, 55],
    concertClef: 'F8vb',
    transposingClef: 'F',
    transposeChromatic: -12,
  },
  {
    id: '5-string-electric-bass-high-c',
    name: '5-str. Electric Bass (high C/tenor)',
    frets: 24,
    openStrings: [40, 45, 50, 55, 60],
    concertClef: 'F8vb',
    transposingClef: 'F',
    transposeChromatic: -12,
  },
  {
    id: '6-string-electric-bass',
    name: '6-str. Electric Bass',
    frets: 24,
    openStrings: [35, 40, 45, 50, 55, 60],
    concertClef: 'F8vb',
    transposingClef: 'F',
    transposeChromatic: -12,
  },
  {
    id: 'ukulele',
    name: 'Ukulele',
    frets: 18,
    openStrings: [67, 60, 64, 69],
    concertClef: 'G',
    transposingClef: 'G',
    transposeChromatic: 0,
  },
  {
    id: 'ukulele-low-g',
    name: 'Ukulele (low G)',
    frets: 18,
    openStrings: [55, 60, 64, 69],
    concertClef: 'G',
    transposingClef: 'G',
    transposeChromatic: 0,
  },
  {
    id: 'baritone-ukulele',
    name: 'Baritone Ukulele',
    frets: 18,
    openStrings: [50, 55, 59, 64],
    concertClef: 'G8vb',
    transposingClef: 'G8vb',
    transposeChromatic: 0,
  },
  {
    id: 'tenor-ukulele',
    name: 'Tenor Ukulele',
    frets: 18,
    openStrings: [67, 60, 64, 69],
    concertClef: 'G',
    transposingClef: 'G',
    transposeChromatic: 0,
  },
  {
    id: 'mandolin',
    name: 'Mandolin',
    frets: 24,
    openStrings: [55, 62, 69, 76],
    concertClef: 'G',
    transposingClef: 'G',
    transposeChromatic: 0,
  },
  {
    id: 'banjo',
    name: 'Banjo',
    frets: 19,
    openStrings: [67, 50, 55, 59, 62],
    concertClef: 'G8vb',
    transposingClef: 'G8vb',
    transposeChromatic: 0,
  },
  {
    id: 'tenor-banjo',
    name: 'Tenor Banjo',
    frets: 19,
    openStrings: [48, 55, 62, 69],
    concertClef: 'G8vb',
    transposingClef: 'G8vb',
    transposeChromatic: 0,
  },
  {
    id: 'irish-tenor-banjo',
    name: 'Irish Tenor Banjo',
    frets: 19,
    openStrings: [43, 50, 57, 64],
    concertClef: 'G8vb',
    transposingClef: 'G8vb',
    transposeChromatic: 0,
  },
];

const BY_ID = new Map(MUSESCORE_STRING_DATA.map((s) => [s.id, s]));

/** One instrument's string data by MuseScore instrument id. */
export function museScoreStringData(id: string): MuseScoreStringData | undefined {
  return BY_ID.get(id);
}

/**
 * MuseScore's own string index (0 = highest string, the tab staff's top
 * line) for a string counted from the lowest, 1-based -- which is how
 * this project's finger engines count.
 */
export function stringIndexFromLowest(stringFromLowest: number, stringCount: number): number {
  return stringCount - stringFromLowest;
}

/**
 * The WRITTEN pitch of a sounding pitch on this instrument.
 *
 * MuseScore's `fret()` works in written pitch and reaches it by adding
 * `-transpose` to whatever it is given, which is this, spelled out:
 * for an electric bass (transpose -12) a sounding E1 (28) is written
 * E2 (40), and 40 - 40 = fret 0 on the open low string.
 */
export function writtenPitchFor(data: MuseScoreStringData, soundingPitch: number): number {
  return soundingPitch - data.transposeChromatic;
}

/**
 * The fret a WRITTEN pitch lands on, on one string, or undefined where
 * it does not reach -- MuseScore's own arithmetic, minus its capo and
 * banjo-fifth-string special cases, which this project has no caller
 * for yet and which are not guessed at here.
 */
export function fretFor(
  data: MuseScoreStringData,
  writtenPitch: number,
  stringFromLowest: number,
): number | undefined {
  const open = data.openStrings[stringFromLowest - 1];
  if (open === undefined) return undefined;
  const fret = writtenPitch - open;
  return fret < 0 || fret > data.frets ? undefined : fret;
}

export interface MuseScoreTuningPreset {
  /** How many strings it is for. */
  readonly strings: number;
  readonly name: string;
  /** Open-string written pitches, lowest first. */
  readonly pitches: readonly number[];
}

/**
 * MuseScore's named guitar tunings, as its own tuning dialog offers
 * them. Standard first in each string count, the rest in MuseScore's
 * order.
 */
export const MUSESCORE_GUITAR_TUNINGS: readonly MuseScoreTuningPreset[] = [
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
export function museScoreTuningsForStrings(strings: number): readonly MuseScoreTuningPreset[] {
  return MUSESCORE_GUITAR_TUNINGS.filter((t) => t.strings === strings);
}

export interface MuseScoreStaffTypePreset {
  /** MuseScore's own `StaffTypes` enumerator name. */
  readonly type: string;
  readonly group: 'STANDARD' | 'PERCUSSION' | 'TAB';
  readonly lines: number;
  /**
   * The gap between two staff lines, in staff spaces. A tab staff's
   * lines are one and a half times as far apart as a standard staff's
   * -- the single biggest reason a tab staff drawn with five evenly
   * spaced lines does not look like MuseScore's.
   */
  readonly lineDistance: number;
}

/**
 * The staff presets this project draws for: the standard staff, the
 * four percussion staves, and the tab staves it has instruments for.
 * MuseScore's full list adds Italian and French lute tablature and
 * seven more string counts, cited and left there.
 */
export const MUSESCORE_STAFF_TYPES: readonly MuseScoreStaffTypePreset[] = [
  { type: 'STANDARD', group: 'STANDARD', lines: 5, lineDistance: 1 },
  { type: 'PERC_1LINE', group: 'PERCUSSION', lines: 1, lineDistance: 1 },
  { type: 'PERC_2LINE', group: 'PERCUSSION', lines: 2, lineDistance: 1 },
  { type: 'PERC_3LINE', group: 'PERCUSSION', lines: 3, lineDistance: 1 },
  { type: 'PERC_5LINE', group: 'PERCUSSION', lines: 5, lineDistance: 1 },
  { type: 'TAB_4SIMPLE', group: 'TAB', lines: 4, lineDistance: 1.5 },
  { type: 'TAB_4COMMON', group: 'TAB', lines: 4, lineDistance: 1.5 },
  { type: 'TAB_4FULL', group: 'TAB', lines: 4, lineDistance: 1.5 },
  { type: 'TAB_5SIMPLE', group: 'TAB', lines: 5, lineDistance: 1.5 },
  { type: 'TAB_5COMMON', group: 'TAB', lines: 5, lineDistance: 1.5 },
  { type: 'TAB_5FULL', group: 'TAB', lines: 5, lineDistance: 1.5 },
  { type: 'TAB_6SIMPLE', group: 'TAB', lines: 6, lineDistance: 1.5 },
  { type: 'TAB_6COMMON', group: 'TAB', lines: 6, lineDistance: 1.5 },
  { type: 'TAB_6FULL', group: 'TAB', lines: 6, lineDistance: 1.5 },
  { type: 'TAB_7COMMON', group: 'TAB', lines: 7, lineDistance: 1.5 },
  { type: 'TAB_UKULELE', group: 'TAB', lines: 4, lineDistance: 1.5 },
];
