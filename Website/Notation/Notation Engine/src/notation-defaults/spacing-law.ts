/**
 * spacing-law.ts — how much room a note is given.
 *
 * This is the single biggest reason a correct score can still look
 * wrong, and it is two lines of arithmetic:
 *
 *     stretch = slope ^ log2(duration / quarter)
 *     width   = quarterNoteSpace * stretch
 *
 * `slope` is 1.5 by default, so each doubling of a note's duration
 * multiplies its space by one and a half: a quarter note gets 3.5 staff
 * spaces, an eighth 2.33, a sixteenth 1.56, a half 5.25, a whole 7.875.
 *
 * It is a POWER law. The engine's other law (`config.law: 'increment'`)
 * is logarithmic — a fixed increment ADDED per doubling rather than a
 * factor applied — and the two disagree most at the extremes: a whole
 * note comes out 7.9 spaces here against 4.8 there, and a sixteenth 1.6
 * against 1.2. Neither is wrong; they are two house styles, and this one
 * is the engine's default because it is the more common published
 * convention.
 *
 * There is one more rule on top, and it matters the moment a staff has
 * more than one voice: see `segmentStretch`. A segment that a SHORTER
 * note runs through does not get the power law at all — it is priced
 * linearly off that shorter note, so the voices stay lined up
 * vertically. A single-voice measure never meets that case, which is why
 * the two lines above are the whole story for most music and no story at
 * all for a drum chart.
 *
 * What is NOT here: the second pass that grows a segment whose glyphs do
 * not fit the width this gives, and system justification, which stretches
 * a whole line to the margin. This engine has both already, in
 * `layout/spacing.ts` and in `justifySystem`.
 */

import { ENGRAVING_STYLE } from './engraving-style.js';
import type { DefaultsSource } from './sources.js';

export const SPACING_SOURCE: DefaultsSource = {
  source: 'houseStyle',
  symbol: 'duration-to-width law',
  what: 'the power law, and the 3.5sp a quarter note starts from',
};

export const SEGMENT_STRETCH_SOURCE: DefaultsSource = {
  source: 'houseStyle',
  symbol: 'multi-voice segment rule',
  what: 'when the power law applies, and what replaces it when it does not',
};

/**
 * What a quarter note is worth, in staff spaces, before any stretch.
 * Every other duration is this times the stretch below.
 */
export const QUARTER_NOTE_SPACE = 3.5;

/**
 * How much more (or less) room a note of `ticks` gets than a quarter
 * note. `ticksPerQuarter` is this engine's own division, so the same
 * function serves a file at 480 ticks per quarter and one at 960.
 */
export function durationStretch(
  ticks: number,
  ticksPerQuarter: number,
  slope: number = ENGRAVING_STYLE.measure.spacing,
): number {
  if (!(ticks > 0) || !(ticksPerQuarter > 0)) return 1;
  return Math.pow(slope, Math.log2(ticks / ticksPerQuarter));
}

/**
 * The space, in staff spaces, a note of `ticks` is given before the
 * minimum-distance pass and before the system is justified.
 *
 * The simple form, for a measure with one voice in it: every segment is
 * then adjacent by definition, so the power law applies outright.
 * `segmentSpace` is the full rule.
 */
export function eventSpace(
  ticks: number,
  ticksPerQuarter: number,
  slope: number = ENGRAVING_STYLE.measure.spacing,
): number {
  return QUARTER_NOTE_SPACE * durationStretch(ticks, ticksPerQuarter, slope);
}

/**
 * One attack, as this spacing law sees it.
 *
 * `ticks` is the gap to the NEXT attack — the width this segment is being
 * asked to pay for. `shortestSounding` is the shortest note or rest
 * sounding ANYWHERE across that gap, in any voice on any staff. They are
 * the same number in the ordinary case; they come apart the moment one
 * voice holds a long note while another moves underneath it.
 */
