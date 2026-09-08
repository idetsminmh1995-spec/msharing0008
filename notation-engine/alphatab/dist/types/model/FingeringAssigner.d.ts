import type { Beat } from "./Beat";
/**
 * Cost-function weights for {@link FingeringAssigner}. Defaults tuned for
 * six-string guitar.
 * @internal
 */
export declare class FingeringOptions {
    preferredHandPosition: number;
    /** Negative = prefer open strings. */
    openStringBonus: number;
    highFretPenaltyWeight: number;
    negativeFretPenaltyWeight: number;
    /** Soft; heavy weight prefers distinct strings but permits collisions
     *  for chords with more notes than strings. */
    collisionPenalty: number;
    /** Negative = cluster chord notes on neighbouring strings. */
    adjacentStringBonus: number;
    /** Negative = repeated pitches stay on the same string across beats. */
    stringContinuityBonus: number;
    /** EWMA weight for the hand-position anchor:
     *  `hand = α·hand + (1−α)·newHand`. */
    handPositionMomentum: number;
}
/**
 * Assigns (string, fret) to a stream of beats via greedy hand-position
 * hysteresis. One instance per (staff, voice); mutates notes in place.
 * Not thread-safe.
 * @internal
 */
export declare class FingeringAssigner {
    private static readonly _maxStrings;
    private readonly _tuning;
    private readonly _capo;
    private readonly _transpositionPitch;
    private readonly _options;
    private _handPosition;
    private readonly _lastStringByMidi;
    private _sortedIdx;
    /**
     * @param tuning High-to-low MIDI pitches (matches {@link Staff.tuning}). 1..30 entries.
     */
    constructor(tuning: number[], capo: number, transpositionPitch: number, options?: FingeringOptions);
    /** Reset the hand-position anchor and per-pitch continuity memory. */
    reset(): void;
    /** Assigns `(string, fret)` to notes that don't already carry both. */
    assign(beat: Beat): void;
}
