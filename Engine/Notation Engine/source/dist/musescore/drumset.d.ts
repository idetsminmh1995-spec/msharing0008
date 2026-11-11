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
export declare const DRUMSET_SOURCE: MuseScoreSource;
export declare const DRUM_NAME_SOURCE: MuseScoreSource;
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
export declare const MUSESCORE_DRUMSET: readonly MuseScoreDrum[];
/** One drum by MIDI pitch, or undefined where MuseScore defines none. */
export declare function museScoreDrum(pitch: number): MuseScoreDrum | undefined;
