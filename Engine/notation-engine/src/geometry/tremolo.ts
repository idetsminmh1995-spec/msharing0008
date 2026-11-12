/**
 * §9.24's tremolo (Phase 56).
 *
 * A tremolo is a note that is played as a rapid repetition of itself: one
 * stroke means eighth-note speed, two sixteenths, three thirty-seconds.
 * The mark is drawn ON THE STEM, and the count of strokes is the whole
 * message -- which is why getting the count right matters more than
 * getting the shape right.
 *
 * Bravura's own `tremolo1`-`tremolo3` are combining marks designed for
 * exactly this: each is centred on its own origin (a 1-stroke glyph spans
 * x -0.6..0.6 and y -0.372..0.376), so drawing one at the stem's midpoint
 * centres it on the stem without any further arithmetic. `tremolo2` and
 * `tremolo3` are taller by exactly one stroke spacing, so all three
 * straddle the point they are drawn at.
 */

/** The strokes a tremolo may be drawn with. MusicXML allows 0-8; the font ships 1-3. */
export const TREMOLO_STROKE_CHOICES = [1, 2, 3] as const;

/**
 * The glyph for a stroke count, or `undefined` when there is no such
 * glyph. Clamping happens in the parser (with a diagnostic), not here:
 * this function's job is to answer "does the font have it", and a silent
 * clamp would make a 4-stroke tremolo look like a 3-stroke one with
 * nothing to say for itself.
 */
export function tremoloGlyphName(strokes: number): string | undefined {
  if (!Number.isInteger(strokes) || strokes < 1 || strokes > 3) return undefined;
  return `tremolo${strokes}`;
}

export interface TremoloPlacement {
  /** The stem's own x -- the glyph straddles it. */
  readonly x: number;
  /** The stem's midpoint, which is where a single tremolo is centred. */
  readonly y: number;
}

/**
 * Where a single tremolo goes: centred on the stem, between the notehead
 * and the stem's tip.
 *
 * Midpoint rather than a fixed distance from the notehead because a
 * tremolo must stay ON the stem whatever its length -- a beamed or
 * shortened stem would otherwise leave the strokes floating off the end.
 * `attachY` is the end touching the notehead, `endY` the free end, and
 * the caller's own y-down convention is preserved.
 */
export function tremoloPlacement(stemX: number, attachY: number, endY: number): TremoloPlacement {
  return { x: stemX, y: (attachY + endY) / 2 };
}
