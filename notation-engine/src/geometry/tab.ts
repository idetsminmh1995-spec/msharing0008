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
 * string 1 -> top line, string `numLines` -> bottom line. For a standard
 * 6-line guitar tab: string 1 -> -5, string 6 -> 0.
 */
export function tabStringPosition(stringNumber: number, numLines: number): number {
  if (!Number.isInteger(stringNumber) || stringNumber < 1 || stringNumber > numLines) {
    throw new Error(
      `String ${stringNumber} is outside a ${numLines}-line tab staff (valid: 1..${numLines}).`,
    );
  }
  return stringNumber - numLines;
}

/**
 * SMuFL's digit glyphs used for fret numbers. Note the codepoints are
 * deliberately NOT derived arithmetically: SMuFL breaks the run after 5
 * (0-5 live at U+ED10..U+ED15, but 6-9 jump to U+ED24..U+ED27), so
 * computing `fingering0 + n` would silently produce wrong glyphs for
 * 6-9. Looked up by name instead, after checking the real glyph table.
 *
 * `fingering*` rather than `luteItalianFret*`: the latter is specifically
 * Italian lute tablature, a different historical system, not the modern
 * guitar tab this renders.
 */
const FRET_DIGIT_GLYPHS: readonly string[] = [
  'fingering0',
  'fingering1',
  'fingering2',
  'fingering3',
  'fingering4',
  'fingering5',
  'fingering6',
  'fingering7',
  'fingering8',
  'fingering9',
];

/**
 * The glyph names spelling out a fret number, most significant digit
 * first. Multi-digit frets are real and common (a 24-fret guitar reaches
 * fret 24), so this returns an array rather than a single glyph.
 */
export function fretDigitGlyphNames(fret: number): readonly string[] {
  if (!Number.isInteger(fret) || fret < 0) {
    throw new Error(`Fret number must be a non-negative integer, got ${fret}.`);
  }
  return String(fret)
    .split('')
    .map((d) => {
      const glyph = FRET_DIGIT_GLYPHS[Number(d)];
      if (glyph === undefined) {
        throw new Error(`No digit glyph for "${d}".`);
      }
      return glyph;
    });
}
