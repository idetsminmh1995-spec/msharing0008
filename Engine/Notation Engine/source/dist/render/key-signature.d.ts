import type { CancellationNatural, KeySignatureAccidental } from '../geometry/key-signature.js';
export interface RenderKeySignatureOptions {
    /** X position of the FIRST accidental. */
    readonly x: number;
    /** Horizontal spacing between adjacent accidentals, in staff-space units. */
    readonly spacing: number;
    /** Y-coordinate of the staff's bottom line (matches Phase 9/10's convention -- each accidental's own `y` from Phase 11 geometry is relative to this). */
    readonly staffBottomY: number;
    readonly color: string;
    readonly fontFamily: string;
}
/** Draws a key signature's accidentals left to right, evenly spaced. */
export declare function renderKeySignature(accidentals: readonly KeySignatureAccidental[], options: RenderKeySignatureOptions): string;
export interface RenderCancellationOptions {
    readonly x: number;
    readonly spacing: number;
    readonly staffBottomY: number;
    readonly color: string;
    readonly fontFamily: string;
}
/** Draws cancellation naturals left to right, evenly spaced -- typically placed just before the new key signature's own accidentals (if any). */
export declare function renderCancellationNaturals(naturals: readonly CancellationNatural[], options: RenderCancellationOptions): string;
