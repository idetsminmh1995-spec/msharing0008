export interface RenderRestOptions {
    readonly x: number;
    /** Y-coordinate the rest sits at -- typically staffBottomY + restY(...) (this phase's geometry). */
    readonly y: number;
    readonly color: string;
    readonly fontFamily: string;
}
/** Draws one rest glyph (from restGlyphName or multiMeasureRestGlyphName) at the given position. */
export declare function renderRest(glyphName: string, options: RenderRestOptions): string;
