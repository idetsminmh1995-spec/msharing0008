import type { StemDirection } from '../geometry/stem.js';
import { getGlyph } from '../glyphs/glyph-table.js';
import { svgLine } from './svg-primitives.js';

export interface RenderStemOptions {
  readonly noteheadGlyphName: string;
  /** The notehead's own drawing position (matches whatever x/y renderNotehead was called with). */
  readonly noteX: number;
  readonly noteY: number;
  readonly direction: StemDirection;
  readonly length: number;
  /** Typically Phase 5's getEngravingDefault('stemThickness'). */
  readonly thickness: number;
  readonly color: string;
}

/**
 * Draws a stem attached at the notehead's REAL anchor point (`stemUpSE`
 * for an up stem, `stemDownNW` for a down stem -- Phase 5's Bravura data,
 * not a bounding-box corner). The anchor is in font design space (Y
 * increases upward); this flips it to match this engine's Y-down
 * convention, the same sign flip already established when Phase 6/9 first
 * drew a stem from anchor data.
 */
export function renderStem(options: RenderStemOptions): string {
  const glyph = getGlyph(options.noteheadGlyphName);
  if (glyph === undefined) {
    throw new Error(`No glyph found for notehead "${options.noteheadGlyphName}"`);
  }
  const anchorName = options.direction === 'up' ? 'stemUpSE' : 'stemDownNW';
  const anchor = glyph.anchors?.[anchorName];
  if (anchor === undefined) {
    throw new Error(`Notehead "${options.noteheadGlyphName}" has no ${anchorName} anchor`);
  }
  const [anchorX, anchorY] = anchor;

  const attachX = options.noteX + anchorX;
  const attachY = options.noteY - anchorY;
  const endY = options.direction === 'up' ? attachY - options.length : attachY + options.length;

  return svgLine(attachX, attachY, attachX, endY, {
    stroke: options.color,
    'stroke-width': options.thickness,
  });
}
