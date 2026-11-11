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
export declare const STRING_DATA_SOURCE: MuseScoreSource;
export declare const STRING_INDEX_SOURCE: MuseScoreSource;
export declare const TUNING_PRESET_SOURCE: MuseScoreSource;
export declare const TAB_STAFF_SOURCE: MuseScoreSource;
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
export declare const MUSESCORE_STRING_DATA: readonly MuseScoreStringData[];
/** One instrument's string data by MuseScore instrument id. */
export declare function museScoreStringData(id: string): MuseScoreStringData | undefined;
/**
 * MuseScore's own string index (0 = highest string, the tab staff's top
 * line) for a string counted from the lowest, 1-based -- which is how
 * this project's finger engines count.
 */
export declare function stringIndexFromLowest(stringFromLowest: number, stringCount: number): number;
/**
 * The WRITTEN pitch of a sounding pitch on this instrument.
 *
 * MuseScore's `fret()` works in written pitch and reaches it by adding
 * `-transpose` to whatever it is given, which is this, spelled out:
 * for an electric bass (transpose -12) a sounding E1 (28) is written
 * E2 (40), and 40 - 40 = fret 0 on the open low string.
 */
export declare function writtenPitchFor(data: MuseScoreStringData, soundingPitch: number): number;
/**
 * The fret a WRITTEN pitch lands on, on one string, or undefined where
 * it does not reach -- MuseScore's own arithmetic, minus its capo and
 * banjo-fifth-string special cases, which this project has no caller
 * for yet and which are not guessed at here.
 */
export declare function fretFor(data: MuseScoreStringData, writtenPitch: number, stringFromLowest: number): number | undefined;
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
export declare const MUSESCORE_GUITAR_TUNINGS: readonly MuseScoreTuningPreset[];
/** Every preset for a given string count. */
export declare function museScoreTuningsForStrings(strings: number): readonly MuseScoreTuningPreset[];
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
export declare const MUSESCORE_STAFF_TYPES: readonly MuseScoreStaffTypePreset[];
