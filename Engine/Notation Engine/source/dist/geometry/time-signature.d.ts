import { type GlyphInfo } from '../glyphs/glyph-table.js';
/**
 * A time signature. `numerator`/`denominator` are the actual numeric
 * meaning (e.g. 7/8 -> numerator:7, denominator:8) -- always used for
 * beat-duration math elsewhere in the engine. `numeratorDisplay` is an
 * OPTIONAL override for additive/irregular meters that are written
 * differently than their numeric total (e.g. "3+2+2" over a denominator
 * of 8, still numerator:7 for math purposes, but displayed as "3+2+2").
 */
export interface TimeSignature {
    readonly numerator: number;
    readonly denominator: number;
    readonly numeratorDisplay?: string;
    /**
     * 'common' draws the C symbol instead of numerals (only valid for
     * 4/4); 'cut' draws the cut-C symbol instead of numerals (only valid
     * for 2/2). Omitted means plain numeric digits.
     */
    readonly symbol?: 'common' | 'cut';
}
export interface TimeSignatureOptions {
    numeratorDisplay?: string;
    symbol?: 'common' | 'cut';
}
/**
 * Builds a validated TimeSignature. Throws for a non-positive-integer
 * numerator, a denominator that isn't a positive power of 2 (1,2,4,8,16,
 * 32,64...), or a `symbol` that doesn't match its required numerator/
 * denominator (common=4/4 only, cut=2/2 only) -- catching a nonsensical
 * "common time symbol representing 7/8" at construction time rather than
 * silently drawing something wrong.
 */
export declare function timeSignature(numerator: number, denominator: number, options?: TimeSignatureOptions): TimeSignature;
/** The exact text to render for the numerator -- numeratorDisplay if given, otherwise the plain number. */
export declare function numeratorText(sig: TimeSignature): string;
/** The exact text to render for the denominator -- always the plain number (additive/irregular display only ever applies to the numerator). */
export declare function denominatorText(sig: TimeSignature): string;
/** Maps a single character ('0'-'9' or '+') from a time-signature display string to its SMuFL glyph name. */
export declare function glyphNameForTimeSigChar(ch: string): string;
/** Looks up the glyph for one time-signature character, throwing if it isn't a real SMuFL glyph. */
export declare function glyphForTimeSigChar(ch: string): GlyphInfo;
/** Bravura advance width (staff-space units) of one time-signature character. */
export declare function charAdvance(ch: string): number;
/**
 * Total width (staff-space units) a display string (e.g. "12", "3+2+2")
 * would take, using each character's real Bravura advance width. Advances
 * include the font's designed side bearings; visible ink bounds are not a
 * substitute for cursor movement. Bravura's time-signature digits are NOT
 * uniform width, so this cannot be a per-character constant.
 */
export declare function textWidth(text: string): number;
