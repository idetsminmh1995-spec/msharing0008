/**
 * Represents a rectangular area within the renderer music notation.
 * @public
 */
export declare class Bounds {
    /**
     * Gets or sets the X-position of the rectangle within the music notation.
     */
    x: number;
    /**
     * Gets or sets the Y-position of the rectangle within the music notation.
     */
    y: number;
    /**
     * Gets or sets the width of the rectangle.
     */
    w: number;
    /**
     * Gets or sets the height of the rectangle.
     */
    h: number;
    scaleWith(scale: number): void;
    constructor(x?: number, y?: number, w?: number, h?: number);
}
