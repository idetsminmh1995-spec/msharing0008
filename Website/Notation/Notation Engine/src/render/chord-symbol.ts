import type { ChordSymbolLayout } from '../geometry/chord-symbol.js';
import { getGlyph } from '../glyphs/glyph-table.js';
import { svgGroup } from './svg-primitives.js';
import { renderText, renderTextScaledGlyph } from './text.js';

export interface RenderChordSymbolOptions {
  /** Ordinary text font -- the root letter, the bass letter and any text suffix. */
  readonly textFont: string;
  /** The SMuFL font the `csym*` accidental/quality/slash glyphs come from. */
  readonly musicFont: string;
  /** `config.fonts.sizes.chordSymbol`, in staff spaces. */
  readonly fontSize: number;
  readonly color: string;
}

/**
 * Draws one assembled chord symbol, left to right, starting at `x`.
 *
 * `x` is the symbol's LEFT edge, not its centre: `chordSymbolLayout`
 * reports a total width, so a caller that wants the symbol centred over
 * a beat subtracts half of it once, here, rather than every part
 * carrying a different anchor.
 *
 * A glyph whose name the font does not have is skipped rather than
 * thrown on -- `chordSymbolLayout` only ever emits names from SMuFL's
 * own chord-symbol set, but a substituted font may not carry all of
 * them, and §7's rule is that a missing glyph is a normal case, not a
 * crash.
 */
export function renderChordSymbol(
  layout: ChordSymbolLayout,
  x: number,
  y: number,
  options: RenderChordSymbolOptions,
): string {
  const children: string[] = [];
  let cursor = x;
  for (const part of layout.parts) {
    if (part.kind === 'text') {
      children.push(
        renderText(part.text, cursor, y, {
          fontFamily: options.textFont,
          fontSize: options.fontSize,
          color: options.color,
        }),
      );
    } else {
      const glyph = getGlyph(part.glyphName);
      if (glyph !== undefined) {
        children.push(
          renderTextScaledGlyph(glyph.char, cursor, y, {
            fontFamily: options.musicFont,
            fontSize: options.fontSize,
            color: options.color,
          }),
        );
      }
    }
    cursor += part.advance;
  }
  return svgGroup(children, { 'data-chord-symbol': 'true' });
}
