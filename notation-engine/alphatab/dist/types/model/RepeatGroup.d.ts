import type { MasterBar } from "./MasterBar";
/**
 * This public class can store the information about a group of measures which are repeated
 * @public
 */
export declare class RepeatGroup {
    /**
     * All masterbars repeated within this group
     */
    masterBars: MasterBar[];
    /**
     * the masterbars which opens the group.
     */
    opening: MasterBar | null;
    /**
     * a list of masterbars which open the group.
     * @deprecated There can only be one opening, use the opening property instead
     */
    get openings(): MasterBar[];
    /**
     * a list of masterbars which close the group.
     */
    closings: MasterBar[];
    /**
     * Gets whether this repeat group is really opened as a repeat.
     */
    get isOpened(): boolean;
    /**
     * true if the repeat group was closed well
     */
    isClosed: boolean;
    addMasterBar(masterBar: MasterBar): void;
}
