import type { Note } from "./../../model/Note";
import type { Bounds } from "./Bounds";
import type { BeatBounds } from "./BeatBounds";
/**
 * Represents the bounds of a single note
 * @public
 */
export declare class NoteBounds {
    /**
     * Gets or sets the reference to the beat boudns this note relates to.
     */
    beatBounds: BeatBounds;
    /**
     * Gets or sets the bounds of the individual note head.
     */
    noteHeadBounds: Bounds;
    /**
     * Gets or sets the note related to this instance.
     */
    note: Note;
    /**
     * Finishes the lookup object and optimizes itself for fast access.
     */
    finish(scale?: number): void;
}
