import type { CancellationNatural, KeySignatureAccidental } from '../geometry/key-signature.js';
import { getGlyph } from '../glyphs/glyph-table.js';
import { svgGlyphText } from './svg-primitives.js';

export interface RenderKeySignatureOptions {
  /** X position of the FIRST accidental. */
  readonly x: number;
  /** Horizontal spacing between adjacent accidentals, in staff-space units. */
  readonly spacing: number;
  /** Y-coordinate of the staff's bottom line (matches Phase 9/10's convention -- each accidental's own `y` from Phase 11 geometry is relative to this). */
  readonly staffBottomY: number;
  readonly color: string;
  readonly fontFamily: string;
}

/** Draws a key signature's accidentals left to right, evenly spaced. */
export function renderKeySignature(
  accidentals: readonly KeySignatureAccidental[],
  options: RenderKeySignatureOptions,
): string {
  const glyphName = accidentals[0]?.type === 'flat' ? 'accidentalFlat' : 'accidentalSharp';
  const glyph = getGlyph(glyphName);
  if (glyph === undefined) {
    throw new Error(`No glyph found for accidental type (glyph name "${glyphName}")`);
  }
  return accidentals
    .map((acc, i) =>
      svgGlyphText(
        options.x + i * options.spacing,
        options.staffBottomY + acc.y,
        glyph.char,
        options.fontFamily,
        {
          fill: options.color,
        },
      ),
    )
    .join('\n');
}

export interface RenderCancellationOptions {
  readonly x: number;
  readonly spacing: number;
  readonly staffBottomY: number;
  readonly color: string;
  readonly fontFamily: string;
}

/** Draws cancellation naturals left to right, evenly spaced -- typically placed just before the new key signature's own accidentals (if any). */
export function renderCancellationNaturals(
  naturals: readonly CancellationNatural[],
  options: RenderCancellationOptions,
): string {
  const glyph = getGlyph('accidentalNatural');
  if (glyph === undefined) {
    throw new Error('No glyph found for accidentalNatural');
  }
  return naturals
    .map((n, i) =>
      svgGlyphText(
        options.x + i * options.spacing,
        options.staffBottomY + n.y,
        glyph.char,
        options.fontFamily,
        {
          fill: options.color,
        },
      ),
    )
    .join('\n');
}
