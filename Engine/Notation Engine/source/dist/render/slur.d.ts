import type { SlurShape } from '../geometry/slur.js';
export interface RenderSlurOptions {
    readonly color: string;
    /** Typically Phase 5's getEngravingDefault('slurMidpointThickness'). */
    readonly midpointThickness: number;
}
/**
 * Draws a slur as a filled, tapered lens shape -- the identical technique
 * to Phase 26's `renderTie` (two quadratic Béziers sharing the same two
 * endpoints, one peaking `midpointThickness` below the other), kept as
 * its own function rather than shared code because a slur and a tie are
 * different musical concepts even though Bravura gives them numerically
 * identical thickness constants and this engine draws them the same way.
 */
export declare function renderSlur(shape: SlurShape, options: RenderSlurOptions): string;
