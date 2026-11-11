/** Resolve a MusicXML accidental value to the exact SMuFL glyph used by MusicXML 4.0. */
export declare function musicXmlAccidentalGlyphName(value: string): string | undefined;
/** True when the SMuFL canonical glyph name is present in the bundled glyph table. */
export declare function isKnownAccidentalGlyphName(name: string): boolean;
/**
 * Return a drawable glyph for an alteration, preferring a source-preserved
 * MusicXML/SMuFL glyph. `undefined` means the pitch is valid but this bundled
 * notation profile has no honest accidental symbol for it.
 */
export declare function tryAccidentalGlyphName(alter: number, preferredGlyphName?: string): string | undefined;
/** Strict public lookup retained for callers that require a drawable glyph. */
export declare function accidentalGlyphName(alter: number, preferredGlyphName?: string): string;
export interface AccidentalPlacement {
    /** Which column this accidental sits in: 0 is closest to the notehead, higher numbers are further left. */
    readonly column: number;
    /** The Y this accidental was placed at -- the same value passed in, returned for convenience. */
    readonly y: number;
}
/**
 * §9.11's stacking rule for a chord's several accidentals: sort by pitch
 * descending (highest Y magnitude toward the top first -- i.e. most
 * negative Y first, since higher pitch = more negative Y), then place
 * each in the leftmost column where it doesn't vertically collide (within
 * 2.5sp) with an already-placed accidental in that column, opening a new
 * column if none fits.
 *
 * Returns placements in the SAME order as the input `positions` array
 * (not sorted order) so callers can zip the result back against their
 * original note list directly.
 */
export declare function assignAccidentalColumns(positions: readonly number[]): readonly AccidentalPlacement[];
/**
 * §9.11's horizontal placement: immediately left of the notehead's own
 * left edge (`noteX` -- the same drawing-origin convention as every other
 * glyph in this engine, confirmed against noteheadBlack's own bounding box
 * having its left edge at x=0), with a 0.16sp gap, and each additional
 * column (from assignAccidentalColumns) stepping one more accidental-width
 * further left again.
 */
export declare function accidentalX(noteX: number, accidentalWidth: number, column: number): number;
