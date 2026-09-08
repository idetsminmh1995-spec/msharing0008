import type { ICanvas } from "./../../platform/ICanvas";
import type { BarRendererBase } from "./../BarRendererBase";
/**
 * A glyph is a single symbol which can be added to a GlyphBarRenderer for automated
 * layouting and drawing of stacked symbols.
 * @internal
 */
export declare class Glyph {
    x: number;
    y: number;
    width: number;
    height: number;
    renderer: BarRendererBase;
    constructor(x: number, y: number);
    getBoundingBoxTop(): number;
    getBoundingBoxBottom(): number;
    /**
     * Paint extent — distinct from the rhythmic-spacing extent (`x`, `x + width`).
     * Override on zero-width "no-rod" glyphs so the bar-local skyline still sees them.
     */
    getBoundingBoxLeft(): number;
    getBoundingBoxRight(): number;
    doLayout(): void;
    /** Hook for glyphs whose bbox is only final after `scaleToWidth`. Default no-op. */
    populateSkyline(): void;
    paint(_cx: number, _cy: number, _canvas: ICanvas): void;
}
