import { type RgbaImage } from './png.js';
import { type EncodePdfOptions } from './pdf.js';
/**
 * Phase 52/§3: SVG -> pixels, the one step this engine cannot do itself.
 *
 * Turning vector art into pixels means resolving fonts, anti-aliasing and
 * a full 2D rasterizer. A browser has one; Node does not, unless the host
 * installed one. So this module does not implement rasterization -- it
 * BORROWS the host's, through a two-method backend, and everything on
 * either side of that borrow (`png.ts`, `pdf.ts`) stays pure and testable
 * without one.
 *
 * The browser backend is built in and needs no arguments. A Node host
 * passes its own (`@napi-rs/canvas`, `skia-canvas`, `sharp`, ...) -- the
 * same dependency-injection shape the MusicXML parser already uses for
 * `domParser`, for the same reason: the engine names what it needs
 * instead of depending on one implementation of it.
 */
export interface RasterCanvas {
    /** Draws the loaded image to fill `(0,0,width,height)`. */
    drawImage(image: unknown, x: number, y: number, width: number, height: number): void;
    /** Row-major RGBA for the whole canvas. */
    getImageData(): RgbaImage;
}
export interface RasterBackend {
    createCanvas(width: number, height: number): RasterCanvas;
    /** Resolves once the image at `dataUri` is decoded and ready to draw. */
    loadImage(dataUri: string): Promise<unknown>;
}
/**
 * The browser's own rasterizer, via `<canvas>` and `Image`.
 *
 * Throws with a real explanation rather than a `ReferenceError` when
 * called somewhere without a DOM, because "document is not defined" three
 * frames deep tells a caller nothing about what to pass instead.
 */
export declare function browserRasterBackend(): RasterBackend;
export interface RasterizeOptions {
    /** Device pixels per SVG user unit. 2 for a retina-sharp raster, higher for print. */
    readonly scale?: number;
    readonly backend?: RasterBackend;
    /**
     * Split the source vertically into this many equal slices, one image
     * each. Page mode (§16.2) stacks every page into ONE SVG, so this is
     * how a multi-page score becomes a multi-page PDF.
     */
    readonly slices?: number;
}
/**
 * The SVG as one RGBA image per slice.
 *
 * Each slice is drawn by placing the WHOLE image at a negative y offset
 * on a canvas the height of one slice -- the browser clips it, which
 * costs nothing and avoids re-serializing the SVG once per page with a
 * different viewBox (which would re-resolve and re-lay-out the fonts
 * every time).
 */
export declare function rasterizeSvg(svg: string, options?: RasterizeOptions): Promise<readonly RgbaImage[]>;
export interface ExportPngOptions extends RasterizeOptions {
    /** Written into a pHYs chunk so the file records its own intended print size. */
    readonly dpi?: number;
}
/**
 * The score as a PNG file.
 *
 * Returns the FIRST slice only -- a PNG is one image, so exporting a
 * multi-page score to PNG means calling `rasterizeSvg` + `encodePng`
 * yourself, once per slice, rather than this returning something a
 * caller cannot write to a single file.
 */
export declare function exportPng(svg: string, options?: ExportPngOptions): Promise<Uint8Array>;
export interface ExportPdfOptions extends RasterizeOptions, EncodePdfOptions {
    /** Page size in points, when the source's own pixel size should not decide it. */
    readonly pageWidthPt?: number;
    readonly pageHeightPt?: number;
}
/** The score as a PDF file, one page per slice. */
export declare function exportPdf(svg: string, options?: ExportPdfOptions): Promise<Uint8Array>;
