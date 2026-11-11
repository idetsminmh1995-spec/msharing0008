/**
 * Phase 51/§18.3: "`config.debug.drawBoundingBoxes` overlays every
 * element's computed bounding box on the SVG -- the fastest way to
 * diagnose a layout bug."
 *
 * No longer only a debug tool. `config.layout.fitSystemHeight` sizes
 * the finished picture from these same boxes (see `verticalInkSpan`),
 * so this module is now load-bearing on every fitted render.
 *
 * The boxes are measured FROM THE EMITTED SVG rather than collected as
 * the renderer draws. That is a deliberate choice, and the reason is the
 * word "every": the renderer has roughly thirty distinct drawing calls,
 * and threading a collector through all of them would give a debug
 * overlay that (a) needs a new line every time a drawing call is added
 * and (b) can silently disagree with what was actually drawn, which is
 * the one thing a debug overlay must never do. Measuring the output
 * cannot drift from the output -- which is exactly the property the
 * fit needs too: it trims to what was DRAWN, never to a second guess
 * at what a later pass is going to draw.
 *
 * What this costs: a path's box is computed from every coordinate in its
 * `d`, CONTROL POINTS INCLUDED, so a curved tie or slur gets a box that
 * is correct but not tight. Plain (non-SMuFL) text is measured from its
 * font size rather than real font metrics, which this module cannot know
 * without a DOM (`geometry/text-metrics.ts` is the shared estimate, and
 * deliberately a generous one). Both are noted on each box's `approximate` flag rather
 * than hidden.
 */
export interface DebugBox {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    /** What produced it -- a SMuFL glyph, a stroke, a filled shape, or ordinary text. */
    readonly kind: 'glyph' | 'line' | 'rect' | 'path' | 'text';
    /** The `data-id` of the nearest enclosing group, when the element sits inside one. */
    readonly id?: string;
    /** True when the box is a correct over-estimate rather than a tight fit (curves, plain text). */
    readonly approximate?: boolean;
}
/**
 * Every drawn element in `svg`, as a bounding box in staff-space units.
 *
 * Scans the string element by element, tracking the nearest enclosing
 * `<g data-id="...">` so each box knows which musical event it belongs to
 * (the same id `getEventStream` reports -- see §17.1), and the nearest
 * enclosing `<g transform>`, which IS applied.
 *
 * Applying it matters more than it sounds. The engine emits exactly one
 * transform -- the brace, which is drawn at a scale that stretches it
 * over however many staves it joins -- and leaving it unapplied put the
 * brace's box almost four staff spaces above the top of the picture.
 * As a debug overlay that was a puzzle; for `fitSystemHeight`, which
 * sizes the picture from these boxes, it would have been four spaces of
 * empty air at the top of every grand staff.
 */
export declare function measureSvgBoxes(svg: string): readonly DebugBox[];
/**
 * The topmost and bottommost ink in a rendered system, in staff-space
 * units -- what `config.layout.fitSystemHeight` sizes the picture from.
 *
 * It is `measureSvgBoxes` reduced to two numbers, and it inherits that
 * function's one stated weakness: a curve is measured through its
 * CONTROL points and plain text through an estimate, so both are
 * over-estimates. For a fit that is the right direction to be wrong in
 * -- a slur gets a sliver more air above it than it strictly needs,
 * where the other way round would clip it.
 *
 * `undefined` on a picture with no ink in it at all, which has no span
 * to report and nothing to fit.
 */
export declare function verticalInkSpan(svg: string): {
    readonly top: number;
    readonly bottom: number;
} | undefined;
