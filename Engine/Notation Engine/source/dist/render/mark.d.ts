export interface RenderMarkOptions {
    readonly x: number;
    readonly y: number;
    readonly color: string;
    readonly fontFamily: string;
}
/** Draws any single glyph-based mark (an articulation or ornament) at the given position -- both are just "one glyph near a note," differing only in which geometry function chose the glyph name and position. */
export declare function renderMark(glyphName: string, options: RenderMarkOptions): string;
