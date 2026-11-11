import type { StemDirection } from '../geometry/stem.js';
import { type DurationType } from '../geometry/flag.js';
export interface RenderFlagOptions {
    /** The stem's own X (matches renderStem's attachX -- a flag sits directly on the stem, not offset from it). */
    readonly x: number;
    /** The stem's FREE end Y -- renderStem's `endY`, not the notehead-attachment end. */
    readonly y: number;
    readonly direction: StemDirection;
    readonly color: string;
    readonly fontFamily: string;
}
/** Draws a flag at the stem's free end. Throws (via flagGlyphName) if the duration never has a flag -- callers should check geometry's needsFlag() first. */
export declare function renderFlag(durationType: DurationType, options: RenderFlagOptions): string;
