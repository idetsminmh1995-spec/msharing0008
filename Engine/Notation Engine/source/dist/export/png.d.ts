/**
 * Phase 52/§3: PNG encoding.
 *
 * Deliberately split from *rasterizing*. Turning an SVG into pixels needs
 * a rendering engine, which this library is not and cannot become
 * (`raster.ts` borrows the host's). Turning pixels into a PNG file is
 * pure arithmetic, so it lives here, has no backend, and is fully
 * testable without a browser -- which is what makes the export path
 * verifiable at all.
 *
 * The encoder is a real one, not a wrapper: IHDR + IDAT + IEND, 8-bit
 * RGBA, with per-scanline filtering and zlib from `fflate` (already a
 * dependency, for `.mxl`).
 */
export interface RgbaImage {
    readonly width: number;
    readonly height: number;
    /** Row-major RGBA, 4 bytes per pixel, `width * height * 4` long. */
    readonly data: Uint8Array | Uint8ClampedArray;
}
export interface EncodePngOptions {
    /** Physical pixels per staff space, written into a pHYs chunk so the file knows its own intended print size. */
    readonly pixelsPerMetre?: number;
}
/** A complete PNG file for an RGBA image. */
export declare function encodePng(image: RgbaImage, options?: EncodePngOptions): Uint8Array;
/**
 * RGBA flattened onto an opaque background, as RGB -- what a PDF's image
 * XObject needs, since PDF has no alpha channel without a separate soft
 * mask, and a score on a transparent background prints as a blank page.
 */
export declare function flattenToRgb(image: RgbaImage, background?: readonly [number, number, number]): Uint8Array;
