"use strict";
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
/**
 * Returns the raw <line> elements for a staff -- meant to be embedded inside
 * a larger <svg> that also draws clefs, notes, etc. in later phases.
 */
function renderStaffLines(config) {
    const { x, y, width, lineSpacing = 10, lineThickness = 1, color = '#000000', numLines = 5, } = config;
    const lines = [];
    for (let i = 0; i < numLines; i++) {
        const lineY = y + i * lineSpacing;
        lines.push(`<line x1="${x}" y1="${lineY}" x2="${x + width}" y2="${lineY}" ` +
            `stroke="${color}" stroke-width="${lineThickness}" stroke-linecap="square" />`);
    }
    return lines.join('\n  ');
}
/**
 * Wraps renderStaffLines() in a complete, standalone <svg> document -- only
 * used by this quick demo. The real engine (Phase 6: SVG primitives layer)
 * will build up a full document across many more render passes.
 */
function renderStaffAsStandaloneSVG(config, svgWidth, svgHeight) {
    const inner = renderStaffLines(config);
    return (`<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" ` +
        `viewBox="0 0 ${svgWidth} ${svgHeight}">\n` +
        `  <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="#ffffff" />\n` +
        `  ${inner}\n` +
        `</svg>`);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof module !== 'undefined' && module.exports) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    module.exports = { renderStaffLines, renderStaffAsStandaloneSVG };
}
