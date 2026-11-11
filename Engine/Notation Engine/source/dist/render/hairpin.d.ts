import type { HairpinShape } from '../geometry/hairpin.js';
export interface RenderHairpinOptions {
    /** Typically Phase 5's getEngravingDefault('hairpinThickness'). */
    readonly thickness: number;
    readonly color: string;
}
/**
 * Draws a hairpin as two line segments meeting at its narrow end: for a
 * crescendo the narrow end is `startX` (opening toward `endX`); for a
 * decrescendo the narrow end is `endX` (closing from `startX`) -- mirror
 * images of the same two-line shape, not two independently-built shapes.
 */
export declare function renderHairpin(shape: HairpinShape, options: RenderHairpinOptions): string;
