import { BeatTickLookup } from "./BeatTickLookup";
import type { Beat } from "./../model/Beat";
import type { MasterBar } from "./../model/MasterBar";
/**
 * Represents a single point in time defining the tempo of a {@link MasterBarTickLookup}.
 * This is typically the initial tempo of a master bar or a tempo change.
 * @public
 */
export declare class MasterBarTickLookupTempoChange {
    /**
     * Gets or sets the tick position within the {@link MasterBarTickLookup.start} and  {@link MasterBarTickLookup.end} range.
     */
    tick: number;
    /**
     * Gets or sets the tempo at the tick position.
     */
    tempo: number;
    constructor(tick: number, tempo: number);
}
/**
 * Represents the time period, for which all bars of a {@link MasterBar} are played.
 * @public
 */
export declare class MasterBarTickLookup {
    /**
     * Gets or sets the start time in midi ticks at which the MasterBar is played.
     */
    start: number;
    /**
     * Gets or sets the end time in midi ticks at which the MasterBar is played.
     */
    end: number;
    /**
     * Gets or sets the current tempo when the MasterBar is played.
     * @deprecated use {@link tempoChanges}
     */
    get tempo(): number;
    /**
     * Gets the list of tempo changes within the tick lookup.
     */
    readonly tempoChanges: MasterBarTickLookupTempoChange[];
    /**
     * Gets or sets the MasterBar which is played.
     */
    masterBar: MasterBar;
    /**
     * The first beat in the bar.
     */
    firstBeat: BeatTickLookup | null;
    /**
     * The last beat in the bar.
     */
    lastBeat: BeatTickLookup | null;
    /**
     * Inserts `newNextBeat` after `currentBeat` in the linked list of items and updates.
     * the `firstBeat` and `lastBeat` respectively too.
     * @param currentBeat The item in which to insert the new item afterwards
     * @param newBeat The new item to insert
     */
    private _insertAfter;
    /**
     * Inserts `newNextBeat` before `currentBeat` in the linked list of items and updates.
     * the `firstBeat` and `lastBeat` respectively too.
     * @param currentBeat The item in which to insert the new item afterwards
     * @param newBeat The new item to insert
     */
    private _insertBefore;
    /**
     * Gets or sets the {@link MasterBarTickLookup} of the next masterbar in the {@link Score}
     */
    nextMasterBar: MasterBarTickLookup | null;
    /**
     * Gets or sets the {@link MasterBarTickLookup} of the previous masterbar in the {@link Score}
     */
    previousMasterBar: MasterBarTickLookup | null;
    /**
     * Adds a new beat to this masterbar following the slicing logic required by the MidiTickLookup.
     * @param beat The beat to add to this masterbat
     * @param beatPlaybackStart The original start of this beat. This time is relevant for highlighting.
     * @param sliceStart The slice start to which this beat should be added. This time is relevant for creating new slices.
     * @param sliceDuration The slice duration to which this beat should be added. This time is relevant for creating new slices.
     * @returns The first item of the chain which was affected.
     */
    addBeat(beat: Beat, beatPlaybackStart: number, sliceStart: number, sliceDuration: number): void;
}
