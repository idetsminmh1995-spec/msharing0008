import { zlibSync } from 'fflate';

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

const PNG_SIGNATURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** The CRC-32 table PNG's chunk checksums need, built once on first use. */
let crcTable: Uint32Array | undefined;

function crc32(bytes: Uint8Array): number {
  if (crcTable === undefined) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (crcTable[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u32(value: number): Uint8Array {
  return Uint8Array.from([
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255,
  ]);
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = Uint8Array.from([...type].map((c) => c.charCodeAt(0)));
  const body = new Uint8Array(typeBytes.length + data.length);
  body.set(typeBytes, 0);
  body.set(data, typeBytes.length);
  const out = new Uint8Array(4 + body.length + 4);
  out.set(u32(data.length), 0);
  out.set(body, 4);
  out.set(u32(crc32(body)), 4 + body.length);
  return out;
}

/**
 * PNG's per-scanline filter 1 ("Sub": each byte minus the byte one pixel
 * to its left). Chosen over filter 0 because notation is overwhelmingly
 * flat runs of one colour, which Sub turns into runs of zeroes that
 * deflate compresses to almost nothing; over the adaptive per-row
 * heuristic real encoders use, because that is a meaningful amount of
 * code for a file this engine writes once at export time.
 */
function filterRows(image: RgbaImage): Uint8Array {
  const { width, height, data } = image;
  const stride = width * 4;
  const out = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    const outStart = y * (stride + 1);
    out[outStart] = 1;
    for (let i = 0; i < stride; i++) {
      const value = data[rowStart + i] ?? 0;
      const left = i >= 4 ? (data[rowStart + i - 4] ?? 0) : 0;
      out[outStart + 1 + i] = (value - left) & 0xff;
    }
  }
  return out;
}

export interface EncodePngOptions {
  /** Physical pixels per staff space, written into a pHYs chunk so the file knows its own intended print size. */
  readonly pixelsPerMetre?: number;
}

/** A complete PNG file for an RGBA image. */
export function encodePng(image: RgbaImage, options: EncodePngOptions = {}): Uint8Array {
  const { width, height, data } = image;
  if (width <= 0 || height <= 0) {
    throw new Error(`encodePng needs a non-empty image; got ${width}x${height}.`);
  }
  if (data.length !== width * height * 4) {
    throw new Error(
      `encodePng expects RGBA data of ${width * height * 4} bytes for ${width}x${height}; got ${data.length}.`,
    );
  }

  const ihdr = new Uint8Array(13);
  ihdr.set(u32(width), 0);
  ihdr.set(u32(height), 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  const chunks: Uint8Array[] = [PNG_SIGNATURE, chunk('IHDR', ihdr)];

  if (options.pixelsPerMetre !== undefined) {
    const phys = new Uint8Array(9);
    const ppm = Math.round(options.pixelsPerMetre);
    phys.set(u32(ppm), 0);
    phys.set(u32(ppm), 4);
    phys[8] = 1; // unit: metre
    chunks.push(chunk('pHYs', phys));
  }

  chunks.push(chunk('IDAT', zlibSync(filterRows(image), { level: 6 })));
  chunks.push(chunk('IEND', new Uint8Array(0)));

  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/**
 * RGBA flattened onto an opaque background, as RGB -- what a PDF's image
 * XObject needs, since PDF has no alpha channel without a separate soft
 * mask, and a score on a transparent background prints as a blank page.
 */
export function flattenToRgb(
  image: RgbaImage,
  background: readonly [number, number, number] = [255, 255, 255],
): Uint8Array {
  const { width, height, data } = image;
  const out = new Uint8Array(width * height * 3);
  const [br, bg, bb] = background;
  for (let p = 0; p < width * height; p++) {
    const alpha = (data[p * 4 + 3] ?? 255) / 255;
    const inv = 1 - alpha;
    out[p * 3] = Math.round((data[p * 4] ?? 0) * alpha + br * inv);
    out[p * 3 + 1] = Math.round((data[p * 4 + 1] ?? 0) * alpha + bg * inv);
    out[p * 3 + 2] = Math.round((data[p * 4 + 2] ?? 0) * alpha + bb * inv);
  }
  return out;
}
