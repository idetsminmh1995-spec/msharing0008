import type { Beat } from "./Beat";
import type { Voice } from "./Voice";
/**
 * Represents a list of beats that are grouped within the same tuplet.
 * @public
 */
export declare class TupletGroup {
    private static readonly _halfTicks;
    private static readonly _quarterTicks;
    private static readonly _eighthTicks;
    private static readonly _sixteenthTicks;
    private static readonly _thirtySecondTicks;
    private static readonly _sixtyFourthTicks;
    private static readonly _oneHundredTwentyEighthTicks;
    private static readonly _twoHundredFiftySixthTicks;
    private static _allTicks;
    private _isEqualLengthTuplet;
    totalDuration: number;
    /**
     * Gets or sets the list of beats contained in this group.
     */
    beats: Beat[];
    /**
     * Gets or sets the voice this group belongs to.
     */
    voice: Voice;
    /**
     * Gets a value indicating whether the tuplet group is fully filled.
     */
    isFull: boolean;
    /**
     * Initializes a new instance of the {@link TupletGroup} class.
     * @param voice The voice this group belongs to.
     */
    constructor(voice: Voice);
    check(beat: Beat): boolean;
}
