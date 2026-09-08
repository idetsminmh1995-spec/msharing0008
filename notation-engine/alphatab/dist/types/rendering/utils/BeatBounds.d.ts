import type { Beat } from "./../../model/Beat";
import type { Note } from "./../../model/Note";
import type { BarBounds } from "./BarBounds";
import type { Bounds } from "./Bounds";
import type { NoteBounds } from "./NoteBounds";
/**
 * Represents the bounds of a single beat.
 * @public
 */
export declare class BeatBounds {
    /**
     * Gets or sets the reference to the parent {@link BarBounds}.
     */
    barBounds: BarBounds;
    /**
     * Gets or sets the bounds covering all visually visible elements spanning this beat.
     */
    visualBounds: Bounds;
    /**
     * Gets or sets x-position where the timely center of the notes for this beat is.
     * This is where the cursor should be at the time when this beat is played.
     */
    onNotesX: number;
    /**
     * Gets or sets the actual bounds of the elements in this beat including whitespace areas.
     */
    realBounds: Bounds;
    /**
     * Gets or sets the beat related to this bounds.
     */
    beat: Beat;
    /**
     * Gets or sets the individual note positions of this beat (if {@link CoreSettings.includeNoteBounds} was set to true).
     */
    notes: NoteBounds[] | null;
    /**
     * Adds a new note to this bounds.
     * @param bounds The note bounds to add.
     */
    addNote(bounds: NoteBounds): void;
    /**
     * Tries to find a note at the given position.
     * @param x The X-position of the note to find.
     * @param y The Y-position of the note to find.
     * @returns The note at the given position or null if no note was found, or the note lookup was not enabled before rendering.
     */
    findNoteAtPos(x: number, y: number): Note | null;
    /**
     * Finishes the lookup object and optimizes itself for fast access.
     */
    finish(scale?: number): void;
}
