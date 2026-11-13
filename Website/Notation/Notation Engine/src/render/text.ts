import { svgText } from './svg-primitives.js';

/**
 * §19.10's gap, closed: how an ARBITRARY run of ordinary text is drawn.
 *
 * Everything else this engine draws is one SMuFL glyph resolved by name.
 * Lyrics, chord symbols, rehearsal marks and `<words>` directions are
 * prose -- "Hal-le-lu-jah", "Cmaj7", "A", "Allegro" -- which Bravura has
 * no glyphs for at all, because it is a music-symbol font. `svgText`
 * already emitted such text for bar numbers and tempo numbers, but each
 * of those call sites spelled out its own font-family/font-size/fill
 * attributes, and none of them had a way to say "centered" or "italic".
 *
 * This is that one place. It computes nothing: §4.1's rule is that
 * `render/` turns geometry into SVG and never decides a position, so
 * every x and y here comes from `geometry/` -- or, for a text run whose
 * exact advance cannot be known without the host's font, from the
 * deliberately-generous estimate in `geometry/text-metrics.ts`.
 */
export type TextAnchor = 'start' | 'middle' | 'end';

export interface RenderTextOptions {
  /** The host's ordinary text font (`config.fonts.textFont`, `lyricFont`, ...). */
  readonly fontFamily: string;
  /** Size in staff spaces (`config.fonts.sizes.*`). */
  readonly fontSize: number;
  readonly color: string;
  /** Defaults to `start`, which is SVG's own default. */
  readonly anchor?: TextAnchor;
  readonly italic?: boolean;
  readonly bold?: boolean;
}

/**
 * One text run, as a single `<text>` element.
 *
 * One element and not one per character, deliberately: the browser's own
 * text shaping then handles kerning, ligatures and complex scripts,
 * which per-character placement could only get wrong. The price is that
 * the engine cannot measure the result exactly -- which is why nothing
 * is ever POSITIONED from a text measurement here, only reserved room
 * for (see `geometry/text-metrics.ts`).
 */
export function renderText(text: string, x: number, y: number, options: RenderTextOptions): string {
  const attrs: Record<string, string | number> = {
    'font-family': options.fontFamily,
    'font-size': options.fontSize,
    fill: options.color,
  };
  if (options.anchor !== undefined && options.anchor !== 'start') {
    attrs['text-anchor'] = options.anchor;
  }
  if (options.italic === true) attrs['font-style'] = 'italic';
  if (options.bold === true) attrs['font-weight'] = 'bold';
  return svgText(x, y, text, attrs);
}

/**
 * One SMuFL glyph drawn at TEXT scale rather than at the 4x convention.
 *
 * `svgGlyphText` draws at one em = 4 staff spaces, which is right for a
 * notehead and wrong for a chord-symbol quality mark or a lyric hyphen:
 * SMuFL designs those (`csym*`, `lyrics*`) to sit beside ordinary text
 * at the text's own size. Drawing `csymDiminished` at 4 would make its
 * circle 1.9 staff spaces across -- taller than the gap between two
 * staff lines, next to a 1.8-space letter.
 */
export function renderTextScaledGlyph(
  char: string,
  x: number,
  y: number,
  options: { readonly fontFamily: string; readonly fontSize: number; readonly color: string },
): string {
  return svgText(x, y, char, {
    'font-family': options.fontFamily,
    'font-size': options.fontSize,
    fill: options.color,
  });
}
