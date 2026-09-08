import type { Bounds } from "./Bounds";
import type { BoundsLookup } from "./BoundsLookup";
import type { MasterBarBounds } from "./MasterBarBounds";
/**
 * Represents the bounds of a staff system.
 * @public
 */
export declare class StaffSystemBounds {
    /**
     * Gets or sets the index of the bounds within the parent lookup.
     * This allows fast access of the next/previous system.
     */
    index: number;
    /**
     * Gets or sets the bounds covering all visually visible elements of this staff system.
     */
    visualBounds: Bounds;
    /**
     * Gets or sets the actual bounds of the elements in this staff system including whitespace areas.
     */
    realBounds: Bounds;
    /**
     * Gets or sets the list of master bar bounds related to this staff system.
     */
    bars: MasterBarBounds[];
    /**
     * Gets or sets a reference to the parent bounds lookup.
     */
    boundsLookup: BoundsLookup;
    /**
     * Whether this system's bounds have already been scaled via `finish`. Prevents double-scaling
     * when the parent `BoundsLookup` is preserved across partial renders and `finish` is invoked
     * again on a mix of already-scaled (preserved) and newly-registered (natural-coordinate) systems.
     */
    isFinished: boolean;
    /**
     * Finished the lookup for optimized access. Idempotent: once finished, further calls are no-ops
     * so preserved systems survive partial renders without being re-scaled.
     */
    finish(scale?: number): void;
    /**
     * Adds a new master bar to this lookup.
     * @param bounds The master bar bounds to add.
     */
    addBar(bounds: MasterBarBounds): void;
    /**
     * Tries to find the master bar bounds that are located at the given X-position.
     * @param x The X-position to find a master bar.
     * @returns The master bounds at the given X-position.
     */
    findBarAtPos(x: number): MasterBarBounds | null;
}
