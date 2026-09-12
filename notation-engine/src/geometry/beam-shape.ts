import type { DurationType } from '../core/duration.js';
import type { BeamStyle } from '../config/config.js';
import { chordStemDirection } from './stem.js';

export type { BeamStyle };
export type BeamDirection = 'up' | 'down';

/**
 * Max total vertical change across a beam, in staff-spaces. §9.13: no
 * single universal value exists across publishers -- this sits within the
 * documented real-world range (Dorico's own dev blog: 0.25sp for a
 * second up to 1.5sp for a seventh+; a separate engraving summary
 * independently cites up to 0.5-1.75sp) rather than reproducing any one
 * house style exactly.
 */
export const MAX_BEAM_SLOPE = 1.0;

export interface BeamShape {
  readonly direction: BeamDirection;
  readonly style: BeamStyle;
  readonly startX: number;
  readonly startY: number;
  readonly endX: number;
  readonly endY: number;
}

function naturalStemTipY(position: number, direction: BeamDirection, stemLength: number): number {
  return direction === 'up' ? position - stemLength : position + stemLength;
}

/**
 * §9.13's direction rule: a beam group's overall stem direction is decided
 * the same way a chord's is (§9.8's `chordStemDirection`) -- whichever
 * note is furthest from the middle line wins, whether those notes sound
 * together (a chord) or in sequence (a beam group) doesn't matter to this
 * specific decision.
 */
export function beamDirection(
  notePositions: readonly number[],
  staffMiddleLineY: number,
): BeamDirection {
  return chordStemDirection(notePositions, staffMiddleLineY);
}

/**
 * Computes the beam's two endpoints for a group. `notePositions`/`noteXs`
 * must be the same length and in the group's left-to-right order;
 * `stemLength` is the natural (unbeamed) stem length (typically §9.8's
 * `computeStemLength` result for the group's own direction/positions, or
 * simply its 3.5sp default).
 */
export function computeBeamShape(
  notePositions: readonly number[],
  noteXs: readonly number[],
  direction: BeamDirection,
  style: BeamStyle,
  stemLength: number,
): BeamShape {
  const firstPos = notePositions[0];
  const lastPos = notePositions[notePositions.length - 1];
  const firstX = noteXs[0];
  const lastX = noteXs[noteXs.length - 1];
  if (
    firstPos === undefined ||
    lastPos === undefined ||
    firstX === undefined ||
    lastX === undefined
  ) {
    throw new Error('computeBeamShape needs at least one note position/X pair');
  }

  if (style === 'flat') {
    const tips = notePositions.map((p) => naturalStemTipY(p, direction, stemLength));
    const flatY = direction === 'up' ? Math.min(...tips) : Math.max(...tips);
    return { direction, style, startX: firstX, startY: flatY, endX: lastX, endY: flatY };
  }

  const startY = naturalStemTipY(firstPos, direction, stemLength);
  const naturalEndY = naturalStemTipY(lastPos, direction, stemLength);
  const diff = naturalEndY - startY;
  const endY =
    Math.abs(diff) > MAX_BEAM_SLOPE ? startY + Math.sign(diff) * MAX_BEAM_SLOPE : naturalEndY;

  return { direction, style, startX: firstX, startY, endX: lastX, endY };
}

/** The beam's Y at any X along its span (linear interpolation) -- used to find where an individual note's stem should actually end once the beam's own slope is known. */
export function beamYAtX(shape: BeamShape, x: number): number {
  if (shape.endX === shape.startX) return shape.startY;
  const t = (x - shape.startX) / (shape.endX - shape.startX);
  return shape.startY + t * (shape.endY - shape.startY);
}

/**
 * How many parallel beam lines a duration needs -- the same count §9.9's
 * flag glyphs already use (1 for eighth, up to 8 for 1024th), since a
 * beam is visually just "the flags joined together."
 */
export function numBeamLines(durationType: DurationType): number {
  switch (durationType) {
    case 'eighth':
      return 1;
    case '16th':
      return 2;
    case '32nd':
      return 3;
    case '64th':
      return 4;
    case '128th':
      return 5;
    case '256th':
      return 6;
    case '512th':
      return 7;
    case '1024th':
      return 8;
    default:
      throw new Error(
        `Duration type "${durationType}" is never beamed (only eighth notes and shorter are).`,
      );
  }
}