export interface SpacingSegment {
  readonly ticks: number;
  readonly shortestSounding: number;
}

/**
 * The stretch for ONE segment, which is not always the power law.
 *
 * A segment is "adjacent" when the shortest thing sounding across it is
 * exactly as long as the segment itself — that is, the gap is set by a
 * note that actually ends at the next attack, with nothing shorter
 * running through. Then, and only then, the power law applies to the
 * segment's own length.
 *
 * When it is NOT adjacent — a half note in one voice while eighths run
 * under it — the power law is applied to the SHORTEST sounding note and
 * the result is scaled LINEARLY by how many of those the segment is
 * worth. A half note over four eighths therefore gets four times an
 * eighth's space, not a half note's: it is sharing the bar with music
 * that has already been given room, and paying the power law twice would
 * push the voices out of vertical alignment.
 *
 * `previous` is the segment before this one. The rule prefers ITS shortest
 * sounding note as the basis when that segment was itself not adjacent and
 * carried something shorter — the polyrhythm case. Leave it undefined and
 * the rule falls back to this segment's own shortest, which is what a
 * first segment gets.
 */
export function segmentStretch(
  segment: SpacingSegment,
  ticksPerQuarter: number,
  options: SegmentOptions = {},
): number {
  const { previous: prevSegment, slope = ENGRAVING_STYLE.measure.spacing } = options;
  const { ticks, shortestSounding } = segment;
  if (!(ticks > 0) || !(shortestSounding > 0)) return 1;

  if (shortestSounding === ticks) {
    return durationStretch(ticks, ticksPerQuarter, slope);
  }

  const prevWasAdjacent =
    prevSegment !== undefined && prevSegment.shortestSounding === prevSegment.ticks;
  const basis =
    prevSegment !== undefined && !prevWasAdjacent && prevSegment.shortestSounding < shortestSounding
      ? prevSegment.shortestSounding
      : shortestSounding;

  return durationStretch(basis, ticksPerQuarter, slope) * (ticks / basis);
}

/**
 * The knobs this law exposes, each defaulting to the house value. A
 * caller with its own house style passes its own numbers and still gets
 * the ARITHMETIC, which is the part worth sharing.
 */
export interface SegmentOptions {
  /** The segment before this one, for the polyrhythm case. */
  readonly previous?: SpacingSegment;
  /** The factor one doubling of duration multiplies by. */
  readonly slope?: number;
  /** Which DIVIDES: above 1 packs tighter, below 1 lets out. */
  readonly density?: number;
  /** What a quarter note is worth before any stretch. */
  readonly quarterNoteSpace?: number;
}

/**
 * The space one segment is given, in staff spaces, before the minimum-
 * distance pass and before the system is justified.
 */
export function segmentSpace(
  segment: SpacingSegment,
  ticksPerQuarter: number,
  options: SegmentOptions = {},
): number {
  const {
    density = ENGRAVING_STYLE.measure.spacingDensity,
    quarterNoteSpace = QUARTER_NOTE_SPACE,
  } = options;
  const stretch = segmentStretch(segment, ticksPerQuarter, options);
  return (quarterNoteSpace * stretch) / (density > 0 ? density : 1);
}

/**
 * Running x positions for a measure's attacks.
 *
 * `gapTicks[i]` is the distance from attack i to the next attack (or to
 * the barline for the last one) — the same input `computeProportionalPositions`
 * takes, so the two can be compared directly on one measure. The returned
 * array has one more entry than the input: the last is where the BARLINE
 * falls, which is what makes the last note's trailing space come out
 * right.
 */
export function positions(
  gapTicks: readonly number[],
  ticksPerQuarter: number,
  slope: number = ENGRAVING_STYLE.measure.spacing,
): readonly number[] {
  const out: number[] = [];
  let x = 0;
  for (const gap of gapTicks) {
    out.push(x);
    x += eventSpace(gap, ticksPerQuarter, slope);
  }
  out.push(x);
  return out;
}
