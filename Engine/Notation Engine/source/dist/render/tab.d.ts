export interface RenderTabNumberOptions {
    readonly x: number;
    /** The Y of the string's own line -- the digits sit centred ON it. */
    readonly y: number;
    readonly color: string;
    /**
     * Page colour, painted as a small rectangle behind the digits so the
     * staff line does not run through them. Real engraving BREAKS the line
     * instead; masking achieves the same visual result without the
     * renderer having to know every number's position before it draws the
     * staff, which the current per-measure draw order doesn't allow.
     */
    /**
     * What the mask behind the digits is painted in -- the page's own
     * background, so the string line appears to break for them.
     *
     * `'none'`/`'transparent'` draws NO mask, and the string line then
     * runs straight through the digits. That is the honest outcome of a
     * transparent render: the engine cannot paint over a line in a colour
     * it does not know. `renderFromMusicXml` reports
     * `TAB_MASK_ON_TRANSPARENT_BACKGROUND` when it happens rather than
     * leaving the reader to notice.
     */
    readonly backgroundColor: string;
    readonly fontFamily: string;
}
/**
 * Draws a fret number on its string's line: a background-coloured mask
 * to interrupt the line, then the digit glyphs centred over it. Glyph origins
 * advance by Bravura's actual hmtx-derived advance widths; centring and the
 * mask use the combined ink bounds, which are a different metric.
 */
export declare function renderTabNumber(glyphNames: readonly string[], options: RenderTabNumberOptions): string;
