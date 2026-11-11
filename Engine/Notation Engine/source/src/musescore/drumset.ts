/**
 * drumset.ts -- MuseScore's standard MIDI drumset, exactly as it ships.
 *
 * This is the table that decides what a drum chart LOOKS like: which
 * line each instrument sits on, which notehead it wears, which way its
 * stem points and which voice it belongs to. A file exported from
 * MuseScore carries MIDI pitches and nothing else about any of that, so
 * two programs reading the same file draw two different charts unless
 * they agree on this table.
 *
 * `line` is MuseScore's own: 0 is the TOP staff line and every +1 is
 * half a space DOWNWARD. `staff-position.ts` converts it; the raw
 * number is kept here so a row can be checked against MuseScore's
 * source without undoing a conversion first.
 *
 * `voice` matters as much as the line does. MuseScore puts the bass
 * drums and the pedal hi-hat in voice 1 and everything else in voice 0,
 * which is what produces the hands-up / feet-down look of a real drum
 * chart.
 */

import type { MuseScoreSource } from './provenance.js';

export const DRUMSET_SOURCE: MuseScoreSource = {
  path: 'src/engraving/dom/drumset.cpp',
  symbol: 'Drumset::initDrumset()',
  what: 'the standard MIDI drumset: notehead group, staff line, stem direction and voice per MIDI pitch',
};

export const DRUM_NAME_SOURCE: MuseScoreSource = {
  path: 'src/engraving/types/typesconv.cpp',
  symbol: 'DRUMNUMS (TConv::userName(DrumNum))',
  what: "each drum's displayed name, in English",
};

/** MuseScore's `DirectionV`, for the two values a drumset ever uses. */
export type MuseScoreStemDirection = 'up' | 'down';

export interface MuseScoreDrum {
  /** GM MIDI note number. */
  readonly pitch: number;
  /** MuseScore's own English name for it. */
  readonly name: string;
  /**
   * MuseScore's `NoteHeadGroup` enumerator. `HEAD_CUSTOM` means the
   * group is not enough on its own and `customNotehead` holds the
   * SMuFL glyph the drumset pins to it.
   */
  readonly notehead: string;
  /** The SMuFL glyph for a HEAD_CUSTOM drum, or undefined. */
  readonly customNotehead?: string;
  /** Staff line, MuseScore's convention: 0 = top line, +1 = half a space down. */
  readonly line: number;
  readonly stemDirection: MuseScoreStemDirection;
  /** 0 for hands, 1 for the feet MuseScore separates out. */
  readonly voice: number;
}

/**
 * The 61 instruments MuseScore's standard drumset defines, by MIDI
 * pitch. Pitches it leaves empty are simply absent -- an empty row in
 * MuseScore means that drum has no notation of its own, and inventing
 * one here would be the guess this layer refuses to make.
 */
