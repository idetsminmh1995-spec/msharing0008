import type { Beat } from "./../model/Beat";
/**
 * Represents the information related to the beats actively being played now.
 * @public
 */
export declare class ActiveBeatsChangedEventArgs {
    /**
     * The currently active beats across all tracks and voices.
     */
    activeBeats: Beat[];
    constructor(activeBeats: Beat[]);
}
