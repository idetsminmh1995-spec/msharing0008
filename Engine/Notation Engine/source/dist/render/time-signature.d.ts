import { type TimeSignature } from '../geometry/time-signature.js';
export interface RenderTimeSignatureOptions {
    /** X position the (wider of the two, horizontally centered) numerator/denominator block starts at. */
    readonly x: number;
    /** Y-coordinate of the staff's bottom line (Phase 9/10 convention). */
    readonly staffBottomY: number;
    readonly color: string;
    readonly fontFamily: string;
}
/**
 * Draws a time signature: for a plain numeric signature, the numerator
 * centered on the upper half of the staff (y=-3, i.e. spanning the
 * middle line to the top line) and the denominator centered on the lower
 * half (y=-1, bottom line to middle line), with the narrower of the two
 * strings horizontally centered under/over the wider one. For a
 * 'common'/'cut' symbol, draws the single glyph vertically centered on
 * the whole staff (y=-2, the middle line) instead.
 */
export declare function renderTimeSignature(sig: TimeSignature, options: RenderTimeSignatureOptions): string;
