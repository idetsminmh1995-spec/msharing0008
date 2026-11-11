import { type RgbaImage } from './png.js';
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
/**
 * A complete PDF file, one page per entry.
 *
 * Objects are written in order and their byte offsets recorded as they
 * go, because that is exactly what the cross-reference table at the end
 * has to contain -- a PDF is built back-to-front by design, and trying to
 * compute the offsets any other way means serializing twice.
 */
export declare function encodePdf(pages: readonly PdfPage[], options?: EncodePdfOptions): Uint8Array;
