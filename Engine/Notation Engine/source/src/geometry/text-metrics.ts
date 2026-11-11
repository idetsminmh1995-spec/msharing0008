/**
 * text-metrics.ts -- how wide a run of ORDINARY text will be, when there
 * is no font to ask.
 *
 * Everything else this engine measures, it measures exactly: a glyph's
 * width comes out of Bravura's own metadata (`glyphs/glyph-table.ts`), a
 * staff's height out of its line count. Plain text has no such table
 * here and cannot have one -- `config.fonts.textFont` is whatever font
 * the HOST has loaded ('Manrope, sans-serif' by default), and the engine
 * produces an SVG string with no canvas, no layout engine and no font
 * file to measure against.
 *
 * So this is an estimate, and it is deliberately used only where an
 * estimate is the right answer: RESERVING horizontal room, so that
 * something drawn as text cannot overrun whatever follows it. Nothing is
 * ever POSITIONED from these numbers -- a text run is emitted as one
 * `<text>` element and spaced by the real font at display time, which is
 * what makes a wrong estimate cost a little empty space rather than a
 * collision.
 *
 * The widths below are therefore biased to over-estimate. They are the
 * widest advance measured across the ordinary sans-serif faces a host is
 * likely to fall back to -- Arial, Helvetica, Liberation Sans and DejaVu
 * Sans, at weight 400 and at 700 -- measured with the browser's own
 * `CanvasRenderingContext2D.measureText` at 100px and divided by that
 * size. DejaVu Sans Bold is the widest of them (its digits are 0.696em
 * against Arial's 0.556em), so these numbers are generous for most
 * fonts and short for none of the ones checked.
 */

/**
 * Width of one character, as a fraction of the font size. Anything not
 * listed falls back to DEFAULT_ADVANCE_PER_EM.
 */
const ADVANCE_PER_EM: Readonly<Record<string, number>> = {
  '0': 0.7,
  '1': 0.7,
  '2': 0.7,
  '3': 0.7,
  '4': 0.7,
  '5': 0.7,
  '6': 0.7,
  '7': 0.7,
  '8': 0.7,
  '9': 0.7,
  '=': 0.84,
  ' ': 0.38,
  '.': 0.38,
  ',': 0.38,
};

/**
 * The fallback for any character with no entry above -- the widest digit
 * measured, which is also a fair over-estimate for mixed-case words
 * (lower case runs narrower than a digit in every face checked, upper
 * case about the same).
 */
export const DEFAULT_ADVANCE_PER_EM = 0.7;

/** One character's estimated advance, in the same units as `fontSize`. */
export function estimateCharWidth(ch: string, fontSize: number): number {
  return (ADVANCE_PER_EM[ch] ?? DEFAULT_ADVANCE_PER_EM) * fontSize;
}

/**
 * A whole text run's estimated width, in the same units as `fontSize`
 * (staff spaces, everywhere in this engine).
 */
export function estimateTextWidth(text: string, fontSize: number): number {
  let total = 0;
  for (const ch of text) total += estimateCharWidth(ch, fontSize);
  return total;
}

/**
 * How far a line of text reaches above its own baseline, as a fraction
 * of the font size, and how far below.
 *
 * The same kind of estimate as the widths above and generous for the
 * same reason, but the DESCENT matters in a way the widths do not. A
 * box drawn too wide is invisible; a box drawn with no room under the
 * baseline says a 'g' or a ',' is not there, and anything sizing a
 * picture from these boxes will cut the tail off. The old reading --
 * from `y - fontSize` to `y` exactly -- made both mistakes at once: too
 * much room above the cap line, none at all under the baseline.
 *
 * 0.78 and 0.22 are an ordinary Latin face's ascender and descender,
 * which together make one em.
 */
export const TEXT_ASCENT_PER_EM = 0.78;
export const TEXT_DESCENT_PER_EM = 0.22;
