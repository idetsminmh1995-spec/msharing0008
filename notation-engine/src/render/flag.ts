import type { DurationType } from '../core/duration.js';
import type { StemDirection } from '../geometry/stem.js';
import { flagGlyphName } from '../geometry/flag.js';
import { getGlyph } from '../glyphs/glyph-table.js';
import { svgGlyphText } from './svg-primitives.js';

export interface RenderFlagOptions {
  /** The stem's own X (matches renderStem's attachX -- a flag sits directly on the stem, not offset from it). */
  readonly x: number;
  /** The stem's FREE end Y -- renderStem's `endY`, not the notehead-attachment end. */
  readonly y: number;
  readonly direction: StemDirection;
  readonly color: string;
  readonly fontFamily: string;
}

/** Draws a flag at the stem's free end. Throws (via flagGlyphName) if the duration never has a flag -- callers should check geometry's needsFlag() first. */
export function renderFlag(durationType: DurationType, options: RenderFlagOptions): string {
  const glyphName = flagGlyphName(durationType, options.direction);
  const glyph = getGlyph(glyphName);
  if (glyph === undefined) {
    throw new Error(`No glyph found for flag "${glyphName}"`);
  }
  return svgGlyphText(options.x, options.y, glyph.char, options.fontFamily, {
    fill: options.color,
  });
}
