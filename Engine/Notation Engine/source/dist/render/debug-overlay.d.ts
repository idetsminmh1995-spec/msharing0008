/**
 * Phase 51/§18.3: the two debug overlays, drawn from already-measured
 * geometry.
 *
 * Both take plain structural shapes rather than importing `debug/`'s own
 * types: `render/` turns geometry into SVG and never depends on a module
 * further down the pipeline (§4.1), and a box is four numbers whether it
 * came from a measurement pass or from a test.
 */
export interface OverlayBox {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly approximate?: boolean;
}
export interface RenderBoundingBoxOverlayOptions {
    readonly color: string;
    /** Stroke width in staff spaces. Deliberately thin -- an overlay that obscures what it measures is useless. */
    readonly thickness?: number;
}
/**
 * One stroked rectangle per box, in a single `<g class="debug-bounding-boxes">`
 * so a host can hide the whole overlay with one CSS rule.
 *
 * A box flagged `approximate` (a curve's control-point hull, plain text
 * measured from its font size) is drawn DASHED, so the overlay says which
 * of its own numbers are exact and which are over-estimates instead of
 * presenting all of them as equally trustworthy.
 */
export declare function renderBoundingBoxOverlay(boxes: readonly OverlayBox[], options: RenderBoundingBoxOverlayOptions): string;
export interface OverlaySkylineSegment {
    readonly xStart: number;
    readonly xEnd: number;
    readonly y: number;
}
export interface OverlaySkyline {
    readonly north: readonly OverlaySkylineSegment[];
    readonly south: readonly OverlaySkylineSegment[];
}
export interface RenderSkylineOverlayOptions {
    readonly color: string;
    readonly thickness?: number;
}
/** Both sides of every staff's skyline, in one `<g class="debug-skyline">`. */
export declare function renderSkylineOverlay(skylines: readonly OverlaySkyline[], options: RenderSkylineOverlayOptions): string;
