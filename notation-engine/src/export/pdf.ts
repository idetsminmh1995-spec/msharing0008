import { zlibSync } from 'fflate';
import { flattenToRgb, type RgbaImage } from './png.js';
import { stringToUtf8 } from './svg.js';

/**
 * Phase 52/§3: PDF export.
 *
 * ### Why the pages are images
 *
 * PDF has no notion of SVG, so an exporter has exactly two honest
 * choices: translate every drawing operation into PDF's own content
 * operators, or put a raster image on each page.
 *
 * The vector route sounds better and, for the lines/rects/curves in this
 * engine's output, it nearly is -- those map almost one to one onto PDF
 * operators. It falls down on TEXT, which is what a score mostly is: PDF
 * cannot reference a font by name and hope, the way SVG can. It requires
 * the font program embedded, as CFF or TrueType, and to keep the file a
 * sane size, SUBSET to the glyphs used -- a font parser and subsetter,
 * which is a project of its own and not one this engine should contain.
 * A "vector" PDF without that is a file of missing glyphs.
 *
 * So: one Flate-compressed RGB image per page, at whatever resolution the
 * caller asks for. It is lossless (unlike the JPEG route most small
 * exporters take), it is correct on any viewer, and it is honest about
 * what it is. `exportSvg` remains the vector deliverable.
 *
 * Everything in this module is pure -- it takes pixels and returns bytes,
 * so it is fully testable without a browser. Producing the pixels is
 * `raster.ts`'s job.
 */

/** 72 PDF points to the inch, by definition. */
const POINTS_PER_INCH = 72;

export interface PdfPage {
  readonly image: RgbaImage;
  /** Page width in POINTS (1/72"). Omit to derive from the image at `dpi`. */
  readonly widthPt?: number;
  readonly heightPt?: number;
}

export interface EncodePdfOptions {
  /** Used to size any page that doesn't state its own points. 96 matches a CSS pixel. */
  readonly dpi?: number;
  /** Flattened onto, since PDF images here carry no alpha. */
  readonly background?: readonly [number, number, number];
  readonly title?: string;
  /** Overrides the creation timestamp -- pass a fixed value for byte-reproducible output (§4.4). */
  readonly creationDate?: Date;
}

/** PDF date syntax: D:YYYYMMDDHHmmSS'Z'. */
function pdfDate(date: Date): string {
  const p = (n: number, w = 2): string => String(n).padStart(w, '0');
  return (
    `D:${p(date.getUTCFullYear(), 4)}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}` +
    `${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}Z`
  );
}

/** Escapes a PDF literal string's three special characters. */
function pdfString(text: string): string {
  return `(${text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')})`;
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/**
 * A complete PDF file, one page per entry.
 *
 * Objects are written in order and their byte offsets recorded as they
 * go, because that is exactly what the cross-reference table at the end
 * has to contain -- a PDF is built back-to-front by design, and trying to
 * compute the offsets any other way means serializing twice.
 */
export function encodePdf(pages: readonly PdfPage[], options: EncodePdfOptions = {}): Uint8Array {
  if (pages.length === 0) throw new Error('encodePdf needs at least one page.');
  const dpi = options.dpi ?? 96;
  const scale = POINTS_PER_INCH / dpi;

  const chunks: Uint8Array[] = [];
  /** Byte offset of each object, indexed by object number (1-based; [0] is the free entry). */
  const offsets: number[] = [0];
  let length = 0;

  const push = (bytes: Uint8Array): void => {
    chunks.push(bytes);
    length += bytes.length;
  };
  const pushText = (text: string): void => push(stringToUtf8(text));

  /** Object numbering: 1 catalog, 2 pages tree, 3 info, then 3 per page (page, content, image). */
  const CATALOG = 1;
  const PAGES = 2;
  const INFO = 3;
  const firstPageObject = 4;
  const objectForPage = (i: number): number => firstPageObject + i * 3;

  const beginObject = (n: number): void => {
    offsets[n] = length;
    pushText(`${n} 0 obj\n`);
  };
  const endObject = (): void => pushText('endobj\n');

  pushText('%PDF-1.4\n');
  // A comment of high-bit bytes, which is how a PDF tells naive tools
  // (and FTP clients) that it is binary and must not be newline-mangled.
  push(Uint8Array.from([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  beginObject(CATALOG);
  pushText(`<< /Type /Catalog /Pages ${PAGES} 0 R >>\n`);
  endObject();

  const kids = pages.map((_, i) => `${objectForPage(i)} 0 R`).join(' ');
  beginObject(PAGES);
  pushText(`<< /Type /Pages /Count ${pages.length} /Kids [ ${kids} ] >>\n`);
  endObject();

  beginObject(INFO);
  const created = pdfDate(options.creationDate ?? new Date());
  pushText(
    `<< /Producer ${pdfString('notation-engine')}` +
      (options.title !== undefined ? ` /Title ${pdfString(options.title)}` : '') +
      ` /CreationDate ${pdfString(created)} >>\n`,
  );
  endObject();

  pages.forEach((page, i) => {
    const pageObject = objectForPage(i);
    const contentObject = pageObject + 1;
    const imageObject = pageObject + 2;
    const { width, height } = page.image;
    const widthPt = page.widthPt ?? width * scale;
    const heightPt = page.heightPt ?? height * scale;

    beginObject(pageObject);
    pushText(
      `<< /Type /Page /Parent ${PAGES} 0 R /MediaBox [ 0 0 ${widthPt.toFixed(3)} ${heightPt.toFixed(3)} ]` +
        ` /Resources << /XObject << /Im0 ${imageObject} 0 R >> >>` +
        ` /Contents ${contentObject} 0 R >>\n`,
    );
    endObject();

    // `cm` scales the unit square the image is drawn into up to the page,
    // which is how PDF places an image: the image itself has no size, only
    // the transform does.
    const content = `q\n${widthPt.toFixed(3)} 0 0 ${heightPt.toFixed(3)} 0 0 cm\n/Im0 Do\nQ\n`;
    const contentBytes = stringToUtf8(content);
    beginObject(contentObject);
    pushText(`<< /Length ${contentBytes.length} >>\nstream\n`);
    push(contentBytes);
    pushText('endstream\n');
    endObject();

    const rgb = flattenToRgb(page.image, options.background);
    const compressed = zlibSync(rgb, { level: 6 });
    beginObject(imageObject);
    pushText(
      `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height}` +
        ` /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode` +
        ` /Length ${compressed.length} >>\nstream\n`,
    );
    push(compressed);
    pushText('\nendstream\n');
    endObject();
  });

  const objectCount = firstPageObject + pages.length * 3;
  const xrefOffset = length;
  pushText(`xref\n0 ${objectCount}\n`);
  pushText('0000000000 65535 f \n');
  for (let n = 1; n < objectCount; n++) {
    pushText(`${String(offsets[n] ?? 0).padStart(10, '0')} 00000 n \n`);
  }
  pushText(
    `trailer\n<< /Size ${objectCount} /Root ${CATALOG} 0 R /Info ${INFO} 0 R >>\n` +
      `startxref\n${xrefOffset}\n%%EOF\n`,
  );

  return concat(chunks);
}
