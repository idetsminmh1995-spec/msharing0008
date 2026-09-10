/**
 * Coordinate convention for this whole module and everything built on top
 * of it: every number passed in is in STAFF-SPACE units (the distance
 * between two adjacent staff lines = 1 unit), never raw pixels. This is
 * what makes Phase 5's engraving-default metrics (already expressed in
 * staff spaces, per the SMuFL spec) plug in directly with zero conversion,
 * and what makes Phase 44's "resize to any W x H" possible with a single
 * number change (see createSvgDocument's pxPerStaffSpace below) instead of
 * rewriting every coordinate everywhere else in the engine.
 */

/** Attribute values as passed to the primitives below -- kept to what SVG actually accepts as attribute text. */
export type SvgAttributes = Readonly<Record<string, string | number>>;

/**
 * Per the SMuFL specification's "scoring applications" metrics
 * (https://w3c.github.io/smufl/latest/specification/scoring-metrics-glyph-registration.html):
 * "All glyphs should be drawn at a scale consistent with the key
 * measurement that one staff space = 0.25 em." Bravura (Phase 5) is
 * designed to this convention. So: to render a glyph at a given
 * staff-space size, the SVG font-size must be 4x that -- this constant is
 * that 4, used by svgGlyphText() below rather than being a magic number
 * scattered wherever a glyph gets drawn.
 */
export const SMUFL_STAFF_SPACES_PER_EM = 4;

/** Escapes text content for safe placement inside an SVG/XML element body. */
export function escapeXmlText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Escapes a value for safe placement inside a double-quoted XML attribute. */
function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function attrsToString(attrs: SvgAttributes | undefined): string {
  if (attrs === undefined) return '';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(attrs)) {
    const stringValue = typeof value === 'number' ? String(value) : escapeXmlAttribute(value);
    parts.push(`${key}="${stringValue}"`);
  }
  return parts.length > 0 ? ' ' + parts.join(' ') : '';
}

/** A straight line from (x1,y1) to (x2,y2). */
export function svgLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  attrs?: SvgAttributes,
): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${attrsToString(attrs)} />`;
}

/** An arbitrary path, for beams/ties/slurs/curves -- `d` is passed through as-is (it's already SVG path syntax, not staff-space coordinates this module can validate). */
export function svgPath(d: string, attrs?: SvgAttributes): string {
  return `<path d="${escapeXmlAttribute(d)}"${attrsToString(attrs)} />`;
}

/** A rectangle -- not one of Phase 6's originally-named four primitives, but trivial and useful (e.g. solid noteheads-as-rects, backgrounds) so included alongside them. */
export function svgRect(
  x: number,
  y: number,
  width: number,
  height: number,
  attrs?: SvgAttributes,
): string {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}"${attrsToString(attrs)} />`;
}

/** Plain text -- for non-glyph labels (measure numbers, tempo text, lyrics). For SMuFL glyph characters, use svgGlyphText() instead so the font-size convention is correct. */
export function svgText(x: number, y: number, content: string, attrs?: SvgAttributes): string {
  return `<text x="${x}" y="${y}"${attrsToString(attrs)}>${escapeXmlText(content)}</text>`;
}

/**
 * One SMuFL glyph character, sized correctly per the 0.25-em convention
 * (see SMUFL_STAFF_SPACES_PER_EM above). `fontFamily` should be the name
 * the SMuFL font is registered under wherever this SVG is displayed (e.g.
 * "Bravura") -- this module doesn't embed or load fonts, just references
 * one by name.
 */
export function svgGlyphText(
  x: number,
  y: number,
  char: string,
  fontFamily: string,
  attrs?: SvgAttributes,
): string {
  return svgText(x, y, char, {
    'font-family': fontFamily,
    'font-size': SMUFL_STAFF_SPACES_PER_EM,
    ...attrs,
  });
}

/** Groups children under one <g>, optionally with shared attributes (e.g. a transform or fill color applied to the whole group). */
export function svgGroup(children: readonly string[], attrs?: SvgAttributes): string {
  return `<g${attrsToString(attrs)}>\n${children.join('\n')}\n</g>`;
}

export interface SvgDocumentOptions {
  /** Width of the drawing, in staff-space units -- becomes the viewBox width. */
  readonly viewBoxWidth: number;
  /** Height of the drawing, in staff-space units -- becomes the viewBox height. */
  readonly viewBoxHeight: number;
  /**
   * How many real CSS pixels one staff space should occupy. This is the
   * SINGLE number Phase 44's arbitrary-resize requirement changes -- every
   * other coordinate in the document stays in staff-space units and the
   * browser does the scaling, since width/height (real pixels) and
   * viewBox (staff-space units) together define the scale factor.
   */
  readonly pxPerStaffSpace: number;
  readonly backgroundColor?: string;
}

/** Wraps a list of already-built primitive strings into one complete, standalone <svg>...</svg> document. */
export function createSvgDocument(
  options: SvgDocumentOptions,
  children: readonly string[],
): string {
  const { viewBoxWidth, viewBoxHeight, pxPerStaffSpace, backgroundColor } = options;
  const pxWidth = viewBoxWidth * pxPerStaffSpace;
  const pxHeight = viewBoxHeight * pxPerStaffSpace;
  const background =
    backgroundColor !== undefined
      ? svgRect(0, 0, viewBoxWidth, viewBoxHeight, { fill: backgroundColor })
      : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pxWidth}" height="${pxHeight}" ` +
    `viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}">\n` +
    (background !== '' ? background + '\n' : '') +
    children.join('\n') +
    `\n</svg>`
  );
}
