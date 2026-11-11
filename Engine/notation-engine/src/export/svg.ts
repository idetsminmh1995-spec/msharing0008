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

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>';

const MIME_BY_FORMAT: Readonly<Record<string, string>> = {
  woff2: 'font/woff2',
  woff: 'font/woff',
  opentype: 'font/otf',
  truetype: 'font/ttf',
};

function escapeXmlText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fontFaceRule(font: EmbeddedFont): string {
  const format = font.format ?? 'woff2';
  const mime = MIME_BY_FORMAT[format] ?? 'application/octet-stream';
  return [
    '@font-face {',
    `  font-family: '${font.family}';`,
    `  src: url(data:${mime};base64,${font.base64}) format('${format}');`,
    '}',
  ].join('\n');
}

/**
 * A standalone SVG document from a rendered fragment.
 *
 * The injected children go immediately after the opening `<svg ...>` tag,
 * which is where SVG requires `<title>`/`<desc>` to be (first, for
 * accessibility) and where a `<style>` must be to apply to everything
 * after it.
 */
export function exportSvg(svg: string, options: ExportSvgOptions = {}): string {
  const openTagEnd = svg.indexOf('>');
  if (!svg.startsWith('<svg') || openTagEnd === -1) {
    throw new Error('exportSvg expects a string starting with an <svg ...> element.');
  }

  const head: string[] = [];
  if (options.title !== undefined) head.push(`<title>${escapeXmlText(options.title)}</title>`);
  if (options.description !== undefined) {
    head.push(`<desc>${escapeXmlText(options.description)}</desc>`);
  }

  const fonts = options.fonts ?? [];
  if (fonts.length > 0) {
    // CDATA, not escaping: a @font-face rule's base64 payload can contain
    // characters XML would otherwise mangle, and a stylesheet is exactly
    // what CDATA exists for.
    head.push(
      `<style type="text/css"><![CDATA[\n${fonts.map(fontFaceRule).join('\n')}\n]]></style>`,
    );
  } else {
    head.push(
      '<!-- No font embedded. This file references its font by NAME only, so it will ' +
        'render with missing glyphs anywhere that font is not installed. Pass ' +
        'options.fonts to embed it. -->',
    );
  }

  const body = svg.slice(0, openTagEnd + 1) + '\n' + head.join('\n') + svg.slice(openTagEnd + 1);
  return options.omitXmlDeclaration === true ? body : `${XML_DECLARATION}\n${body}`;
}

/** Base64 for arbitrary bytes, without assuming `btoa` or `Buffer` exists. */
export function bytesToBase64(bytes: Uint8Array): string {
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1] ?? 0;
    const b2 = bytes[i + 2] ?? 0;
    const triple = (b0 << 16) | (b1 << 8) | b2;
    out += ALPHABET[(triple >> 18) & 63];
    out += ALPHABET[(triple >> 12) & 63];
    out += i + 1 < bytes.length ? ALPHABET[(triple >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? ALPHABET[triple & 63] : '=';
  }
  return out;
}

/** UTF-8 bytes for a string, without assuming `TextEncoder` exists. */
export function stringToUtf8(text: string): Uint8Array {
  const out: number[] = [];
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000) {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    } else {
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 63),
        0x80 | ((code >> 6) & 63),
        0x80 | (code & 63),
      );
    }
  }
  return Uint8Array.from(out);
}

/**
 * A `data:` URI for an SVG string -- what the raster path loads into an
 * `Image`, and a usable `src`/`background-image` value in its own right.
 *
 * Base64 rather than percent-encoding: a percent-encoded SVG has to escape
 * a different character set for every context it appears in (`#` in CSS,
 * `"` in an attribute), and this engine's output contains both.
 */
export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${bytesToBase64(stringToUtf8(svg))}`;
}
