import type { DurationType } from '../core/duration.js';
import type { BeamStyle } from '../config/config.js';
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
export declare const MAX_BEAM_SLOPE = 1;
export interface BeamShape {
    readonly direction: BeamDirection;
    readonly style: BeamStyle;
    readonly startX: number;
    readonly startY: number;
    readonly endX: number;
    readonly endY: number;
}
/**
 * §9.13's direction rule: a beam group's overall stem direction is decided
 * the same way a chord's is (§9.8's `chordStemDirection`) -- whichever
 * note is furthest from the middle line wins, whether those notes sound
 * together (a chord) or in sequence (a beam group) doesn't matter to this
 * specific decision.
 */
export declare function beamDirection(notePositions: readonly number[], staffMiddleLineY: number): BeamDirection;
/**
 * Computes the beam's two endpoints for a group. `notePositions`/`noteXs`
 * must be the same length and in the group's left-to-right order;
 * `stemLength` is the natural (unbeamed) stem length (typically §9.8's
 * `computeStemLength` result for the group's own direction/positions, or
 * simply its 3.5sp default).
 */
export declare function computeBeamShape(notePositions: readonly number[], noteXs: readonly number[], direction: BeamDirection, style: BeamStyle, stemLength: number): BeamShape;
/** The beam's Y at any X along its span (linear interpolation) -- used to find where an individual note's stem should actually end once the beam's own slope is known. */
export declare function beamYAtX(shape: BeamShape, x: number): number;
/**
 * How many parallel beam lines a duration needs -- the same count §9.9's
 * flag glyphs already use (1 for eighth, up to 8 for 1024th), since a
 * beam is visually just "the flags joined together."
 */
export declare function numBeamLines(durationType: DurationType): number;
/**
 * The shortest a beam line may be drawn -- MuseScore's own
 * `Sid::beamMinLen`, and the length a HOOK is given, since a hook is
 * exactly "a beam with nothing on its other end."
 */
export declare const BEAM_HOOK_LENGTH = 1.1;
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
export declare function computeBeamSegments(beamLevels: readonly number[], hints?: readonly (readonly {
    readonly number: number;
    readonly value: string;
}[] | undefined)[]): readonly BeamSegment[];
