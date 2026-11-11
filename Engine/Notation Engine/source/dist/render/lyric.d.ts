import type { ExtenderLineShape } from '../geometry/lyric.js';
export interface RenderExtenderLineOptions {
    /** Typically Phase 5's getEngravingDefault('lyricLineThickness'). */
    readonly thickness: number;
    readonly color: string;
}
/** Draws a melisma extender line as a plain horizontal segment. */
export declare function renderExtenderLine(shape: ExtenderLineShape, options: RenderExtenderLineOptions): string;
