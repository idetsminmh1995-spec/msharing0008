import { encodePng, type RgbaImage } from './png.js';
import { encodePdf, type EncodePdfOptions } from './pdf.js';
import { svgToDataUri } from './svg.js';

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
export function browserRasterBackend(): RasterBackend {
  const globalScope = globalThis as unknown as {
    document?: { createElement(tag: string): unknown };
    Image?: new () => {
      onload: (() => void) | null;
      onerror: ((error: unknown) => void) | null;
      src: string;
    };
  };
  if (globalScope.document === undefined || globalScope.Image === undefined) {
    throw new Error(
      'browserRasterBackend() needs a DOM (document + Image). Outside a browser, pass your own ' +
        'RasterBackend -- e.g. one built on @napi-rs/canvas -- via options.backend.',
    );
  }
  const doc = globalScope.document;
  const ImageCtor = globalScope.Image;

  return {
    createCanvas(width, height) {
      const canvas = doc.createElement('canvas') as {
        width: number;
        height: number;
        getContext(kind: '2d'): {
          drawImage(image: unknown, x: number, y: number, w: number, h: number): void;
          getImageData(x: number, y: number, w: number, h: number): RgbaImage;
        } | null;
      };
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (context === null) throw new Error('Could not get a 2d context from the canvas.');
      return {
        drawImage: (image, x, y, w, h) => context.drawImage(image, x, y, w, h),
        getImageData: () => context.getImageData(0, 0, width, height),
      };
    },
    loadImage(dataUri) {
      return new Promise((resolve, reject) => {
        const image = new ImageCtor();
        image.onload = (): void => resolve(image);
        image.onerror = (error): void =>
          reject(
            error instanceof Error ? error : new Error('Could not decode the SVG as an image.'),
          );
        image.src = dataUri;
      });
    },
  };
}

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

/** `width`/`height` in real pixels from an `<svg>`'s own attributes. */
function svgPixelSize(svg: string): { width: number; height: number } {
  const width = Number(/\swidth="([\d.]+)"/.exec(svg)?.[1]);
  const height = Number(/\sheight="([\d.]+)"/.exec(svg)?.[1]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('Could not read a positive width/height from the <svg> element.');
  }
  return { width, height };
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
export async function rasterizeSvg(
  svg: string,
  options: RasterizeOptions = {},
): Promise<readonly RgbaImage[]> {
  const scale = options.scale ?? 2;
  const slices = Math.max(1, Math.floor(options.slices ?? 1));
  const backend = options.backend ?? browserRasterBackend();
  const { width, height } = svgPixelSize(svg);

  const image = await backend.loadImage(svgToDataUri(svg));
  const fullWidth = Math.max(1, Math.round(width * scale));
  const fullHeight = Math.max(1, Math.round(height * scale));
  const sliceHeight = Math.max(1, Math.round(fullHeight / slices));

  const out: RgbaImage[] = [];
  for (let i = 0; i < slices; i++) {
    const canvas = backend.createCanvas(fullWidth, sliceHeight);
    // `0` rather than `-0` for the first slice -- a host shouldn't be
    // handed a negative zero for "no offset".
    const offsetY = i === 0 ? 0 : -(i * sliceHeight);
    canvas.drawImage(image, 0, offsetY, fullWidth, fullHeight);
    out.push(canvas.getImageData());
  }
  return out;
}

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
export async function exportPng(svg: string, options: ExportPngOptions = {}): Promise<Uint8Array> {
  const [image] = await rasterizeSvg(svg, options);
  if (image === undefined) throw new Error('Rasterizing produced no image.');
  return encodePng(
    image,
    options.dpi !== undefined
      ? { pixelsPerMetre: Math.round((options.dpi / 0.0254) * (options.scale ?? 2)) }
      : {},
  );
}

export interface ExportPdfOptions extends RasterizeOptions, EncodePdfOptions {
  /** Page size in points, when the source's own pixel size should not decide it. */
  readonly pageWidthPt?: number;
  readonly pageHeightPt?: number;
}

/** The score as a PDF file, one page per slice. */
export async function exportPdf(svg: string, options: ExportPdfOptions = {}): Promise<Uint8Array> {
  const images = await rasterizeSvg(svg, options);
  return encodePdf(
    images.map((image) => ({
      image,
      ...(options.pageWidthPt !== undefined ? { widthPt: options.pageWidthPt } : {}),
      ...(options.pageHeightPt !== undefined ? { heightPt: options.pageHeightPt } : {}),
    })),
    options,
  );
}
