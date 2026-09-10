import glyphnamesData from './data/glyphnames.json' with { type: 'json' };
import bravuraMetadataData from './data/bravura_metadata.json' with { type: 'json' };

/** One entry from the SMuFL spec's font-independent glyphnames.json. */
interface SmuflGlyphNameEntry {
  readonly codepoint: string;
  readonly description: string;
  readonly alternateCodepoint?: string;
}

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
 * codepoint (font-independent) plus whatever Bravura-specific bounding-box
 * and anchor data exists for it (font-specific -- a different SMuFL font
 * would supply different bBox/anchors for the same name+codepoint).
 */
export interface GlyphInfo {
  readonly name: string;
  readonly codepoint: string;
  /** The actual glyph character, ready to use in an SVG <text>/<tspan>. */
  readonly char: string;
  readonly description: string;
  readonly bBox?: GlyphBBox;
  readonly anchors?: GlyphAnchors;
}

const glyphnames = glyphnamesData as unknown as Readonly<Record<string, SmuflGlyphNameEntry>>;

interface BravuraMetadataFile {
  readonly fontName: string;
  readonly fontVersion: string;
  readonly engravingDefaults: Readonly<Record<string, number>>;
  readonly glyphBBoxes: Readonly<Record<string, GlyphBBox>>;
  readonly glyphsWithAnchors: Readonly<Record<string, GlyphAnchors>>;
}

const bravuraMetadata = bravuraMetadataData as unknown as BravuraMetadataFile;

/** "U+E0A4" -> the actual JS string character at that codepoint. */
export function codepointToChar(codepoint: string): string {
  const hex = codepoint.replace(/^U\+/, '');
  return String.fromCodePoint(parseInt(hex, 16));
}

/**
 * Looks up one glyph by its SMuFL name (e.g. "noteheadBlack",
 * "gClef", "accidentalSharp"). Returns undefined for an unrecognized name
 * rather than throwing -- callers decide whether a missing glyph is fatal.
 */
export function getGlyph(name: string): GlyphInfo | undefined {
  const entry = glyphnames[name];
  if (entry === undefined) return undefined;
  const bBox = bravuraMetadata.glyphBBoxes[name];
  const anchors = bravuraMetadata.glyphsWithAnchors[name];
  return {
    name,
    codepoint: entry.codepoint,
    char: codepointToChar(entry.codepoint),
    description: entry.description,
    ...(bBox !== undefined ? { bBox } : {}),
    ...(anchors !== undefined ? { anchors } : {}),
  };
}

/**
 * One Bravura-specific engraving-default metric (e.g. "stemThickness",
 * "beamThickness", "staffLineThickness") in staff-space units. Returns
 * undefined for an unrecognized key.
 */
export function getEngravingDefault(key: string): number | undefined {
  return bravuraMetadata.engravingDefaults[key];
}

/** The full engraving-defaults table, for callers that want to enumerate every metric. */
export function getEngravingDefaults(): Readonly<Record<string, number>> {
  return bravuraMetadata.engravingDefaults;
}

/** Which font this metadata actually describes -- e.g. "Bravura 1.38". Useful for diagnostics/attribution. */
export function getFontInfo(): { readonly name: string; readonly version: string } {
  return { name: bravuraMetadata.fontName, version: bravuraMetadata.fontVersion };
}
