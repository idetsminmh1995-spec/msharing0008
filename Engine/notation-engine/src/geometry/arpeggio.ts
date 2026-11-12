import type { ArpeggioDirection } from '../core/note.js';

/**
 * §9.25's arpeggio and non-arpeggio (Phase 56).
 *
 * A rolled chord is drawn as a vertical squiggle to the LEFT of the chord,
 * as tall as the chord itself; a chord explicitly NOT rolled is drawn as
 * a vertical bracket in the same place, with a short horizontal hook at
 * each end. Both marks are the same size and in the same place, because
 * they are two answers to the same question and a reader compares them.
 *
 * Drawn as a path rather than as a scaled glyph, for the same reason
 * `computeBraceShape` is: `arpeggiato` is a fixed 5.5-space-tall glyph,
 * and a chord is anywhere from 1 to 10 spaces tall. Stretching a glyph
 * with a transform would stretch its stroke weight too, so a two-note
 * chord's squiggle would be fat and a six-note chord's thin. A path is
 * the same weight at every height.
 */

/** How far the squiggle's own zigzag swings either side of its centre line. */
export const ARPEGGIO_AMPLITUDE = 0.28;

/** One full zigzag per this many staff spaces, so the wave density stays constant as a chord grows. */
const SPACES_PER_WAVE = 0.62;

/** At least this many waves, however short the chord -- a two-note chord still has to read as a squiggle. */
const MIN_WAVES = 5;

export interface ArpeggioShape {
  /** The centre line's x. The squiggle swings either side of it. */
  readonly x: number;
  readonly topY: number;
  readonly bottomY: number;
  readonly direction: ArpeggioDirection;
  /** The zigzag, in drawing order, as absolute coordinates. */
  readonly points: readonly (readonly [number, number])[];
}

/**
 * The squiggle for a chord spanning `topY`..`bottomY` (y-down, so `topY`
 * is the smaller number).
 *
 * `direction` slants the whole mark: an upward roll leans right as it
 * rises, which is the convention that lets a player see the direction
 * before reading the noteheads. The lean is applied to the wave
 * positions rather than to the glyph, so the mark stays inside the same
 * narrow column for either direction.
 */
export function computeArpeggioShape(
  x: number,
  topY: number,
  bottomY: number,
  direction: ArpeggioDirection = 'up',
): ArpeggioShape {
  const height = Math.max(bottomY - topY, 0);
  const waves = Math.max(MIN_WAVES, Math.round(height / SPACES_PER_WAVE));
  const points: (readonly [number, number])[] = [];
  // A lean of a third of the amplitude, so the direction reads without the
  // mark drifting into the chord's own noteheads.
  const lean = (direction === 'up' ? 1 : -1) * ARPEGGIO_AMPLITUDE * 0.6;
  for (let i = 0; i <= waves; i++) {
    const t = i / waves;
    const y = topY + height * t;
    // Alternate either side of the centre line; the first and last points
    // sit ON it so the mark starts and ends cleanly.
    const swing =
      i === 0 || i === waves ? 0 : i % 2 === 0 ? ARPEGGIO_AMPLITUDE : -ARPEGGIO_AMPLITUDE;
    // `t` runs from the top down; the lean is applied so that the top of an
    // "up" roll sits to the right of its bottom.
    const xOffset = swing + lean * (1 - t * 2) * 0.5;
    points.push([x + xOffset, y]);
  }
  return { x, topY, bottomY, direction, points };
}

export interface NonArpeggioShape {
  readonly x: number;
  readonly topY: number;
  readonly bottomY: number;
  /** Length of each end hook, pointing away from the chord. */
  readonly hookLength: number;
}

/**
 * The bracket for a chord the file explicitly says is NOT rolled.
 *
 * The hooks point LEFT, away from the noteheads, which is the only
 * direction with room: the mark sits immediately left of the chord's own
 * left edge.
 */
export function computeNonArpeggioShape(
  x: number,
  topY: number,
  bottomY: number,
  hookLength = 0.8,
): NonArpeggioShape {
  return { x, topY, bottomY, hookLength };
}
