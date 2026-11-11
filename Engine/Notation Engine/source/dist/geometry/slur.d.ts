import type { StemDirection } from './stem.js';
import type { TieSide } from './tie.js';
export type SlurSide = TieSide;
/**
 * §9.16's rule -- one decision for the WHOLE span, confirmed identically
 * across Wikipedia's "Slur (music)" and Dorico's own published engraving
 * conventions: all up-stem notes -> below; anything else (all down-stem,
 * or a mix of both) -> above. This is a different shape of rule from a
 * tie's per-note flip (§9.15) -- a slur commits to one side for its
 * entire length, the same way a beam commits to one shared direction for
 * its whole group (§9.13), just via a different test (here: "are they
 * ALL up?", not "which is furthest from the middle line?").
 */
export declare function slurSide(stemDirections: readonly StemDirection[]): SlurSide;
/**
 * How high a slur or tie arcs over its own span, in staff spaces.
 *
 * Shared by both because MuseScore shapes both from the same rule, and
 * because the alternative -- the flat 0.5 staff spaces this engine used
 * to give every curve regardless of length -- is wrong at both ends: a
 * slur over half a bar came out as flat as one over two notes, and a
 * two-note tie came out taller than its own length wanted.
 *
 * `MUSESCORE_STYLE.slur`'s three numbers give the SHOULDER height --
 * where the curve's inner control points go. A curve does not reach its
 * control points: a cubic with both shoulders at the same height peaks
 * at three quarters of it (B(0.5) = (P0 + 3P1 + 3P2 + P3)/8, and with
 * the two ends at zero that is 6/8 of the shoulder). That three
 * quarters is applied here, so what this function returns is the height
 * the drawn curve actually reaches -- which is the only number the rest
 * of the engine has any use for. Whatever `renderSlur`/`renderTie` then
 * do to hit it is their business.
 */
export declare function arcHeightForSpan(span: number): number;
export interface SlurShape {
    readonly startX: number;
    readonly endX: number;
    readonly y: number;
    readonly side: SlurSide;
    readonly bulgeHeight: number;
}
/**
 * A slur's endpoints and curve height -- structurally the same shape as
 * Phase 26's `TieShape` (both render via the same tapered-lens Bezier
 * primitive), kept as a separate type and function because a slur and a
 * tie remain different musical concepts even where the geometry
 * coincides. `startX`/`endX` are the span's FIRST and LAST note only;
 * this section does not check that the curve clears any notes in
 * between (§9.16's stated limitation, matching Phase 24's beam-curve
 * scope).
 */
export declare function computeSlurShape(startX: number, endX: number, y: number, side: SlurSide): SlurShape;
