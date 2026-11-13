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
  const slanted =
    Math.abs(diff) > MAX_BEAM_SLOPE ? startY + Math.sign(diff) * MAX_BEAM_SLOPE : naturalEndY;

  // Then lift the whole beam clear of every note under it.
  //
  // The slope above is taken from the FIRST and LAST notes, which says
  // nothing about the ones in between or about how far the beam ends up
  // from the highest of them. A rising run anchored on its first note
  // leaves its last note with almost no stem at all -- the note nearest
  // the beam is the one that decides, so the beam is moved until THAT
  // note has a full-length stem and every other note has more. This is
  // what stops a beamed passage looking like it is sliding off its own
  // noteheads.
  const span = lastX - firstX;
  const shortest = notePositions.reduce((least, position, i) => {
    const x = noteXs[i] ?? firstX;
    const t = span === 0 ? 0 : (x - firstX) / span;
    const beamY = startY + t * (slanted - startY);
    const length = direction === 'up' ? position - beamY : beamY - position;
    return Math.min(least, length);
  }, Number.POSITIVE_INFINITY);
  const lift =
    Number.isFinite(shortest) && shortest < stemLength
      ? (stemLength - shortest) * (direction === 'up' ? -1 : 1)
      : 0;

  return {
    direction,
    style,
    startX: firstX,
    startY: startY + lift,
    endX: lastX,
    endY: slanted + lift,
  };
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

/**
 * The shortest a beam line may be drawn -- MuseScore's own
 * `Sid::beamMinLen`, and the length a HOOK is given, since a hook is
 * exactly "a beam with nothing on its other end."
 */
export const BEAM_HOOK_LENGTH = 1.1;

/** One drawn beam line: which level it is, and which notes of the group it runs between. */
export interface BeamSegment {
  /** 1 = the primary (eighth) beam, 2 = the sixteenth beam, and so on. */
  readonly level: number;
  /** Index into the group, of the note this line starts at. */
  readonly fromIndex: number;
  /** Index into the group, of the note this line ends at. Equal to `fromIndex` for a hook. */
  readonly toIndex: number;
  /**
   * Set only on a HOOK -- a level that only one note of the group needs,
   * drawn as a stub off that note's stem rather than as a line between
   * two stems. 'backward' points left (toward the previous note),
   * 'forward' points right.
   */
  readonly hook?: 'forward' | 'backward';
}

/**
 * Which beam lines a group actually gets.
 *
 * This is the rule a dotted eighth followed by a sixteenth makes
 * visible, and the one this engine used to get wrong: it drew as many
 * parallel beams as the group's SHORTEST note needed, across the whole
 * group, so the dotted eighth came out with a sixteenth beam it does not
 * have. What is actually engraved is one full beam over both, plus a
 * short hook on the sixteenth alone.
 *
 * The rule, level by level:
 *
 * - Level 1 always runs the length of the group -- that is what makes it
 *   one group.
 * - At level 2 and above, each maximal run of CONSECUTIVE notes that
 *   need that level gets its own line. A run of two or more is drawn
 *   between their stems; a run of exactly one has no other stem to reach
 *   and becomes a hook.
 *
 * `hints` is the file's own `<beam number="N">` for each note, when it
 * wrote them: MusicXML states a hook outright ("forward hook" /
 * "backward hook"), and a file that says which way its hook points is
 * the authority on it (§10.8). Where it says nothing, a hook points
 * BACKWARD -- toward the note it shares its beat with -- except on the
 * group's first note, which has nothing behind it.
 */
export function computeBeamSegments(
  beamLevels: readonly number[],
  hints?: readonly (readonly { readonly number: number; readonly value: string }[] | undefined)[],
): readonly BeamSegment[] {
  const count = beamLevels.length;
  if (count === 0) return [];
  const maxLevel = Math.max(...beamLevels);
  if (maxLevel < 1) return [];

  const segments: BeamSegment[] = [];

  // Level 1 is the group itself, whatever the individual notes need --
  // an eighth and a sixteenth beamed together still share one primary
  // beam from the first stem to the last.
  segments.push({ level: 1, fromIndex: 0, toIndex: count - 1 });

  for (let level = 2; level <= maxLevel; level++) {
    let runStart: number | undefined;
    for (let i = 0; i <= count; i++) {
      const needs = i < count && (beamLevels[i] ?? 0) >= level;
      if (needs) {
        if (runStart === undefined) runStart = i;
        continue;
      }
      if (runStart === undefined) continue;
      const runEnd = i - 1;
      if (runEnd > runStart) {
        segments.push({ level, fromIndex: runStart, toIndex: runEnd });
      } else {
        segments.push({
          level,
          fromIndex: runStart,
          toIndex: runStart,
          hook: hookDirection(runStart, count, hints?.[runStart], level),
        });
      }
      runStart = undefined;
    }
  }

  return segments;
}

function hookDirection(
  index: number,
  count: number,
  hintsForNote: readonly { readonly number: number; readonly value: string }[] | undefined,
  level: number,
): 'forward' | 'backward' {
  const stated = hintsForNote?.find((h) => h.number === level)?.value;
  if (stated === 'forward hook') return 'forward';
  if (stated === 'backward hook') return 'backward';
  // Nothing stated: a lone short note hooks back toward the note it
  // belongs with, which is the previous one -- unless it is the group's
  // first note, where there is no previous one to point at.
  return index === 0 && count > 1 ? 'forward' : 'backward';
}
