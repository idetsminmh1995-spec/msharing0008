import type { BeamShape } from '../geometry/beam-shape.js';
import { type BeamSegment } from '../geometry/beam-shape.js';
export interface RenderBeamOptions {
    /**
     * Which lines to draw, from `computeBeamSegments` -- the primary beam
     * across the whole group, plus a line or a hook for every level a
     * shorter note in the group needs. Drawing a flat `lineCount` of
     * full-length lines instead is what gave a dotted eighth a sixteenth
     * beam it does not have.
     */
    readonly segments: readonly BeamSegment[];
    /** Each group member's stem X, in the group's own order -- `segments` indexes into this. */
    readonly stemXs: readonly number[];
    /** Typically Phase 5's getEngravingDefault('beamThickness'). */
    readonly thickness: number;
    /**
     * Typically Phase 5's getEngravingDefault('beamSpacing') -- per the SMuFL
     * spec this is "the distance between the inner edge of the primary and
     * outer edge of subsequent secondary beams", i.e. the GAP between two
     * beams, NOT their center-to-center distance. The center-to-center step
     * is therefore `thickness + spacing` (0.5 + 0.25 = 0.75sp for Bravura) --
     * a value MuseScore 4's own engraving notes independently confirm as the
     * correct "regular" beam distance.
     */
    readonly spacing: number;
    readonly color: string;
}
/**
 * Draws every beam line a group gets. Secondary lines (2nd and up) stack
 * TOWARD the notehead from the primary beam -- for an up-stem beam the
 * primary sits highest (most negative Y) and each secondary line is
 * added going back down toward the noteheads; for a down-stem beam it's
 * the mirror image.
 *
 * Each line is clipped to its own segment's stems, and a hook is drawn
 * as a `BEAM_HOOK_LENGTH` stub off the one stem it belongs to, following
 * the beam's own slope so it reads as a piece of the same beam.
 */
export declare function renderBeam(shape: BeamShape, options: RenderBeamOptions): string;
