/**
 * clefs.ts — MuseScore's own clef table.
 *
 * MuseScore positions a note on the staff with two numbers and one
 * subtraction, and this file is both of them:
 *
 *     absStep = stepIndex + (octave + 1) * 7      // C-1 = 0, C4 = 35
 *     line    = pitchOffset(clef) - absStep       // 0 = TOP staff line,
 *                                                 // +1 per HALF space down
 *
 * `pitchOffset` is the whole clef: it is the absolute diatonic step
 * that would sit on line 0. Everything else about a clef -- which
 * glyph, which staff group, where its own symbol is drawn, where a key
 * signature's accidentals go -- hangs off the same row.
 *
 * `staffPositionFromLine` in `staff-position.ts` converts `line` into
 * this engine's own y convention; nothing here assumes either one.
 */
import type { MuseScoreSource } from './provenance.js';
export declare const CLEF_TABLE_SOURCE: MuseScoreSource;
export declare const STAFF_POSITION_SOURCE: MuseScoreSource;
export declare const MUSICXML_CLEF_SOURCE: MuseScoreSource;
/** Which kind of staff a clef belongs on -- MuseScore's own StaffGroup. */
export type MuseScoreStaffGroup = 'STANDARD' | 'PERCUSSION' | 'TAB';
export interface MuseScoreClef {
    /** MuseScore's own ClefType enumerator name, so a row can be found in its source. */
    readonly type: string;
    /**
     * The staff line the clef GLYPH is drawn on, counted 1..5 from the
     * BOTTOM -- MuseScore's `ClefInfo::line`. Treble is 2 (the G line),
     * bass 4, alto 3.
     */
    readonly line: number;
    /**
     * The absolute diatonic step that would land on line 0 (the top staff
     * line). Treble 45, bass 33, alto 41 -- see the formula above.
     */
    readonly pitchOffset: number;
    /** SMuFL glyph name for the clef itself. */
    readonly symId: string;
    readonly staffGroup: MuseScoreStaffGroup;
    /**
     * Where a key signature's accidentals go under this clef, as staff
     * lines in the same units as `pitchOffset` produces: the first seven
     * are the sharps in order (F C G D A E B), the last seven the flats
     * (B E A D G C F).
     */
    readonly keySignatureLines: readonly number[];
}
/**
 * Every clef MuseScore knows, in its own enum order.
 *
 * Kept whole rather than trimmed to the ones this project draws today:
 * the point of the table is that a file asking for a baritone F clef or
 * a 15ma treble gets the answer MuseScore would give, and a trimmed
 * table silently gives a different one.
 */
export declare const MUSESCORE_CLEFS: readonly MuseScoreClef[];
/** One clef by its MuseScore enumerator name, or undefined. */
export declare function museScoreClef(type: string): MuseScoreClef | undefined;
/**
 * Which clef MuseScore picks for a MusicXML `<clef>`.
 *
 * Exactly the branch ladder MuseScore's own importer runs, including
 * its defaults for a `<clef>` that omits `<line>` (MusicXML 2.0 allows
 * it, and Primus writes it that way) and its two non-pitch signs.
 * Returns undefined for a combination MuseScore itself does not
 * recognise -- it logs and leaves the clef alone there, and inventing
 * one here would be exactly the guess this layer refuses to make.
 */
export declare function museScoreClefForMusicXml(sign: string, line?: number, octaveChange?: number): MuseScoreClef | undefined;
