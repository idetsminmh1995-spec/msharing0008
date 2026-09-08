import type { Beat } from "./../../model/Beat";
import type { MasterBar } from "./../../model/MasterBar";
import type { Note } from "./../../model/Note";
import type { Score } from "./../../model/Score";
import { BeatBounds } from "./BeatBounds";
import { MasterBarBounds } from "./MasterBarBounds";
import { StaffSystemBounds } from "./StaffSystemBounds";
/**
 * @public
 */
export declare class BoundsLookup {
    toJson(): Map<string, unknown>;
    static fromJson(json: Map<string, unknown> | null, score: Score): BoundsLookup | null;
    private static _boundsFromJson;
    private static _boundsToJson;
    private _beatLookup;
    private _masterBarLookup;
    private _currentStaffSystem;
    /**
     * Gets a list of all individual staff systems contained in the rendered music notation.
     */
    staffSystems: StaffSystemBounds[];
    /**
     * Gets or sets a value indicating whether this lookup was finished already.
     */
    isFinished: boolean;
    /**
     * Finishes the lookup for optimized access.
     */
    finish(scale?: number): void;
    /**
     * Re-opens the lookup for registrations without discarding previously registered bounds.
     * Used by the renderer when it preserves this lookup across a partial render so that new
     * bounds for the re-layouted range can be added while preserved systems stay intact.
     * @internal
     */
    resetForPartialUpdate(): void;
    /**
     * Removes all entries belonging to the given master bar index and any bars after it.
     * Used before a partial render re-registers bounds for the re-layouted range, so the
     * preserved lookup ends up with only the unchanged entries when registration begins.
     *
     * Assumes the layout aligns its re-layouted range to system boundaries - i.e. the first
     * system to clear starts exactly at `masterBarIndex`. Caller is responsible for passing
     * the first master-bar-index of the first re-layouted system.
     * @internal
     */
    clearFromMasterBar(masterBarIndex: number): void;
    /**
     * Adds a new staff sytem to the lookup.
     * @param bounds The staff system bounds to add.
     */
    addStaffSystem(bounds: StaffSystemBounds): void;
    /**
     * Adds a new master bar to the lookup.
     * @param bounds The master bar bounds to add.
     */
    addMasterBar(bounds: MasterBarBounds): void;
    /**
     * Adds a new beat to the lookup.
     * @param bounds The beat bounds to add.
     */
    addBeat(bounds: BeatBounds): void;
    /**
     * Tries to find the master bar bounds by a given index.
     * @param index The index of the master bar to find.
     * @returns The master bar bounds if it was rendered, or null if no boundary information is available.
     */
    findMasterBarByIndex(index: number): MasterBarBounds | null;
    /**
     * Tries to find the master bar bounds by a given master bar.
     * @param bar The master bar to find.
     * @returns The master bar bounds if it was rendered, or null if no boundary information is available.
     */
    findMasterBar(bar: MasterBar): MasterBarBounds | null;
    /**
     * Tries to find the bounds of a given beat.
     * @param beat The beat to find.
     * @returns The beat bounds if it was rendered, or null if no boundary information is available.
     */
    findBeat(beat: Beat): BeatBounds | null;
    /**
     * Tries to find the bounds of a given beat.
     * @param beat The beat to find.
     * @returns The beat bounds if it was rendered, or null if no boundary information is available.
     */
    findBeats(beat: Beat): BeatBounds[] | null;
    /**
     * Tries to find a beat at the given absolute position.
     * @param x The absolute X-position of the beat to find.
     * @param y The absolute Y-position of the beat to find.
     * @returns The beat found at the given position or null if no beat could be found.
     */
    getBeatAtPos(x: number, y: number): Beat | null;
    /**
     * Tries to find the note at the given position using the given beat for fast access.
     * Use {@link findBeat} to find a beat for a given position first.
     * @param beat The beat containing the note.
     * @param x The X-position of the note.
     * @param y The Y-position of the note.
     * @returns The note at the given position within the beat.
     */
    getNoteAtPos(beat: Beat, x: number, y: number): Note | null;
}
