/** A glyph's bounding box, in staff-space units relative to its origin. */
export interface GlyphBBox {
    readonly bBoxNE: readonly [number, number];
    readonly bBoxSW: readonly [number, number];
}
/**
 * A named anchor point on a glyph -- e.g. a notehead's `stemUpSE` anchor is
 * where an upward stem should attach. Names vary by glyph (noteheads have
 * stem anchors; some have `cutOutNW`/`cutOutSE` for beam collision, etc.)
 * so this stays a generic string-keyed map rather than a fixed interface.
 */
export type GlyphAnchors = Readonly<Record<string, readonly [number, number]>>;
/**
 * Everything the engine knows about one glyph: its SMuFL name and
 * codepoint (font-independent) plus any Bravura-specific advance-width,
 * bounding-box and anchor data (font-specific -- a different SMuFL font
 * would supply different metrics for the same name+codepoint).
 */
export interface GlyphInfo {
    readonly name: string;
    readonly codepoint: string;
    /** The actual glyph character, ready to use in an SVG <text>/<tspan>. */
    readonly char: string;
    readonly description: string;
    /** Bravura's horizontal advance in staff spaces; never inferred from bBox. */
    readonly advanceWidth?: number;
    readonly bBox?: GlyphBBox;
    readonly anchors?: GlyphAnchors;
}
/** "U+E0A4" -> the actual JS string character at that codepoint. */
export declare function codepointToChar(codepoint: string): string;
/**
 * Looks up one glyph by its SMuFL name (e.g. "noteheadBlack",
 * "gClef", "accidentalSharp"). Returns undefined for an unrecognized name
 * or a codepoint absent from the bundled Bravura cmap rather than throwing.
 */
export declare function getGlyph(name: string): GlyphInfo | undefined;
/**
 * One Bravura-specific engraving-default metric (e.g. "stemThickness",
 * "beamThickness", "staffLineThickness") in staff-space units. Returns
 * undefined for an unrecognized key.
 */
export declare function getEngravingDefault(key: string): number | undefined;
/** The full engraving-defaults table, for callers that want to enumerate every metric. */
export declare function getEngravingDefaults(): Readonly<Record<string, number>>;
/** Which font this metadata actually describes -- e.g. "Bravura 1.482". Useful for diagnostics/attribution. */
export declare function getFontInfo(): {
    readonly name: string;
    readonly version: string;
};
export declare function getGlyphByChar(char: string): GlyphInfo | undefined;
