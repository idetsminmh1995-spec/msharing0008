/**
 * spacing.ts — how much room MuseScore gives a note.
 *
 * This is the single biggest reason a correct score can still not look
 * like MuseScore's, and it is two lines of arithmetic:
 *
 *     stretch = measureSpacing ^ log2(duration / quarter)
 *     width   = 3.5sp * stretch
 *
 * `measureSpacing` is 1.5 by default, so each doubling of a note's
 * duration multiplies its space by one and a half: a quarter note gets
 * 3.5 staff spaces, an eighth 2.33, a sixteenth 1.56, a half 5.25, a
 * whole 7.875.
 *
 * It is a POWER law. This engine's own §14 uses a logarithmic one --
 * a fixed increment ADDED per doubling rather than a factor applied --
 * and the two disagree most at the extremes: against §14's defaults a
 * whole note comes out 7.9 spaces here against 4.8 there, and a
 * sixteenth 1.6 against 1.2. Neither is wrong; they are two house
 * styles, and this one is MuseScore's.
 *
 * What is NOT here: MuseScore's second pass, which grows a segment
 * whose glyphs do not fit the width this gives, and its system
 * justification, which stretches a whole line to the margin. This
 * engine has both of those already, in `layout/spacing.ts` and in
 * `justifySystem` -- they are the parts the two programs already agree
 * about in principle, and duplicating them here would be a second copy
 * to keep in step rather than a second opinion worth having.
 */

import type { MuseScoreSource } from './provenance.js';
import { MUSESCORE_STYLE } from './style.js';

export const SPACING_SOURCE: MuseScoreSource = {
  path: 'src/engraving/rendering/score/horizontalspacing.cpp',
  symbol: 'HorizontalSpacing::durationStretchForTicks / chordRestSegmentNaturalWidth',
  what: 'the duration-to-width law, and the 3.5sp a quarter note starts from',
};

/**
 * What a quarter note is worth, in staff spaces, before any stretch.
 *
 * MuseScore's own `DEFAULT_QUARTER_NOTE_SPACE`. Every other duration is
 * this times the stretch below.
 */
export const QUARTER_NOTE_SPACE = 3.5;

/**
 * MuseScore's `durationStretchForTicks`: how much more (or less) room a
 * note of `ticks` gets than a quarter note.
 *
 * `ticksPerQuarter` is this engine's own division, so the same function
 * serves a file at 480 ticks per quarter and one at 960.
 */
export function museScoreDurationStretch(
  ticks: number,
  ticksPerQuarter: number,
  slope: number = MUSESCORE_STYLE.measure.spacing,
): number {
  if (!(ticks > 0) || !(ticksPerQuarter > 0)) return 1;
  return Math.pow(slope, Math.log2(ticks / ticksPerQuarter));
}

/**
 * The space, in staff spaces, MuseScore would give a note of `ticks`
 * before its minimum-distance pass and before the system is justified.
 *
 * This is the drop-in for this engine's own `computeEventSpace`: same
 * signature shape, same units, a different house style.
 */
export function museScoreEventSpace(
  ticks: number,
  ticksPerQuarter: number,
  slope: number = MUSESCORE_STYLE.measure.spacing,
): number {
  return QUARTER_NOTE_SPACE * museScoreDurationStretch(ticks, ticksPerQuarter, slope);
}

/**
 * Running x positions for a measure's attacks, MuseScore's way.
 *
 * `gapTicks[i]` is the distance from attack i to the next attack (or to
 * the barline for the last one) -- the same input this engine's own
 * `computeProportionalPositions` takes, so the two can be compared
 * directly on one measure. The returned array has one more entry than
 * the input: the last is where the BARLINE falls, which is what makes
 * the last note's trailing space come out right.
 */
export function museScorePositions(
  gapTicks: readonly number[],
  ticksPerQuarter: number,
  slope: number = MUSESCORE_STYLE.measure.spacing,
): readonly number[] {
  const positions: number[] = [];
  let x = 0;
  for (const gap of gapTicks) {
    positions.push(x);
    x += museScoreEventSpace(gap, ticksPerQuarter, slope);
  }
  positions.push(x);
  return positions;
}
