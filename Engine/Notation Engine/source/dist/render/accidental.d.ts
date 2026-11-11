export interface RenderAccidentalOptions {
    readonly x: number;
    readonly y: number;
    readonly color: string;
    readonly fontFamily: string;
}
/** Draws one accidental glyph (from geometry's accidentalGlyphName) at the given position. */
export declare function renderAccidental(glyphName: string, options: RenderAccidentalOptions): string;
