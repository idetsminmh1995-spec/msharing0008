import type { Color } from "./Color";
/**
 * Defines the custom styles for an element in the music sheet (like bars, voices, notes etc).
 * @public
 */
export declare class ElementStyle<TSubElements extends number> {
    /**
     * Changes the color of the specified sub-element within the element this style container belongs to.
     * Null indicates that a certain element should use the default color from {@link RenderingResources}
     * even if some "higher level" element changes colors.
     */
    colors: Map<TSubElements, Color | null>;
}
