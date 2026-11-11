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
 * There is one more rule on top, and it matters the moment a staff has
 * more than one voice: see `museScoreSegmentStretch`. A segment that a
 * SHORTER note runs through does not get the power law at all -- it is
 * priced linearly off that shorter note, so the voices stay lined up
 * vertically. A single-voice measure never meets that case, which is
 * why the two lines above are the whole story for most music and no
 * story at all for a drum chart.
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

export const SEGMENT_STRETCH_SOURCE: MuseScoreSource = {
  path: 'src/engraving/rendering/score/horizontalspacing.cpp',
  symbol: 'HorizontalSpacing::computeSegmentDurationStretch',
  what: 'when the power law applies, and what replaces it when it does not',
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
 * The simple form, for a measure with one voice in it: every segment is
 * then adjacent by definition, so the power law applies outright.
 * `museScoreSegmentSpace` is the full rule.
 */
export function museScoreEventSpace(
  ticks: number,
  ticksPerQuarter: number,
  slope: number = MUSESCORE_STYLE.measure.spacing,
): number {
  return QUARTER_NOTE_SPACE * museScoreDurationStretch(ticks, ticksPerQuarter, slope);
}

/**
 * One attack, as MuseScore's spacing sees it.
 *
 * `ticks` is the gap to the NEXT attack -- the width this segment is
 * being asked to pay for. `shortestSounding` is the shortest note or
 * rest sounding ANYWHERE across that gap, in any voice on any staff.
 * They are the same number in the ordinary case; they come apart the
 * moment one voice holds a long note while another moves underneath it.
 */
export interface MuseScoreSegment {
  readonly ticks: number;
  readonly shortestSounding: number;
}

/**
 * MuseScore's `computeSegmentDurationStretch`: the stretch for ONE
 * segment, which is not always the power law.
 *
 * MuseScore calls a segment "adjacent" when the shortest thing sounding
 * across it is exactly as long as the segment itself -- that is, the
 * gap is set by a note that actually ends at the next attack, with
 * nothing shorter running through. Then, and only then, the power law
 * applies to the segment's own length.
 *
 * When it is NOT adjacent -- a half note in one voice while eighths run
 * under it -- the power law is applied to the SHORTEST sounding note
 * and the result is scaled LINEARLY by how many of those the segment is
 * worth. A half note over four eighths therefore gets four times an
 * eighth's space, not a half note's: it is sharing the bar with music
 * that has already been given room, and paying the power law twice
 * would push the voices out of vertical alignment.
 *
 * `prevSegment` is the segment before this one. MuseScore prefers ITS
 * shortest sounding note as the basis when that segment was itself not
 * adjacent and carried something shorter -- its own comment calls that
 * case "polyrhythms". Leave it undefined and the rule falls back to
 * this segment's own shortest, which is what a first segment gets.
 */
export function museScoreSegmentStretch(
  segment: MuseScoreSegment,
  ticksPerQuarter: number,
  options: MuseScoreSegmentOptions = {},
): number {
  const { previous: prevSegment, slope = MUSESCORE_STYLE.measure.spacing } = options;
  const { ticks, shortestSounding } = segment;
  if (!(ticks > 0) || !(shortestSounding > 0)) return 1;

  if (shortestSounding === ticks) {
    return museScoreDurationStretch(ticks, ticksPerQuarter, slope);
  }

  const prevWasAdjacent =
    prevSegment !== undefined && prevSegment.shortestSounding === prevSegment.ticks;
  const basis =
    prevSegment !== undefined && !prevWasAdjacent && prevSegment.shortestSounding < shortestSounding
      ? prevSegment.shortestSounding
      : shortestSounding;

  return museScoreDurationStretch(basis, ticksPerQuarter, slope) * (ticks / basis);
}

/**
 * The knobs MuseScore's own style exposes on this law, each defaulting
 * to what MuseScore ships. A caller that wants MuseScore's look passes
 * nothing; one that has its own house style passes its own numbers and
 * still gets MuseScore's ARITHMETIC, which is the part worth sharing.
 */
export interface MuseScoreSegmentOptions {
  /** The segment before this one, for the polyrhythm case. */
  readonly previous?: MuseScoreSegment;
  /** `measureSpacing`: the factor one doubling of duration multiplies by. */
  readonly slope?: number;
  /** `spacingDensity`, which DIVIDES: above 1 packs tighter, below 1 lets out. */
  readonly density?: number;
  /** `DEFAULT_QUARTER_NOTE_SPACE`: what a quarter note is worth before any stretch. */
  readonly quarterNoteSpace?: number;
}

/**
 * The space one segment is given, in staff spaces, before the minimum-
 * distance pass and before the system is justified.
 *
 * This is the function the engine's own `layout/spacing.ts` calls when
 * its spacing law is `'musescore'`. It is deliberately the SAME code
 * rather than a copy of the arithmetic: a second copy is a second thing
 * to keep in step, and the point of this folder is that there is one
 * place to check a number against MuseScore.
 */
export function museScoreSegmentSpace(
  segment: MuseScoreSegment,
  ticksPerQuarter: number,
  options: MuseScoreSegmentOptions = {},
): number {
  const {
    density = MUSESCORE_STYLE.measure.spacingDensity,
    quarterNoteSpace = QUARTER_NOTE_SPACE,
  } = options;
  const stretch = museScoreSegmentStretch(segment, ticksPerQuarter, options);
  return (quarterNoteSpace * stretch) / (density > 0 ? density : 1);
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
