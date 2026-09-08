import type { Settings } from "./Settings";
/**
 * Represents the information related to a resize event.
 * @public
 */
export declare class ResizeEventArgs {
    /**
     * Gets the size before the resizing happened.
     */
    oldWidth: number;
    /**
     * Gets the size after the resize was complete.
     */
    newWidth: number;
    /**
     * Gets the settings currently used for rendering.
     */
    settings: Settings | null;
}
