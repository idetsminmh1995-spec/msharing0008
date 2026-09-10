// Notation Engine -- Quick Demo: Staff Lines
//
// This is a standalone, throwaway proof-of-concept -- it does NOT live inside
// src/geometry or src/render from the real Phase 1 folder structure. It exists
// only to visually confirm the 5-line staff shape before the full foundation
// (Phase 1-8) gets built.
//
// Every visual property is a parameter -- nothing is hardcoded -- since the
// real engine's config-driven theming (Phase 48) needs staff line thickness,
// spacing, and color to all be overridable later.

interface StaffConfig {
  /** Top-left X position of the staff, in SVG user units (px). */
  x: number;
  /** Y position of the TOP line of the staff. */
  y: number;
  /** How far the staff lines extend horizontally. */
  width: number;
  /** Vertical distance between two adjacent staff lines (1 "staff space"). */
  lineSpacing?: number;
  /** Stroke thickness of each staff line. */
  lineThickness?: number;
  /** Color of the staff lines. */
  color?: string;
  /** Number of horizontal lines (5 for standard staff, but configurable --
   * e.g. 1-line/single-line percussion staff or 6-line tab staff). */
  numLines?: number;
}

/**
 * Returns the raw <line> elements for a staff -- meant to be embedded inside
 * a larger <svg> that also draws clefs, notes, etc. in later phases.
 */
function renderStaffLines(config: StaffConfig): string {
  const {
    x,
    y,
    width,
    lineSpacing = 10,
    lineThickness = 1,
    color = '#000000',
    numLines = 5,
  } = config;

  const lines: string[] = [];
  for (let i = 0; i < numLines; i++) {
    const lineY = y + i * lineSpacing;
    lines.push(
      `<line x1="${x}" y1="${lineY}" x2="${x + width}" y2="${lineY}" ` +
        `stroke="${color}" stroke-width="${lineThickness}" stroke-linecap="square" />`
    );
  }
  return lines.join('\n  ');
}

/**
 * Wraps renderStaffLines() in a complete, standalone <svg> document -- only
 * used by this quick demo. The real engine (Phase 6: SVG primitives layer)
 * will build up a full document across many more render passes.
 */
function renderStaffAsStandaloneSVG(
  config: StaffConfig,
  svgWidth: number,
  svgHeight: number
): string {
  const inner = renderStaffLines(config);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" ` +
    `viewBox="0 0 ${svgWidth} ${svgHeight}">\n` +
    `  <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="#ffffff" />\n` +
    `  ${inner}\n` +
    `</svg>`
  );
}

// Dual environment support for this quick demo only: a plain <script> tag in
// index.html uses the two functions above as globals; Node (for generating a
// one-off preview file) uses this CommonJS export instead. The real engine's
// build (Phase 2: toolchain) will use proper ES module imports/exports
// throughout -- this is just a shortcut for a throwaway demo.
declare const module: { exports: unknown } | undefined;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof module !== 'undefined' && (module as any).exports) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (module as any).exports = { renderStaffLines, renderStaffAsStandaloneSVG };
}
