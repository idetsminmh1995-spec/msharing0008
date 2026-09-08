import type { Beat } from "./../model/Beat";
/**
 * Represents a beat and when it is actually played according to the generated audio.
 * @public
 */
export declare class BeatTickLookupItem {
    /**
     * Gets the beat represented by this item.
     */
    readonly beat: Beat;
    /**
     * Gets the playback start of the beat according to the generated audio.
     */
    readonly playbackStart: number;
    constructor(beat: Beat, playbackStart: number);
}
/**
 * Classes implementing this interface can help in checking whether beats are currently being
 * displayed so that they can be considered for a tick-search.
 * @public
 */
export interface IBeatVisibilityChecker {
    isVisible(beat: Beat): boolean;
}
/**
 * Represents the time period, for which one or multiple {@link Beat}s are played
 * @public
 */
export declare class BeatTickLookup {
    private _highlightedBeats;
    /**
     * Gets or sets the start time in midi ticks at which the given beat is played.
     */
    start: number;
    /**
     * Gets or sets the end time in midi ticks at which the given beat is played.
     */
    end: number;
    /**
     * Gets or sets a list of all beats that should be highlighted when
     * the beat of this lookup starts playing. This might not mean
     * the beats start at this position.
     */
    highlightedBeats: BeatTickLookupItem[];
    /**
     * Gets the next BeatTickLookup which comes after this one and is in the same
     * MasterBarTickLookup.
     */
    nextBeat: BeatTickLookup | null;
    /**
     * Gets the preivous BeatTickLookup which comes before this one and is in the same
     * MasterBarTickLookup.
     */
    previousBeat: BeatTickLookup | null;
    /**
     * Gets the tick duration of this lookup.
     */
    get duration(): number;
    constructor(start: number, end: number);
    /**
     * Marks the given beat as highlighed as part of this lookup.
     * @param beat The beat to add.
     */
    highlightBeat(beat: Beat, playbackStart: number): void;
    /**
     * Looks for the first visible beat which starts at this lookup so it can be used for cursor placement.
     * @param visibleTracks The visible tracks.
     * @returns The first beat which is visible according to the given tracks or null.
     */
    getVisibleBeatAtStart(visibleTracks: Set<number>): Beat | null;
    /**
     * Looks for the first visible beat which starts at this lookup so it can be used for cursor placement.
     * @param checker The custom checker to see if a beat is visible.
     * @returns The first beat which is visible according to the given tracks or null.
     */
    getVisibleBeatAtStartWithChecker(checker: IBeatVisibilityChecker): Beat | null;
}
