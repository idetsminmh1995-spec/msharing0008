import type { PitchStep } from '../core/pitch.js';
/**
 * The fixed order sharps are added to a key signature, regardless of
 * clef -- F#, C#, G#, D#, A#, E#, B#. Mnemonic: "Fat Cats Go Down Alleys
 * (to) Eat Birds" (or "Father Charles Goes Down And Ends Battle").
 */
export declare const SHARP_ORDER: readonly PitchStep[];
/** The flat order is the exact reverse of the sharp order: Bb, Eb, Ab, Db, Gb, Cb, Fb. */
export declare const FLAT_ORDER: readonly PitchStep[];
/**
 * Which of the 7 sharps/flats are active for a key signature with this
 * many sharps (positive) or flats (negative would be handled by the
 * caller choosing FLAT_ORDER instead -- this function takes a plain
 * count, always 0-7).
 */
export declare function sharpsForCount(count: number): readonly PitchStep[];
export declare function flatsForCount(count: number): readonly PitchStep[];
/**
 * Per-clef Y-positions (staff-space units, Phase 9's convention) for each
 * of the 7 sharps and 7 flats, in SHARP_ORDER/FLAT_ORDER order. These are
 * NOT derived from staffPositionForPitch() at render time -- real key
 * signature engraving picks a specific, fixed octave for each accidental
 * (chosen by convention to produce a readable zigzag within/near the
 * staff), which doesn't follow the clef's general pitch-position formula
 * in a way that could be computed generically. Each row below was
 * independently verified against the real notated pitch letter+octave
 * for every position -- see Doc/phase-11-key-signature-engine.md Sec. 3
 * for the full derivation and sourcing.
 */
export interface ClefKeySignaturePositions {
    readonly sharpPositions: readonly number[];
    readonly flatPositions: readonly number[];
}
export declare function getKeySignaturePositions(clefName: string): ClefKeySignaturePositions;
export type AccidentalType = 'sharp' | 'flat';
export interface KeySignatureAccidental {
    readonly step: PitchStep;
    readonly type: AccidentalType;
    readonly y: number;
}
/**
 * Returns the key-signature accidentals for a MusicXML-style <fifths>
 * value (positive = sharps, negative = flats, 0 = none -- e.g. fifths=2
 * is D major/B minor: F# C#), positioned for a specific clef. Throws for
 * any clef getKeySignaturePositions() doesn't have verified positions for.
 */
export declare function keySignatureAccidentals(fifths: number, clefName: string): readonly KeySignatureAccidental[];
export interface CancellationNatural {
    readonly step: PitchStep;
    readonly y: number;
}
/**
 * When moving from one key to another, any accidental present in the OLD
 * key but not carried over into the new one needs a natural sign -- drawn
 * at the position the OLD accidental occupied (the standard cancellation
 * convention). Three cases: new key is C major/A minor (fifths=0) ->
 * cancel everything; new key uses the opposite accidental type (sharps
 * vs flats) -> cancel everything; new key is the same type with FEWER
 * accidentals -> cancel only the excess ones (e.g. D major -> G major
 * cancels just C#, at C#'s old position).
 */
export declare function cancellationNaturals(oldFifths: number, newFifths: number, clefName: string): readonly CancellationNatural[];
