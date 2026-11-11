import type { StemDirection } from './stem.js';
/**
 * §9.17's rule, confirmed against MuseScore's own documented "Automatic"
 * bracket behavior: a bracket is redundant when the beam already shows
 * the group's extent. Needed whenever the group contains any unbeamed
 * note or a rest (nothing there for a beam to visually join).
 */
export declare function tupletBracketNeeded(allMembersBeamed: boolean): boolean;
/**
 * §9.17's side rule, confirmed against Dorico's published conventions:
 * the bracket/number sits on the SAME side as the stem direction --
 * notably the OPPOSITE relationship from a tie (§9.15) or slur (§9.16),
 * which both sit opposite the stem. Getting this backwards would be a
 * real, easy-to-make mistake given how consistently ties/slurs go the
 * other way.
 */
export declare function tupletSide(stemDirection: StemDirection): 'above' | 'below';
/**
 * The real SMuFL digit glyph for a tuplet number -- confirmed to be a
 * SEPARATE glyph set from time-signature digits (`tuplet0`..`tuplet9`,
 * not `timeSig0`..`timeSig9`) before writing this, not assumed shared.
 * Single digit only (0-9) -- see §9.17's stated multi-digit limitation.
 */
export declare function tupletDigitGlyphName(digit: number): string;
export interface TupletBracketShape {
    readonly startX: number;
    readonly endX: number;
    readonly y: number;
    readonly side: 'above' | 'below';
    readonly hookLength: number;
}
/** The bracket's endpoints and hook length -- a horizontal line from startX to endX at y, with a short perpendicular hook at each end pointing back toward the notes. */
export declare function computeTupletBracketShape(startX: number, endX: number, y: number, side: 'above' | 'below'): TupletBracketShape;
