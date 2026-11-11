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

/**
 * A coordinate as it goes into the markup.
 *
 * Every number here is a staff space, and four decimal places of one is
 * a ten-thousandth of the gap between two staff lines -- finer than any
 * display, printer or PDF will ever resolve. Without the rounding,
 * binary floating point writes the full seventeen digits of a value
 * like 12.857099999999999 into the attribute, which is both noise in
 * the markup and, over a long score, real bytes.
 *
 * `Number(...)` after the rounding is what drops a trailing zero, so
 * a whole number still reads as `6` and not `6.0000`.
 */
export function svgNumber(value: number): string {
  return String(Number(value.toFixed(4)));
}

function attrsToString(attrs: SvgAttributes | undefined): string {
  if (attrs === undefined) return '';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(attrs)) {
    const stringValue = typeof value === 'number' ? svgNumber(value) : escapeXmlAttribute(value);
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
  return `<line x1="${svgNumber(x1)}" y1="${svgNumber(y1)}" x2="${svgNumber(x2)}" y2="${svgNumber(y2)}"${attrsToString(attrs)} />`;
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
  return `<rect x="${svgNumber(x)}" y="${svgNumber(y)}" width="${svgNumber(width)}" height="${svgNumber(height)}"${attrsToString(attrs)} />`;
}

/** Plain text -- for non-glyph labels (measure numbers, tempo text, lyrics). For SMuFL glyph characters, use svgGlyphText() instead so the font-size convention is correct. */
export function svgText(x: number, y: number, content: string, attrs?: SvgAttributes): string {
  return `<text x="${svgNumber(x)}" y="${svgNumber(y)}"${attrsToString(attrs)}>${escapeXmlText(content)}</text>`;
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
   * Where the top of the picture sits in the coordinates the music was
   * drawn in. Zero, except where `config.layout.fitSystemHeight` has
   * trimmed the empty air off a system: the trim moves the BOX, never
   * the music, so every y in the markup still means what it meant --
   * which is what lets a host find the staff lines in the output and
   * put a playhead on them.
   */
  readonly viewBoxMinY?: number;
  /**
   * How many real CSS pixels one staff space should occupy. This is the
   * SINGLE number Phase 44's arbitrary-resize requirement changes -- every
   * other coordinate in the document stays in staff-space units and the
   * browser does the scaling, since width/height (real pixels) and
   * viewBox (staff-space units) together define the scale factor.
   */
  readonly pxPerStaffSpace: number;
  /** Omitted -- or `'none'`/`'transparent'` -- draws no background rectangle at all. See `ColorConfig.background`. */
  readonly backgroundColor?: string;
}

/**
 * Whether a background colour means "draw a rectangle". `undefined`,
 * `'none'` and `'transparent'` all mean no rectangle -- see
 * `ColorConfig.background` for why these draw NOTHING rather than
 * drawing a see-through rectangle.
 */
export function hasBackground(backgroundColor: string | undefined): backgroundColor is string {
  return (
    backgroundColor !== undefined && backgroundColor !== 'none' && backgroundColor !== 'transparent'
  );
}

/** Wraps a list of already-built primitive strings into one complete, standalone <svg>...</svg> document. */
export function createSvgDocument(
  options: SvgDocumentOptions,
  children: readonly string[],
): string {
  const { viewBoxWidth, viewBoxHeight, pxPerStaffSpace, backgroundColor } = options;
  const minY = options.viewBoxMinY ?? 0;
  const pxWidth = viewBoxWidth * pxPerStaffSpace;
  const pxHeight = viewBoxHeight * pxPerStaffSpace;
  const background = hasBackground(backgroundColor)
    ? svgRect(0, minY, viewBoxWidth, viewBoxHeight, { fill: backgroundColor })
    : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pxWidth}" height="${pxHeight}" ` +
    `viewBox="0 ${svgNumber(minY)} ${viewBoxWidth} ${viewBoxHeight}">\n` +
    (background !== '' ? background + '\n' : '') +
    children.join('\n') +
    `\n</svg>`
  );
}
