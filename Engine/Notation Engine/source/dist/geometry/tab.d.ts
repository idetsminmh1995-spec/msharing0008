/**
 * Tablature geometry: where a fret number sits, and which glyphs draw it.
 *
 * String-to-line mapping is confirmed unanimously across every source
 * consulted (LilyPond's own reference, Berklee, Yamaha, Acoustic Guitar):
 * **string 1 is the TOP line and the highest-numbered string is the
 * BOTTOM line** -- the mirror of what a player sees looking down at the
 * instrument, and the opposite of the "1 = bottom" a reader might assume.
 * A number is placed directly ON its string's line, with 0 meaning an
 * open string.
 */
/**
 * The staff position (Phase 9's convention: bottom line 0, negative
 * upward) of a given string on a tab staff of `numLines` lines.
 *
 * string 1 -> top line, string `numLines` -> bottom line. `lineDistance`
 * is how far apart the lines are, which on a MuseScore tab staff is 1.5
 * rather than 1, so a standard 6-line guitar tab puts string 1 at -7.5
 * and string 6 at 0.
 */
export declare function tabStringPosition(stringNumber: number, numLines: number, lineDistance?: number): number;
/**
 * The glyph names spelling out a fret number, most significant digit
 * first. Multi-digit frets are real and common (a 24-fret guitar reaches
 * fret 24), so this returns an array rather than a single glyph.
 */
export declare function fretDigitGlyphNames(fret: number): readonly string[];
