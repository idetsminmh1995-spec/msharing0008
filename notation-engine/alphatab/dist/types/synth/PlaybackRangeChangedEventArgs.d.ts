import type { PlaybackRange } from "./PlaybackRange";
/**
 * Represents the info when the playback range changed.
 * @public
 */
export declare class PlaybackRangeChangedEventArgs {
    /**
     * The new playback range.
     */
    readonly playbackRange: PlaybackRange | null;
    /**
     * Initializes a new instance of the {@link PlaybackRangeChangedEventArgs} class.
     * @param range The range.
     */
    constructor(playbackRange: PlaybackRange | null);
}
