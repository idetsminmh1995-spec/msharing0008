import { getGlyph, type GlyphInfo } from '../glyphs/glyph-table.js';
import { svgGlyphText } from './svg-primitives.js';

function requireGlyph(name: string): GlyphInfo {
  const glyph = getGlyph(name);
  if (glyph === undefined) {
    throw new Error(`No glyph found for notehead "${name}"`);
  }
  return glyph;
}

/** Real width (staff-space units) of a notehead glyph, from its Bravura bounding box -- e.g. for Phase 14's ledger lines or a future Phase 16's stem attachment. */
export function noteheadWidth(glyphName: string): number {
  const bbox = requireGlyph(glyphName).bBox;
  return bbox !== undefined ? bbox.bBoxNE[0] - bbox.bBoxSW[0] : 0;
}

export interface RenderNoteheadOptions {
  readonly x: number;
  /** Y-coordinate the notehead sits at -- typically staffBottomY + staffPositionForPitch(...) (Phase 9/10). */
  readonly y: number;
  readonly color: string;
  readonly fontFamily: string;
}

/** Draws one notehead glyph at the given position. */
export function renderNotehead(glyphName: string, options: RenderNoteheadOptions): string {
  const glyph = requireGlyph(glyphName);
  return svgGlyphText(options.x, options.y, glyph.char, options.fontFamily, {
    fill: options.color,
  });
}
