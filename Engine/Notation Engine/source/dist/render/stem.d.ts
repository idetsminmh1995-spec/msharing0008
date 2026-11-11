import type { StemDirection } from '../geometry/stem.js';
export interface RenderStemOptions {
    readonly noteheadGlyphName: string;
    /** The notehead's own drawing position (matches whatever x/y renderNotehead was called with). */
    readonly noteX: number;
    readonly noteY: number;
    readonly direction: StemDirection;
    readonly length: number;
    /** Typically Phase 5's getEngravingDefault('stemThickness'). */
    readonly thickness: number;
    readonly color: string;
}
/**
 * Draws a stem attached at the notehead's REAL anchor point (`stemUpSE`
 * for an up stem, `stemDownNW` for a down stem -- Phase 5's Bravura data,
 * not a bounding-box corner). The anchor is in font design space (Y
 * increases upward); this flips it to match this engine's Y-down
 * convention, the same sign flip already established when Phase 6/9 first
 * drew a stem from anchor data.
 */
export declare function renderStem(options: RenderStemOptions): string;