export const MUSESCORE_DRUMSET: readonly MuseScoreDrum[] = [
  {
    pitch: 27,
    name: 'High Q',
    notehead: 'HEAD_SLASH',
    line: 8,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 28,
    name: 'Slap',
    notehead: 'HEAD_CUSTOM',
    customNotehead: 'noteheadSlashX',
    line: 4,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 29,
    name: 'Scratch Push',
    notehead: 'HEAD_SLASH',
    line: 6,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 30,
    name: 'Scratch Pull',
    notehead: 'HEAD_SLASH',
    line: 6,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 31,
    name: 'Sticks',
    notehead: 'HEAD_PLUS',
    line: -1,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 32,
    name: 'Square Click',
    notehead: 'HEAD_PLUS',
    line: 10,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 33,
    name: 'Metronome Click',
    notehead: 'HEAD_CROSS',
    line: 10,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 34,
    name: 'Metronome Bell',
    notehead: 'HEAD_TRIANGLE_UP',
    line: 10,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 35,
    name: 'Acoustic Bass Drum',
    notehead: 'HEAD_NORMAL',
    line: 8,
    stemDirection: 'up',
    voice: 1,
  },
  {
    pitch: 36,
    name: 'Bass Drum 1',
    notehead: 'HEAD_NORMAL',
    line: 7,
    stemDirection: 'down',
    voice: 1,
  },
  {
    pitch: 37,
    name: 'Side Stick',
    notehead: 'HEAD_SLASHED1',
    line: 3,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 38,
    name: 'Acoustic Snare',
    notehead: 'HEAD_NORMAL',
    line: 3,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 39,
    name: 'Hand Clap',
    notehead: 'HEAD_PLUS',
    line: -2,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 40,
    name: 'Electric Snare',
    notehead: 'HEAD_SLASH',
    line: 3,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 41,
    name: 'Low Floor Tom',
    notehead: 'HEAD_NORMAL',
    line: 6,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 42,
    name: 'Closed Hi-Hat',
    notehead: 'HEAD_CROSS',
    line: -1,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 43,
    name: 'High Floor Tom',
    notehead: 'HEAD_NORMAL',
    line: 5,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 44,
    name: 'Pedal Hi-Hat',
    notehead: 'HEAD_CROSS',
    line: 9,
    stemDirection: 'up',
    voice: 1,
  },
  {
    pitch: 45,
    name: 'Low Tom',
    notehead: 'HEAD_NORMAL',
    line: 4,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 46,
    name: 'Open Hi-Hat',
    notehead: 'HEAD_XCIRCLE',
    line: -1,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 47,
    name: 'Low-Mid Tom',
    notehead: 'HEAD_NORMAL',
    line: 2,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 48,
    name: 'Hi-Mid Tom',
    notehead: 'HEAD_NORMAL',
    line: 1,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 49,
    name: 'Crash Cymbal 1',
    notehead: 'HEAD_CROSS',
    line: -2,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 50,
    name: 'High Tom',
    notehead: 'HEAD_NORMAL',
    line: 0,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 51,
    name: 'Ride Cymbal 1',
    notehead: 'HEAD_CROSS',
    line: 0,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 52,
    name: 'Chinese Cymbal',
    notehead: 'HEAD_CUSTOM',
    customNotehead: 'noteheadHeavyXHat',
    line: -3,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 53,
    name: 'Ride Bell',
    notehead: 'HEAD_DIAMOND',
    line: 0,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 54,
    name: 'Tambourine',
    notehead: 'HEAD_DIAMOND',
    line: 6,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 55,
    name: 'Splash Cymbal',
    notehead: 'HEAD_CROSS',
    line: -4,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 56,
    name: 'Cowbell',
    notehead: 'HEAD_TRIANGLE_DOWN',
    line: 0,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 57,
    name: 'Crash Cymbal 2',
    notehead: 'HEAD_CROSS',
    line: -3,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 58,
    name: 'Vibraslap',
    notehead: 'HEAD_TI',
    line: 0,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 59,
    name: 'Ride Cymbal 2',
    notehead: 'HEAD_CROSS',
    line: 2,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 60,
    name: 'Hi Bongo',
    notehead: 'HEAD_NORMAL',
    line: -1,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 61,
    name: 'Low Bongo',
    notehead: 'HEAD_NORMAL',
    line: 0,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 62,
    name: 'Mute Hi Conga',
    notehead: 'HEAD_CUSTOM',
    customNotehead: 'noteheadXOrnate',
    line: 1,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 63,
    name: 'Open Hi Conga',
    notehead: 'HEAD_NORMAL',
    line: 1,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 64,
    name: 'Low Conga',
    notehead: 'HEAD_NORMAL',
    line: 2,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 65,
    name: 'High Timbale',
    notehead: 'HEAD_NORMAL',
    line: 5,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 66,
    name: 'Low Timbale',
    notehead: 'HEAD_NORMAL',
    line: 7,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 67,
    name: 'High Agogo',
    notehead: 'HEAD_TRIANGLE_DOWN',
    line: -2,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 68,
    name: 'Low Agogo',
    notehead: 'HEAD_TRIANGLE_DOWN',
    line: -1,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 69,
    name: 'Cabasa',
    notehead: 'HEAD_DIAMOND',
    line: 2,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 70,
    name: 'Maracas',
    notehead: 'HEAD_DIAMOND',
    line: 4,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 71,
    name: 'Short Whistle',
    notehead: 'HEAD_CROSS',
    line: -3,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 72,
    name: 'Long Whistle',
    notehead: 'HEAD_TI',
    line: -3,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 73,
    name: 'Short Güiro',
    notehead: 'HEAD_CROSS',
    line: -1,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 74,
    name: 'Long Güiro',
    notehead: 'HEAD_SLASHED1',
    line: -1,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 75,
    name: 'Claves',
    notehead: 'HEAD_LA',
    line: 0,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 76,
    name: 'Hi Wood Block',
    notehead: 'HEAD_LA',
    line: 5,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 77,
    name: 'Low Wood Block',
    notehead: 'HEAD_LA',
    line: 7,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 78,
    name: 'Mute Cuica',
    notehead: 'HEAD_CROSS',
    line: 8,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 79,
    name: 'Open Cuica',
    notehead: 'HEAD_SLASHED2',
    line: 8,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 80,
    name: 'Mute Triangle',
    notehead: 'HEAD_CROSS',
    line: 0,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 81,
    name: 'Open Triangle',
    notehead: 'HEAD_TRIANGLE_UP',
    line: 0,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 82,
    name: 'Shaker',
    notehead: 'HEAD_DIAMOND',
    line: 5,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 83,
    name: 'Sleigh Bell',
    notehead: 'HEAD_TRIANGLE_DOWN',
    line: 3,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 84,
    name: 'Mark Tree',
    notehead: 'HEAD_TI',
    line: 2,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 85,
    name: 'Castanets',
    notehead: 'HEAD_LA',
    line: 2,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 86,
    name: 'Mute Surdo',
    notehead: 'HEAD_CUSTOM',
    customNotehead: 'noteheadSlashX',
    line: 4,
    stemDirection: 'up',
    voice: 0,
  },
  {
    pitch: 87,
    name: 'Open Surdo',
    notehead: 'HEAD_SLASH',
    line: 4,
    stemDirection: 'up',
    voice: 0,
  },
];

const BY_PITCH = new Map(MUSESCORE_DRUMSET.map((d) => [d.pitch, d]));

/** One drum by MIDI pitch, or undefined where MuseScore defines none. */
export function museScoreDrum(pitch: number): MuseScoreDrum | undefined {
  return BY_PITCH.get(pitch);
}
