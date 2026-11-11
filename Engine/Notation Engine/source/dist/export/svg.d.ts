/**
 * Phase 52/§3: SVG export.
 *
 * `renderFromMusicXml` already returns an SVG *fragment string* — a
 * `<svg>` element ready to drop into a page. A FILE is not quite the same
 * thing: it wants an XML declaration, it wants its title and description
 * inside the document rather than alongside it, and it wants its font to
 * travel with it, because an `.svg` opened outside the page that rendered
 * it has no stylesheet to tell it what "Bravura" is.
 *
 * That last point is the one that matters in practice: a score exported
 * without its font is a page of missing-glyph boxes, and this engine
 * cannot silently fix that — it does not ship a font (§7.2: glyph *names*
 * are font-independent, the font itself is the host's). So `fontFace`
 * takes the bytes the host already loaded and embeds them, and when the
 * host passes nothing the export says so in a comment inside the file
 * rather than producing a broken one silently.
 */
export interface EmbeddedFont {
    /** The family name the SVG's own `font-family` attributes use (e.g. `'Bravura'`). */
    readonly family: string;
    /** The font file, base64-encoded. A woff2 is the smallest; any format a browser accepts works. */
    readonly base64: string;
    /** The `format(...)` hint: 'woff2', 'woff', 'opentype', 'truetype'. */
    readonly format?: string;
}
export interface ExportSvgOptions {
    /** `<title>` — what a screen reader announces and what a browser tab shows. */
    readonly title?: string;
    /** `<desc>` — a longer description. */
    readonly description?: string;
    /** Fonts to embed as `@font-face` rules, so the file renders correctly on its own. */
    readonly fonts?: readonly EmbeddedFont[];
    /** Omit the `<?xml ... ?>` declaration (for embedding the result in HTML rather than saving it). */
    readonly omitXmlDeclaration?: boolean;
}
/**
 * A standalone SVG document from a rendered fragment.
 *
 * The injected children go immediately after the opening `<svg ...>` tag,
 * which is where SVG requires `<title>`/`<desc>` to be (first, for
 * accessibility) and where a `<style>` must be to apply to everything
 * after it.
 */
export declare function exportSvg(svg: string, options?: ExportSvgOptions): string;
/** Base64 for arbitrary bytes, without assuming `btoa` or `Buffer` exists. */
export declare function bytesToBase64(bytes: Uint8Array): string;
/** UTF-8 bytes for a string, without assuming `TextEncoder` exists. */
export declare function stringToUtf8(text: string): Uint8Array;
/**
 * A `data:` URI for an SVG string -- what the raster path loads into an
 * `Image`, and a usable `src`/`background-image` value in its own right.
 *
 * Base64 rather than percent-encoding: a percent-encoded SVG has to escape
 * a different character set for every context it appears in (`#` in CSS,
 * `"` in an attribute), and this engine's output contains both.
 */
export declare function svgToDataUri(svg: string): string;
