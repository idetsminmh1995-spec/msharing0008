import type { TieShape } from '../geometry/tie.js';
export interface RenderTieOptions {
    readonly color: string;
    /** Typically Phase 5's getEngravingDefault('tieMidpointThickness'). */
    readonly midpointThickness: number;
}
/**
 * Draws a tie as a filled, tapered lens shape rather than a single
 * uniform-width stroke: two quadratic Béziers sharing the same two
 * endpoints, one peaking `midpointThickness` below the other, so the
 * shape is thinnest at its very tips and thickest at its peak --
 * matching Bravura's own distinction between `tieEndpointThickness` and
 * `tieMidpointThickness` (a beam, by contrast, is uniform thickness
 * throughout, which is why Phase 24's beam rendering is a plain
 * stroked line/path instead).
 *
 * Simplification, stated rather than silently exact: the two curves meet
 * at the SAME endpoints, tapering fully to a point rather than to
 * Bravura's real `tieEndpointThickness` -- which is 0.05 staff spaces,
 * under half a pixel at the sizes this engine draws at, so the tips
 * would look no different for the extra geometry.
 */
export declare function renderTie(shape: TieShape, options: RenderTieOptions): string;
