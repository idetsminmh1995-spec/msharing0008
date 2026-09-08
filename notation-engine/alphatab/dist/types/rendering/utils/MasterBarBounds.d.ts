import type { Beat } from "./../../model/Beat";
import type { BarBounds } from "./BarBounds";
import type { BeatBounds } from "./BeatBounds";
import type { Bounds } from "./Bounds";
import type { StaffSystemBounds } from "./StaffSystemBounds";
/**
 * Represents the boundaries of a list of bars related to a single master bar.
 * @public
 */
export declare class MasterBarBounds {
    /**
     * The MasterBar index within the data model represented by these bounds.
     */
    index: number;
    /**
     * Gets or sets a value indicating whether this bounds are the first of the line.
     */
    isFirstOfLine: boolean;
    /**
     * Gets or sets the bounds covering all visually visible elements spanning all bars of this master bar.
     */
    visualBounds: Bounds;
    /**
     * Gets or sets the actual bounds of the elements in this master bar including whitespace areas.
     */
    realBounds: Bounds;
    /**
     * Gets or sets the actual bounds which are exactly aligned with the lines of the staffs.
     */
    lineAlignedBounds: Bounds;
    /**
     * Gets or sets the list of individual bars within this lookup.
     */
    bars: BarBounds[];
    /**
     * Gets or sets a reference to the parent {@link staffSystemBounds}.
     */
    staffSystemBounds: StaffSystemBounds | null;
    /**
     * Gets or sets a reference to the parent {@link staffSystemBounds}.
     * @deprecated use staffSystemBounds
     */
    get staveGroupBounds(): StaffSystemBounds | null;
    /**
     * Adds a new bar to this lookup.
     * @param bounds The bar bounds to add to this lookup.
     */
    addBar(bounds: BarBounds): void;
    /**
     * Tries to find a beat at the given location.
     * @param x The absolute X position where the beat spans across.
     * @returns The beat that spans across the given point, or null if none of the contained bars had a beat at this position.
     */
    findBeatAtPos(x: number): Beat | null;
    /**
     * Finishes the lookup object and optimizes itself for fast access.
     */
    finish(scale?: number): void;
    /**
     * Adds a new beat to the lookup.
     * @param bounds The beat bounds to add.
     */
    addBeat(bounds: BeatBounds): void;
}
